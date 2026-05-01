import Database from 'better-sqlite3'
import bcrypt from 'bcrypt'
import { join } from 'path'
import { mkdirSync } from 'fs'

const DATA_DIR = join(__dirname, '../../data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'issuer.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT DEFAULT 'user',
    given_name    TEXT DEFAULT '',
    family_name   TEXT DEFAULT '',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',

    given_name      TEXT NOT NULL,
    family_name     TEXT NOT NULL,
    date_of_birth   TEXT NOT NULL,
    document_number TEXT NOT NULL,
    street_address  TEXT DEFAULT '',
    locality        TEXT DEFAULT '',
    region          TEXT DEFAULT '',
    postal_code     TEXT DEFAULT '',
    country         TEXT DEFAULT 'AU',
    nationality     TEXT DEFAULT 'Australian',
    sex             TEXT DEFAULT 'M',
    height          INTEGER DEFAULT 175,

    admin_note      TEXT DEFAULT '',
    reviewed_at     TEXT,
    reviewed_by     TEXT,

    email_sent      INTEGER DEFAULT 0,
    email_sent_at   TEXT,
    offer_url       TEXT DEFAULT '',

    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS issued_credentials (
    id              TEXT PRIMARY KEY,
    application_id  TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    holder_did      TEXT,
    issued_at       TEXT DEFAULT (datetime('now'))
  );
`)

const existingCols = (db.prepare(`PRAGMA table_info(applications)`).all() as any[]).map((c: any) => c.name)
if (!existingCols.includes('doc_file_name')) {
  db.exec(`ALTER TABLE applications ADD COLUMN doc_file_name TEXT NOT NULL DEFAULT ''`)
  db.exec(`ALTER TABLE applications ADD COLUMN doc_file_path TEXT NOT NULL DEFAULT ''`)
  db.exec(`ALTER TABLE applications ADD COLUMN doc_mime_type TEXT NOT NULL DEFAULT ''`)
}
if (!existingCols.includes('face_image')) {
  db.exec(`ALTER TABLE applications ADD COLUMN face_image TEXT NOT NULL DEFAULT ''`)
}
if (!existingCols.includes('extra_data')) {
  db.exec(`ALTER TABLE applications ADD COLUMN extra_data TEXT NOT NULL DEFAULT '{}'`)
}

const userCols = (db.prepare(`PRAGMA table_info(users)`).all() as any[]).map((c: any) => c.name)
if (!userCols.includes('given_name')) {
  db.exec(`ALTER TABLE users ADD COLUMN given_name TEXT NOT NULL DEFAULT ''`)
  db.exec(`ALTER TABLE users ADD COLUMN family_name TEXT NOT NULL DEFAULT ''`)
}

export async function ensureAdminAccount() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@eudi.demo'
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(adminEmail)
  if (existing) return

  const adminPass = process.env.ADMIN_PASSWORD || 'Admin1234!'
  const hash = await bcrypt.hash(adminPass, 10)
  const { v4: uuidv4 } = await import('uuid')
  db.prepare(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
    .run(uuidv4(), adminEmail, hash)
  console.log(`  Admin account created: ${adminEmail}`)
}

export default db
