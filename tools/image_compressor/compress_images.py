#!/usr/bin/env python3
import argparse
import os
import shutil
import time
from io import BytesIO
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True


def human(n):
    for unit in ['B','KB','MB','GB']:
        if n < 1024.0:
            return f"{n:.1f}{unit}"
        n /= 1024.0
    return f"{n:.1f}TB"


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def backup_file(path, src_root, backup_root):
    rel = os.path.relpath(path, src_root)
    dest = os.path.join(backup_root, rel)
    ensure_dir(os.path.dirname(dest))
    shutil.copy2(path, dest)


def try_save(img, fmt, save_kwargs):
    buf = BytesIO()
    img.save(buf, fmt, **save_kwargs)
    return buf.getvalue()


def compress_jpeg(path, max_size):
    orig_size = os.path.getsize(path)
    with Image.open(path) as im:
        rgb = im.convert('RGB')
        widths = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
        qualities = [90,85,80,75,70,65,60,55,50,45,40,35,30]
        for scale in widths:
            if scale == 1.0:
                candidate = rgb
            else:
                w = max(1, int(rgb.width * scale))
                h = max(1, int(rgb.height * scale))
                candidate = rgb.resize((w, h), Image.LANCZOS)
            for q in qualities:
                data = try_save(candidate, 'JPEG', {'quality': q, 'optimize': True, 'progressive': True})
                if len(data) <= max_size or len(data) < orig_size:
                    return data
    return None


def compress_png(path, max_size):
    orig_size = os.path.getsize(path)
    with Image.open(path) as im:
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == 'P' and 'transparency' in im.info)
        widths = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
        palettes = [256,128,64,32,16,8]
        for scale in widths:
            if scale == 1.0:
                candidate = im
            else:
                w = max(1, int(im.width * scale))
                h = max(1, int(im.height * scale))
                candidate = im.resize((w, h), Image.LANCZOS)
            for colors in palettes:
                if has_alpha:
                    converted = candidate.convert('RGBA')
                    quant = converted.quantize(colors=colors, method=Image.MEDIANCUT)
                    data = try_save(quant, 'PNG', {'optimize': True})
                else:
                    converted = candidate.convert('RGB')
                    quant = converted.quantize(colors=colors, method=Image.MEDIANCUT)
                    data = try_save(quant, 'PNG', {'optimize': True})
                if len(data) <= max_size or len(data) < orig_size:
                    return data
    return None


def process_file(path, src_root, backup_root, max_size, dry_run=False, verbose=False):
    ext = os.path.splitext(path)[1].lower().lstrip('.')
    orig_size = os.path.getsize(path)
    if verbose:
        print('Processing', path, human(orig_size))
    if orig_size == 0:
        return (False, 0, 'empty')
    if ext in ('jpg', 'jpeg'):
        data = compress_jpeg(path, max_size)
    elif ext == 'png':
        data = compress_png(path, max_size)
    elif ext in ('webp',):
        with Image.open(path) as im:
            rgb = im.convert('RGB')
            data = try_save(rgb, 'WEBP', {'quality': 85, 'method': 6})
            if len(data) >= orig_size and orig_size <= max_size:
                data = None
    else:
        return (False, 0, 'unsupported')
    if data is None:
        return (False, 0, 'no_benefit')
    new_size = len(data)
    if orig_size <= max_size and new_size >= orig_size:
        return (False, 0, 'no_benefit')
    if orig_size > max_size and new_size > max_size:
        return (False, 0, 'no_benefit')
    if dry_run:
        return (True, orig_size - new_size, 'dry-run')
    backup_file(path, src_root, backup_root)
    tmp = path + '.tmp_compress'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)
    saved = orig_size - new_size
    return (True, saved, 'replaced')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--target-dir', default='backend/uploads/images')
    p.add_argument('--max-size', type=int, default=10 * 1024 * 1024)
    p.add_argument('--backup-dir')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--verbose', action='store_true')
    args = p.parse_args()
    src = args.target_dir
    if not os.path.isdir(src):
        print('Target directory not found:', src)
        return
    stamp = time.strftime('%Y%m%d_%H%M%S')
    backup_root = args.backup_dir or f"{src}_backups_{stamp}"
    ensure_dir(backup_root)
    total_saved = 0
    processed = 0
    skipped = 0
    for root, _, files in os.walk(src):
        if os.path.commonpath([os.path.abspath(root), os.path.abspath(backup_root)]) == os.path.abspath(backup_root):
            continue
        for fn in files:
            path = os.path.join(root, fn)
            try:
                ok, saved, reason = process_file(path, src, backup_root, args.max_size, args.dry_run, args.verbose)
            except Exception as e:
                if args.verbose:
                    print('Error processing', path, str(e))
                ok, saved, reason = False, 0, 'error'
            if ok:
                processed += 1
                total_saved += saved
                if args.verbose:
                    print('Compressed:', path, 'saved', human(saved))
            else:
                skipped += 1
                if args.verbose:
                    print('Skipped:', path, 'reason', reason)
    print('Done. Processed:', processed, 'Skipped:', skipped, 'Total saved:', human(total_saved))


if __name__ == '__main__':
    main()
