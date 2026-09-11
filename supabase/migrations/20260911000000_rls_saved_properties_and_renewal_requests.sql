-- #21: saved_properties and renewal_requests have RLS enabled with zero
-- policies. Both are accessed with the end-user JWT (bookmarks.py:13,
-- leases.py:304), so every read returns empty and every write is denied
-- silently. Both tables have 0 rows as a result.
--
-- NOTE: saved_properties.user_id -> profiles.id (surrogate PK), NOT the
-- auth UID. tenants.user_id/owner_id -> profiles.user_id (the auth UID).

-- saved_properties: a user owns their own bookmarks.
DROP POLICY IF EXISTS "Users manage own saved properties" ON saved_properties;
CREATE POLICY "Users manage own saved properties"
    ON saved_properties FOR ALL
    USING      (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- renewal_requests: the tenant who raised it can manage it.
DROP POLICY IF EXISTS "Tenants manage own renewal requests" ON renewal_requests;
CREATE POLICY "Tenants manage own renewal requests"
    ON renewal_requests FOR ALL
    USING      (EXISTS (SELECT 1 FROM tenants t
                        WHERE t.id = renewal_requests.tenant_id
                          AND t.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM tenants t
                        WHERE t.id = renewal_requests.tenant_id
                          AND t.user_id = auth.uid()));

-- renewal_requests: the landlord who owns the tenant record can read and
-- action them, otherwise no one can ever approve a renewal.
DROP POLICY IF EXISTS "Owners manage renewal requests for their tenants" ON renewal_requests;
CREATE POLICY "Owners manage renewal requests for their tenants"
    ON renewal_requests FOR ALL
    USING      (EXISTS (SELECT 1 FROM tenants t
                        WHERE t.id = renewal_requests.tenant_id
                          AND t.owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM tenants t
                        WHERE t.id = renewal_requests.tenant_id
                          AND t.owner_id = auth.uid()));
