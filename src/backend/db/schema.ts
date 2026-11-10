import { IDatabase } from './database.js';

export async function initializeSchema(db: IDatabase): Promise<void> {
  // Users table
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Photos table
  await db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      title TEXT NOT NULL,
      user_description TEXT,
      ai_description TEXT,
      exif_data TEXT,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create index for photos query optimization
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_photos_user_id_upload_date 
    ON photos(user_id, upload_date DESC)
  `);

  // Tags table
  await db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      UNIQUE(photo_id, tag_name)
    )
  `);

  // Create index for tags query
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_tags_photo_id 
    ON tags(photo_id)
  `);

  // Refresh tokens table (for auth)
  await db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create index for token cleanup
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
    ON refresh_tokens(user_id)
  `);

  // Password reset tokens table
  await db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create index for token lookup
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
    ON password_reset_tokens(user_id)
  `);

  console.log('✓ Database schema initialized');
}
