import sys
import os
# Ensure the Backend directory is on sys.path so that all intra-package
# imports (config, database, routes.*) resolve correctly regardless of
# whether this module is run as a script or imported as Backend.main.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes.auth import router as auth_router
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

app.include_router(auth_router)
app.include_router(tables_router)
app.include_router(files_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "Scout Data Platform API", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
