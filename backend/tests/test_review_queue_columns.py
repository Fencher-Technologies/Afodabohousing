"""The review-queue query must only ask for columns that exist on properties.

It once selected manager_id and currency, neither of which is a column, so
PostgREST rejected every call and the Super Admin saw an empty queue.
"""

import re
from pathlib import Path

# Columns of public.properties relevant to the queue, as in the live schema.
PROPERTIES_COLUMNS = {
    "id", "owner_id", "address", "city", "state", "country", "property_type",
    "bedrooms", "bathrooms", "monthly_rent", "description", "images",
    "is_active", "created_at", "title", "review_status", "reviewed_at",
    "review_notes", "submitted_for_review_at",
}


def test_review_queue_selects_only_real_columns():
    src = (Path(__file__).parents[1] / "routers" / "admin.py").read_text()
    start = src.index("def list_properties_for_review")
    block = src[start : src.index("query = (", start)]
    selected = "".join(re.findall(r'"([^"]*)"', block.split("columns = (")[1]))
    names = {c.strip() for c in selected.split(",") if c.strip()}
    assert names, "no columns parsed"
    assert names <= PROPERTIES_COLUMNS, names - PROPERTIES_COLUMNS
