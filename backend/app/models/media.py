from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.sql import func
from app.db.session import Base


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, index=True)
    stored_name = Column(String(255), nullable=False, unique=True)
    original_name = Column(String(255), nullable=True)
    file_type = Column(String(128), nullable=True)
    size_bytes = Column(Integer, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    alt_text = Column(String(500), nullable=True)
    caption = Column(String(1000), nullable=True)
    # `metadata` is a reserved attribute name on Declarative Base; map to DB column 'metadata' but
    # use attribute name `metadata_json` to avoid conflicts with Base.metadata.
    metadata_json = Column('metadata', JSON, nullable=True)
    is_public = Column(Boolean, nullable=False, default=True)
