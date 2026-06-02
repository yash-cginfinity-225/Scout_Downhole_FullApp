from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query
from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    username: str
    is_admin: bool
    message: str


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    try:
        query = f"SELECT username, password FROM {settings.LOGIN_TABLE} WHERE username = '{request.username}'"
        results, _ = execute_query(query)

        if not results:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = results[0]
        if user["password"] != request.password:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return LoginResponse(
            success=True,
            username=user["username"],
            is_admin=user["username"] == "admin",
            message="Login successful",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
