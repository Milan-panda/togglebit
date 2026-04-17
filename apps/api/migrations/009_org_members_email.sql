ALTER TABLE org_members ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE org_members om
SET email = i.email
FROM org_invitations i
WHERE i.accepted_by = om.user_id
  AND i.org_id = om.org_id
  AND om.email IS NULL;
