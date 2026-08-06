CREATE TABLE shows (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (
    length(trim(name)) BETWEEN 1 AND 200
  ),
  description TEXT,
  thumbnail_resource_id TEXT,
  style_defaults_json TEXT NOT NULL CHECK (
    json_valid(style_defaults_json) AND json_type(style_defaults_json) = 'object'
  ),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  CHECK (length(id) = 36),
  CHECK (length(studio_id) = 36),
  CHECK (thumbnail_resource_id IS NULL OR length(thumbnail_resource_id) = 36),
  CHECK (archived_at IS NULL OR length(archived_at) = 24),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX shows_active_studio_updated_at_idx
ON shows (studio_id, updated_at DESC, id)
WHERE archived_at IS NULL;

CREATE TABLE show_blueprints (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL UNIQUE REFERENCES shows(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  CHECK (length(id) = 36),
  CHECK (length(show_id) = 36),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;
