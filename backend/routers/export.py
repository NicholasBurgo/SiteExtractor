"""
Export API router.
Provides endpoints for downloading export bundles and previewing manifests.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from backend.export.bundle import ExportBundleBuilder
from backend.export.asset_store import AssetDownloadConfig
import os

router = APIRouter()


@router.get("/{run_id}/export")
async def export_bundle(
    run_id: str,
    format: str = Query(
        "both",
        description="Export format: both, markdown, or json",
        regex="^(both|markdown|json)$",
    ),
    download_assets: str = Query(
        "none",
        description="Asset download mode: none, images, or all",
        regex="^(none|images|all)$",
    ),
    assets_scope: str = Query(
        "same-origin",
        description="Scope for asset downloads: same-origin, include-cdn, or all",
        regex="^(same-origin|include-cdn|all)$",
    ),
    max_asset_bytes: int = Query(
        5_242_880,
        description="Max bytes per individual asset (default 5 MB)",
        ge=1024,
    ),
    max_total_asset_bytes: int = Query(
        104_857_600,
        description="Max total bytes for all assets (default 100 MB)",
        ge=1024,
    ),
    assets_dir: str = Query(
        "assets",
        description="Directory name for assets in the export bundle",
    ),
):
    """
    Download a structured zip export for a completed run.

    Pass download_assets=images to download referenced images and rewrite
    Markdown links to local paths. Default is 'none' (lightweight export).
    """
    run_dir = os.path.join("runs", run_id)
    if not os.path.exists(run_dir):
        raise HTTPException(status_code=404, detail="Run not found")

    try:
        builder = ExportBundleBuilder(run_id)

        # Build asset config if downloading is requested
        asset_config = None
        if download_assets != "none":
            asset_config = AssetDownloadConfig(
                download_assets=download_assets,
                assets_scope=assets_scope,
                max_asset_bytes=max_asset_bytes,
                max_total_asset_bytes=max_total_asset_bytes,
                assets_dir=assets_dir,
            )

        zip_buf = builder.build_zip(asset_config=asset_config, export_format=format)

        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=export_{run_id}.zip"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building export: {str(e)}")


@router.get("/{run_id}/export/manifest")
async def export_manifest(run_id: str):
    """
    Return the export manifest (same data as run.json + counts)
    for the UI preview — no zip creation.
    """
    run_dir = os.path.join("runs", run_id)
    if not os.path.exists(run_dir):
        raise HTTPException(status_code=404, detail="Run not found")

    try:
        builder = ExportBundleBuilder(run_id)
        return builder.build_manifest()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error building manifest: {str(e)}"
        )

