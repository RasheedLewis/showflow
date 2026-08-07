CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  subtitle TEXT,
  episode_number INTEGER CHECK (
    episode_number IS NULL OR episode_number >= 0
  ),
  description TEXT,
  planned_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'ready')),
  guest_names_json TEXT NOT NULL CHECK (
    json_valid(guest_names_json) AND json_type(guest_names_json) = 'array'
  ),
  sponsor_information TEXT,
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  CHECK (length(id) = 36),
  CHECK (length(show_id) = 36),
  CHECK (planned_at IS NULL OR length(planned_at) = 24),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX episodes_show_updated_at_idx
ON episodes (show_id, updated_at DESC, id);

CREATE TABLE episode_segments (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  source_show_segment_id TEXT NOT NULL REFERENCES show_segments(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT,
  field_values_json TEXT NOT NULL CHECK (
    json_valid(field_values_json) AND json_type(field_values_json) = 'object'
  ),
  notes TEXT NOT NULL DEFAULT '',
  expected_duration_override_ms INTEGER CHECK (
    expected_duration_override_ms IS NULL OR expected_duration_override_ms >= 0
  ),
  default_layout_override_id TEXT,
  fixed_resource_replacements_json TEXT NOT NULL CHECK (
    json_valid(fixed_resource_replacements_json) AND
    json_type(fixed_resource_replacements_json) = 'array'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (episode_id, position),
  CHECK (length(id) = 36),
  CHECK (length(episode_id) = 36),
  CHECK (length(source_show_segment_id) = 36),
  CHECK (
    default_layout_override_id IS NULL OR
    length(default_layout_override_id) = 36
  ),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX episode_segments_source_usage_idx
ON episode_segments (source_show_segment_id, episode_id);
