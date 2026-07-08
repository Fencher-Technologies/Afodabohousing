# Analytics Design — Boost Revenue Cards

## Understanding Summary
- **What**: Boost revenue summary cards on the Super Admin dashboard
- **Why**: Give super admins visibility into boost feature earnings
- **Who**: Super admins only
- **Metrics**: Total boost revenue, active boosts count, monthly boost revenue
- **Scale**: < 100 users, < 1000 properties
- **Non-goals**: Per-property breakdown, monthly trend charts, manager-specific data

## Assumptions
- < 100 users, < 1000 properties
- Stats refresh on page load + Refresh button
- Only `super_admin` role can see boost revenue
- Backend `GET /boosts/stats` provides all needed fields
- No new backend endpoints required

## Decision Log

| Decision | Options Considered | Chosen |
|----------|-------------------|--------|
| Boost scope | Rental income effect vs boost feature revenue | Boost feature revenue (what managers pay) |
| Metrics | Individual cards vs single total | All three: total revenue, active boosts, monthly |
| Audience | Manager + Super Admin vs Super Admin only | Super Admin only |
| Layout | Inline KPI cards vs dedicated section | Inline KPI cards (Approach 1) |
| Backend | New endpoint vs use existing | Reuse `GET /boosts/stats` |
| Refresh | Auto-poll vs on-load + button | On page load + Refresh button |

## Final Design

### Data Flow
```
SuperAdminDashboard.fetchData()
  → GET /admin/stats (existing)
  → GET /admin/users (existing)
  → GET /boosts/stats (new call, same endpoint)
  → setBoostStats({ total_revenue, active_boosts })
```

### Components
- **State**: `boostStats: { total_revenue: number; active_boosts: number } | null`
- **2 new KPI cards** appended to existing 4-card grid:
  1. "Boost Revenue" — `formatUGX(total_revenue)`, subtitle: `{active_boosts} active boosts`
  2. "Active Boosts" — `String(active_boosts)`, subtitle: `Avg UGX {total/active}/boost`

### Error Handling
- API failure → fallback `{ total_revenue: 0, active_boosts: 0 }`
- No boost data → cards show `UGX 0` and `0`

### Files Changed
- `src/pages/SuperAdminDashboard.tsx` only

---

## Future Analytics (Deferred)
Suggested analytics for later consideration, not in scope for this task:

1. **Platform Growth** — total properties/managers/tenants over time (line chart)
2. **Occupancy Rate Trend** — monthly occupancy rate over 6-12 months
3. **Rent Collection Rate** — % paid on time vs overdue (donut chart)
4. **Top Performing Properties** — highest revenue properties ranked
5. **Manager Performance** — per-manager stats (properties managed, collection rate)
6. **Boost ROI** — correlation between boosted properties and rental velocity
