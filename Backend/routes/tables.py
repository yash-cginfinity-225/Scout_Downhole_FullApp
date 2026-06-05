from fastapi import APIRouter, HTTPException, Query
from database import execute_query
from config import settings
from typing import Optional
import json

router = APIRouter(prefix="/api/tables", tags=["tables"])

TABLE_MAP = {
    "bha_tally": settings.BHA_TALLY_TABLE,
    "bha_report": settings.BHA_REPORT_TABLE,
    "bha_extracted": settings.BHA_EXTRACTED_TABLE,
    "motor_performance": settings.MOTOR_PERFORMANCE_TABLE,
    "scout_bha_report": settings.SCOUT_BHA_REPORT_TABLE,
    "scout_failure_report": settings.SCOUT_FAILURE_REPORT_TABLE,
    "scout_motor_performance": settings.SCOUT_MOTOR_PERFORMANCE_TABLE,
}


@router.get("/{table_name}")
def get_table_data(
    table_name: str,
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    if table_name not in TABLE_MAP:
        raise HTTPException(status_code=404, detail="Table not found")

    table = TABLE_MAP[table_name]
    offset = (page - 1) * page_size

    try:
        # Determine columns for the table (used to build a safe search expression)
        _, sample_cols = execute_query(f"SELECT * FROM {table} LIMIT 1")

        # If a search term is provided, build an INSTR-based predicate across columns
        if search and sample_cols:
            # Escape single quotes in the search literal
            safe_search = search.replace("'", "''")

            # Build a predicate that checks each column for the substring (case-insensitive)
            # Use instr(lower(cast(col AS string)), lower('search')) > 0 to avoid LIKE wildcard semantics
            predicates = [f"instr(lower(CAST(`{c}` AS STRING)), lower('{safe_search}')) > 0" for c in sample_cols]
            where_clause = " OR ".join(predicates)

            count_query = f"SELECT COUNT(*) as total FROM {table} WHERE {where_clause}"
            query = f"SELECT * FROM {table} WHERE {where_clause} LIMIT {page_size} OFFSET {offset}"
        else:
            # Fallback: no search or couldn't determine columns — return full page
            count_query = f"SELECT COUNT(*) as total FROM {table}"
            query = f"SELECT * FROM {table} LIMIT {page_size} OFFSET {offset}"

        count_results, _ = execute_query(count_query)
        total = int(count_results[0]["total"]) if count_results else 0

        # Execute main query
        results, columns = execute_query(query)

        # Parse JSON strings in results
        parsed_results = []
        for row in results:
            parsed_row = {}
            for key, value in row.items():
                if isinstance(value, str) and value.startswith("["):
                    try:
                        parsed_row[key] = json.loads(value)
                    except (json.JSONDecodeError, ValueError):
                        parsed_row[key] = value
                else:
                    parsed_row[key] = value
            parsed_results.append(parsed_row)

        return {
            "data": parsed_results,
            "columns": columns,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_name}/columns")
def get_table_columns(table_name: str):
    if table_name not in TABLE_MAP:
        raise HTTPException(status_code=404, detail="Table not found")

    table = TABLE_MAP[table_name]
    try:
        query = f"SELECT * FROM {table} LIMIT 1"
        _, columns = execute_query(query)
        return {"columns": columns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_name}/export")
def export_table_data(
    table_name: str,
    search: Optional[str] = Query(None),
):
    if table_name not in TABLE_MAP:
        raise HTTPException(status_code=404, detail="Table not found")

    table = TABLE_MAP[table_name]
    try:
        query = f"SELECT * FROM {table}"
        if search:
            query += f" WHERE CAST(CONCAT_WS(' ', *) AS STRING) ILIKE '%{search}%'"

        results, columns = execute_query(query)
        return {"data": results, "columns": columns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
