import asyncio
from unittest.mock import MagicMock, patch

from config import get_settings
from services import pesapal


def _mock_client(MockClient, token: str):
    client = MockClient.return_value
    client.__aenter__.return_value = client
    resp = MagicMock()
    resp.raise_for_status = lambda: None
    resp.json.return_value = {"token": token}

    async def _post(*_args, **_kwargs):
        return resp

    client.post.side_effect = _post
    return client


def test_get_auth_token_caches_within_ttl():
    s = get_settings()
    old_key, old_secret = s.pesapal_consumer_key, s.pesapal_consumer_secret
    s.pesapal_consumer_key = "ck"
    s.pesapal_consumer_secret = "cs"
    pesapal._token_cache["token"] = ""
    pesapal._token_cache["expires_at"] = 0.0

    try:
        with patch("services.pesapal.httpx.AsyncClient") as MockClient:
            _mock_client(MockClient, "tok-1")
            assert asyncio.run(pesapal.get_auth_token()) == "tok-1"
            assert asyncio.run(pesapal.get_auth_token()) == "tok-1"
            assert MockClient.call_count == 1, "second call must reuse the cached token"
    finally:
        s.pesapal_consumer_key = old_key
        s.pesapal_consumer_secret = old_secret
        pesapal._token_cache["token"] = ""
        pesapal._token_cache["expires_at"] = 0.0


def test_get_auth_token_refreshes_after_ttl():
    s = get_settings()
    old_key, old_secret = s.pesapal_consumer_key, s.pesapal_consumer_secret
    s.pesapal_consumer_key = "ck"
    s.pesapal_consumer_secret = "cs"

    pesapal._token_cache["token"] = "tok-expired"
    pesapal._token_cache["expires_at"] = 0.0  # past grace -> force refresh

    try:
        with patch("services.pesapal.httpx.AsyncClient") as MockClient:
            _mock_client(MockClient, "tok-2")
            assert asyncio.run(pesapal.get_auth_token()) == "tok-2"
            assert MockClient.call_count == 1
    finally:
        s.pesapal_consumer_key = old_key
        s.pesapal_consumer_secret = old_secret
        pesapal._token_cache["token"] = ""
        pesapal._token_cache["expires_at"] = 0.0