from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
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

class PublicationCreate(PublicationBase):
    pass

class PublicationOut(PublicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    subject: str
    content_type: str
    created_at: datetime

# --- Submission Schemas ---
class SubmissionBase(BaseModel):
    title: str
    content: str
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


# --- Event Schemas ---
class EventBase(BaseModel):
    title: str
    description: str
    event_date: datetime
    location: str
    image_url: Optional[str] = None
    status: Optional[str] = "upcoming"
    is_active: Optional[bool] = True


class EventCreate(EventBase):
    pass


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Story Schemas ---
class StoryBase(BaseModel):
    title: str
    content: str
    snippet: Optional[str] = None
    author: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    read_time_minutes: Optional[int] = 5
    is_published: Optional[bool] = True


class StoryCreate(StoryBase):
    pass


class StoryOut(StoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime

# --- Stats Schemas ---
class DashboardStats(BaseModel):
    users: int
    publications: int
    submissions: int
    pending_submissions: int
    events: int
    stories: int
