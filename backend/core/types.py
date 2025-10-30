from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict, Tuple, Union

class StartRunRequest(BaseModel):
    url: str
    maxPages: Optional[int] = None
    maxDepth: int = 5
    concurrency: Optional[int] = None
    renderBudget: Optional[float] = None

class RunProgress(BaseModel):
    runId: str
    queued: int
    visited: int
    errors: int
    etaSeconds: Optional[int]
    hosts: Dict[str, int]

class PageSummary(BaseModel):
    pageId: str
    url: str
    contentType: str
    title: Optional[str] = None
    words: int = 0
    images: int = 0
    links: int = 0
    status: Optional[int] = None
    path: Optional[str] = None
    type: Optional[str] = None  # HTML/PDF/DOCX/JSON/CSV/IMG

class PageDetail(BaseModel):
    summary: PageSummary
    meta: dict
    text: Optional[str] = None
    htmlExcerpt: Optional[str] = None
    headings: List[str] = []
    images: List[str] = []
    links: List[str] = []
    tables: List[Dict] = []
    structuredData: List[Dict] = []
    stats: Dict = {}

# Review and Confirmation Models
class BusinessProfile(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    phones: List[str] = []
    emails: List[str] = []
    socials: Dict[str, str] = {}  # {"facebook": "...", "instagram": "..."}
    logo: Optional[str] = None
    brand_colors: List[str] = []  # hex list
    sources: List[str] = []       # pageIds

class ItemBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    image: Optional[str] = None
    price: Optional[str] = None
    cta: Optional[Dict[str, str]] = None
    confidence: float = 0.0
    sources: List[str] = []

class Location(BaseModel):
    id: str
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    hours: Optional[Dict[str, str]] = None
    latlng: Optional[Tuple[float, float]] = None
    confidence: float = 0.0
    sources: List[str] = []

class NavItem(BaseModel):
    label: str
    href: Optional[str] = None
    children: List["NavItem"] = []

class DraftModel(BaseModel):
    runId: str
    business: BusinessProfile
    services: List[ItemBase] = []
    products: List[ItemBase] = []
    menu: List[ItemBase] = []
    locations: List[Location] = []
    team: List[ItemBase] = []          # use title as name, description as role
    faqs: List[Dict] = []              # {q,a,confidence,sources}
    testimonials: List[Dict] = []      # {author,text,confidence,sources}
    policies: List[Dict] = []          # privacy/terms
    media: List[Dict] = []             # {src,alt,role}
    sitemap: Dict = Field(default_factory=lambda: {  # proposed navs
        "primary": [],
        "secondary": [],
        "footer": [],
    })

class ConfirmRequest(BaseModel):
    draft: DraftModel