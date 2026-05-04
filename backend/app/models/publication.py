from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
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
    CUOC_THI = "cuoc-thi"
    TAI_LIEU = "tai-lieu"
    VINH_DANH = "vinh-danh"

class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    # Merged field: `subject` is the canonical DB column. `category` kept as a legacy alias.
    subject = Column(String(50), nullable=False, default=Category.VAN.value)
    content_type = Column(String(50), nullable=False, default=ContentType.AN_PHAM.value)
    featured_year = Column(String(20), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    image_url = Column(String(500), nullable=True)
    layout_metadata = Column(JSON, nullable=True)
    @property
    def category(self):
        """Legacy compatibility: return `subject` value for older clients."""
        return self.subject

    @category.setter
    def category(self, value):
        """Assigning legacy `category` sets canonical `subject`."""
        self.subject = value
    comments_enabled = Column(Boolean, nullable=False, default=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=False)
    # Recurrence: store an RRULE string when event is recurring (RFC5545)
    rrule = Column(String(500), nullable=True)
    # Timezone name (e.g. 'Asia/Ho_Chi_Minh') — store per-event timezone
    timezone = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default="upcoming")
    linked_post_id = Column(Integer, ForeignKey("publications.id"), nullable=True)
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
    layout_metadata = Column(JSON, nullable=True)
    read_time_minutes = Column(Integer, nullable=False, default=5)
    is_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventAttachment(Base):
    __tablename__ = "event_attachments"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SocialScale(Base):
    __tablename__ = "social_scale"

    id = Column(Integer, primary_key=True, index=True)
    hero_title = Column(String(255), nullable=False, default="Quy mô & phát triển")
    hero_subtitle = Column(Text, nullable=True)
    vision = Column(Text, nullable=True)
    subjects_overview = Column(String(500), nullable=True)
    staff_count = Column(Integer, nullable=False, default=20)
    student_count = Column(Integer, nullable=False, default=5000)
    projects_count = Column(Integer, nullable=False, default=100)
    awards_count = Column(Integer, nullable=False, default=25)
    roadmap = Column(Text, nullable=True)
    # Hero sentence specifically for the team page (ĐỘI NGŨ)
    staff_hero = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    expertise = Column(String(255), nullable=True)
    # Optional tier/level for staff (e.g. management, senior, instructor, assistant)
    tier = Column(String(50), nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def tier_label(self):
        """Human-readable Vietnamese label for the stored `tier` value."""
        if not self.tier:
            return None
        mapping = {
            'management': 'Tổ trưởng',
            'senior': 'Trưởng bộ môn',
            'instructor': 'Giảng viên',
            'assistant': 'Trợ giảng',
        }
        return mapping.get(self.tier, self.tier)

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    student_name = Column(String(255))
    student_email = Column(String(255))
    status = Column(String(50), default="pending") # pending, approved, rejected
    votes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SubmissionVote(Base):
    __tablename__ = "submission_votes"
    __table_args__ = (
        UniqueConstraint("submission_id", "user_id", name="uq_submission_vote_submission_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    publication_id = Column(Integer, ForeignKey("publications.id"), nullable=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True, index=True)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True, index=True)
    is_visible = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StaffReaction(Base):
    __tablename__ = "staff_reactions"
    __table_args__ = (
        UniqueConstraint("staff_id", "user_id", name="uq_staff_reaction_staff_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reaction_type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CommentMention(Base):
    __tablename__ = "comment_mentions"
    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_comment_mention_comment_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
