"""
Database migration: Create contest judging tables and add new submission type columns.
Run this script to update the database schema.

Usage:
    python -m app.db.migrate_contest_judging
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from app.db.session import engine


def column_exists(conn, table_name, column_name):
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :col"
    ), {"table": table_name, "col": column_name})
    return result.scalar() > 0


def table_exists(conn, table_name):
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.TABLES "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table"
    ), {"table": table_name})
    return result.scalar() > 0


def migrate():
    with engine.connect() as conn:
        # 1. Create judge_assignments table
        if not table_exists(conn, 'judge_assignments'):
            conn.execute(text("""
                CREATE TABLE judge_assignments (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    contest_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_judge_assignment_contest_user (contest_id, user_id),
                    INDEX idx_judge_assignments_contest (contest_id),
                    INDEX idx_judge_assignments_user (user_id),
                    FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """))
            print("[OK] Created judge_assignments table")
        else:
            print("[SKIP] judge_assignments table already exists")

        # 2. Create judge_scores table
        if not table_exists(conn, 'judge_scores'):
            conn.execute(text("""
                CREATE TABLE judge_scores (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    submission_id INTEGER NOT NULL,
                    judge_id INTEGER NOT NULL,
                    criterion_index INTEGER NOT NULL DEFAULT 0,
                    score INTEGER NOT NULL,
                    comment TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_judge_score_unique (submission_id, judge_id, criterion_index),
                    INDEX idx_judge_scores_submission (submission_id),
                    INDEX idx_judge_scores_judge (judge_id),
                    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
                    FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """))
            print("[OK] Created judge_scores table")
        else:
            print("[SKIP] judge_scores table already exists")

        # 3. Add new columns to contests table
        contest_columns = [
            ("allowed_submission_types", "JSON"),
            ("allow_image_upload", "BOOLEAN DEFAULT TRUE"),
            ("max_image_size_mb", "INTEGER DEFAULT 10"),
            ("allow_url_submission", "BOOLEAN DEFAULT TRUE"),
        ]
        for col_name, col_def in contest_columns:
            if not column_exists(conn, 'contests', col_name):
                conn.execute(text(f"ALTER TABLE contests ADD COLUMN {col_name} {col_def}"))
                print(f"[OK] Added contests.{col_name}")
            else:
                print(f"[SKIP] contests.{col_name} already exists")

        # Set default value for allowed_submission_types after adding
        if column_exists(conn, 'contests', 'allowed_submission_types'):
            conn.execute(text(
                "UPDATE contests SET allowed_submission_types = '[\"text\", \"file\", \"image\"]' "
                "WHERE allowed_submission_types IS NULL"
            ))
            print("[OK] Set default allowed_submission_types for existing contests")

        # 4. Add new columns to submissions table
        submission_columns = [
            ("submission_type", "VARCHAR(20) NOT NULL DEFAULT 'text'"),
            ("image_url", "VARCHAR(500)"),
            ("external_url", "VARCHAR(1000)"),
            ("caption", "TEXT"),
            ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ]
        for col_name, col_def in submission_columns:
            if not column_exists(conn, 'submissions', col_name):
                conn.execute(text(f"ALTER TABLE submissions ADD COLUMN {col_name} {col_def}"))
                print(f"[OK] Added submissions.{col_name}")
            else:
                print(f"[SKIP] submissions.{col_name} already exists")

        # 5. Make submissions.content nullable
        try:
            conn.execute(text("ALTER TABLE submissions MODIFY COLUMN content TEXT"))
            print("[OK] Made submissions.content nullable")
        except Exception as e:
            print(f"[INFO] submissions.content: {e}")

        conn.commit()
    
    print("\nMigration completed successfully!")


if __name__ == "__main__":
    migrate()
