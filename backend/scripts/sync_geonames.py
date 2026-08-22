#!/usr/bin/env python3
"""
GeoNames Sync Service
Downloads, diffs, and applies country/region data from GeoNames
dumps to the local database (Supabase via service client).

Usage:
  # One-time full import (seed)
  python sync_geonames.py seed

  # Monthly sync (diffs against current data)
  python sync_geonames.py sync

  # Dry-run (shows what would change without applying)
  python sync_geonames.py sync --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime
from typing import Any

import httpx

# ---------------------------------------------------------------------------
# GeoNames dump URLs
# ---------------------------------------------------------------------------
COUNTRY_INFO_URL = "https://download.geonames.org/export/dump/countryInfo.txt"
ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"
ADMIN2_URL = "https://download.geonames.org/export/dump/admin2Codes.txt"

# Fallback: simpler admin1 list if the ASCII dump is unavailable
ADMIN1_SIMPLE_URL = "https://download.geonames.org/export/dump/admin1Codes.txt"

# ---------------------------------------------------------------------------
# Supabase connection
# ---------------------------------------------------------------------------
# We use the service-role key to bypass RLS for background sync operations.
# The caller must set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env,
# or supply them via --supabase-url / --supabase-key CLI flags.

try:
    from supabase import Client, create_client  # type: ignore
except ImportError:
    print(
        "supabase-py is required.  Install with:  pip install supabase",
        file=sys.stderr,
    )
    sys.exit(1)


def _supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL") or ""
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        print(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
            file=sys.stderr,
        )
        sys.exit(1)
    return create_client(url, key)


# ---------------------------------------------------------------------------
# GeoNames download helpers
# ---------------------------------------------------------------------------

def _fetch_text(url: str, client: httpx.Client) -> str:
    """Download a text file from GeoNames."""
    print(f"  Downloading {url} ...")
    resp = client.get(url, follow_redirects=True)
    resp.raise_for_status()
    return resp.text


def _parse_country_info(raw: str) -> list[dict[str, str]]:
    """Parse countryInfo.txt (tab-delimited, comment lines start with #).

    Columns: ISO, ISO3, ISO-Numeric, fips, Country, Capital, Area(in sq km),
    Population, Continent, tld, currencies, languages, geonameid, neighbours,
    equivalentfips
    """
    countries: list[dict[str, str]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        cols = line.split("\t")
        if len(cols) < 8:
            continue
        countries.append({
            "iso_code": cols[0].strip()[:2],
            "name": cols[4].strip(),
            "is_active": "true",
        })
    return countries


def _parse_admin1(raw: str) -> list[dict[str, str]]:
    """Parse admin1CodesASCII.txt.

    Format (4 tab-delimited columns):
      countryCode.admin1Code  name  nameAscii  geonameid
    Example: UG.33  Northern Region  Northern Region  226083
    """
    regions: list[dict[str, str]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        cols = line.split("\t")
        if len(cols) < 4:
            continue
        key = cols[0].strip()
        parts = key.split(".", 1)
        if len(parts) != 2:
            continue
        iso = parts[0][:2]
        geonames_id = cols[3].strip()
        name = cols[1].strip() or cols[2].strip()
        if not name or not geonames_id:
            continue
        regions.append({
            "country_id": iso,
            "name": name,
            "admin_level": "state",
            "geonames_id": geonames_id,
        })
    return regions


def _parse_admin2(raw: str) -> list[dict[str, str]]:
    """Parse admin2Codes.txt.

    Format (4 tab-delimited columns):
      countryCode.admin1Code.admin2Code  name  nameAscii  geonameid
    Example: AE.01.101  Abu Dhabi Municipality  Abu Dhabi Municipality  12047239
    """
    regions: list[dict[str, str]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        cols = line.split("\t")
        if len(cols) < 4:
            continue
        key = cols[0].strip()
        parts = key.split(".")
        if len(parts) < 2:
            continue
        iso = parts[0][:2]
        geonames_id = cols[3].strip()
        name = cols[1].strip() or cols[2].strip()
        if not name or not geonames_id:
            continue
        regions.append({
            "country_id": iso,
            "name": name,
            "admin_level": "district",
            "geonames_id": geonames_id,
        })
    return regions
    return regions


# ---------------------------------------------------------------------------
# Database operations
# ---------------------------------------------------------------------------

def _upsert_countries(sb: Client, countries: list[dict[str, str]]) -> int:
    """Insert or update countries. Returns count of inserted rows."""
    count = 0
    for c in countries:
        try:
            # Check if already exists
            existing = (
                sb.table("countries")
                .select("iso_code")
                .eq("iso_code", c["iso_code"])
                .execute()
            )
            if existing.data:
                # Update name if changed
                if existing.data[0].get("name") != c["name"]:
                    (
                        sb.table("countries")
                        .update({"name": c["name"]})
                        .eq("iso_code", c["iso_code"])
                        .execute()
                    )
            else:
                sb.table("countries").insert(c).execute()
                count += 1
        except Exception as e:
            print(f"  Warning: failed to upsert country {c['iso_code']}: {e}")
    return count


def _get_existing_regions(sb: Client) -> dict[str, dict[str, Any]]:
    """Fetch all active regions keyed by (country_id, geonames_id) → row."""
    result = sb.table("regions").select("*").is_("deprecated_at", "null").execute()
    lookup: dict[str, dict[str, Any]] = {}
    for row in result.data:
        key = f"{row['country_id']}|{row['geonames_id']}"
        lookup[key] = row
    return lookup


BATCH_SIZE = 500


def _upsert_regions(
    sb: Client,
    regions: list[dict[str, str]],
    dry_run: bool = False,
) -> dict[str, int]:
    """Diff and apply region changes using batch inserts. Returns counts."""
    counts = {"added": 0, "updated": 0, "deprecated": 0}
    existing = _get_existing_regions(sb)
    today = date.today().isoformat()

    # Track which regions we've seen (for deprecation)
    seen_keys: set[str] = set()
    new_rows: list[dict[str, str]] = []

    for r in regions:
        key = f"{r['country_id']}|{r['geonames_id']}"
        seen_keys.add(key)

        if key in existing:
            row = existing[key]
            if row["name"] != r["name"]:
                counts["updated"] += 1
                if not dry_run:
                    try:
                        sb.table("regions").update({"name": r["name"]}).eq("id", row["id"]).execute()
                        print(f"  [UPDATED] {r['country_id']} | {row['name']} -> {r['name']}")
                    except Exception as e:
                        print(f"  Warning: failed to update region {key}: {e}")
                else:
                    print(f"  [DRY-RUN] Would update: {row['name']} -> {r['name']}")
        else:
            counts["added"] += 1
            new_rows.append({
                "country_id": r["country_id"],
                "name": r["name"],
                "admin_level": r["admin_level"],
                "geonames_id": r["geonames_id"],
                "effective_date": today,
            })

    # Batch insert new regions
    if new_rows and not dry_run:
        for i in range(0, len(new_rows), BATCH_SIZE):
            batch = new_rows[i : i + BATCH_SIZE]
            try:
                sb.table("regions").insert(batch).execute()
                print(f"  Inserted batch {i // BATCH_SIZE + 1}: {len(batch)} regions")
            except Exception as e:
                print(f"  Warning: batch insert failed at offset {i}: {e}")

    # Deprecate regions no longer in the dump
    deprecated_rows = []
    for key, row in existing.items():
        if key not in seen_keys:
            counts["deprecated"] += 1
            deprecated_rows.append(row["id"])

    if deprecated_rows and not dry_run:
        for rid in deprecated_rows:
            try:
                sb.table("regions").update({
                    "deprecated_at": datetime.utcnow().isoformat() + "Z",
                    "superseded_by_region_id": None,
                }).eq("id", rid).execute()
            except Exception as e:
                print(f"  Warning: failed to deprecate region {rid}: {e}")

    return counts

    # Deprecate regions no longer in the dump
    for key, row in existing.items():
        if key not in seen_keys:
            counts["deprecated"] += 1
            if not dry_run:
                try:
                    (
                        sb.table("regions")
                        .update({
                            "deprecated_at": datetime.utcnow().isoformat() + "Z",
                            "superseded_by_region_id": None,  # leave null for manual review
                        })
                        .eq("id", row["id"])
                        .execute()
                    )
                    print(f"  [DEPRECATED] {row['country_id']} | {row['name']}")
                except Exception as e:
                    print(f"  Warning: failed to deprecate region {key}: {e}")
            else:
                print(f"  [DRY-RUN] Would deprecate: {row['country_id']} | {row['name']}")

    return counts


def _log_sync_run(
    sb: Client,
    source: str,
    counts: dict[str, int],
    notes: str = "",
) -> None:
    """Write a record to the sync_history table."""
    try:
        sb.table("sync_history").insert({
            "source": source,
            "records_added": counts.get("added", 0),
            "records_updated": counts.get("updated", 0),
            "records_deprecated": counts.get("deprecated", 0),
            "notes": notes,
        }).execute()
    except Exception as e:
        print(f"  Warning: failed to log sync history: {e}")


# ---------------------------------------------------------------------------
# CLI commands
# ---------------------------------------------------------------------------

def cmd_seed(dry_run: bool = False) -> None:
    """One-time full import from GeoNames dumps."""
    print("=== GeoNames Full Seed ===")
    sb = _supabase_client()

    with httpx.Client(timeout=60) as client:
        # 1. Countries
        raw_country = _fetch_text(COUNTRY_INFO_URL, client)
        countries = _parse_country_info(raw_country)
        print(f"\nParsed {len(countries)} countries")
        if not dry_run:
            added = _upsert_countries(sb, countries)
            print(f"Inserted {added} new countries")
        else:
            print("[DRY-RUN] Skipping country insert")

        # 2. Admin1 regions (states/provinces)
        try:
            raw_admin1 = _fetch_text(ADMIN1_URL, client)
            admin1_regions = _parse_admin1(raw_admin1)
        except Exception:
            print("  Falling back to admin1 simple dump...")
            raw_admin1 = _fetch_text(ADMIN1_SIMPLE_URL, client)
            admin1_regions = _parse_admin1(raw_admin1)
        print(f"\nParsed {len(admin1_regions)} admin1 regions")

        # 3. Admin2 regions (districts/counties)
        try:
            raw_admin2 = _fetch_text(ADMIN2_URL, client)
            admin2_regions = _parse_admin2(raw_admin2)
            print(f"Parsed {len(admin2_regions)} admin2 regions")
        except Exception:
            admin2_regions = []
            print("  Admin2 dump unavailable, skipping")

    all_regions = admin1_regions + admin2_regions
    print(f"\nTotal regions to seed: {len(all_regions)}")

    counts = _upsert_regions(sb, all_regions, dry_run)
    print(f"\nResults: +{counts['added']} added, ~{counts['updated']} updated, -{counts['deprecated']} deprecated")

    if not dry_run:
        _log_sync_run(sb, "GeoNames_full_seed", counts, "One-time full import")
    print("\nSeed complete.")


def cmd_sync(dry_run: bool = False) -> None:
    """Recurring monthly sync — diffs against current data."""
    print("=== GeoNames Sync ===")
    sb = _supabase_client()

    with httpx.Client(timeout=60) as client:
        # 1. Countries
        raw_country = _fetch_text(COUNTRY_INFO_URL, client)
        countries = _parse_country_info(raw_country)
        print(f"\nParsed {len(countries)} countries")
        if not dry_run:
            added = _upsert_countries(sb, countries)
            print(f"Upserted countries ({added} new)")

        # 2. Admin1
        try:
            raw_admin1 = _fetch_text(ADMIN1_URL, client)
            admin1_regions = _parse_admin1(raw_admin1)
        except Exception:
            raw_admin1 = _fetch_text(ADMIN1_SIMPLE_URL, client)
            admin1_regions = _parse_admin1(raw_admin1)
        print(f"Parsed {len(admin1_regions)} admin1 regions")

        # 3. Admin2
        try:
            raw_admin2 = _fetch_text(ADMIN2_URL, client)
            admin2_regions = _parse_admin2(raw_admin2)
            print(f"Parsed {len(admin2_regions)} admin2 regions")
        except Exception:
            admin2_regions = []
            print("  Admin2 dump unavailable, skipping")

    all_regions = admin1_regions + admin2_regions
    print(f"\nTotal regions to sync: {len(all_regions)}")

    counts = _upsert_regions(sb, all_regions, dry_run)
    print(f"\nResults: +{counts['added']} added, ~{counts['updated']} updated, -{counts['deprecated']} deprecated")

    if not dry_run:
        _log_sync_run(sb, "GeoNames_monthly_sync", counts, "Monthly sync run")
    print("\nSync complete.")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="GeoNames sync service")
    sub = parser.add_subparsers(dest="command", required=True)

    seed_parser = sub.add_parser("seed", help="One-time full import from GeoNames")
    seed_parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")

    sync_parser = sub.add_parser("sync", help="Monthly sync (diffs against current data)")
    sync_parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")

    args = parser.parse_args()

    if args.command == "seed":
        cmd_seed(dry_run=args.dry_run)
    elif args.command == "sync":
        cmd_sync(dry_run=args.dry_run)
    else:
        parser.print_help()
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
