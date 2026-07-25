from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings
from services.phone_auth import send_sms_esms


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Send a test SMS via EgoSMS to verify authentication, sender ID, and delivery."
    )
    parser.add_argument(
        "--phone",
        required=True,
        help="Recipient phone number (e.g. +256700123456)",
    )
    parser.add_argument(
        "--message",
        default="This is a test SMS from Afodabo. If you receive this, EgoSMS integration is working.",
        help="SMS message body (default: standard test message)",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()

    print(f"EgoSMS URL:      {settings.egosms_url}")
    print(f"Username:        {'set' if settings.egosms_username else 'NOT SET'}")
    print(f"Password:        {'set' if settings.egosms_password else 'NOT SET'}")
    print(f"Sender ID:       {settings.egosms_sender_id}")
    print(f"Recipient:       {args.phone}")
    print(f"Message:         {args.message}")
    print()

    if not settings.egosms_username or not settings.egosms_password:
        print("ERROR: EGOSMS_USERNAME and EGOSMS_PASSWORD must be set in backend/.env")
        sys.exit(1)

    print("Sending...")
    result = asyncio.run(send_sms_esms(args.phone, args.message))

    if result:
        print("SUCCESS: SMS sent successfully.")
    else:
        print("FAILURE: SMS sending failed. Check the logs above for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
