import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABRICKS_HOST: str = os.getenv("DATABRICKS_HOST", "")
    DATABRICKS_HTTP_PATH: str = os.getenv("DATABRICKS_HTTP_PATH", "")
    DATABRICKS_TOKEN: str = os.getenv("DATABRICKS_TOKEN", "")
    DATABRICKS_CATALOG: str = os.getenv("DATABRICKS_CATALOG", "databricksnonprod")
    DATABRICKS_SCHEMA: str = os.getenv("DATABRICKS_SCHEMA", "default")

    LOGIN_TABLE: str = os.getenv("LOGIN_TABLE", "databricksnonprod.default.login")
    BHA_TALLY_TABLE: str = os.getenv("BHA_TALLY_TABLE", "databricksnonprod.default.halliburton_bha_tally")
    BHA_REPORT_TABLE: str = os.getenv("BHA_REPORT_TABLE", "databricksnonprod.default.halliburton_bha_report")
    BHA_EXTRACTED_TABLE: str = os.getenv("BHA_EXTRACTED_TABLE", "databricksnonprod.default.bha_extracted_reports")
    MOTOR_PERFORMANCE_TABLE: str = os.getenv("MOTOR_PERFORMANCE_TABLE", "databricksnonprod.default.halliburton_motor_performance")

    DATABRICKS_VOLUME_PATH: str = os.getenv("DATABRICKS_VOLUME_PATH", "/Volumes/databricksnonprod/pdf_ingestion_data/pdf")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    @property
    def databricks_base_url(self) -> str:
        return f"https://{self.DATABRICKS_HOST}"

    @property
    def warehouse_id(self) -> str:
        parts = self.DATABRICKS_HTTP_PATH.strip().split("/")
        return parts[-1] if parts else ""


settings = Settings()
