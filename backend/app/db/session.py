from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from pathlib import Path
from threading import Lock
from dotenv import load_dotenv

# Load env from backend/.env regardless of where the script is run
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    # Try local .env in backend/
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_schema_guard_done = False
_schema_guard_lock = Lock()


def _ensure_runtime_schema_compatibility():
    global _schema_guard_done
    if _schema_guard_done:
        return

    with _schema_guard_lock:
        if _schema_guard_done:
            return

        try:
            inspector = inspect(engine)
            table_names = set(inspector.get_table_names())
            statements = []

            if "events" in table_names:
                event_columns = {c["name"] for c in inspector.get_columns("events")}
                if "linked_post_id" not in event_columns:
                    statements.append("ALTER TABLE events ADD COLUMN linked_post_id INT NULL")

            # Keep vote endpoints available even when submission_votes table has not
            # been created by a migration yet.
            if "submission_votes" not in table_names and "submissions" in table_names and "users" in table_names:
                from app.models.publication import SubmissionVote

                SubmissionVote.__table__.create(bind=engine, checkfirst=True)

            if statements:
                with engine.begin() as conn:
                    for stmt in statements:
                        conn.execute(text(stmt))

            _schema_guard_done = True
        except Exception as exc:
            # Keep API available even if auto-migration cannot run.
            print(f"Warning: runtime schema compatibility check failed: {exc}")

# Dependency to get DB session
def get_db():
    _ensure_runtime_schema_compatibility()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
