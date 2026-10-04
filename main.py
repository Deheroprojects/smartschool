"""Classroom API. Run: python -m uvicorn backend.main:app --host 127.0.0.1."""
from contextlib import asynccontextmanager, contextmanager
import csv
from datetime import datetime, timezone
from io import StringIO
import json
import math
import os
from pathlib import Path
import sqlite3
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
import pandas as pd
from pydantic import BaseModel, Field, field_validator

from results import DEFAULT_SCALE, RESERVED, analyze, validate_marks
from backend.school import initialize_school, school_router

ROOT = Path(__file__).resolve().parents[1]


class NewClass(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    term: str = Field(min_length=1, max_length=100)
    subjects: list[str] = Field(min_length=1, max_length=30)


class RecordsUpdate(BaseModel):
    revision: int = Field(ge=1)
    records: list[dict[str, str | float]] = Field(max_length=10000)

    @field_validator("records", mode="before")
    @classmethod
    def reject_boolean_values(cls, records):
        if isinstance(records, list) and any(isinstance(value, bool) for row in records if isinstance(row, dict) for value in row.values()):
            raise ValueError("Use names, IDs and numeric marks, not true/false values.")
        return records


class RulesUpdate(BaseModel):
    revision: int = Field(ge=1)
    scale: dict[str, float]
    pass_mark: float = Field(ge=0, le=100, allow_inf_nan=False)


class CSVImport(BaseModel):
    revision: int = Field(ge=1)
    csv_text: str = Field(min_length=1, max_length=2000000)
    replace: bool = False


def validate_subjects(subjects):
    names = [name.strip() for name in subjects]
    reserved = {name.casefold() for name in RESERVED | {"Student ID", "Name"}}
    if any(not name or len(name) > 80 or name.casefold() in reserved for name in names):
        raise ValueError("Use subject names of 1–80 characters, different from student and result columns.")
    if len({name.casefold() for name in names}) != len(names):
        raise ValueError("Subject names must be unique.")
    return names


def clean_records(records, subjects):
    columns = ["Student ID", "Name", *subjects]
    for row in records:
        if set(row) != set(columns):
            raise ValueError("Every row must contain Student ID, Name and exactly the subjects in this class.")
        if any(isinstance(row[s], bool) for s in subjects):
            raise ValueError("Marks must be numbers, not true/false values.")
    clean, _ = validate_marks(pd.DataFrame(records, columns=columns))
    if clean["Student ID"].str.len().gt(100).any() or clean["Name"].str.len().gt(200).any():
        raise ValueError("Student IDs must be at most 100 characters and names at most 200.")
    return clean.to_dict(orient="records")


def parse_csv(content, subjects):
    try:
        rows = list(csv.reader(StringIO(content.lstrip("\ufeff")), strict=True))
    except csv.Error as exc:
        raise ValueError(f"Invalid CSV: {exc}") from exc
    if not rows:
        raise ValueError("The CSV is empty.")
    header = [cell.strip() for cell in rows[0]]
    if len(header) != len(set(header)):
        raise ValueError("CSV column names must be unique.")
    if set(header) != {"Student ID", "Name", *subjects}:
        raise ValueError("CSV columns must match this class: Student ID, Name, " + ", ".join(subjects))
    records = []
    for line, row in enumerate(rows[1:], start=2):
        if not row or all(not cell.strip() for cell in row):
            continue
        if len(row) != len(header):
            raise ValueError(f"CSV row {line} has the wrong number of columns.")
        records.append(dict(zip(header, row)))
    if not records:
        raise ValueError("The CSV contains no student rows.")
    if len(records) > 10000:
        raise ValueError("Import at most 10,000 students at a time.")
    return clean_records(records, subjects)


def validate_rules(scale, pass_mark):
    if set(scale) != set(DEFAULT_SCALE) or any(not math.isfinite(v) for v in scale.values()):
        raise ValueError("Supply numeric boundaries for A, B, C, D and E.")
    analyze(pd.DataFrame(columns=["Student ID", "Name", "Subject"]), scale, pass_mark)


def create_app(database_path=None):
    db_path = Path(database_path or os.environ.get("CLASSROOM_DB", ROOT / "data" / "classroom.sqlite3"))

    @contextmanager
    def connect():
        connection = sqlite3.connect(db_path, timeout=15)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def timestamp():
        return datetime.now(timezone.utc).isoformat()

    @asynccontextmanager
    async def lifespan(_app):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL)")
            if not db.execute("SELECT 1 FROM classes LIMIT 1").fetchone():
                sample = pd.read_csv(ROOT / "sample_marks.csv", dtype={"Student ID": str})
                payload = {
                    "id": str(uuid4()), "name": "Demo class", "term": "Sample term",
                    "subjects": list(sample.columns[2:]), "scale": DEFAULT_SCALE.copy(),
                    "pass_mark": 40, "records": sample.to_dict(orient="records"),
                    "updated_at": timestamp(),
                }
                db.execute("INSERT INTO classes VALUES (?, ?, 1)", (payload["id"], json.dumps(payload)))
        initialize_school(connect)
        yield

    app = FastAPI(title="SmartSchool Results Analytics System", version="2.0.0", lifespan=lifespan)
    app.include_router(school_router(connect))

    def read_class(class_id):
        with connect() as db:
            row = db.execute("SELECT payload, revision FROM classes WHERE id = ?", (class_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Class not found.")
        payload = json.loads(row["payload"])
        payload["revision"] = row["revision"]
        return payload

    def detail(payload):
        data = pd.DataFrame(payload["records"], columns=["Student ID", "Name", *payload["subjects"]])
        calculated, _ = analyze(data, payload["scale"], payload["pass_mark"])
        return {**payload, "results": calculated.to_dict(orient="records")}

    def write_class(payload, revision):
        payload = {**payload, "updated_at": timestamp()}
        payload.pop("revision", None)
        with connect() as db:
            cursor = db.execute(
                "UPDATE classes SET payload = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
                (json.dumps(payload, allow_nan=False), payload["id"], revision),
            )
            if cursor.rowcount != 1:
                raise HTTPException(409, "This class changed in another window. Refresh the class before saving again.")
        return detail({**payload, "revision": revision + 1})

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/classes")
    def classes():
        with connect() as db:
            rows = db.execute("SELECT payload, revision FROM classes ORDER BY rowid").fetchall()
        return [
            {key: value for key, value in {**json.loads(row["payload"]), "revision": row["revision"]}.items() if key != "records"}
            for row in rows
        ]

    @app.post("/api/classes", status_code=201)
    def new_class(body: NewClass):
        try:
            subjects = validate_subjects(body.subjects)
            if not body.name.strip() or not body.term.strip():
                raise ValueError("Enter a class name and term.")
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        payload = {
            "id": str(uuid4()), "name": body.name.strip(), "term": body.term.strip(),
            "subjects": subjects, "scale": DEFAULT_SCALE.copy(), "pass_mark": 40,
            "records": [], "updated_at": timestamp(),
        }
        with connect() as db:
            db.execute("INSERT INTO classes VALUES (?, ?, 1)", (payload["id"], json.dumps(payload)))
        return detail({**payload, "revision": 1})

    @app.get("/api/classes/{class_id}")
    def get_class(class_id: str):
        return detail(read_class(class_id))

    @app.put("/api/classes/{class_id}/records")
    def update_records(class_id: str, body: RecordsUpdate):
        payload = read_class(class_id)
        try:
            payload["records"] = clean_records(body.records, payload["subjects"])
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        return write_class(payload, body.revision)

    @app.put("/api/classes/{class_id}/rules")
    def update_rules(class_id: str, body: RulesUpdate):
        payload = read_class(class_id)
        try:
            validate_rules(body.scale, body.pass_mark)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        payload.update(scale=body.scale, pass_mark=body.pass_mark)
        return write_class(payload, body.revision)

    @app.post("/api/classes/{class_id}/import")
    def import_csv(class_id: str, body: CSVImport):
        payload = read_class(class_id)
        try:
            imported = parse_csv(body.csv_text, payload["subjects"])
            combined = imported if body.replace else [*payload["records"], *imported]
            if len(combined) > 10000:
                raise ValueError("A class can contain at most 10,000 students.")
            payload["records"] = clean_records(combined, payload["subjects"])
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        return write_class(payload, body.revision)

    @app.get("/api/classes/{class_id}/export")
    def export(class_id: str, raw: bool = False):
        payload = detail(read_class(class_id))
        columns = ["Student ID", "Name", *payload["subjects"]]
        if not raw:
            columns += ["Total", "Average", "Grade", "Status", "Position"]
        data = pd.DataFrame(payload["records" if raw else "results"], columns=columns)
        # Prevent spreadsheet programs from treating user-supplied text as formulas.
        def safe_cell(value):
            if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")):
                return "'" + value
            return value
        data = data.map(safe_cell)
        data.columns = [safe_cell(column) for column in data.columns]
        filename = "student_marks.csv" if raw else "student_results.csv"
        return Response(data.to_csv(index=False).encode("utf-8-sig"), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    # A production build is served by the same Python process, avoiding CORS setup.
    if (ROOT / "dist" / "index.html").exists():
        app.mount("/assets", StaticFiles(directory=ROOT / "dist" / "assets"), name="assets")

        @app.get("/favicon.svg", include_in_schema=False)
        def favicon():
            return FileResponse(ROOT / "dist" / "favicon.svg")

        @app.get("/school-logo.svg", include_in_schema=False)
        def school_logo():
            return FileResponse(ROOT / "dist" / "school-logo.svg")

        @app.get("/", include_in_schema=False)
        def frontend():
            return FileResponse(ROOT / "dist" / "index.html")

    return app


app = create_app()
