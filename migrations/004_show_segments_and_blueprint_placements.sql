CREATE TABLE show_segments (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (
    length(trim(name)) BETWEEN 1 AND 200
  ),
  description TEXT,
  expected_duration_ms INTEGER CHECK (
    expected_duration_ms IS NULL OR expected_duration_ms >= 0
  ),
  notes_template TEXT NOT NULL DEFAULT '',
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  CHECK (length(id) = 36),
  CHECK (length(show_id) = 36),
  CHECK (archived_at IS NULL OR length(archived_at) = 24),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX show_segments_active_show_updated_at_idx
ON show_segments (show_id, updated_at DESC, id)
WHERE archived_at IS NULL;

CREATE TABLE blueprint_segment_placements (
  id TEXT PRIMARY KEY,
  show_blueprint_id TEXT NOT NULL REFERENCES show_blueprints(id) ON DELETE CASCADE,
  show_segment_id TEXT NOT NULL REFERENCES show_segments(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT,
  default_data_json TEXT NOT NULL CHECK (
    json_valid(default_data_json) AND json_type(default_data_json) = 'object'
  ),
  default_duration_ms INTEGER CHECK (
    default_duration_ms IS NULL OR default_duration_ms >= 0
  ),
  placement_overrides_json TEXT CHECK (
    placement_overrides_json IS NULL OR (
      json_valid(placement_overrides_json) AND
      json_type(placement_overrides_json) = 'object'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (show_blueprint_id, position),
  CHECK (length(id) = 36),
  CHECK (length(show_blueprint_id) = 36),
  CHECK (length(show_segment_id) = 36),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX blueprint_placements_segment_usage_idx
ON blueprint_segment_placements (show_segment_id, show_blueprint_id);
