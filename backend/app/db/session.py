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
    SQLALCHEMY_DATABASE_URL,
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    pool_pre_ping=True,
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
                # Add runtime compatibility for recurrence and timezone fields
                if "rrule" not in event_columns:
                    statements.append("ALTER TABLE events ADD COLUMN rrule VARCHAR(500) NULL")
                if "timezone" not in event_columns:
                    statements.append("ALTER TABLE events ADD COLUMN timezone VARCHAR(100) NULL")

            # Ensure submissions table has rejection_reason column for legacy schemas.
            if "submissions" in table_names:
                submission_columns = {c["name"] for c in inspector.get_columns("submissions")}
                if "rejection_reason" not in submission_columns:
                    statements.append("ALTER TABLE submissions ADD COLUMN rejection_reason TEXT NULL")

            # Keep vote endpoints available even when submission_votes table has not
            # been created by a migration yet.
            if "submission_votes" not in table_names and "submissions" in table_names and "users" in table_names:
                from app.models.publication import SubmissionVote

                SubmissionVote.__table__.create(bind=engine, checkfirst=True)

            # Keep comment reaction endpoints available even when comment_reactions table
            # has not been created by a migration yet.
            if "comment_reactions" not in table_names and "comments" in table_names and "users" in table_names:
                from app.models.publication import CommentReaction

                CommentReaction.__table__.create(bind=engine, checkfirst=True)

            # Ensure users table has image_url column (runtime compatibility for profile avatars)
            if "users" in table_names:
                try:
                    user_columns = {c["name"] for c in inspector.get_columns("users")}
                except Exception:
                    user_columns = set()

                if "image_url" not in user_columns:
                    statements.append("ALTER TABLE users ADD COLUMN image_url VARCHAR(500) NULL")

            # Ensure publications table has comments_enabled column (runtime compatibility for comments)
            if "publications" in table_names:
                try:
                    pub_columns = {c["name"] for c in inspector.get_columns("publications")}
                except Exception:
                    pub_columns = set()

                if "comments_enabled" not in pub_columns:
                    statements.append("ALTER TABLE publications ADD COLUMN comments_enabled BOOLEAN NOT NULL DEFAULT 1")

            # Ensure event attachments table exists for new attachment support
            if "event_attachments" not in table_names and "events" in table_names:
                try:
                    from app.models.publication import EventAttachment
                    EventAttachment.__table__.create(bind=engine, checkfirst=True)
                except Exception:
                    # Non-fatal: keep API available even if table creation fails at runtime
                    pass

            # Ensure media_assets table exists for media library
            if "media_assets" not in table_names:
                try:
                    from app.models.media import MediaAsset
                    MediaAsset.__table__.create(bind=engine, checkfirst=True)
                except Exception:
                    # Non-fatal: keep API available even if table creation fails at runtime
                    pass

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
