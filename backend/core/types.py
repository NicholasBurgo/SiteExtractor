from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict, Tuple

class StartRunRequest(BaseModel):
    url: str
    maxPages: int | None = None
    maxDepth: int = 5
    concurrency: int | None = None
    renderBudget: float | None = None

class RunProgress(BaseModel):
    runId: str
    queued: int
    visited: int
    errors: int
    etaSeconds: int | None
    hosts: dict[str, int]

class PageSummary(BaseModel):
    pageId: str
    url: str
    contentType: str
    title: str | None = None
    words: int = 0
    images: int = 0
    links: int = 0
    status: int | None = None
    path: str | None = None
    type: str | None = None  # HTML/PDF/DOCX/JSON/CSV/IMG

class PageDetail(BaseModel):
    summary: PageSummary
    meta: dict
    text: str | None = None
    htmlExcerpt: str | None = None
    headings: list[str] = []
    images: list[str] = []
    links: list[str] = []
    tables: list[dict] = []
    structuredData: list[dict] = []
    stats: dict = {}

# Review and Confirmation Models
class BusinessProfile(BaseModel):
    name: str | None = None
    tagline: str | None = None
    phones: list[str] = []
    emails: list[str] = []
    socials: dict[str, str] = {}  # {"facebook": "...", "instagram": "..."}
    logo: str | None = None
    brand_colors: list[str] = []  # hex list
    sources: list[str] = []       # pageIds

class ItemBase(BaseModel):
    id: str
    title: str
    description: str | None = None
    image: str | None = None
    price: str | None = None
    cta: dict[str, str] | None = None
    confidence: float = 0.0
    sources: list[str] = []

class Location(BaseModel):
    id: str
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    hours: dict[str, str] | None = None
    latlng: tuple[float, float] | None = None
    confidence: float = 0.0
    sources: list[str] = []

class NavItem(BaseModel):
    label: str
    href: str | None = None
    children: list["NavItem"] = []

class DraftModel(BaseModel):
    runId: str
    business: BusinessProfile
    services: list[ItemBase] = []
    products: list[ItemBase] = []
    menu: list[ItemBase] = []
    locations: list[Location] = []
    team: list[ItemBase] = []          # use title as name, description as role
    faqs: list[dict] = []              # {q,a,confidence,sources}
    testimonials: list[dict] = []      # {author,text,confidence,sources}
    policies: list[dict] = []          # privacy/terms
    media: list[dict] = []             # {src,alt,role}
    sitemap: dict = Field(default_factory=lambda: {  # proposed navs
        "primary": [],
        "secondary": [],
        "footer": [],
    })

class ConfirmRequest(BaseModel):
    draft: DraftModel