"""Database-backed idempotency for webhooks.

The previous guard was a dict inside the API process. It forgot everything on
every restart and was invisible to a second worker or instance, so a gateway
retry landing on a different process was processed again. Here the claim is a
row in public.webhook_events, and the primary key (provider, event_key) makes
the claim atomic: of any number of concurrent deliveries exactly one inserts
the row and the rest are told someone else has it.

Lifecycle of an event:

    claim()     insert (processing)          -> "acquired"
                row already processed        -> "done"   (replay the response)
                row processing, still fresh  -> "busy"   (another delivery has it)
                row processing, gone stale   -> taken over (the worker died)
    complete()  mark processed + store the response
    release()   delete the claim so a retry can run (failure, or not final yet)

Every write after the claim is conditional on the claim token, so a slow
worker whose claim was taken over cannot overwrite or delete its successor's.
"""

from __future__ import annotations

import logging
import random
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

logger = logging.getLogger(__name__)

TABLE = "webhook_events"

#: A claim not completed within this long is assumed to belong to a crashed
#: worker and may be taken over. Comfortably longer than any single webhook.
DEFAULT_STALE_AFTER_SECONDS = 300

#: Finished events older than this are pruned; gateways do not retry for months.
RETENTION_DAYS = 90


@dataclass(frozen=True)
class Claim:
    state: Literal["acquired", "done", "busy"]
    response: dict[str, Any] | None = None
    #: None when the claim could not be recorded (store unreachable).
    token: str | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def _is_unique_violation(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    text = str(exc).lower()
    return code == "23505" or "23505" in text or "duplicate key" in text


def _parse(ts: Any) -> datetime | None:
    if not ts:
        return None
    try:
        parsed = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


class WebhookEvents:
    def __init__(self, supabase: Any, provider: str, stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS):
        self.supabase = supabase
        self.provider = provider
        self.stale_after = stale_after_seconds

    def _table(self):
        return self.supabase.table(TABLE)

    def _key(self, query, key: str):
        return query.eq("provider", self.provider).eq("event_key", key)

    def claim(self, key: str, _retry: bool = True) -> Claim:
        token = uuid.uuid4().hex
        now = _now().isoformat()
        try:
            self._table().insert(
                {
                    "provider": self.provider,
                    "event_key": key,
                    "status": "processing",
                    "claim_token": token,
                    "created_at": now,
                    "updated_at": now,
                }
            ).execute()
            self._maybe_prune()
            return Claim("acquired", token=token)
        except Exception as exc:
            if not _is_unique_violation(exc):
                # The store itself is unavailable. Dropping a paid-for payment
                # notification is worse than processing it unguarded: the
                # handlers' own pending -> active transitions are conditional,
                # so a repeat cannot double-apply. Say so loudly and carry on.
                logger.error(
                    "webhook_events unavailable, processing %s:%s unguarded: %s",
                    self.provider, key, exc,
                )
                return Claim("acquired", token=None)

        return self._existing(key, token, _retry)

    def _maybe_prune(self) -> None:
        """Occasionally drop old finished events so the table stays small.

        Done opportunistically (about 1 in 100 claims) instead of by a
        scheduled job, so it needs no extra infrastructure.
        """
        if random.random() >= 0.01:
            return
        try:
            cutoff = (_now() - timedelta(days=RETENTION_DAYS)).isoformat()
            self._table().delete().eq("provider", self.provider).eq("status", "processed").lt("created_at", cutoff).execute()
        except Exception as exc:
            logger.warning("webhook_events prune failed: %s", exc)

    def _existing(self, key: str, token: str, retry: bool) -> Claim:
        try:
            rows = self._key(self._table().select("status, response, claim_token, updated_at"), key).limit(1).execute().data
        except Exception as exc:
            logger.error("webhook_events lookup failed for %s:%s: %s", self.provider, key, exc)
            return Claim("acquired", token=None)

        row = rows[0] if isinstance(rows, list) and rows else rows
        if not row:
            # Deleted between the failed insert and this read (a release):
            # nobody holds it now, so try once more to take it.
            return self.claim(key, _retry=False) if retry else Claim("busy")

        if row.get("status") == "processed":
            return Claim("done", response=row.get("response") or {})

        updated = _parse(row.get("updated_at"))
        if updated and (_now() - updated).total_seconds() < self.stale_after:
            return Claim("busy")

        # Stale: the worker that claimed it is presumed dead. Compare-and-swap
        # on the old token so that two retries cannot both take it over.
        try:
            taken = (
                self._key(self._table().update({"claim_token": token, "updated_at": _now().isoformat()}), key)
                .eq("status", "processing")
                .eq("claim_token", row.get("claim_token"))
                .execute()
            )
        except Exception as exc:
            logger.error("webhook_events takeover failed for %s:%s: %s", self.provider, key, exc)
            return Claim("busy")
        if taken.data:
            logger.warning("Took over stale webhook claim %s:%s", self.provider, key)
            return Claim("acquired", token=token)
        return Claim("busy")

    def complete(self, claim: Claim, key: str, response: dict[str, Any]) -> None:
        if not claim.token:
            return
        try:
            self._key(
                self._table().update(
                    {"status": "processed", "response": response, "updated_at": _now().isoformat()}
                ),
                key,
            ).eq("claim_token", claim.token).execute()
        except Exception as exc:
            # The work is done; failing to record it only risks a replay,
            # which the handlers tolerate. Do not turn that into a 500.
            logger.error("Could not mark webhook %s:%s processed: %s", self.provider, key, exc)

    def release(self, claim: Claim, key: str) -> None:
        if not claim.token:
            return
        try:
            self._key(self._table().delete(), key).eq("claim_token", claim.token).eq("status", "processing").execute()
        except Exception as exc:
            logger.error("Could not release webhook claim %s:%s: %s", self.provider, key, exc)
