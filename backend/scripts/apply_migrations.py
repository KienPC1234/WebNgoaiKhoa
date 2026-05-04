#!/usr/bin/env python3
"""
apply_migrations.py

Idempotently apply SQL migration files from the repository `migrations/` folder.
- Uses `backend/.env` DATABASE_URL by default.
- Records applied migrations in `applied_migrations` table.
- Skips `ALTER TABLE ... ADD COLUMN` statements when column already exists.
"""
import os
import re
import sys
from pathlib import Path
from datetime import datetime
# Avoid relying on `python-dotenv` runtime being installed; implement a minimal .env loader


def _load_env_file(path):
    try:
        text = Path(path).read_text()
    except Exception:
        return
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('\"').strip("'")
        # don't overwrite existing env vars
        os.environ.setdefault(k, v)
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError


def main():
    this_file = Path(__file__).resolve()
    backend_dir = this_file.parent.parent  # /.../backend
    repo_root = backend_dir.parent

    # Load backend/.env first (standard server env)
    env_path = backend_dir / ".env"
    if env_path.exists():
        _load_env_file(env_path)
    else:
        # fallback to repo-root .env if present
        _load_env_file(repo_root / ".env")

    db_url = os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set in backend/.env or environment.")
        sys.exit(1)

    engine = create_engine(db_url, pool_pre_ping=True)

    migrations_dir = repo_root / "migrations"
    if not migrations_dir.exists():
        print(f"No migrations directory found at {migrations_dir}")
        return

    applied = []
    try:
        with engine.begin() as conn:
            # Ensure applied_migrations table exists
            try:
                conn.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS applied_migrations (
                        name VARCHAR(255) PRIMARY KEY,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                ))
            except SQLAlchemyError as e:
                print("Warning: could not ensure applied_migrations table:", e)

            files = sorted(migrations_dir.glob("*.sql"))
            inspector = inspect(engine)

            for f in files:
                name = f.name
                already = conn.execute(text("SELECT name FROM applied_migrations WHERE name = :name"), {"name": name}).fetchone()
                if already:
                    print(f"Skipping already-applied migration: {name}")
                    continue

                sql = f.read_text()
                # Split statements by semicolon (simple heuristic).
                stmts = [s.strip() for s in sql.split(";") if s.strip()]

                for stmt in stmts:
                    stmt_text = stmt.strip()
                    # Detect ALTER TABLE ADD COLUMN to avoid duplicate column errors
                    m = re.search(r"ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+ADD\s+COLUMN\s+`?([a-zA-Z0-9_]+)`?",
                                  stmt_text, re.IGNORECASE)
                    if m:
                        table = m.group(1)
                        col = m.group(2)
                        try:
                            cols = {c["name"] for c in inspector.get_columns(table)}
                        except Exception:
                            cols = set()
                        if col in cols:
                            print(f"Skipping statement (column exists) {table}.{col}")
                            continue

                    try:
                        print(f"Executing statement from {name}: {stmt_text[:120]}")
                        conn.execute(text(stmt_text))
                    except Exception as e:
                        print(f"Error executing statement in {name}: {e}")
                        raise

                # Mark migration applied
                conn.execute(text("INSERT INTO applied_migrations (name, applied_at) VALUES (:name, :applied_at)"),
                             {"name": name, "applied_at": datetime.utcnow()})
                print(f"Applied migration: {name}")
                applied.append(name)

    except Exception as exc:
        print("Migration runner failed:", exc)
        sys.exit(2)

    print("Migration run complete. Applied:", applied)


if __name__ == '__main__':
    main()
