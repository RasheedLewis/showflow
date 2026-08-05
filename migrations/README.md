# Showflow database migrations

This directory contains Showflow's forward-only SQLite schema migrations. The
migration runner owns the `schema_migrations` table; feature migrations must not
create or modify it.

Migration files must:

- use contiguous `NNN_snake_case.sql` names beginning with `001`;
- contain non-empty SQLite SQL;
- rely on the migration runner for transaction boundaries; and
- remain immutable after they have been applied.

Add schema changes as new numbered files. Never rename, reorder, or edit an
applied migration.
