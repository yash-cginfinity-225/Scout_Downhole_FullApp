from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import execute_query
from config import settings
from typing import List, Optional
import json

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Lookup table stored in Databricks
LOOKUP_TABLE = "databricksnonprod.default.lookup_table_config"

TABLE_MAP = {
    "bha_tally": settings.BHA_TALLY_TABLE,
    "bha_report": settings.BHA_REPORT_TABLE,
    "bha_extracted": settings.BHA_EXTRACTED_TABLE,
    "motor_performance": settings.MOTOR_PERFORMANCE_TABLE,
}


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


@router.get("/mapped-data")
def get_mapped_data(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """
    Fetch unified data from all tables based on stored column mappings.
    Returns rows with 'file_name' as first column, plus all mapped columns.
    Sub-fields are expanded from JSON array columns.
    """
    # 1. Get lookup config
    try:
        config_query = f"SELECT * FROM {LOOKUP_TABLE}"
        config_results, _ = execute_query(config_query)
    except Exception:
        return {"data": [], "columns": [], "total": 0, "page": 1, "total_pages": 0}

    if not config_results:
        return {"data": [], "columns": [], "total": 0, "page": 1, "total_pages": 0}

    # 2. Parse mappings: each row has column_name, mapped_columns (comma-sep in order: bha_tally, bha_report, bha_extracted, motor_performance), sub_fields
    table_keys = ["bha_tally", "bha_report", "bha_extracted", "motor_performance"]
    mappings = []
    for row in config_results:
        mapped_cols = (row.get("mapped_columns") or "").split(",")
        # Pad to 4
        while len(mapped_cols) < 4:
            mapped_cols.append("N/A")
        sub_fields_str = row.get("sub_fields") or ""
        sub_fields = [s.strip() for s in sub_fields_str.split(",") if s.strip()]
        mappings.append({
            "column_name": row.get("column_name", ""),
            "mapped_columns": mapped_cols,
            "sub_fields": sub_fields,
        })

    # 3. Query each table for its mapped columns + path
    all_rows = []

    for table_idx, table_key in enumerate(table_keys):
        full_table = TABLE_MAP.get(table_key)
        if not full_table:
            continue

        # Collect columns needed from this table
        needed_cols = set()
        needed_cols.add("path")
        col_mapping = {}  # source_col -> display_name
        sub_field_map = {}  # source_col -> list of sub field names

        for m in mappings:
            source_col = m["mapped_columns"][table_idx].strip()
            if source_col and source_col != "N/A":
                needed_cols.add(source_col)
                col_mapping[source_col] = m["column_name"]
                if m["sub_fields"]:
                    sub_field_map[source_col] = m["sub_fields"]

        if len(needed_cols) <= 1:
            # Only path, no mappings for this table
            continue

        cols_str = ", ".join(f"`{c}`" for c in needed_cols)
        query = f"SELECT {cols_str} FROM {full_table}"
        if search:
            query += f" WHERE CAST(CONCAT_WS(' ', *) AS STRING) ILIKE '%{search}%'"

        try:
            results, _ = execute_query(query)
        except Exception:
            continue

        for row in results:
            path_val = row.get("path", "")
            file_name = path_val.rsplit("/", 1)[-1] if path_val else ""
            unified_row = {"file_name": file_name, "_path": path_val, "_source_table": table_key}

            for source_col, display_name in col_mapping.items():
                value = row.get(source_col)

                # Parse JSON strings
                if isinstance(value, str) and value.strip().startswith("["):
                    try:
                        value = json.loads(value)
                    except (json.JSONDecodeError, ValueError):
                        pass

                # If this column has sub-fields and value is a list of dicts, expand them
                if source_col in sub_field_map and isinstance(value, list):
                    sub_fields = sub_field_map[source_col]
                    for sf in sub_fields:
                        # Collect all values of this sub-field from the array
                        sf_values = []
                        for item in value:
                            if isinstance(item, dict) and sf in item:
                                sf_values.append(str(item[sf]) if item[sf] is not None else "")
                        unified_row[f"{display_name}__{sf}"] = sf_values if sf_values else None
                elif isinstance(value, list):
                    unified_row[display_name] = value
                else:
                    unified_row[display_name] = value

            all_rows.append(unified_row)

    # 4. Build column list
    output_columns = ["file_name"]
    for m in mappings:
        if m["sub_fields"]:
            for sf in m["sub_fields"]:
                col_name = f"{m['column_name']}__{sf}"
                if col_name not in output_columns:
                    output_columns.append(col_name)
        else:
            if m["column_name"] not in output_columns:
                output_columns.append(m["column_name"])

    # 5. Paginate
    total = len(all_rows)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    paged_rows = all_rows[offset:offset + page_size]

    return {
        "data": paged_rows,
        "columns": output_columns,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/mapped-data/export")
def export_mapped_data(search: Optional[str] = Query(None)):
    """Export all mapped data without pagination."""
    result = get_mapped_data(search=search, page=1, page_size=100000)
    return {"data": result["data"], "columns": result["columns"]}
