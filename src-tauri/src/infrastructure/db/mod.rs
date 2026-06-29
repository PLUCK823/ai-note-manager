use rusqlite::Connection;

use crate::error::AppError;

pub const INIT_MIGRATION: &str = include_str!("migrations/001_init.sql");

pub struct Database {
    connection: Connection,
}

impl Database {
    pub fn open_in_memory() -> Result<Self, AppError> {
        let connection = Connection::open_in_memory().map_err(|_| AppError::DbError)?;
        let database = Self { connection };
        database.apply_migrations()?;
        Ok(database)
    }

    pub fn apply_migrations(&self) -> Result<(), AppError> {
        self.connection
            .execute_batch(INIT_MIGRATION)
            .map_err(|_| AppError::DbError)
    }

    pub fn table_exists(&self, table_name: &str) -> Result<bool, AppError> {
        let mut statement = self
            .connection
            .prepare("SELECT 1 FROM sqlite_master WHERE name = ?1 LIMIT 1")
            .map_err(|_| AppError::DbError)?;
        let mut rows = statement
            .query(rusqlite::params![table_name])
            .map_err(|_| AppError::DbError)?;

        rows.next()
            .map(|row| row.is_some())
            .map_err(|_| AppError::DbError)
    }

    pub fn upsert_vault(&self, id: &str, path: &str, name: &str) -> Result<(), AppError> {
        self.connection
            .execute(
                "
                INSERT INTO vaults (id, path, name, created_at, updated_at, last_opened_at)
                VALUES (?1, ?2, ?3, datetime('now'), datetime('now'), datetime('now'))
                ON CONFLICT(path) DO UPDATE SET
                  name = excluded.name,
                  updated_at = datetime('now'),
                  last_opened_at = datetime('now')
                ",
                rusqlite::params![id, path, name],
            )
            .map(|_| ())
            .map_err(|_| AppError::DbError)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn upsert_note_index(
        &self,
        id: &str,
        vault_id: &str,
        path: &str,
        title: &str,
        size_bytes: i64,
        content_hash: &str,
        body: &str,
    ) -> Result<(), AppError> {
        self.connection
            .execute(
                "
                INSERT INTO notes_index (
                  id, vault_id, path, title, modified_at, size_bytes, content_hash, indexed_at
                )
                VALUES (?1, ?2, ?3, ?4, datetime('now'), ?5, ?6, datetime('now'))
                ON CONFLICT(vault_id, path) DO UPDATE SET
                  title = excluded.title,
                  modified_at = excluded.modified_at,
                  size_bytes = excluded.size_bytes,
                  content_hash = excluded.content_hash,
                  indexed_at = excluded.indexed_at
                ",
                rusqlite::params![id, vault_id, path, title, size_bytes, content_hash],
            )
            .map_err(|_| AppError::DbError)?;

        self.connection
            .execute(
                "DELETE FROM notes_fts WHERE note_id = ?1",
                rusqlite::params![id],
            )
            .map_err(|_| AppError::DbError)?;
        self.connection
            .execute(
                "INSERT INTO notes_fts (note_id, title, body) VALUES (?1, ?2, ?3)",
                rusqlite::params![id, title, body],
            )
            .map(|_| ())
            .map_err(|_| AppError::DbError)
    }

    pub fn indexed_note_count(&self, vault_id: &str) -> Result<i64, AppError> {
        self.connection
            .query_row(
                "SELECT COUNT(*) FROM notes_index WHERE vault_id = ?1",
                rusqlite::params![vault_id],
                |row| row.get(0),
            )
            .map_err(|_| AppError::DbError)
    }
}

#[cfg(test)]
mod tests {
    use super::Database;

    #[test]
    fn applies_initial_migration() {
        let database = Database::open_in_memory().unwrap();

        assert!(database.table_exists("vaults").unwrap());
        assert!(database.table_exists("notes_index").unwrap());
        assert!(database.table_exists("notes_fts").unwrap());
        assert!(database.table_exists("snapshots").unwrap());
    }

    #[test]
    fn upserts_vault_and_note_index_rows() {
        let database = Database::open_in_memory().unwrap();

        database
            .upsert_vault("vault:/tmp/notes", "/tmp/notes", "notes")
            .unwrap();
        database
            .upsert_note_index(
                "note-1",
                "vault:/tmp/notes",
                "README.md",
                "README",
                12,
                "hash-1",
                "# README",
            )
            .unwrap();

        assert_eq!(database.indexed_note_count("vault:/tmp/notes").unwrap(), 1);
    }
}
