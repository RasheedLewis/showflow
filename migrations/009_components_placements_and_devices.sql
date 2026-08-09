CREATE TABLE components (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  component_type TEXT NOT NULL CHECK (component_type IN (
    'camera', 'video', 'image', 'text', 'background', 'logo', 'lowerThird'
  )),
  property_schema_json TEXT NOT NULL CHECK (
    json_valid(property_schema_json) AND json_type(property_schema_json) = 'array'
  ),
  default_properties_json TEXT NOT NULL CHECK (
    json_valid(default_properties_json) AND json_type(default_properties_json) = 'object'
  ),
  default_enter_animation_json TEXT NOT NULL CHECK (
    json_valid(default_enter_animation_json) AND json_type(default_enter_animation_json) = 'object'
  ),
  default_exit_animation_json TEXT NOT NULL CHECK (
    json_valid(default_exit_animation_json) AND json_type(default_exit_animation_json) = 'object'
  ),
  supported_slot_roles_json TEXT NOT NULL CHECK (
    json_valid(supported_slot_roles_json) AND json_type(supported_slot_roles_json) = 'array'
  ),
  validation_rules_json TEXT NOT NULL CHECK (
    json_valid(validation_rules_json) AND json_type(validation_rules_json) = 'array'
  ),
  archived_at TEXT,
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK (length(updated_at) = 24 AND updated_at >= created_at)
) STRICT;

CREATE INDEX components_show_type_idx
ON components (show_id, component_type, updated_at DESC, id);

CREATE TABLE component_placements (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
  slot_id TEXT NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
  fixed_properties_json TEXT NOT NULL CHECK (
    json_valid(fixed_properties_json) AND json_type(fixed_properties_json) = 'object'
  ),
  bindings_json TEXT NOT NULL CHECK (
    json_valid(bindings_json) AND json_type(bindings_json) = 'object'
  ),
  visible_by_default INTEGER NOT NULL CHECK (visible_by_default IN (0, 1)),
  layer_override INTEGER CHECK (layer_override IS NULL OR layer_override >= 0),
  enter_animation_override_json TEXT CHECK (
    enter_animation_override_json IS NULL OR (
      json_valid(enter_animation_override_json) AND json_type(enter_animation_override_json) = 'object'
    )
  ),
  exit_animation_override_json TEXT CHECK (
    exit_animation_override_json IS NULL OR (
      json_valid(exit_animation_override_json) AND json_type(exit_animation_override_json) = 'object'
    )
  ),
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK (length(updated_at) = 24 AND updated_at >= created_at)
) STRICT;

CREATE INDEX component_placements_layout_layer_idx
ON component_placements (layout_id, layer_override, id);

ALTER TABLE resources ADD COLUMN device_state TEXT CHECK (
  device_state IS NULL OR device_state IN (
    'available', 'permissionRequired', 'unavailable', 'disconnected'
  )
);

CREATE TRIGGER resources_camera_device_state_insert
BEFORE INSERT ON resources
WHEN NEW.device_state IS NOT NULL AND NEW.category <> 'cameraInput'
BEGIN
  SELECT RAISE(ABORT, 'Only camera Resources may store device state.');
END;

CREATE TRIGGER resources_camera_device_state_update
BEFORE UPDATE OF device_state, category ON resources
WHEN NEW.device_state IS NOT NULL AND NEW.category <> 'cameraInput'
BEGIN
  SELECT RAISE(ABORT, 'Only camera Resources may store device state.');
END;
