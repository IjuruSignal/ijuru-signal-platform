ALTER TABLE jobs ADD COLUMN available_at TEXT;
ALTER TABLE jobs ADD COLUMN error_code TEXT;
UPDATE jobs SET available_at = created_at WHERE available_at IS NULL;
CREATE INDEX jobs_claimable ON jobs(status, available_at, lease_until, created_at);
