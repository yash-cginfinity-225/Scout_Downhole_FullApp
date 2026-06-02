import re
from urllib.parse import quote
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from config import settings
from typing import List
import httpx

router = APIRouter(prefix="/api/files", tags=["files"])

HEADERS = {
    "Authorization": f"Bearer {settings.DATABRICKS_TOKEN}",
}


def _safe_filename(filename: str) -> str:
    """Strip path components and dangerous characters to prevent path traversal."""
    name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    name = re.sub(r"[^\w.\-]", "_", name)
    return name or "file"


def _volume_url(filename: str = "") -> str:
    base = f"{settings.databricks_base_url}/api/2.0/fs/files{settings.DATABRICKS_VOLUME_PATH}"
    if filename:
        return f"{base}/{quote(filename, safe='')}"
    return base


def _dir_url() -> str:
    return f"{settings.databricks_base_url}/api/2.0/fs/directories{settings.DATABRICKS_VOLUME_PATH}"


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    uploaded = []
    async with httpx.AsyncClient(timeout=120) as client:
        for file in files:
            safe_name = _safe_filename(file.filename)
            content = await file.read()

            resp = await client.put(
                _volume_url(safe_name) + "?overwrite=true",
                content=content,
                headers={**HEADERS, "Content-Type": "application/octet-stream"},
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Failed to upload {safe_name} to Databricks: {resp.text}",
                )
            uploaded.append({
                "original_name": file.filename,
                "stored_name": safe_name,
                "size": len(content),
            })

    return {"uploaded": uploaded, "message": f"{len(uploaded)} file(s) uploaded successfully"}


@router.get("/list")
async def list_files():
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_dir_url(), headers=HEADERS)

    if resp.status_code == 404:
        return {"files": []}
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    contents = resp.json().get("contents", [])
    files = [
        {
            "name": item["path"].rsplit("/", 1)[-1],
            "size": item.get("file_size", 0),
            "modified": item.get("last_modified", 0),
        }
        for item in contents
        if not item.get("is_directory", False)
    ]
    return {"files": sorted(files, key=lambda x: x["modified"], reverse=True)}


@router.get("/download/{filename}")
async def download_file(filename: str):
    safe_name = _safe_filename(filename)

    async def stream_content():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("GET", _volume_url(safe_name), headers=HEADERS) as resp:
                if resp.status_code == 404:
                    raise HTTPException(status_code=404, detail="File not found")
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code, detail="Download failed")
                async for chunk in resp.aiter_bytes():
                    yield chunk

    return StreamingResponse(
        stream_content(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.get("/view/{filename:path}")
async def view_file(filename: str):
    # Only strip path traversal, preserve spaces and other chars in the actual filename
    name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    if not name or ".." in name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    async def stream_content():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("GET", _volume_url(name), headers=HEADERS) as resp:
                if resp.status_code == 404:
                    raise HTTPException(status_code=404, detail="File not found")
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code, detail="View failed")
                async for chunk in resp.aiter_bytes():
                    yield chunk

    return StreamingResponse(
        stream_content(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{name}"'},
    )


@router.delete("/{filename}")
async def delete_file(filename: str):
    safe_name = _safe_filename(filename)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(_volume_url(safe_name), headers=HEADERS)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="File not found")
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return {"message": "File deleted successfully"}
