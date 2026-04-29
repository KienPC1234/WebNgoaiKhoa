import json
import os
from pathlib import Path
from sqlalchemy.orm import sessionmaker
from app.db.session import engine
from app.models.notification import PushSubscription
from app.models.user import User


# Simple .env loader (avoid external dependency)
def _load_dotenv_file(path: Path):
    if not path.exists():
        return
    try:
        for raw in path.read_text(encoding='utf-8').splitlines():
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            idx = line.find('=')
            key = line[:idx].strip()
            val = line[idx+1:].strip()
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            if val.startswith("'") and val.endswith("'"):
                val = val[1:-1]
            if key not in os.environ:
                os.environ[key] = val
    except Exception:
        pass


# Load backend/.env if present
_load_dotenv_file(Path(__file__).resolve().parents[2] / '.env')

PUSH_REGISTRY_FILE = Path(os.getenv("PUSH_REGISTRY_FILE", "backend/app/db/push_registry.json"))


def migrate():
    if not PUSH_REGISTRY_FILE.exists():
        print(f"Push registry file not found: {PUSH_REGISTRY_FILE}")
        return

    try:
        data = json.loads(PUSH_REGISTRY_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Failed to read registry: {e}")
        return

    if not isinstance(data, dict):
        print("Registry format unexpected; expected a dict of email -> [tokens]")
        return

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    added = 0
    try:
        for email, tokens in data.items():
            if not isinstance(tokens, list):
                continue
            user = db.query(User).filter(User.email == email).first()
            user_id = user.id if user else None
            for token in tokens:
                if not token or not isinstance(token, str):
                    continue
                exists = db.query(PushSubscription).filter(PushSubscription.token == token).first()
                if exists:
                    continue
                sub = PushSubscription(user_id=user_id, token=token)
                db.add(sub)
                added += 1
        db.commit()
        print(f"Migration complete: {added} subscriptions added.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()


if __name__ == '__main__':
    migrate()
