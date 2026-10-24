import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'foodbridge.db');

export const db = new DatabaseSync(dbPath);

// Enable foreign keys, WAL mode, and busy timeout
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

/**
 * Initialize database schema
 */
export function initDb() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      district TEXT NOT NULL,
      area TEXT NOT NULL,
      org_type TEXT DEFAULT 'individual',
      bio TEXT,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Donations table
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT NOT NULL,
      dietary_class TEXT NOT NULL,
      declared_allergens TEXT NOT NULL,
      has_unknown_allergens INTEGER DEFAULT 0,
      preparation_time TEXT,
      storage_info TEXT,
      district TEXT NOT NULL,
      area TEXT NOT NULL,
      available_from TEXT NOT NULL,
      collection_deadline TEXT NOT NULL,
      image_url TEXT,
      donor_reference TEXT,
      available_quantity REAL NOT NULL CHECK(available_quantity >= 0),
      reserved_quantity REAL NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0),
      collected_quantity REAL NOT NULL DEFAULT 0 CHECK(collected_quantity >= 0),
      status TEXT NOT NULL DEFAULT 'Available',
      is_demo INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Food requests table
    CREATE TABLE IF NOT EXISTS food_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      food_type TEXT NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT NOT NULL,
      dietary_requirements TEXT NOT NULL,
      allergies_to_avoid TEXT,
      district TEXT NOT NULL,
      area TEXT NOT NULL,
      needed_by TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      reserved_quantity REAL NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0),
      collected_quantity REAL NOT NULL DEFAULT 0 CHECK(collected_quantity >= 0),
      outstanding_quantity REAL NOT NULL CHECK(outstanding_quantity >= 0),
      status TEXT NOT NULL DEFAULT 'Open',
      is_demo INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Allocations table (Multi-donor engine link)
    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
      donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
      allocated_quantity REAL NOT NULL CHECK(allocated_quantity > 0),
      collected_quantity REAL NOT NULL DEFAULT 0 CHECK(collected_quantity >= 0),
      status TEXT NOT NULL DEFAULT 'proposed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Reservations table (Formal reservation lifecycle)
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_group_id TEXT NOT NULL,
      request_id INTEGER NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
      donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
      requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      allocation_id INTEGER REFERENCES allocations(id) ON DELETE SET NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      collected_quantity REAL NOT NULL DEFAULT 0 CHECK(collected_quantity >= 0),
      uncollected_quantity REAL NOT NULL DEFAULT 0 CHECK(uncollected_quantity >= 0),
      status TEXT NOT NULL DEFAULT 'pending',
      donor_notes TEXT,
      requester_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Collection records table (Audit trail for confirmed pick-ups)
    CREATE TABLE IF NOT EXISTS collection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      request_id INTEGER NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
      donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
      collector_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quantity_collected REAL NOT NULL CHECK(quantity_collected > 0),
      uncollected_released REAL NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      link TEXT,
      unique_key TEXT UNIQUE,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Activity log table
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL
    );

    -- Listing reports moderation table
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_type TEXT NOT NULL,
      listing_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    -- Password resets table for real recovery
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Indexes for fast querying & matching performance
    CREATE INDEX IF NOT EXISTS idx_donations_status_deadline ON donations(status, collection_deadline);
    CREATE INDEX IF NOT EXISTS idx_donations_locality ON donations(district, area);
    CREATE INDEX IF NOT EXISTS idx_requests_status_needed ON food_requests(status, needed_by);
    CREATE INDEX IF NOT EXISTS idx_requests_locality ON food_requests(district, area);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_donor ON reservations(donor_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_requester ON reservations(requester_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token, used);
  `);
}

/**
 * Transaction helper for node:sqlite DatabaseSync
 * Runs fn inside BEGIN ... COMMIT, automatically doing ROLLBACK on exception.
 */
export function runInTransaction(fn) {
  db.exec('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // rollback error ignore
    }
    throw err;
  }
}
