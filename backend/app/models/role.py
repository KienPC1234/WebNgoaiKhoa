from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from app.db.session import Base
from datetime import datetime, timezone


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    # permissions stored as JSON array of strings (fall back to DB text if engine doesn't support JSON)
    permissions = Column(JSON, nullable=True)
    built_in = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:  # pragma: no cover - simple representation
        return f"<Role slug={self.slug} name={self.name} built_in={self.built_in}>"
