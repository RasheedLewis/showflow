CREATE TABLE studios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (
    length(trim(name)) BETWEEN 1 AND 200
  ),
  logo_resource_id TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  CHECK (length(id) = 36),
  CHECK (logo_resource_id IS NULL OR length(logo_resource_id) = 36),
  CHECK (archived_at IS NULL OR length(archived_at) = 24),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX studios_active_created_at_idx
ON studios (created_at, id)
WHERE archived_at IS NULL;
