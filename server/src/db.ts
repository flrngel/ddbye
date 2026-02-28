import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { DiligenceRequest } from './types.js';

const defaultDbPath = path.join(import.meta.dirname, '..', 'data', 'outreachos.db');
const dbPath = path.resolve(process.env.DB_PATH || defaultDbPath);

// Validate DB_PATH is within the project directory
const projectRoot = path.resolve(import.meta.dirname, '..', '..');
if (!dbPath.startsWith(projectRoot + path.sep) && !dbPath.startsWith(path.resolve(import.meta.dirname, '..'))) {
  throw new Error(`DB_PATH must be within the project. Got: ${dbPath}`);
}

// Ensure the directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });

const db = new Database(dbPath);

// Enable WAL mode for read concurrency
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const stmtGet = db.prepare('SELECT data FROM requests WHERE id = ?');
const stmtList = db.prepare('SELECT data FROM requests ORDER BY created_at DESC');
const stmtUpsert = db.prepare(`
  INSERT OR REPLACE INTO requests (id, status, data, created_at, updated_at)
  VALUES (@id, @status, @data, @created_at, @updated_at)
`);

export function getRequest(id: string): DiligenceRequest | null {
  const row = stmtGet.get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as DiligenceRequest;
}

export function listRequests(): DiligenceRequest[] {
  const rows = stmtList.all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as DiligenceRequest);
}

export function upsertRequest(req: DiligenceRequest): void {
  stmtUpsert.run({
    id: req.id,
    status: req.status,
    data: JSON.stringify(req),
    created_at: req.createdAt,
    updated_at: req.updatedAt,
  });
}
