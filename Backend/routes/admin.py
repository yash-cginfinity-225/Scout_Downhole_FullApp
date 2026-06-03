from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import execute_query
from config import settings
from typing import List, Optional
import json

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Lookup table stored in Databricks
LOOKUP_TABLE = "databricksnonprod.default.lookup_table_config"

# Final pre-built unified data table
FINAL_DATA_TABLE = "databricksnonprod.default.final_mapped_data"


class LookupColumn(BaseModel):
    column_name: str
    mapped_tables: List[str]
    mapped_columns: List[str]
    sub_fields: Optional[dict] = None  # {"bha_report": ["description"], ...}
    sub_field_row_index: Optional[dict] = None  # {"bha_report": null, ...}


class LookupTableCreate(BaseModel):
    columns: List[LookupColumn]


@router.get("/lookup-table")
def get_lookup_table():
    try:
        query = f"SELECT * FROM {LOOKUP_TABLE}"
        results, columns = execute_query(query)
        return {"data": results, "columns": columns}
    except Exception:
        return {"data": [], "columns": [], "message": "Table not created yet"}


@router.post("/lookup-table")
def create_lookup_table(request: LookupTableCreate):
    try:
        # Create table if not exists
        create_query = f"""
        CREATE TABLE IF NOT EXISTS {LOOKUP_TABLE} (
            id BIGINT GENERATED ALWAYS AS IDENTITY,
            column_name STRING,
            mapped_tables STRING,
            mapped_columns STRING,
            sub_fields STRING,
            sub_field_row_index STRING
        )
        """
        execute_query(create_query)

        # Ensure sub_field_row_index column exists (for existing tables)
        try:
            execute_query(f"ALTER TABLE {LOOKUP_TABLE} ADD COLUMN sub_field_row_index STRING")
        except Exception:
            pass  # Column already exists

        # Insert columns
        for col in request.columns:
            sub_fields_json = json.dumps(col.sub_fields) if col.sub_fields else '{}'
            row_index_json = json.dumps(col.sub_field_row_index) if col.sub_field_row_index else '{}'
            insert_query = f"""
            INSERT INTO {LOOKUP_TABLE} (column_name, mapped_tables, mapped_columns, sub_fields, sub_field_row_index)
            VALUES (
                '{col.column_name}',
                '{",".join(col.mapped_tables)}',
                '{",".join(col.mapped_columns)}',
                '{sub_fields_json}',
                '{row_index_json}'
            )
            """
            execute_query(insert_query)

        return {"message": "Lookup table created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/lookup-table/{column_id}")
def update_lookup_column(column_id: int, column: LookupColumn):
    try:
        sub_fields_json = json.dumps(column.sub_fields) if column.sub_fields else '{}'
        row_index_json = json.dumps(column.sub_field_row_index) if column.sub_field_row_index else '{}'
        query = f"""
        UPDATE {LOOKUP_TABLE}
        SET column_name = '{column.column_name}',
            mapped_tables = '{",".join(column.mapped_tables)}',
            mapped_columns = '{",".join(column.mapped_columns)}',
            sub_fields = '{sub_fields_json}',
            sub_field_row_index = '{row_index_json}'
        WHERE id = {column_id}
        """
        execute_query(query)
        return {"message": "Column updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/lookup-table/{column_id}")
def delete_lookup_column(column_id: int):
    try:
        query = f"DELETE FROM {LOOKUP_TABLE} WHERE id = {column_id}"
        execute_query(query)
        return {"message": "Column deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/table-structures")
def get_table_structures():
    """Return the structure of all 4 tables for admin mapping"""
    structures = {}
    table_map = {
        "bha_tally": settings.BHA_TALLY_TABLE,
        "bha_report": settings.BHA_REPORT_TABLE,
        "bha_extracted": settings.BHA_EXTRACTED_TABLE,
        "motor_performance": settings.MOTOR_PERFORMANCE_TABLE,
    }

    for key, table in table_map.items():
        try:
            query = f"DESCRIBE TABLE {table}"
            results, _ = execute_query(query)
            structures[key] = results
        except Exception:
            structures[key] = []

    return structures


@router.get("/mapped-data")
def get_mapped_data(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    try:
        count_query = f"SELECT COUNT(*) as total FROM {FINAL_DATA_TABLE}"
        if search:
            count_query += f" WHERE CAST(CONCAT_WS(' ', *) AS STRING) ILIKE '%{search}%'"
        count_results, _ = execute_query(count_query)
        total = int(count_results[0]["total"]) if count_results else 0

        offset = (page - 1) * page_size
        query = f"SELECT * FROM {FINAL_DATA_TABLE}"
        if search:
            query += f" WHERE CAST(CONCAT_WS(' ', *) AS STRING) ILIKE '%{search}%'"
        query += f" LIMIT {page_size} OFFSET {offset}"

        results, columns = execute_query(query)
        return {
            "data": results,
            "columns": columns,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mapped-data/export")
def export_mapped_data(search: Optional[str] = Query(None)):
    try:
        query = f"SELECT * FROM {FINAL_DATA_TABLE}"
        if search:
            query += f" WHERE CAST(CONCAT_WS(' ', *) AS STRING) ILIKE '%{search}%'"
        results, columns = execute_query(query)
        return {"data": results, "columns": columns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
