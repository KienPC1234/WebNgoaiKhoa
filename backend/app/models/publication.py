from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class Category(str, enum.Enum):
    VAN = "van"
    KTPL = "ktpl"
    LICH_SU = "lich-su"
    DIA_LI = "dia-li"
    VOVINAM = "vovinam"
    NGOAI_KHOA = "ngoaikhoa"


class ContentType(str, enum.Enum):
    AN_PHAM = "an-pham"
    TAI_LIEU = "tai-lieu"
    VINH_DANH = "vinh-danh"

class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # Legacy field, mirrors subject
    subject = Column(String(50), nullable=False, default=Category.VAN.value)
    content_type = Column(String(50), nullable=False, default=ContentType.AN_PHAM.value)
    featured_year = Column(String(20), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    image_url = Column(String(500), nullable=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=False)
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default="upcoming")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    snippet = Column(Text, nullable=True)
    author = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=True)
    read_time_minutes = Column(Integer, nullable=False, default=5)
    is_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    student_name = Column(String(255))
    student_email = Column(String(255))
    status = Column(String(50), default="pending") # pending, approved, rejected
    votes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    publication_id = Column(Integer, ForeignKey("publications.id"), nullable=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
