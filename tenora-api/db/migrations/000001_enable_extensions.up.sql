-- pgcrypto is also enabled during database provisioning (db/init).
-- Kept here so non-Docker environments stay in sync.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
