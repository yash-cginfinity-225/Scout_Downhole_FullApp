from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query
from config import settings
from typing import List, Optional

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Lookup table stored in Databricks
LOOKUP_TABLE = "databricksnonprod.default.lookup_table_config"


class LookupColumn(BaseModel):
    column_name: str
    mapped_tables: List[str]
    mapped_columns: List[str]
    sub_fields: Optional[List[str]] = None


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
            sub_fields STRING
        )
        """
        execute_query(create_query)

        # Insert columns
        for col in request.columns:
            insert_query = f"""
            INSERT INTO {LOOKUP_TABLE} (column_name, mapped_tables, mapped_columns, sub_fields)
            VALUES (
                '{col.column_name}',
                '{",".join(col.mapped_tables)}',
                '{",".join(col.mapped_columns)}',
                '{",".join(col.sub_fields) if col.sub_fields else ""}'
            )
            """
            execute_query(insert_query)

        return {"message": "Lookup table created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/lookup-table/{column_id}")
def update_lookup_column(column_id: int, column: LookupColumn):
    try:
        query = f"""
        UPDATE {LOOKUP_TABLE}
        SET column_name = '{column.column_name}',
            mapped_tables = '{",".join(column.mapped_tables)}',
            mapped_columns = '{",".join(column.mapped_columns)}',
            sub_fields = '{",".join(column.sub_fields) if column.sub_fields else ""}'
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
