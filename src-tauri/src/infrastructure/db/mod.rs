use std::path::Path;

use rusqlite::Connection;

use crate::domain::search::SearchResult;
use crate::domain::vault::VaultInfo;
use crate::error::AppError;

pub const INIT_MIGRATION: &str = include_str!("migrations/001_init.sql");

pub struct Database {
    connection: Connection,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, AppError> {
        let connection = Connection::open(path).map_err(|_| AppError::DbError)?;
        let database = Self { connection };
        database.apply_migrations()?;
        Ok(database)
    }

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

    pub fn recent_vault(&self) -> Result<Option<VaultInfo>, AppError> {
        let mut statement = self
            .connection
            .prepare(
                "
                SELECT id, path, name, last_opened_at
                FROM vaults
                ORDER BY last_opened_at DESC, updated_at DESC
                LIMIT 1
                ",
            )
            .map_err(|_| AppError::DbError)?;
        let mut rows = statement.query([]).map_err(|_| AppError::DbError)?;

        let Some(row) = rows.next().map_err(|_| AppError::DbError)? else {
            return Ok(None);
        };

        Ok(Some(VaultInfo {
            id: row.get(0).map_err(|_| AppError::DbError)?,
            path: row.get(1).map_err(|_| AppError::DbError)?,
            name: row.get(2).map_err(|_| AppError::DbError)?,
            last_opened_at: row.get(3).map_err(|_| AppError::DbError)?,
        }))
    }

    pub fn search_notes(&self, vault_id: &str, query: &str) -> Result<Vec<SearchResult>, AppError> {
        let query = query.trim();
        if query.is_empty() {
            return Ok(Vec::new());
        }

        let mut statement = self
            .connection
            .prepare(
                "
                SELECT notes_index.path, notes_index.title, snippet(notes_fts, 2, '', '', '…', 12)
                FROM notes_fts
                JOIN notes_index ON notes_index.id = notes_fts.note_id
                WHERE notes_index.vault_id = ?1
                  AND notes_fts MATCH ?2
                ORDER BY rank
                LIMIT 25
                ",
            )
            .map_err(|_| AppError::DbError)?;
        let rows = statement
            .query_map(rusqlite::params![vault_id, query], |row| {
                Ok(SearchResult {
                    path: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                })
            })
            .map_err(|_| AppError::DbError)?;

        rows.collect::<Result<Vec<_>, _>>()
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

    #[test]
    fn persists_rows_when_reopened_from_disk() {
        let path = test_database_path("persistent");
        {
            let database = Database::open(&path).unwrap();
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
        }

        let database = Database::open(&path).unwrap();

        assert_eq!(database.indexed_note_count("vault:/tmp/notes").unwrap(), 1);
    }

    #[test]
    fn returns_most_recent_vault() {
        let database = Database::open_in_memory().unwrap();
        database
            .upsert_vault("vault:/tmp/notes", "/tmp/notes", "notes")
            .unwrap();

        let vault = database.recent_vault().unwrap().unwrap();

        assert_eq!(vault.id, "vault:/tmp/notes");
        assert_eq!(vault.path, "/tmp/notes");
        assert_eq!(vault.name, "notes");
        assert!(vault.last_opened_at.is_some());
    }

    #[test]
    fn searches_indexed_notes_by_body_and_title() {
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
                "This note mentions rust and tauri.",
            )
            .unwrap();
        database
            .upsert_note_index(
                "note-2",
                "vault:/tmp/notes",
                "Ideas.md",
                "Ideas",
                12,
                "hash-2",
                "Unrelated body.",
            )
            .unwrap();

        let results = database.search_notes("vault:/tmp/notes", "tauri").unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "README.md");
        assert_eq!(results[0].title, "README");
        assert!(results[0].snippet.to_lowercase().contains("tauri"));
    }

    fn test_database_path(name: &str) -> std::path::PathBuf {
        let root =
            std::env::temp_dir().join(format!("ai-note-manager-db-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        root.join("metadata.sqlite3")
    }
}
