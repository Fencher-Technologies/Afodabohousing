import logging
from supabase import Client
from .base import BaseService

logger = logging.getLogger(__name__)


class TrackingService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "page_views"

    def get_popular_properties(self, limit: int = 10) -> list[dict]:
        result = (
            self.supabase.table(self._table)
            .select("metadata->>property_id, count", "path")
            .ilike("path", "%/properties/%")
            .execute()
        )
        counts: dict[str, int] = {}
        for row in (result.data or []):
            prop_id = row.get("metadata", {}).get("property_id")
            if prop_id:
                counts[prop_id] = counts.get(prop_id, 0) + 1
        sorted_props = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [{"property_id": pid, "views": count} for pid, count in sorted_props]
