#!/usr/bin/env python3
"""Utility to merge legacy `category` values into canonical `subject`.

Usage: run from repository root with same Python environment as the app.
Example: `python3 scripts/merge_category_subject.py`
"""
from app.db.session import engine
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError


def main():
    dialect = engine.dialect.name
    print(f"Detected DB dialect: {dialect}")

    with engine.begin() as conn:
        try:
            print("Copying legacy `category` into `subject` where subject is missing or empty...")
            conn.execute(text(
                "UPDATE publications SET subject = category WHERE (subject IS NULL OR subject = '') AND category IS NOT NULL"
            ))

            if dialect in ("postgresql", "postgres"):
                print("Dropping legacy column `category` (Postgres dialect detected)...")
                conn.execute(text("ALTER TABLE publications DROP COLUMN IF EXISTS category"))
            else:
                print("Non-Postgres dialect detected — skipping DROP COLUMN. See migrations/*.sqlite.sql for guidance.")

            print("Migration step completed successfully.")
        except SQLAlchemyError as exc:
            print("Migration failed:", exc)
            raise


if __name__ == '__main__':
    main()
