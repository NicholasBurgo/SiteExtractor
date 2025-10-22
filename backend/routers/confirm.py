"""
Confirmation API router.
Provides endpoints for Prime, Content, and Seed operations.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from storage.confirmation import ConfirmationStore
from storage.seed import SeedBuilder

router = APIRouter()


@router.get("/{run_id}/prime")
async def get_prime_data(run_id: str):
    """
    Get prime data (nav, footer, pages index) for confirmation.
    Returns: { nav, footer, pages: [{titleGuess,path,url,status}] }
    """
    try:
        store = ConfirmationStore(run_id)
        
        # Get site data
        site_data = store.get_site_data()
        
        # Get pages index
        pages_index = store.get_pages_index()
        
        return {
            "baseUrl": site_data.get("baseUrl", ""),
            "nav": site_data.get("nav", []),
            "footer": site_data.get("footer", {"columns": [], "socials": [], "contact": {}}),
            "pages": pages_index
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting prime data: {str(e)}")


@router.get("/{run_id}/content")
async def get_page_content(run_id: str, page_path: str = Query(..., description="Page path to get content for")):
    """
    Get structured content for a specific page.
    Returns the single page JSON (media/files/words/links).
    """
    try:
        store = ConfirmationStore(run_id)
        
        # Find page by path
        pages_index = store.get_pages_index()
        page = next((p for p in pages_index if p.get("path") == page_path), None)
        
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page_id = page.get("pageId")
        content = store.get_page_content(page_id)
        
        if not content:
            raise HTTPException(status_code=404, detail="Page content not found")
        
        return content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting page content: {str(e)}")


@router.patch("/{run_id}/prime/nav")
async def update_navigation(run_id: str, nav: List[Dict[str, Any]]):
    """
    Update navigation data.
    Input: edited nav (labels/urls/order); persist to site.json
    """
    try:
        store = ConfirmationStore(run_id)
        store.update_navigation(nav)
        return {"message": "Navigation updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating navigation: {str(e)}")


@router.patch("/{run_id}/prime/footer")
async def update_footer(run_id: str, footer: Dict[str, Any]):
    """
    Update footer data.
    Input: edited footer; persist to site.json
    """
    try:
        store = ConfirmationStore(run_id)
        store.update_footer(footer)
        return {"message": "Footer updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating footer: {str(e)}")


@router.patch("/{run_id}/content")
async def update_page_content(run_id: str, page_path: str = Query(..., description="Page path to update"), 
                             content: Dict[str, Any] = None):
    """
    Update page content.
    Allow edits to title, description, media[].alt, remove/add links, etc.
    """
    try:
        store = ConfirmationStore(run_id)
        
        # Find page by path
        pages_index = store.get_pages_index()
        page = next((p for p in pages_index if p.get("path") == page_path), None)
        
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page_id = page.get("pageId")
        
        # Update page content
        store.update_page_content(page_id, content)
        
        return {"message": "Page content updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating page content: {str(e)}")


@router.post("/{run_id}/seed")
async def generate_seed(run_id: str):
    """
    Generate seed.json using edited site.json + selected/cleaned page files.
    Returns the path to the generated seed.json file.
    """
    try:
        seed_builder = SeedBuilder(run_id)
        seed_path = seed_builder.build_seed()
        
        return {
            "message": "Seed generated successfully",
            "seedPath": seed_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating seed: {str(e)}")
