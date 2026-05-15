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
    tags: Optional[List[str]] = None
    layout_metadata: Optional[Dict[str, Any]] = None
    short_description: Optional[str] = None

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
    view_count: int = 0
    favorites_count: int = 0
    votes_count: int = 0


# --- Draft Schemas (partial updates allowed) ---
class PublicationDraft(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    content_type: Optional[str] = None
    featured_year: Optional[str] = None
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    layout_metadata: Optional[Dict[str, Any]] = None
    is_published: Optional[bool] = None



# --- Submission Schemas ---
class SubmissionBase(BaseModel):
    title: str
    content: Optional[str] = None
    submission_type: Optional[str] = "text"
    attachment_url: Optional[str] = None
    image_url: Optional[str] = None
    external_url: Optional[str] = None
    caption: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    rejection_reason: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    contest_id: Optional[int] = None

class SubmissionOut(SubmissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contest_id: Optional[int] = None
    status: str
    votes: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class SubmissionStatusUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]
    rejection_reason: Optional[str] = None

class SubmissionBulkStatusUpdate(BaseModel):
    ids: List[int]
    status: Literal["pending", "approved", "rejected"]

class SubmissionBulkDelete(BaseModel):
    ids: List[int]


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


class JudgeAssignmentCreate(BaseModel):
    user_id: int


class JudgeAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contest_id: int
    user_id: int
    assigned_at: datetime
    judge_name: Optional[str] = None
    judge_email: Optional[str] = None


class JudgeScoreSubmit(BaseModel):
    scores: List[Dict[str, Any]]
    comment: Optional[str] = None


class JudgeScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    judge_id: int
    criterion_index: int
    score: int
    comment: Optional[str] = None
    judge_name: Optional[str] = None
    created_at: datetime


class ContestResultOut(BaseModel):
    submission_id: int
    title: str
    student_name: Optional[str] = None
    votes: int = 0
    total_score: float = 0.0
    judge_count: int = 0
    rank: int
    prizes: Optional[List[Dict[str, Any]]] = None


class PublicationCommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None
    recaptcha_token: Optional[str] = None


class PublicationCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    publication_id: int
    parent_id: Optional[int] = None
    user_id: Optional[int] = None
    created_at: datetime
    author_name: Optional[str] = None
    author_image_url: Optional[str] = None
    like_count: int = 0
    dislike_count: int = 0
    user_reaction: Optional[str] = None
    mentions: Optional[List[int]] = None


class CommentReactionIn(BaseModel):
    reaction_type: str


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


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    rrule: Optional[str] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None
    linked_post_id: Optional[int] = None
    is_active: Optional[bool] = None


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
    staff_hero: Optional[str] = None
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


# --- Contest Schemas ---
class ContestBase(BaseModel):
    title: str
    slug: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    subject: Optional[str] = None
    contest_type: Optional[str] = "custom"
    custom_type_name: Optional[str] = None
    status: Optional[str] = "draft"
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    voting_method: Optional[str] = "public-vote"
    max_submissions_per_user: Optional[int] = 1
    allowed_submission_types: Optional[List[str]] = ["text", "file", "image"]
    allow_file_upload: Optional[bool] = True
    allowed_file_types: Optional[str] = None
    max_file_size_mb: Optional[int] = 15
    allow_image_upload: Optional[bool] = True
    max_image_size_mb: Optional[int] = 10
    allow_url_submission: Optional[bool] = True
    require_approval: Optional[bool] = True
    show_author: Optional[bool] = True
    show_vote_count: Optional[bool] = True
    show_comments: Optional[bool] = True
    min_title_length: Optional[int] = 6
    max_title_length: Optional[int] = 200
    min_content_length: Optional[int] = 0
    max_content_length: Optional[int] = 60000
    custom_fields: Optional[Dict[str, Any]] = None
    judging_criteria: Optional[List[Dict[str, Any]]] = None
    prizes: Optional[List[Dict[str, Any]]] = None
    contact_info: Optional[str] = None
    is_featured: Optional[bool] = False
    display_order: Optional[int] = 0
    tags: Optional[List[str]] = None


class ContestCreate(ContestBase):
    pass


class ContestUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    subject: Optional[str] = None
    contest_type: Optional[str] = None
    custom_type_name: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    voting_method: Optional[str] = None
    max_submissions_per_user: Optional[int] = None
    allow_file_upload: Optional[bool] = None
    allowed_file_types: Optional[str] = None
    max_file_size_mb: Optional[int] = None
    require_approval: Optional[bool] = None
    show_author: Optional[bool] = None
    show_vote_count: Optional[bool] = None
    show_comments: Optional[bool] = None
    min_title_length: Optional[int] = None
    max_title_length: Optional[int] = None
    min_content_length: Optional[int] = None
    max_content_length: Optional[int] = None
    custom_fields: Optional[Dict[str, Any]] = None
    judging_criteria: Optional[List[Dict[str, Any]]] = None
    prizes: Optional[List[Dict[str, Any]]] = None
    contact_info: Optional[str] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None
    tags: Optional[List[str]] = None


class ContestOut(ContestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_count: int = 0
    view_count: int = 0
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    type_label: Optional[str] = None
    status_label: Optional[str] = None
    is_accepting_submissions: Optional[bool] = None


class ContestListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    description: Optional[str] = None
    subject: str
    contest_type: str
    custom_type_name: Optional[str] = None
    status: str
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    voting_method: str
    submission_count: int = 0
    view_count: int = 0
    is_featured: bool = False
    display_order: int = 0
    created_at: datetime
    type_label: Optional[str] = None
    status_label: Optional[str] = None
    is_accepting_submissions: Optional[bool] = None


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
    image_srcset: Optional[str] = None
    image_sizes: Optional[str] = None
    image_optimized_url: Optional[str] = None

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
    token: str = ""  # Legacy field, ignored


class PushSubscriptionIn(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class PushTokenOut(BaseModel):
    message: str
    tokens: int = 0


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


# --- Admin Comment Schemas ---
class AdminCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    user_id: Optional[int] = None
    author_name: Optional[str] = None
    author_email: Optional[str] = None
    publication_id: Optional[int] = None
    publication_title: Optional[str] = None
    submission_id: Optional[int] = None
    submission_title: Optional[str] = None
    parent_id: Optional[int] = None
    is_visible: bool = True
    created_at: datetime


# --- Public Profile Schema ---
class PublicProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserOut
    submissions: List[SubmissionOut]
