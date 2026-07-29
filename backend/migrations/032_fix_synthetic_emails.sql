-- ──────────────────────────────────────────────────────────────
-- 032: Fix synthetic email placeholders in profiles
-- ──────────────────────────────────────────────────────────────

-- 1. Clear synthetic emails from profiles (column is NOT NULL, use empty string)
UPDATE profiles SET email = '' WHERE email LIKE 'phone_%@afodabo.app';

-- 2. Clear synthetic emails from house_managers (column is nullable)
UPDATE house_managers SET email = NULL WHERE email LIKE 'phone_%@afodabo.app';

-- 3. Patch the sync trigger to use empty string for profiles
CREATE OR REPLACE FUNCTION sync_house_manager_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'house_manager' THEN
        INSERT INTO house_managers (user_id, full_name, phone, email, photo_url, status, created_by)
        VALUES (
            NEW.user_id,
            COALESCE(NEW.full_name, ''),
            COALESCE(NEW.phone, ''),
            CASE WHEN NEW.email LIKE 'phone_%@afodabo.app' THEN NULL ELSE NEW.email END,
            NEW.photo_url,
            COALESCE(NEW.status, 'active'),
            NEW.created_by
        )
        ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone     = EXCLUDED.phone,
            email     = EXCLUDED.email,
            photo_url = EXCLUDED.photo_url,
            status    = EXCLUDED.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
