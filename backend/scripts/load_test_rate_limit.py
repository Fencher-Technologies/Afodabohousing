import argparse
import json
from collections import Counter

import httpx


def run_probe(base_url: str, method: str, path: str, requests: int, json_body: dict | None = None) -> dict:
    url = f"{base_url.rstrip('/')}{path}"
    counts: Counter[int] = Counter()
    first_429 = None
    last_headers = {}

    with httpx.Client(timeout=10) as client:
        for index in range(1, requests + 1):
            response = client.request(method, url, json=json_body)
            counts[response.status_code] += 1
            if response.status_code == 429 and first_429 is None:
                first_429 = index
            if response.status_code == 429:
                last_headers = {
                    "Retry-After": response.headers.get("Retry-After"),
                    "X-RateLimit-Limit": response.headers.get("X-RateLimit-Limit"),
                    "X-RateLimit-Remaining": response.headers.get("X-RateLimit-Remaining"),
                    "X-RateLimit-Reset": response.headers.get("X-RateLimit-Reset"),
                    "X-RateLimit-Policy": response.headers.get("X-RateLimit-Policy"),
                }

    return {
        "path": path,
        "method": method,
        "requests": requests,
        "status_counts": dict(sorted(counts.items())),
        "first_429_at_request": first_429,
        "last_429_headers": last_headers,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe Afodabo API rate-limit enforcement.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--requests", type=int, default=40)
    args = parser.parse_args()

    probes = [
        ("GET", "/api/endpoints", None),
        ("POST", "/login", {"email": "loadtest@example.com", "password": "not-the-password"}),
        ("GET", "/payments", None),
    ]
    results = [
        run_probe(args.base_url, method, path, args.requests, json_body)
        for method, path, json_body in probes
    ]
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
