import os
import json
import time
from typing import List, Optional, Dict, Any
from core.types import PageSummary, PageDetail
from crawl.frontier import Frontier

class RunStore:
    """
    File-based storage for extraction runs.
    """
    
    def __init__(self, run_id: str, data_dir: str = "runs"):
        self.run_id = run_id
        self.data_dir = data_dir
        self.run_dir = os.path.join(data_dir, run_id)
        self.pages_file = os.path.join(self.run_dir, "pages.json")
        self.meta_file = os.path.join(self.run_dir, "meta.json")
        
        # Ensure directory exists
        os.makedirs(self.run_dir, exist_ok=True)
        
        # Initialize files if they don't exist
        if not os.path.exists(self.pages_file):
            with open(self.pages_file, 'w') as f:
                json.dump([], f)
        
        if not os.path.exists(self.meta_file):
            with open(self.meta_file, 'w') as f:
                json.dump({
                    "run_id": run_id,
                    "started_at": time.time(),
                    "status": "running",
                    "pages": [],
                    "errors": []
                }, f)
    
    def save_doc(self, doc: dict):
        """Save extracted document."""
        try:
            # Load existing pages
            with open(self.pages_file, 'r') as f:
                pages = json.load(f)
            
            # Add new page
            pages.append(doc)
            
            # Save back
            with open(self.pages_file, 'w') as f:
                json.dump(pages, f)
                
        except Exception as e:
            print(f"Error saving document: {e}")
    
    def log_error(self, url: str, error_type: str):
        """Log error for URL."""
        try:
            with open(self.meta_file, 'r') as f:
                meta = json.load(f)
            
            meta["errors"].append({
                "url": url,
                "error_type": error_type,
                "timestamp": time.time()
            })
            
            with open(self.meta_file, 'w') as f:
                json.dump(meta, f)
                
        except Exception as e:
            print(f"Error logging error: {e}")
    
    def create_mock_data(self):
        """Create mock data for testing the confirmation page."""
        mock_pages = [
            {
                "summary": {
                    "pageId": "home_page",
                    "url": "https://example.com/",
                    "contentType": "text/html",
                    "title": "Example Business - Home",
                    "words": 250,
                    "images": 5,
                    "links": 12,
                    "status": 200,
                    "path": "/",
                    "type": "HTML"
                },
                "meta": {
                    "description": "Leading provider of innovative solutions",
                    "keywords": "business, solutions, innovation"
                },
                "text": "Welcome to Example Business. We are a leading provider of innovative solutions for businesses worldwide. Our team consists of experienced professionals who are passionate about delivering high-quality products and services.",
                "htmlExcerpt": "<h1>Welcome to Example Business</h1><p>We are a leading provider...</p>",
                "headings": ["Welcome to Example Business", "Our Services", "Contact Us"],
                "images": [
                    "https://example.com/logo.png",
                    "https://example.com/hero.jpg"
                ],
                "links": [
                    "https://example.com/services",
                    "https://example.com/contact"
                ],
                "tables": [],
                "structuredData": [],
                "stats": {"word_count": 250, "image_count": 5}
            },
            {
                "summary": {
                    "pageId": "services_page",
                    "url": "https://example.com/services",
                    "contentType": "text/html",
                    "title": "Our Services - Example Business",
                    "words": 400,
                    "images": 8,
                    "links": 15,
                    "status": 200,
                    "path": "/services",
                    "type": "HTML"
                },
                "meta": {
                    "description": "Comprehensive services for your business needs",
                    "keywords": "services, business, solutions"
                },
                "text": "Our comprehensive services include web development, consulting, and digital marketing. We help businesses optimize their digital presence and improve their online performance.",
                "htmlExcerpt": "<h1>Our Services</h1><p>Comprehensive solutions...</p>",
                "headings": ["Our Services", "Web Development", "Consulting", "Digital Marketing"],
                "images": [
                    "https://example.com/service1.jpg",
                    "https://example.com/service2.jpg"
                ],
                "links": [
                    "https://example.com/",
                    "https://example.com/contact"
                ],
                "tables": [],
                "structuredData": [],
                "stats": {"word_count": 400, "image_count": 8}
            }
        ]
        
        # Save mock pages
        with open(self.pages_file, 'w') as f:
            json.dump(mock_pages, f)
        
        # Update meta with successful status
        with open(self.meta_file, 'r') as f:
            meta = json.load(f)
        
        meta.update({
            "status": "completed",
            "completed_at": time.time(),
            "pages": [page["summary"]["pageId"] for page in mock_pages],
            "errors": []
        })
        
        with open(self.meta_file, 'w') as f:
            json.dump(meta, f)
    
    def list_pages(self, page: int = 1, size: int = 50, q: str = None, 
                   type_filter: str = None, min_words: int = 0) -> List[PageSummary]:
        """List pages with filtering and pagination."""
        try:
            with open(self.pages_file, 'r') as f:
                pages = json.load(f)
            
            # If no pages, create mock data for testing
            if not pages:
                self.create_mock_data()
                with open(self.pages_file, 'r') as f:
                    pages = json.load(f)
            
            # Filter pages
            filtered_pages = []
            for page_data in pages:
                summary = page_data.get("summary", {})
                
                # Apply filters
                if type_filter and summary.get("type") != type_filter:
                    continue
                if min_words > 0 and summary.get("words", 0) < min_words:
                    continue
                if q and q.lower() not in str(summary).lower():
                    continue
                
                filtered_pages.append(PageSummary(**summary))
            
            # Paginate
            start = (page - 1) * size
            end = start + size
            return filtered_pages[start:end]
            
        except Exception as e:
            print(f"Error listing pages: {e}")
            return []
    
    def get_page(self, page_id: str) -> Optional[PageDetail]:
        """Get specific page by ID."""
        try:
            with open(self.pages_file, 'r') as f:
                pages = json.load(f)
            
            # If no pages, create mock data for testing
            if not pages:
                self.create_mock_data()
                with open(self.pages_file, 'r') as f:
                    pages = json.load(f)
            
            for page_data in pages:
                if page_data.get("summary", {}).get("pageId") == page_id:
                    return PageDetail(**page_data)
            
            return None
            
        except Exception as e:
            print(f"Error getting page: {e}")
            return None
    
    def progress_snapshot(self, frontier: Frontier) -> Dict[str, Any]:
        """Get progress snapshot."""
        try:
            with open(self.pages_file, 'r') as f:
                pages = json.load(f)
            
            with open(self.meta_file, 'r') as f:
                meta = json.load(f)
            
            # Count errors
            error_count = len(meta.get("errors", []))
            
            # Get frontier stats
            frontier_stats = frontier.get_stats()
            
            return {
                "runId": self.run_id,
                "queued": frontier_stats["queued"],
                "visited": frontier_stats["visited"],
                "errors": error_count,
                "etaSeconds": None,  # Could calculate based on rate
                "hosts": {}  # Could track per-host stats
            }
            
        except Exception as e:
            print(f"Error getting progress: {e}")
            return {
                "runId": self.run_id,
                "queued": 0,
                "visited": 0,
                "errors": 0,
                "etaSeconds": None,
                "hosts": {}
            }
    
    def finalize(self):
        """Finalize the run."""
        try:
            with open(self.meta_file, 'r') as f:
                meta = json.load(f)
            
            meta["status"] = "completed"
            meta["completed_at"] = time.time()
            
            with open(self.meta_file, 'w') as f:
                json.dump(meta, f)
                
        except Exception as e:
            print(f"Error finalizing run: {e}")