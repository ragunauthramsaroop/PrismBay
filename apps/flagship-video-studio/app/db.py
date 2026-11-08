import json
import os
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(os.getenv('STUDIO_DATA_DIR', str(Path(__file__).resolve().parent.parent / 'data'))).resolve()
DB = BASE / 'studio.sqlite3'
LOCK = threading.RLock()

def now():
    return datetime.now(timezone.utc).isoformat()

def uid():
    return uuid.uuid4().hex[:12]

def initialize():
    BASE.mkdir(parents=True, exist_ok=True)
    for directory in ('assets', 'renders', 'temp', 'exports'):
        (BASE / directory).mkdir(exist_ok=True)
    with connect() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, client TEXT DEFAULT '', description TEXT DEFAULT '',
            format TEXT NOT NULL DEFAULT 'landscape', accent TEXT NOT NULL DEFAULT '#7AE3CE',
            background TEXT NOT NULL DEFAULT '#0B1424', script TEXT NOT NULL DEFAULT '',
            narration_asset TEXT, captions TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS shots (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            position INTEGER NOT NULL, kind TEXT NOT NULL, headline TEXT DEFAULT '',
            subtitle TEXT DEFAULT '', duration REAL NOT NULL DEFAULT 4, asset_id TEXT,
            FOREIGN KEY (asset_id) REFERENCES assets(id)
        );
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY, filename TEXT NOT NULL, media_type TEXT NOT NULL,
            bytes INTEGER NOT NULL, saved_name TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0, output_file TEXT, error TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY, service TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'normal',
            due_on TEXT, owner TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, organization TEXT DEFAULT '',
            email TEXT DEFAULT '', notes TEXT DEFAULT '', conversation_id INTEGER, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
            starts_at TEXT NOT NULL, purpose TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'requested',
            booking_url TEXT DEFAULT '', created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS seo_briefs (
            project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
            primary_keyword TEXT DEFAULT '', target_audience TEXT DEFAULT '',
            page_title TEXT DEFAULT '', meta_description TEXT DEFAULT '', keywords TEXT DEFAULT '',
            research_notes TEXT DEFAULT '', updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id,status);
        CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id,starts_at);
        CREATE INDEX IF NOT EXISTS idx_shots_project ON shots(project_id,position);
        CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id,created_at);
        ''')

@contextmanager
def connect():
    with LOCK:
        db = sqlite3.connect(DB, check_same_thread=False, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA busy_timeout=10000')
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

def rows(query, params=()):
    with connect() as db:
        return [dict(r) for r in db.execute(query, params).fetchall()]

def one(query, params=()):
    with connect() as db:
        r = db.execute(query, params).fetchone()
        return dict(r) if r else None

def execute(query, params=()):
    with connect() as db:
        return db.execute(query, params).rowcount

def stats():
    with connect() as db:
        return {
            'projects': db.execute('SELECT COUNT(*) FROM projects').fetchone()[0],
            'assets': db.execute('SELECT COUNT(*) FROM assets').fetchone()[0],
            'completed': db.execute("SELECT COUNT(*) FROM jobs WHERE status='completed'").fetchone()[0],
            'renders': db.execute('SELECT COUNT(*) FROM jobs').fetchone()[0],
            'tasks': db.execute("SELECT COUNT(*) FROM tasks WHERE status!='done'").fetchone()[0],
            'clients': db.execute('SELECT COUNT(*) FROM clients').fetchone()[0],
        }
