Image Compressor (tool-specific)
--------------------------------

This folder contains a standalone image compressor utility that is intended to be run in its own virtual environment so it does not contaminate the project's main environment.

Setup (recommended):

```bash
python3 -m venv .venv-tools
source .venv-tools/bin/activate
pip install -r requirements-tools.txt
```

Usage:

```bash
.venv-tools/bin/python compress_images.py --target-dir backend/uploads/images --max-size 10485760 --backup-dir backend/uploads/image_backups_$(date +%Y%m%d_%H%M%S) --verbose
```

Notes:
- The production backend uses the Conda environment `webngoaikhoa_fpt_env` (see README_AGENTS.md). Installing `Pillow` into that conda environment is optional — the server-side upload now performs compression if `Pillow` is available in the runtime environment.
