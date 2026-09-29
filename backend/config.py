"""
Legacy Logic Pro — Backend Application Configuration
Loads environment variables using Pydantic v2 Settings
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    port: int = Field(default=8000, alias="PORT")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_key: str = Field(default="", alias="SUPABASE_SERVICE_KEY")
    supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")
    allowed_origins_raw: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", alias="ALLOWED_ORIGINS")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    @property
    def allowed_origins(self) -> List[str]:
        # Cleanly parse comma-separated origins, strip whitespace, remove trailing slashes
        return [origin.strip().rstrip("/") for origin in self.allowed_origins_raw.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
