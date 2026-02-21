from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.routers import runs, pages, review, confirm
from backend.routers import export as export_router

app = FastAPI(
    title="Site Extractor API",
    description=(
        "Crawl websites, extract content, normalize data, run audits, "
        "and export structured bundles. No site generation — extraction only."
    ),
    version="1.0.0",
    contact={"name": "Site Extractor Team", "email": settings.CONTACT_EMAIL},
    license_info={"name": "MIT"},
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])
app.include_router(review.router, prefix="/api/review", tags=["review"])
app.include_router(confirm.router, prefix="/api/confirm", tags=["confirm"])
app.include_router(export_router.router, prefix="/api/runs", tags=["export"])


@app.get("/health", tags=["meta"])
async def health():
    return {"ok": True}
