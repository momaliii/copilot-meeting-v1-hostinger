import pg from 'pg';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
const USE_SQLITE = process.env.USE_SQLITE_FOR_DEV === 'true' || !DATABASE_URL;

type SqliteDatabase = import('better-sqlite3').Database;
let sqliteDb: SqliteDatabase | null = null;
let pgPool: pg.Pool | null = null;

// Convert SQLite ? placeholders to Postgres $1, $2, ...
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export function isPostgres(): boolean {
  return !USE_SQLITE && !!pgPool;
}

export async function initDb(): Promise<void> {
  if (USE_SQLITE) {
    let Database: new (path: string) => SqliteDatabase;
    try {
      const mod = await import('better-sqlite3');
      Database = (mod as { default: new (path: string) => SqliteDatabase }).default;
    } catch (e) {
      throw new Error(
        'better-sqlite3 is required for SQLite mode but failed to load (often due to GLIBC on hosting). ' +
          'Set DATABASE_URL to use Postgres instead, or install better-sqlite3 locally.'
      );
    }
    sqliteDb = new Database('app.db');
    runSqliteSchema();
    return;
  }

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required when not using SQLite');
  }

  pgPool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') || DATABASE_URL.includes('pooler')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await runPostgresSchema();
}

function runSqliteSchema(): void {
  if (!sqliteDb) return;
  const db = sqliteDb;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      plan_id TEXT DEFAULT 'starter',
      cloud_save_enabled INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT,
      price INTEGER,
      minutes_limit INTEGER
    );
    CREATE TABLE IF NOT EXISTS meeting_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      meeting_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      transcript TEXT,
      analysis_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meeting_shares (
      token TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      meeting_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'medium',
      reviewer_id TEXT,
      reviewed_at TEXT,
      review_notes TEXT DEFAULT '',
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_user_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prompt_rules (
      id TEXT PRIMARY KEY,
      rule_text TEXT,
      created_at TEXT
    );
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN cloud_save_enabled INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN extra_minutes_override INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN force_logout_at TEXT`);
  } catch (_) {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, message TEXT NOT NULL, active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE announcements ADD COLUMN priority TEXT DEFAULT 'info'`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE announcements ADD COLUMN starts_at TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE announcements ADD COLUMN ends_at TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE announcements ADD COLUMN show_on TEXT DEFAULT 'public,user_app,admin_app'`);
  } catch (_) {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS support_conversations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    db.exec(`CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_type TEXT NOT NULL, sender_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE support_messages ADD COLUMN attachments_json TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE support_conversations ADD COLUMN assigned_to TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE support_conversations ADD COLUMN admin_notes TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE support_conversations ADD COLUMN tags TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN language_changes_limit INTEGER DEFAULT -1`);
  } catch (_) {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_conv_user ON support_conversations(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON support_messages(conversation_id)`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        new_email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id)`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN totp_secret TEXT`);
    db.exec(`ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_backup_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON user_backup_codes(user_id)`);
  } catch (_) {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_meeting_usage_user_date ON meeting_usage(user_id, date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_meetings_user_date ON meetings(user_id, date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)`);
  } catch (_) {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS redirect_rules (id TEXT PRIMARY KEY, from_path TEXT NOT NULL UNIQUE, to_path TEXT NOT NULL, active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_redirect_rules_from_path ON redirect_rules(from_path)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_redirect_rules_active ON redirect_rules(active)`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN where_know_us TEXT DEFAULT ''`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('discount', 'plan_time')),
        discount_percent INTEGER,
        plan_id TEXT REFERENCES plans(id),
        plan_months INTEGER DEFAULT 1,
        valid_from TEXT,
        valid_until TEXT,
        max_uses INTEGER,
        uses_count INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active)`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE promo_codes ADD COLUMN max_uses_per_user INTEGER`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS promo_code_uses (
        id TEXT PRIMARY KEY,
        promo_code_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        used_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo_user ON promo_code_uses(promo_code_id, user_id)`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at)`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        page_url TEXT,
        duration_seconds INTEGER
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS session_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        events_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS heatmap_data (
        id TEXT PRIMARY KEY,
        page_path TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        type TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        date TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_heatmap_data_page_date ON heatmap_data(page_path, date)`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN session_replay_consent INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN video_caption INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN cloud_save INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN pro_analysis_enabled INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN analysis_model TEXT DEFAULT 'gemini-2.5-flash'`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN transcript_model TEXT DEFAULT 'gemini-2.5-flash'`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE meetings ADD COLUMN media_path TEXT`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tour_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        step_index INTEGER,
        total_steps INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tour_events_user_created ON tour_events(user_id, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tour_events_type ON tour_events(event_type)`);
  } catch (_) {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        ip_address TEXT,
        user_id TEXT,
        path TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        ip TEXT PRIMARY KEY,
        reason TEXT,
        blocked_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        success INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at)`);
  } catch (_) {}

  const planCount = db.prepare('SELECT COUNT(*) as count FROM plans').get() as { count: number };
  if (planCount.count === 0) {
    db.prepare('INSERT INTO plans (id, name, price, minutes_limit, language_changes_limit) VALUES (?, ?, ?, ?, ?)').run('starter', 'Starter', 0, 60, 2);
    db.prepare('INSERT INTO plans (id, name, price, minutes_limit, language_changes_limit) VALUES (?, ?, ?, ?, ?)').run('pro', 'Pro', 15, 600, -1);
  } else {
    try {
      db.prepare('UPDATE plans SET language_changes_limit = 2 WHERE id = ?').run('starter');
      db.prepare('UPDATE plans SET language_changes_limit = -1 WHERE id = ?').run('pro');
    } catch (_) {}
    try {
      db.prepare('INSERT INTO plans (id, name, price, minutes_limit, language_changes_limit) VALUES (?, ?, ?, ?, ?)').run('pro_video', 'Pro Video', 29, 600, -1);
    } catch (_) {
      db.prepare('UPDATE plans SET name = ?, price = ?, minutes_limit = ?, language_changes_limit = ? WHERE id = ?').run('Pro Video', 29, 600, -1, 'pro_video');
    }
  }
  try {
    db.prepare('UPDATE plans SET video_caption = 1, cloud_save = 1, pro_analysis_enabled = 1 WHERE id = ?').run('pro_video');
    db.prepare('UPDATE plans SET cloud_save = 1, pro_analysis_enabled = 1 WHERE id = ?').run('pro');
    db.prepare('UPDATE plans SET video_caption = 0, cloud_save = 0, pro_analysis_enabled = 0 WHERE id = ?').run('starter');
  } catch (_) {}

  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  if (adminCount.count === 0) {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomUUID().slice(0, 16);
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run('admin-1', 'admin@meetingcopilot.app', hash, '', 'admin');
    if (!process.env.ADMIN_DEFAULT_PASSWORD) {
      console.warn(`[SECURITY] Default admin account created. Email: admin@meetingcopilot.app Password: ${adminPassword}`);
      console.warn('[SECURITY] Change this password immediately and set ADMIN_DEFAULT_PASSWORD env var for future deployments.');
    }
  }
}

async function runPostgresSchema(): Promise<void> {
  if (!pgPool) return;
  const migrations = ['001_initial_postgres.sql', '002_phase2.sql', '003_support_chat.sql', '004_support_attachments.sql', '005_support_admin.sql', '006_language_changes_limit.sql', '007_announcements_enhancements.sql', '008_support_notes_tags.sql', '009_avatar.sql', '010_email_verification.sql', '011_twofa.sql', '012_announcement_show_on.sql', '013_redirect_rules.sql', '014_signup_fields.sql', '015_promo_codes.sql', '016_contact_submissions.sql', '017_promo_per_user.sql', '018_session_replay.sql', '019_pro_video_plan.sql', '020_plan_features_and_model.sql', '021_transcript_model.sql', '022_tour_events.sql', '023_meetings_media.sql', '024_security_tables.sql'];
  const migrationsDir = existsSync(join(__dirname, 'migrations'))
    ? join(__dirname, 'migrations')
    : join(process.cwd(), 'server', 'migrations');
  for (const name of migrations) {
    const migrationPath = join(migrationsDir, name);
    if (!existsSync(migrationPath)) continue;
    const sql = readFileSync(migrationPath, 'utf-8');
    const client = await pgPool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  }

  // Ensure announcements table exists (fallback if migration 002 was skipped)
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (_) {}

  const planResult = await pgPool.query('SELECT COUNT(*) as count FROM plans');
  if (parseInt(planResult.rows[0]?.count || '0') === 0) {
    await pgPool.query(
      `INSERT INTO plans (id, name, price, minutes_limit) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, minutes_limit = EXCLUDED.minutes_limit`,
      ['starter', 'Starter', 0, 60, 'pro', 'Pro', 15, 600]
    );
  }

  const adminResult = await pgPool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  if (parseInt(adminResult.rows[0]?.count || '0') === 0) {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomUUID().slice(0, 16);
    const hash = await bcrypt.hash(adminPassword, 10);
    await pgPool.query(
      `INSERT INTO users (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      ['admin-1', 'admin@meetingcopilot.app', hash, '', 'admin']
    );
    if (!process.env.ADMIN_DEFAULT_PASSWORD) {
      console.warn(`[SECURITY] Default admin account created. Email: admin@meetingcopilot.app Password: ${adminPassword}`);
      console.warn('[SECURITY] Change this password immediately and set ADMIN_DEFAULT_PASSWORD env var for future deployments.');
    }
  }
}

// Unified async query interface
export async function query(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  if (USE_SQLITE && sqliteDb) {
    const stmt = sqliteDb.prepare(sql);
    const rows = params.length ? (stmt.all as (...args: any[]) => any[])(...params) : (stmt.all as () => any[])();
    return { rows: rows as any[], rowCount: (rows as any[]).length };
  }
  if (pgPool) {
    const pgSql = toPgPlaceholders(sql);
    const result = await pgPool.query(pgSql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }
  throw new Error('Database not initialized');
}

export async function queryOne(sql: string, params: any[] = []): Promise<any> {
  const { rows } = await query(sql, params);
  return rows[0] ?? null;
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  if (USE_SQLITE && sqliteDb) {
    const stmt = sqliteDb.prepare(sql);
    if (params.length) {
      (stmt.run as (...args: any[]) => import('better-sqlite3').RunResult)(...params);
    } else {
      (stmt.run as () => import('better-sqlite3').RunResult)();
    }
    return;
  }
  if (pgPool) {
    const pgSql = toPgPlaceholders(sql);
    await pgPool.query(pgSql, params);
    return;
  }
  throw new Error('Database not initialized');
}

// SQL dialect helpers
export function sqlCurrentMonth(column: string): string {
  if (USE_SQLITE) return `strftime('%Y-%m', ${column}) = strftime('%Y-%m', 'now')`;
  return `to_char(${column}::timestamptz, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')`;
}

// Usage: WHERE ... AND date >= ${sqlDateFilter('date')}  with params [..., days]
export function sqlDateFilter(column: string): string {
  if (USE_SQLITE) return `${column} >= datetime('now', '-' || ? || ' days')`;
  return `${column} >= NOW() - (? * INTERVAL '1 day')`;
}

// Usage: SELECT ${sqlDateColumn('date')} as day  (for GROUP BY)
export function sqlDateColumn(column: string): string {
  if (USE_SQLITE) return `substr(${column}, 1, 10)`;
  return `to_char(${column}::timestamptz, 'YYYY-MM-DD')`;
}

// Usage table: meeting_usage for both backends
export const USAGE_TABLE = 'meeting_usage';

// Async db interface - all callers must await
const db = {
  prepare: (sql: string) => ({
    get: async (...params: any[]) => queryOne(sql, params),
    all: async (...params: any[]) => (await query(sql, params)).rows,
    run: async (...params: any[]) => run(sql, params),
  }),
  query,
  queryOne,
  run,
};

export default db;
