from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from config import settings
from routes.tables import router as tables_router
from routes.files import router as files_router
from routes.admin import router as admin_router

app = FastAPI(title="Scout Data Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tables_router)
app.include_router(files_router)
app.include_router(admin_router)

# Serve frontend build (Vite -> `dist`, CRA -> `build`). If a build exists,
# mount it and return `index.html` for SPA routes.
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
_possible_dirs = [REPO_ROOT / "Frontend" / "dist", REPO_ROOT / "Frontend" / "build"]
FRONTEND_BUILD_DIR = next((p for p in _possible_dirs if p.exists()), None)

if FRONTEND_BUILD_DIR:
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True), name="frontend")


@app.get("/", include_in_schema=False)
def root():
    if FRONTEND_BUILD_DIR:
        index = FRONTEND_BUILD_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
    return {"message": "Scout Data Platform API", "status": "running"}


@app.get("/{full_path:path}", include_in_schema=False)
def spa_catchall(full_path: str):
    if FRONTEND_BUILD_DIR:
        index = FRONTEND_BUILD_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Not Found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
