from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings
from dependencies.database import get_service_client
from services.pesapal import register_ipn_for_url


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Register/re-register the Pesapal IPN webhook URL. "
        "For production use the permanent Render URL; re-run only if the domain changes. "
        "For local development, re-run after every ngrok restart, because the tunnel URL changes. "
        "The ipn_id is persisted in the pesapal_config table and reused by boosts/subscriptions."
    )
    parser.add_argument(
        "ipn_url",
        help="Public webhook URL, e.g. https://axishousing.onrender.com/payments/webhook/pesapal",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()

    if not settings.pesapal_consumer_key or not settings.pesapal_consumer_secret:
        print("ERROR: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in backend/.env")
        sys.exit(1)

    url = args.ipn_url.strip()
    print(f"Environment:    {settings.pesapal_environment}")
    print(f"IPN URL:        {url}")
    print()

    print("Registering...")
    supabase = get_service_client()
    try:
        result = asyncio.run(register_ipn_for_url(supabase, url))
    except Exception as e:
        print(f"ERROR: IPN registration failed: {e}")
        sys.exit(1)

    print(f"SUCCESS ({result['status']}):")
    print(f"  ipn_id = {result['ipn_id']}")
    print(f"  url    = {result['ipn_url']}")


if __name__ == "__main__":
    main()
