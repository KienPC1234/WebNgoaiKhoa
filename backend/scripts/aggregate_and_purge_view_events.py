#!/usr/bin/env python3
"""Aggregate publication view events into `publications.view_count` and purge old events.

Usage:
  python3 aggregate_and_purge_view_events.py --retention-days 90

This script is safe to run periodically (cron/systemd timer).
"""
import os
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def load_env(path: Path):
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip("'\""))


def main(retention_days: int = 90):
    # load backend/.env if present
    repo_root = Path(__file__).resolve().parent.parent
    load_env(repo_root / '.env')
    load_env(repo_root / 'backend' / '.env')

    db_url = os.getenv('DATABASE_URL') or os.getenv('SQLALCHEMY_DATABASE_URL')
    if not db_url:
        print('DATABASE_URL not configured')
        return 2

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)

    cutoff = datetime.utcnow() - timedelta(days=retention_days)
    cutoff_str = cutoff.strftime('%Y-%m-%d %H:%M:%S')

    with engine.begin() as conn:
        print('Aggregating view events per publication...')
        rows = conn.execute(text('SELECT publication_id, COUNT(*) as cnt FROM publication_view_events GROUP BY publication_id')).fetchall()
        for r in rows:
            pub_id = int(r[0])
            cnt = int(r[1])
            print(f' - setting publication {pub_id} view_count = {cnt}')
            conn.execute(text('UPDATE publications SET view_count = :cnt WHERE id = :id'), {'cnt': cnt, 'id': pub_id})

        print(f'Purging view events older than {retention_days} days ({cutoff_str})...')
        deleted = conn.execute(text('DELETE FROM publication_view_events WHERE created_at < :cutoff'), {'cutoff': cutoff_str}).rowcount
        print(f'Purged {deleted} view event rows')

    print('Done')
    return 0


if __name__ == '__main__':
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument('--retention-days', type=int, default=int(os.getenv('ENGAGEMENT_RETENTION_DAYS', '90')))
    args = p.parse_args()
    raise SystemExit(main(args.retention_days))
