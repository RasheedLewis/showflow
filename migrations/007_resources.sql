CREATE TABLE resources (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  owner_scope TEXT NOT NULL CHECK (owner_scope IN ('studio', 'show', 'episode')),
  studio_id TEXT REFERENCES studios(id) ON DELETE CASCADE,
  show_id TEXT REFERENCES shows(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 255),
  original_filename TEXT,
  local_path TEXT,
  mime_type TEXT NOT NULL CHECK (length(trim(mime_type)) > 0),
  category TEXT NOT NULL CHECK (category IN (
    'image', 'video', 'audio', 'font', 'cameraInput', 'microphoneInput',
    'screenCapture', 'textDocument', 'structuredData', 'animatedGraphic'
  )),
  file_size_bytes INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  source_modified_at TEXT,
  content_hash TEXT,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  availability TEXT NOT NULL CHECK (availability IN (
    'available', 'missing', 'unavailable', 'unsupported'
  )),
  thumbnail_cache_key TEXT,
  created_at TEXT NOT NULL CHECK (length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK (length(updated_at) = 24 AND updated_at >= created_at),
  CHECK (
    (owner_scope = 'studio' AND studio_id IS NOT NULL AND show_id IS NULL AND episode_id IS NULL) OR
    (owner_scope = 'show' AND studio_id IS NULL AND show_id IS NOT NULL AND episode_id IS NULL) OR
    (owner_scope = 'episode' AND studio_id IS NULL AND show_id IS NULL AND episode_id IS NOT NULL)
  ),
  CHECK ((width IS NULL) = (height IS NULL))
) STRICT;

CREATE INDEX resources_studio_owner_idx ON resources (studio_id, updated_at DESC, id);
CREATE INDEX resources_show_owner_idx ON resources (show_id, updated_at DESC, id);
CREATE INDEX resources_episode_owner_idx ON resources (episode_id, updated_at DESC, id);
CREATE INDEX resources_content_hash_idx ON resources (content_hash) WHERE content_hash IS NOT NULL;
