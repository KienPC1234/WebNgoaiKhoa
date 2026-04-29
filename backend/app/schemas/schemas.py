from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Literal, Optional, List
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    image_url: Optional[str] = None
    role: str
    is_active: bool

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

# --- Publication Schemas ---
class PublicationBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    subject: Optional[str] = None
    content_type: Optional[str] = None
    featured_year: Optional[str] = None
    image_url: Optional[str] = None
    layout_metadata: Optional[Dict[str, Any]] = None

class PublicationCreate(PublicationBase):
    pass

class PublicationOut(PublicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    subject: str
    content_type: str
    created_at: datetime
    comments_enabled: Optional[bool] = True


# --- Draft Schemas (partial updates allowed) ---
class PublicationDraft(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    content_type: Optional[str] = None
    featured_year: Optional[str] = None
    image_url: Optional[str] = None
    layout_metadata: Optional[Dict[str, Any]] = None
    is_published: Optional[bool] = None



# --- Submission Schemas ---
class SubmissionBase(BaseModel):
    title: str
    content: str
    attachment_url: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionOut(SubmissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    votes: int
    created_at: datetime


class SubmissionStatusUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class SubmissionCommentCreate(BaseModel):
    content: str
    recaptcha_token: Optional[str] = None


class SubmissionCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    submission_id: int
    user_id: Optional[int] = None
    created_at: datetime
    author_name: Optional[str] = None


class PublicationCommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None
    recaptcha_token: Optional[str] = None


class PublicationCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    publication_id: int
    user_id: Optional[int] = None
    created_at: datetime
    author_name: Optional[str] = None
    mentions: Optional[List[int]] = None


# --- Event Schemas ---
class EventBase(BaseModel):
    title: str
    description: str
    event_date: datetime
    # Optional recurrence rule (RFC5545 RRULE string) for recurring events
    rrule: Optional[str] = None
    # Per-event timezone name (e.g. 'Asia/Ho_Chi_Minh')
    timezone: Optional[str] = None
    location: str
    image_url: Optional[str] = None
    status: Optional[str] = "upcoming"
    linked_post_id: Optional[int] = None
    is_active: Optional[bool] = True


class EventCreate(EventBase):
    pass


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Event Attachment Schemas ---
class EventAttachmentBase(BaseModel):
    file_url: str
    file_name: Optional[str] = None
    file_type: Optional[str] = None


class EventAttachmentCreate(EventAttachmentBase):
    pass


class EventAttachmentOut(EventAttachmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    created_at: datetime


# --- Event Occurrence Schema ---
class EventOccurrenceOut(BaseModel):
    id: str
    event_id: int
    title: str
    description: str
    event_date: datetime
    timezone: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = "upcoming"
    linked_post_id: Optional[int] = None
    is_active: Optional[bool] = True


# --- Story Schemas ---
class StoryBase(BaseModel):
    title: str
    content: str
    snippet: Optional[str] = None
    author: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    layout_metadata: Optional[Dict[str, Any]] = None
    read_time_minutes: Optional[int] = 5
    is_published: Optional[bool] = True


class StoryCreate(StoryBase):
    pass


class StoryOut(StoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Draft Schemas (story/event) ---
class StoryDraft(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    layout_metadata: Optional[Dict[str, Any]] = None
    snippet: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    read_time_minutes: Optional[int] = None
    is_published: Optional[bool] = None


# --- Social Scale Schemas ---
class SocialScaleBase(BaseModel):
    hero_title: str
    hero_subtitle: Optional[str] = None
    vision: Optional[str] = None
    subjects_overview: Optional[str] = None
    staff_count: int = 20
    student_count: int = 5000
    projects_count: int = 100
    awards_count: int = 25
    roadmap: Optional[str] = None
    is_active: Optional[bool] = True


class SocialScaleCreate(SocialScaleBase):
    pass


class SocialScaleOut(SocialScaleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class EventDraft(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    layout_metadata: Optional[Dict[str, Any]] = None
    event_date: Optional[datetime] = None
    rrule: Optional[str] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None
    linked_post_id: Optional[int] = None


# --- Staff Profile Schemas ---
class StaffProfileBase(BaseModel):
    full_name: str
    title: str
    bio: Optional[str] = None
    email: Optional[str] = None
    image_url: Optional[str] = None
    expertise: Optional[str] = None
    tier: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True


class StaffProfileCreate(StaffProfileBase):
    pass


class StaffProfileOut(StaffProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    # Optional metadata populated from MediaAsset when available
    image_asset_id: Optional[str] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    image_blur_placeholder: Optional[str] = None

# --- Stats Schemas ---
class DashboardStats(BaseModel):
    users: int
    publications: int
    submissions: int
    pending_submissions: int
    events: int
    stories: int


class AdminActivityItem(BaseModel):
    type: str
    title: str
    status: Optional[str] = None
    created_at: datetime


class AdminOverview(BaseModel):
    stats: DashboardStats
    ai_status: str
    ai_documents: int
    knowledge_assets: int
    recent_activity: List[AdminActivityItem]
    weekly_metrics: Optional[List[Dict[str, Any]]] = None


class AIKnowledgeAssetOut(BaseModel):
    id: str
    file_name: str
    file_type: str
    size_bytes: int
    chunks: int
    uploaded_by: Optional[str] = None
    uploaded_at: str


class AIKnowledgeUploadOut(BaseModel):
    uploaded: List[AIKnowledgeAssetOut]
    failed: List[Dict[str, str]]


class NewsletterDispatchIn(BaseModel):
    title: str
    body: str
    action_url: Optional[str] = None
    send_email: bool = True
    send_webpush: bool = True


class NewsletterDispatchOut(BaseModel):
    queued: bool
    recipients: int
    send_email: bool
    send_webpush: bool
    newsletter_enabled: bool
    webpush_configured: bool


class PushTokenIn(BaseModel):
    token: str


class PushTokenOut(BaseModel):
    message: str
    tokens: int


class PushConfigOut(BaseModel):
    newsletter_enabled: bool
    webpush_enabled: bool


# --- Role Schemas ---
class RoleCreate(BaseModel):
    slug: str
    name: str
    permissions: Optional[List[str]] = None
    built_in: Optional[bool] = False


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    permissions: Optional[List[str]] = None
    built_in: bool
    created_at: datetime


# --- Public Profile Schema ---
class PublicProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserOut
    submissions: List[SubmissionOut]
