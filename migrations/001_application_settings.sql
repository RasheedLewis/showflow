CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_studio_id TEXT,
  last_route TEXT NOT NULL CHECK (
    length(last_route) BETWEEN 1 AND 2048
  ),
  window_preferences_json TEXT
) STRICT;

INSERT INTO app_settings (
  id,
  last_studio_id,
  last_route,
  window_preferences_json
) VALUES (1, NULL, '/', NULL);
