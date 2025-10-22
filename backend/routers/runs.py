from fastapi import APIRouter, HTTPException
from core.types import StartRunRequest, RunProgress
from crawl.runner import RunManager

router = APIRouter()
manager = RunManager()

@router.post("/start", response_model=dict)
async def start_run(req: StartRunRequest):
    run_id = await manager.start(req)
    return {"runId": run_id}

@router.get("/{run_id}/progress", response_model=RunProgress)
async def run_progress(run_id: str):
    prog = await manager.progress(run_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Run not found")
    return prog

@router.post("/{run_id}/stop", response_model=dict)
async def stop_run(run_id: str):
    ok = await manager.stop(run_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"stopped": True}
