from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.routers import runs, pages, review, confirm

app = FastAPI(
    title="Site Generator API",
    description=(
        "Full-stack Site Generator with extraction, aggregation, and confirmation workflow. "
        "Crawl websites, extract business information, and provide a review interface "
        "for confirming data before packaging/seeding."
    ),
    version="2.0.0",
    contact={"name": "Site Generator Team", "email": "contact@example.com"},
    license_info={"name": "MIT"},
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])
app.include_router(review.router, prefix="/api/review", tags=["review"])
app.include_router(confirm.router, prefix="/api/confirm", tags=["confirm"])

@app.get("/health", tags=["meta"])
async def health():
    return {"ok": True}