import time
import httpx
from config import settings


def _statement_headers():
    return {
        "Authorization": f"Bearer {settings.DATABRICKS_TOKEN}",
        "Content-Type": "application/json",
    }


def _extract_results(payload):
    manifest = payload.get("manifest", {})
    schema = manifest.get("schema", {})
    col_meta = schema.get("columns", [])
    columns = [col.get("name") for col in col_meta]

    # Databricks SQL Statement API returns data_array as arrays of strings/nulls
    data_array = payload.get("result", {}).get("data_array", [])
    rows = []
    for row in data_array:
        row_dict = {}
        for i, value in enumerate(row):
            col_name = columns[i] if i < len(columns) else f"col_{i}"
            row_dict[col_name] = value  # values are strings or None
        rows.append(row_dict)
    return rows, columns


def _fetch_statement_result(statement_id: str):
    url = f"{settings.databricks_base_url}/api/2.0/sql/statements/{statement_id}"
    with httpx.Client(timeout=120) as client:
        while True:
            response = client.get(url, headers=_statement_headers())
            response.raise_for_status()
            payload = response.json()
            state = payload.get("status", {}).get("state")

            if state == "SUCCEEDED":
                return _extract_results(payload)
            if state in {"FAILED", "CANCELED", "CLOSED"}:
                message = payload.get("status", {}).get("error", {}).get("message", "Statement execution failed")
                raise RuntimeError(message)

            time.sleep(0.5)


def execute_query(query: str, params=None):
    if params:
        raise NotImplementedError("Parameterized queries are not supported by the current backend implementation")

    if not settings.warehouse_id:
        raise RuntimeError("DATABRICKS_HTTP_PATH must include a warehouse id")

    url = f"{settings.databricks_base_url}/api/2.0/sql/statements"
    body = {
        "statement": query,
        "warehouse_id": settings.warehouse_id,
        "catalog": settings.DATABRICKS_CATALOG,
        "schema": settings.DATABRICKS_SCHEMA,
        "wait_timeout": "50s",
        "disposition": "INLINE",
    }

    with httpx.Client(timeout=120) as client:
        response = client.post(url, headers=_statement_headers(), json=body)
        response.raise_for_status()
        payload = response.json()

    statement_id = payload.get("statement_id")
    state = payload.get("status", {}).get("state")

    if state == "SUCCEEDED":
        return _extract_results(payload)
    if state in {"PENDING", "RUNNING"} and statement_id:
        return _fetch_statement_result(statement_id)
    if state in {"FAILED", "CANCELED", "CLOSED"}:
        message = payload.get("status", {}).get("error", {}).get("message", "Statement execution failed")
        raise RuntimeError(message)

    return [], []
