import re
from urllib.parse import quote
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from config import settings
from typing import List, Optional
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


EXCEL_EXTENSIONS = {"xlsx", "xls"}
ALLOWED_EXTENSIONS = EXCEL_EXTENSIONS | {"pdf"}


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _volume_url(filename: str = "") -> str:
    base = f"{settings.databricks_base_url}/api/2.0/fs/files{settings.DATABRICKS_VOLUME_PATH}"
    if filename:
        return f"{base}/{quote(filename, safe='')}"
    return base


def _excel_volume_url(filename: str = "") -> str:
    base = f"{settings.databricks_base_url}/api/2.0/fs/files{settings.DATABRICKS_EXCEL_VOLUME_PATH}"
    if filename:
        return f"{base}/{quote(filename, safe='')}"
    return base


def _file_volume_url(filename: str) -> str:
    """Return the correct volume URL based on file extension."""
    return _excel_volume_url(filename) if _ext(filename) in EXCEL_EXTENSIONS else _volume_url(filename)


def _dir_url() -> str:
    return f"{settings.databricks_base_url}/api/2.0/fs/directories{settings.DATABRICKS_VOLUME_PATH}"


def _excel_dir_url() -> str:
    return f"{settings.databricks_base_url}/api/2.0/fs/directories{settings.DATABRICKS_EXCEL_VOLUME_PATH}"


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    uploaded = []
    async with httpx.AsyncClient(timeout=120) as client:
        for file in files:
            safe_name = _safe_filename(file.filename)
            ext = _ext(safe_name)

            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type '.{ext}' is not allowed. Only Excel (.xlsx, .xls) and PDF files are accepted.",
                )

            content = await file.read()
            upload_url = _file_volume_url(safe_name)

            resp = await client.put(
                upload_url + "?overwrite=true",
                content=content,
                headers={**HEADERS, "Content-Type": "application/octet-stream"},
            )
            if resp.status_code not in (200, 201, 204):
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Failed to upload {safe_name} to Databricks: {resp.text}",
                )
            uploaded.append({
                "original_name": file.filename,
                "stored_name": safe_name,
                "size": len(content),
                "type": "excel" if ext in EXCEL_EXTENSIONS else "pdf",
            })

    return {"uploaded": uploaded, "message": f"{len(uploaded)} file(s) uploaded successfully"}


@router.get("/list")
async def list_files():
    all_files = []
    async with httpx.AsyncClient(timeout=30) as client:
        for dir_url, label in [(_dir_url(), "pdf"), (_excel_dir_url(), "excel")]:
            resp = await client.get(dir_url, headers=HEADERS)
            if resp.status_code == 404:
                continue
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            contents = resp.json().get("contents", [])
            all_files.extend([
                {
                    "name": item["path"].rsplit("/", 1)[-1],
                    "size": item.get("file_size", 0),
                    "modified": item.get("last_modified", 0),
                    "type": label,
                }
                for item in contents
                if not item.get("is_directory", False)
            ])
    return {"files": sorted(all_files, key=lambda x: x["modified"], reverse=True)}


@router.get("/download/{filename}")
async def download_file(filename: str):
    safe_name = _safe_filename(filename)
    download_url = _file_volume_url(safe_name)

    async def stream_content():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("GET", download_url, headers=HEADERS) as resp:
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
async def view_file(filename: str, path: Optional[str] = Query(None)):
    # If full volume path is provided, use it directly (from database path column)
    if path:
        # Validate path is within allowed volumes
        allowed_prefixes = [settings.DATABRICKS_VOLUME_PATH, settings.DATABRICKS_EXCEL_VOLUME_PATH]
        if not any(path.startswith(prefix) for prefix in allowed_prefixes):
            raise HTTPException(status_code=400, detail="Invalid file path")
        if ".." in path:
            raise HTTPException(status_code=400, detail="Invalid file path")

        name = path.rsplit("/", 1)[-1]
        # URL-encode each path segment after the volume base
        encoded_path = "/".join(quote(segment, safe="") for segment in path.split("/"))
        view_url = f"{settings.databricks_base_url}/api/2.0/fs/files{encoded_path}"
    else:
        # Fallback: use filename only with configured volume path
        name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
        if not name or ".." in name:
            raise HTTPException(status_code=400, detail="Invalid filename")
        view_url = _file_volume_url(name)

    ext = _ext(name)

    if ext in EXCEL_EXTENSIONS:
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "application/pdf"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(view_url, headers=HEADERS)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="File not found")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="View failed")

    return Response(
        content=resp.content,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{name}"'},
    )


@router.delete("/{filename}")
async def delete_file(filename: str):
    safe_name = _safe_filename(filename)
    delete_url = _file_volume_url(safe_name)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(delete_url, headers=HEADERS)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="File not found")
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return {"message": "File deleted successfully"}
