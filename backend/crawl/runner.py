import asyncio, time, orjson as json
from dataclasses import dataclass
from typing import Dict
from core.config import settings
from crawl.frontier import Frontier
from crawl.fetch import Fetcher
from extract.html import extract_html
from extract.pdfs import extract_pdf
from extract.docx_ import extract_docx
from extract.json_csv import extract_json_csv
from storage.runs import RunStore
from storage.confirmation import ConfirmationStore

@dataclass
class RunState:
    frontier: Frontier
    fetcher: Fetcher
    store: RunStore
    confirmation_store: ConfirmationStore
    started_at: float
    max_pages: int

class RunManager:
    def __init__(self):
        self._runs: Dict[str, RunState] = {}

    async def start(self, req) -> str:
        run_id = str(int(time.time()))
        store = RunStore(run_id)
        confirmation_store = ConfirmationStore(run_id)
        frontier = Frontier(req.url, max_pages=req.maxPages or settings.MAX_PAGES_DEFAULT)
        fetcher = Fetcher(settings)
        self._runs[run_id] = RunState(frontier, fetcher, store, confirmation_store, time.time(), req.maxPages or settings.MAX_PAGES_DEFAULT)
        asyncio.create_task(self._worker_loop(run_id))
        return run_id

    async def _worker_loop(self, run_id: str):
        state = self._runs[run_id]
        sem = asyncio.Semaphore(settings.GLOBAL_CONCURRENCY)
        async def work(url):
            async with sem:
                resp = await state.fetcher.fetch(url)
                if not resp:
                    state.store.log_error(url, "fetch_failed")
                    return
                ct = resp.content_type
                if ct.startswith("text/html"):
                    doc = await extract_html(resp, run_id)
                    # Extract site data from first page
                    if url == state.frontier.start_url:
                        try:
                            state.confirmation_store.extract_site_data(resp.content.decode('utf-8', errors='ignore'), url)
                            print(f"Extracted site data for base URL: {url}")
                        except Exception as e:
                            print(f"Error extracting site data: {e}")
                elif ct in ("application/pdf",):
                    doc = await extract_pdf(resp)
                elif ct in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",):
                    doc = await extract_docx(resp)
                elif ct in ("application/json", "text/csv"):
                    doc = await extract_json_csv(resp)
                else:
                    doc = {"summary": {"url": resp.url, "contentType": ct, "title": None, "words": 0, "images": 0, "links": 0, "status": resp.status, "path": resp.path, "type": "BIN"}, "meta": {}, "text": None}
                state.store.save_doc(doc)
                
                # Add to confirmation store pages index
                if doc.get("summary"):
                    summary = doc["summary"]
                    try:
                        state.confirmation_store.add_page_to_index({
                            "pageId": summary.get("pageId"),
                            "title": summary.get("title"),
                            "path": summary.get("path", "/"),
                            "url": summary.get("url"),
                            "status": summary.get("status"),
                            "words": summary.get("words", 0),
                            "mediaCount": summary.get("images", 0)
                        })
                        print(f"Added page to index: {summary.get('pageId')}")
                    except Exception as e:
                        print(f"Error adding page to index: {e}")
                for link in doc.get("links", []):
                    if isinstance(link, dict):
                        url = link.get("url")
                    else:
                        url = link
                    if url:
                        state.frontier.enqueue(url)
        while not state.frontier.done():
            batch = state.frontier.next_batch(settings.GLOBAL_CONCURRENCY)
            await asyncio.gather(*(work(u) for u in batch))
        state.store.finalize()

    async def progress(self, run_id: str):
        st = self._runs.get(run_id)
        if not st: return None
        return st.store.progress_snapshot(st.frontier)

    async def stop(self, run_id: str):
        st = self._runs.pop(run_id, None)
        if not st: return False
        st.store.finalize()
        return True