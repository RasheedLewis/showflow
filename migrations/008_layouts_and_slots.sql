CREATE TABLE layouts (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('16:9', '9:16')),
  canvas_width INTEGER NOT NULL CHECK (canvas_width > 0),
  canvas_height INTEGER NOT NULL CHECK (canvas_height > 0),
  archived_at TEXT,
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK (
    length(updated_at) = 24 AND updated_at >= created_at
  ),
  CHECK (archived_at IS NULL OR length(archived_at) = 24),
  CHECK (
    (aspect_ratio = '16:9' AND canvas_width * 9 = canvas_height * 16) OR
    (aspect_ratio = '9:16' AND canvas_width * 16 = canvas_height * 9)
  )
) STRICT;

CREATE INDEX layouts_active_show_updated_at_idx
ON layouts (show_id, updated_at DESC, id)
WHERE archived_at IS NULL;

CREATE TABLE slots (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  role TEXT NOT NULL CHECK (role IN (
    'background', 'hostCamera', 'guestCamera', 'mainVideo',
    'pictureInPicture', 'logo', 'lowerThird', 'banner', 'chat',
    'center', 'topCenter', 'bottomCenter', 'upperLeft', 'upperRight',
    'lowerLeft', 'lowerRight'
  )),
  x REAL NOT NULL CHECK (x >= 0.0 AND x <= 1.0),
  y REAL NOT NULL CHECK (y >= 0.0 AND y <= 1.0),
  width REAL NOT NULL CHECK (width >= 0.02 AND width <= 1.0),
  height REAL NOT NULL CHECK (height >= 0.02 AND height <= 1.0),
  alignment TEXT NOT NULL CHECK (alignment IN ('start', 'center', 'end', 'stretch')),
  safe_margin_top REAL NOT NULL CHECK (safe_margin_top >= 0.0 AND safe_margin_top <= 1.0),
  safe_margin_right REAL NOT NULL CHECK (safe_margin_right >= 0.0 AND safe_margin_right <= 1.0),
  safe_margin_bottom REAL NOT NULL CHECK (safe_margin_bottom >= 0.0 AND safe_margin_bottom <= 1.0),
  safe_margin_left REAL NOT NULL CHECK (safe_margin_left >= 0.0 AND safe_margin_left <= 1.0),
  layer_order INTEGER NOT NULL CHECK (layer_order >= 0),
  clip_content INTEGER NOT NULL CHECK (clip_content IN (0, 1)),
  allowed_component_types_json TEXT NOT NULL CHECK (
    json_valid(allowed_component_types_json) AND
    json_type(allowed_component_types_json) = 'array'
  ),
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK (
    length(updated_at) = 24 AND updated_at >= created_at
  ),
  UNIQUE (layout_id, layer_order),
  CHECK (x + width <= 1.0),
  CHECK (y + height <= 1.0)
) STRICT;

CREATE INDEX slots_layout_layer_order_idx
ON slots (layout_id, layer_order, id);
