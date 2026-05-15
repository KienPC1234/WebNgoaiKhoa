#!/usr/bin/env python3
"""
CLI to prune unreferenced media assets older than a grace period.
Run: `python backend/scripts/prune_media_assets.py --grace-hours 24`
"""
import argparse

from app.db.session import SessionLocal
from app.api import admin as admin_module


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--grace-hours', type=int, default=24)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        summary = admin_module._prune_unreferenced_media(args.grace_hours, db)
        print(f"Prune complete: checked={summary.get('checked')}, deleted={summary.get('deleted')}")
    finally:
        db.close()


if __name__ == '__main__':
    main()
