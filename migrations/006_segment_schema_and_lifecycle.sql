CREATE TABLE segment_data_fields (
  id TEXT PRIMARY KEY,
  show_segment_id TEXT NOT NULL REFERENCES show_segments(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL CHECK (
    length(field_key) BETWEEN 1 AND 80 AND
    field_key NOT GLOB '*[^A-Za-z0-9]*' AND
    substr(field_key, 1, 1) BETWEEN 'a' AND 'z'
  ),
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 100),
  field_type TEXT NOT NULL CHECK (field_type IN (
    'shortText',
    'longText',
    'number',
    'imageResource',
    'videoResource',
    'audioResource',
    'boolean'
  )),
  is_required INTEGER NOT NULL CHECK (is_required IN (0, 1)),
  default_value_json TEXT CHECK (
    default_value_json IS NULL OR json_valid(default_value_json)
  ),
  help_text TEXT,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (show_segment_id, field_key),
  UNIQUE (show_segment_id, position),
  CHECK (length(id) = 36),
  CHECK (length(show_segment_id) = 36),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

CREATE INDEX segment_data_fields_segment_position_idx
ON segment_data_fields (show_segment_id, position, id);

CREATE TABLE segment_lifecycle_configs (
  show_segment_id TEXT PRIMARY KEY REFERENCES show_segments(id) ON DELETE CASCADE,
  prepare_actions_json TEXT NOT NULL CHECK (
    json_valid(prepare_actions_json) AND json_type(prepare_actions_json) = 'array'
  ),
  enter_actions_json TEXT NOT NULL CHECK (
    json_valid(enter_actions_json) AND json_type(enter_actions_json) = 'array'
  ),
  active_configuration_json TEXT NOT NULL CHECK (
    json_valid(active_configuration_json) AND
    json_type(active_configuration_json) = 'object'
  ),
  exit_actions_json TEXT NOT NULL CHECK (
    json_valid(exit_actions_json) AND json_type(exit_actions_json) = 'array'
  ),
  cleanup_actions_json TEXT NOT NULL CHECK (
    json_valid(cleanup_actions_json) AND json_type(cleanup_actions_json) = 'array'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (updated_at >= created_at),
  CHECK (length(show_segment_id) = 36),
  CHECK (length(created_at) = 24),
  CHECK (length(updated_at) = 24)
) STRICT;

INSERT INTO segment_lifecycle_configs (
  show_segment_id,
  prepare_actions_json,
  enter_actions_json,
  active_configuration_json,
  exit_actions_json,
  cleanup_actions_json,
  created_at,
  updated_at
)
SELECT
  id,
  '[]',
  '[]',
  '{"availableLayoutIds":[],"hostCueIds":[]}',
  '[]',
  '[]',
  created_at,
  updated_at
FROM show_segments;
