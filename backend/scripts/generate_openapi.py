"""Generate a checked-in OpenAPI contract from the FastAPI application."""

from __future__ import annotations

import json
from pathlib import Path

from main import app


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    output_path = repo_root / "docs" / "backend" / "openapi.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {output_path.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
