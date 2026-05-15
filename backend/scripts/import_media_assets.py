#!/usr/bin/env python3
"""
Import existing files from uploads directories into the media_assets table.
Run from project root: `python backend/scripts/import_media_assets.py`
"""
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.models.media import MediaAsset

IMAGE_DIR = Path(os.getenv('IMAGE_UPLOAD_DIR', '/data/WebNgoaiKhoa/backend/uploads/images'))
PUBLICATION_DIR = Path(os.getenv('PUBLICATION_UPLOAD_DIR', '/data/WebNgoaiKhoa/backend/uploads/publications'))


def main():
    db = SessionLocal()
    created = 0
    try:
        for directory, default_type in ((IMAGE_DIR, 'image'), (PUBLICATION_DIR, 'pdf')):
            if not directory.exists():
                print(f"Skipping missing directory: {directory}")
                continue
            for p in directory.iterdir():
                if not p.is_file():
                    continue
                stored_name = p.name
                existing = db.query(MediaAsset).filter(MediaAsset.stored_name == stored_name).first()
                if existing:
                    continue
                try:
                    asset = MediaAsset(
                        id=uuid.uuid4().hex,
                        stored_name=stored_name,
                        original_name=stored_name,
                        file_type=(p.suffix.lstrip('.') if default_type != 'pdf' else 'pdf'),
                        size_bytes=p.stat().st_size,
                        uploaded_by=None,
                        uploaded_at=datetime.fromtimestamp(p.stat().st_mtime, timezone.utc),
                    )
                    db.add(asset)
                    db.commit()
                    created += 1
                    print(f"Imported: {stored_name}")
                except Exception as exc:
                    db.rollback()
                    print(f"Failed to import {stored_name}: {exc}")

        print(f"Done. Imported {created} assets.")
    finally:
        db.close()


if __name__ == '__main__':
    main()
