"""Simple school domain: students, enrolment, CA/exams, reports and analytics."""
from datetime import datetime, timezone
import hashlib
import hmac
import json
import math
import secrets
import sqlite3
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
import pandas as pd
from pydantic import BaseModel, Field, model_validator

from results import DEFAULT_SCALE, analyze, grade

SCHOOL_NAME = "Bright Future School"
SUBJECTS = ["Mathematics", "English", "Biology", "Physics", "Chemistry"]
TERMS = ["First Term", "Second Term", "Third Term"]
DEMO_PASSWORD = "BrightFuture2026!"
REMARKS = {"A": "Excellent", "B": "Very good", "C": "Good", "D": "Fair", "E": "Pass", "F": "Needs improvement"}
COMMENTS = {
    "A": "Excellent academic performance. Keep up the good work.",
    "B": "Very good performance. With consistent effort, you can achieve even more.",
    "C": "Good performance. Continue studying regularly and strengthen weaker subjects.",
    "D": "Fair performance. More practice and focused study are needed.",
    "E": "You have made a start. Work closely with your teachers to improve.",
    "F": "Additional support and regular practice are needed. Keep working steadily.",
}


def password_hash(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310000).hex()


def initialize_school(connect):
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS school_settings (id INTEGER PRIMARY KEY, scale TEXT NOT NULL, pass_mark REAL NOT NULL, revision INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS school_classes (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
        CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
        CREATE TABLE IF NOT EXISTS class_subjects (class_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, PRIMARY KEY(class_id, subject_id), FOREIGN KEY(class_id) REFERENCES school_classes(id), FOREIGN KEY(subject_id) REFERENCES subjects(id));
        CREATE TABLE IF NOT EXISTS academic_sessions (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, student_code TEXT NOT NULL COLLATE NOCASE UNIQUE, name TEXT NOT NULL, gender TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS enrolments (student_id INTEGER NOT NULL, class_id INTEGER NOT NULL, session_id INTEGER NOT NULL, PRIMARY KEY(student_id, session_id), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(class_id) REFERENCES school_classes(id), FOREIGN KEY(session_id) REFERENCES academic_sessions(id));
        CREATE TABLE IF NOT EXISTS assessments (id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, session_id INTEGER NOT NULL, term TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, UNIQUE(class_id, session_id, term), FOREIGN KEY(class_id) REFERENCES school_classes(id), FOREIGN KEY(session_id) REFERENCES academic_sessions(id));
        CREATE TABLE IF NOT EXISTS school_results (assessment_id INTEGER NOT NULL, student_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, ca REAL, exam REAL, total REAL NOT NULL CHECK(total >= 0 AND total <= 100), PRIMARY KEY(assessment_id, student_id, subject_id), FOREIGN KEY(assessment_id) REFERENCES assessments(id), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(subject_id) REFERENCES subjects(id));
        CREATE TABLE IF NOT EXISTS report_comments (assessment_id INTEGER NOT NULL, student_id INTEGER NOT NULL, comment TEXT NOT NULL, PRIMARY KEY(assessment_id, student_id), FOREIGN KEY(assessment_id) REFERENCES assessments(id), FOREIGN KEY(student_id) REFERENCES students(id));
        CREATE TABLE IF NOT EXISTS school_users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at REAL NOT NULL, FOREIGN KEY(user_id) REFERENCES school_users(id));
        """)
        db.execute("INSERT OR IGNORE INTO school_settings VALUES (1, ?, 40, 1)", (json.dumps(DEFAULT_SCALE),))
        if not db.execute("SELECT 1 FROM school_users").fetchone():
            salt = secrets.token_hex(16)
            db.execute("INSERT INTO school_users (username, name, role, salt, password_hash) VALUES ('teacher', 'Demo Teacher', 'Teacher', ?, ?)", (salt, password_hash(DEMO_PASSWORD, salt)))
        if db.execute("SELECT 1 FROM school_classes").fetchone():
            return
        db.executemany("INSERT INTO school_classes (name) VALUES (?)", [("SS2 Science",), ("SS1 Science",)])
        db.executemany("INSERT INTO subjects (name) VALUES (?)", [(s,) for s in SUBJECTS])
        db.execute("INSERT INTO academic_sessions (name) VALUES ('2026/2027')")
        db.executemany("INSERT INTO class_subjects VALUES (?, ?)", [(c, s) for c in (1, 2) for s in range(1, 6)])
        for c in (1, 2):
            for term in TERMS:
                db.execute("INSERT INTO assessments (class_id, session_id, term) VALUES (?, 1, ?)", (c, term))
        demo = [
            ("BFS001", "John Doe", "Male", 1, [78, 72, 81, 69, 75], [25, 22, 24, 20, 23]),
            ("BFS002", "Mary James", "Female", 1, [65, 80, 74, 71, 68], [20, 25, 23, 22, 21]),
            ("BFS003", "Amina Yusuf", "Female", 1, [94, 88, 92, 89, 87], [29, 27, 28, 27, 26]),
            ("BFS004", "Esther Obi", "Female", 1, [89, 86, 85, 84, 86], [27, 26, 26, 25, 26]),
            ("BFS005", "David Okoro", "Male", 1, [68, 72, 70, 65, 69], [21, 22, 21, 20, 21]),
            ("BFS006", "Samuel Ade", "Male", 1, [55, 61, 58, 54, 62], [17, 19, 18, 17, 19]),
            ("BFS007", "Grace Bello", "Female", 1, [60, 64, 62, 57, 66], [18, 19, 19, 17, 20]),
            ("BFS008", "Daniel James", "Male", 1, [32, 38, 35, 28, 37], [10, 12, 11, 9, 11]),
            ("BFS009", "Sarah Eze", "Female", 2, [76, 82, 79, 72, 77], [23, 25, 24, 22, 23]),
            ("BFS010", "Michael Ali", "Male", 2, [72, 68, 74, 70, 71], [22, 21, 23, 21, 22]),
            ("BFS011", "Fatima Musa", "Female", 2, [58, 64, 61, 56, 60], [18, 20, 19, 17, 18]),
            ("BFS012", "Peter John", "Male", 2, [42, 46, 44, 38, 45], [13, 14, 13, 12, 14]),
        ]
        for code, name, gender, class_id, totals, cas in demo:
            sid = db.execute("INSERT INTO students (student_code, name, gender) VALUES (?, ?, ?)", (code, name, gender)).lastrowid
            db.execute("INSERT INTO enrolments VALUES (?, ?, 1)", (sid, class_id))
            for t, term in enumerate(TERMS):
                aid = db.execute("SELECT id FROM assessments WHERE class_id=? AND session_id=1 AND term=?", (class_id, term)).fetchone()[0]
                for subject_id, (total, ca) in enumerate(zip(totals, cas), 1):
                    # These are explicit fictional demo assessments, not inferred history.
                    exam = min(70, total - ca + t * (2 + subject_id % 2))
                    db.execute("INSERT INTO school_results VALUES (?, ?, ?, ?, ?, ?)", (aid, sid, subject_id, ca, exam, ca + exam))


class LoginBody(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class StudentBody(BaseModel):
    student_code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    gender: Literal["Male", "Female", "Not specified"]
    class_id: int
    session_id: int


class SubjectScore(BaseModel):
    ca: float | None = Field(default=None, ge=0, le=30, allow_inf_nan=False, strict=True)
    exam: float | None = Field(default=None, ge=0, le=70, allow_inf_nan=False, strict=True)
    total: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False, strict=True)

    @model_validator(mode="after")
    def check_score(self):
        if self.ca is not None or self.exam is not None:
            if self.ca is None or self.exam is None or self.total is not None:
                raise ValueError("Supply both CA and exam, or only a total score.")
        elif self.total is None:
            raise ValueError("Supply a total score or both CA and exam.")
        return self


class ResultEntry(BaseModel):
    student_id: int
    scores: dict[str, SubjectScore | None]


class ResultsBody(BaseModel):
    revision: int = Field(ge=1)
    entries: list[ResultEntry] = Field(min_length=1, max_length=10000)


class SchoolRulesBody(BaseModel):
    revision: int = Field(ge=1)
    scale: dict[str, float]
    pass_mark: float = Field(ge=0, le=100, allow_inf_nan=False)


class SchoolClassBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    subjects: list[str] = Field(min_length=1, max_length=20)


class SessionBody(BaseModel):
    name: str = Field(pattern=r"^\d{4}/\d{4}$")


class CommentBody(BaseModel):
    comment: str = Field(max_length=1000)


def school_router(connect):
    router = APIRouter(prefix="/api/school", tags=["SmartSchool"])

    def authenticated(request: Request):
        token = request.cookies.get("smartschool_session", "")
        digest = hashlib.sha256(token.encode()).hexdigest()
        with connect() as db:
            user = db.execute("SELECT u.id, u.name, u.role FROM auth_sessions a JOIN school_users u ON u.id=a.user_id WHERE a.token_hash=? AND a.expires_at>?", (digest, time.time())).fetchone()
        if user is None:
            raise HTTPException(401, "Please sign in to your school workspace.")
        return dict(user)

    def settings(db):
        row = db.execute("SELECT * FROM school_settings WHERE id=1").fetchone()
        return {"scale": json.loads(row["scale"]), "pass_mark": row["pass_mark"], "revision": row["revision"]}

    def assessment(db, class_id, session_id, term):
        if term not in TERMS:
            raise HTTPException(422, "Choose First Term, Second Term or Third Term.")
        row = db.execute("SELECT * FROM assessments WHERE class_id=? AND session_id=? AND term=?", (class_id, session_id, term)).fetchone()
        if row is None:
            raise HTTPException(404, "Class or session not found.")
        return row

    def subjects(db, class_id):
        return [dict(r) for r in db.execute("SELECT s.id, s.name FROM subjects s JOIN class_subjects cs ON cs.subject_id=s.id WHERE cs.class_id=? ORDER BY s.id", (class_id,))]

    def roster(db, session_id, class_id=None):
        query = "SELECT s.id, s.student_code, s.name, s.gender, e.class_id, c.name AS class_name, e.session_id, a.name AS session FROM students s JOIN enrolments e ON e.student_id=s.id JOIN school_classes c ON c.id=e.class_id JOIN academic_sessions a ON a.id=e.session_id WHERE e.session_id=?"
        params = [session_id]
        if class_id is not None:
            query += " AND e.class_id=?"
            params.append(class_id)
        return [dict(r) for r in db.execute(query + " ORDER BY s.name", params)]

    def class_results(db, class_id, session_id, term, rules):
        assess = assessment(db, class_id, session_id, term)
        subject_list = subjects(db, class_id)
        subject_names = [s["name"] for s in subject_list]
        raw = list(db.execute("SELECT r.*, s.name AS subject FROM school_results r JOIN subjects s ON s.id=r.subject_id WHERE assessment_id=?", (assess["id"],)))
        saved = {(r["student_id"], r["subject"]): r for r in raw}
        comments = {r["student_id"]: r["comment"] for r in db.execute("SELECT * FROM report_comments WHERE assessment_id=?", (assess["id"],))}
        rows = []
        complete = []
        for student in roster(db, session_id, class_id):
            scores = {}
            for name in subject_names:
                value = saved.get((student["id"], name))
                scores[name] = {"ca": value["ca"], "exam": value["exam"], "total": value["total"], "grade": grade(value["total"], rules["scale"])} if value else None
            ready = all(s is not None for s in scores.values())
            result = {**student, "scores": scores, "complete": ready, "total": None, "average": None, "grade": None, "remark": "Pending", "position": None, "status": "Pending", "comment": comments.get(student["id"], ""), "suggested_comment": "Complete all subject marks to generate the report.", "support_subjects": [n for n, s in scores.items() if s and s["total"] < rules["pass_mark"]]}
            rows.append(result)
            if ready:
                complete.append({"Student ID": student["student_code"], "Name": student["name"], **{n: scores[n]["total"] for n in subject_names}})
        if complete:
            calculated, _ = analyze(pd.DataFrame(complete), rules["scale"], rules["pass_mark"])
            lookup = {r["Student ID"]: r for r in calculated.to_dict(orient="records")}
            for row in rows:
                if row["complete"]:
                    r = lookup[row["student_code"]]
                    row.update(total=r["Total"], average=r["Average"], grade=r["Grade"], remark=REMARKS[r["Grade"]], position=r["Position"], status=r["Status"], suggested_comment=COMMENTS[r["Grade"]])
        rows.sort(key=lambda r: (r["position"] or 100000, r["name"]))
        return rows, dict(assess), subject_list

    @router.post("/login")
    def login(body: LoginBody, response: Response):
        with connect() as db:
            row = db.execute("SELECT * FROM school_users WHERE username=?", (body.username.strip(),)).fetchone()
            if row is None or not hmac.compare_digest(password_hash(body.password, row["salt"]), row["password_hash"]):
                raise HTTPException(401, "Incorrect username or password.")
            token = secrets.token_urlsafe(32)
            db.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (time.time(),))
            db.execute("INSERT INTO auth_sessions VALUES (?, ?, ?)", (hashlib.sha256(token.encode()).hexdigest(), row["id"], time.time() + 8 * 3600))
        response.set_cookie("smartschool_session", token, httponly=True, samesite="strict", max_age=8 * 3600)
        return {"name": row["name"], "role": row["role"]}

    @router.post("/logout")
    def logout(request: Request, response: Response):
        with connect() as db:
            db.execute("DELETE FROM auth_sessions WHERE token_hash=?", (hashlib.sha256(request.cookies.get("smartschool_session", "").encode()).hexdigest(),))
        response.delete_cookie("smartschool_session")
        return {"ok": True}

    @router.get("/me")
    def me(user=Depends(authenticated)):
        return user

    @router.get("/workspace")
    def workspace(class_id: int | None = None, session_id: int | None = None, term: str = "First Term", user=Depends(authenticated)):
        with connect() as db:
            classes = [dict(r) for r in db.execute("SELECT * FROM school_classes ORDER BY id")]
            sessions = [dict(r) for r in db.execute("SELECT * FROM academic_sessions ORDER BY name DESC")]
            class_id = class_id or classes[0]["id"]
            session_id = session_id or sessions[0]["id"]
            rules = settings(db)
            rows, assess, subject_list = class_results(db, class_id, session_id, term, rules)
            all_students = roster(db, session_id)
            complete = [r for r in rows if r["complete"]]
            school_rows = [r for c in classes for r in class_results(db, c["id"], session_id, term, rules)[0] if r["complete"]]
            subject_means = [{"subject": s["name"], "average": sum(r["scores"][s["name"]]["total"] for r in complete) / len(complete) if complete else None} for s in subject_list]
            gender_data = []
            for gender in ("Male", "Female", "Not specified"):
                group = [r for r in complete if r["gender"] == gender]
                gender_data.append({"gender": gender, "average": sum(r["average"] for r in group) / len(group) if group else None, "students": len(group)})
            term_data = []
            for t in TERMS:
                group = [r for r in class_results(db, class_id, session_id, t, rules)[0] if r["complete"]]
                term_data.append({"term": t, "average": sum(r["average"] for r in group) / len(group) if group else None, "students": len(group)})
            return {
                "school": {"name": SCHOOL_NAME, "motto": "Learn. Lead. Excel.", "demo": True}, "user": user,
                "classes": classes, "sessions": sessions, "terms": TERMS, "settings": rules,
                "selected": {"class_id": class_id, "session_id": session_id, "term": term},
                "assessment": assess, "subjects": subject_list, "students": all_students, "results": rows,
                "summary": {"total_students": len(all_students), "total_classes": len(classes), "total_subjects": db.execute("SELECT COUNT(*) FROM subjects").fetchone()[0], "outstanding": sum(r["grade"] == "A" for r in school_rows), "class_average": sum(r["average"] for r in complete) / len(complete) if complete else None, "pass_rate": 100 * sum(r["status"] == "Pass" for r in complete) / len(complete) if complete else None, "completed": len(complete)},
                "analytics": {"subjects": subject_means, "grades": [{"grade": g, "students": sum(r["grade"] == g for r in complete)} for g in "ABCDEF"], "gender": gender_data, "terms": term_data},
            }

    @router.post("/students", status_code=201)
    def add_student(body: StudentBody, user=Depends(authenticated)):
        code, name = body.student_code.strip(), body.name.strip()
        if not code or not name:
            raise HTTPException(422, "Enter a student ID and name.")
        try:
            with connect() as db:
                assessment(db, body.class_id, body.session_id, "First Term")
                existing = db.execute("SELECT * FROM students WHERE student_code=?", (code,)).fetchone()
                if existing:
                    if existing["name"].casefold() != name.casefold() or existing["gender"] != body.gender:
                        raise HTTPException(422, "This student ID already belongs to another profile. Use the same name and gender, or a different ID.")
                    sid = existing["id"]
                else:
                    sid = db.execute("INSERT INTO students (student_code, name, gender) VALUES (?, ?, ?)", (code, name, body.gender)).lastrowid
                db.execute("INSERT INTO enrolments VALUES (?, ?, ?)", (sid, body.class_id, body.session_id))
                db.execute("UPDATE assessments SET revision=revision+1 WHERE class_id=? AND session_id=?", (body.class_id, body.session_id))
        except sqlite3.IntegrityError as exc:
            raise HTTPException(422, "This student is already registered in this session. Student IDs must be unique.") from exc
        return {"id": sid, "name": name}

    @router.put("/students/{student_id}")
    def edit_student(student_id: int, body: StudentBody, user=Depends(authenticated)):
        code, name = body.student_code.strip(), body.name.strip()
        if not code or not name:
            raise HTTPException(422, "Enter a student ID and name.")
        try:
            with connect() as db:
                existing = db.execute("SELECT class_id FROM enrolments WHERE student_id=? AND session_id=?", (student_id, body.session_id)).fetchone()
                if existing is None:
                    raise HTTPException(404, "Student enrolment not found.")
                assessment(db, body.class_id, body.session_id, "First Term")
                if existing["class_id"] != body.class_id:
                    has_marks = db.execute("SELECT 1 FROM school_results r JOIN assessments a ON a.id=r.assessment_id WHERE r.student_id=? AND a.session_id=? LIMIT 1", (student_id, body.session_id)).fetchone()
                    if has_marks:
                        raise HTTPException(422, "This student already has results. Keep their current class for this session.")
                db.execute("UPDATE students SET student_code=?, name=?, gender=? WHERE id=?", (code, name, body.gender, student_id))
                db.execute("UPDATE enrolments SET class_id=? WHERE student_id=? AND session_id=?", (body.class_id, student_id, body.session_id))
                db.execute("UPDATE assessments SET revision=revision+1 WHERE session_id=? AND class_id IN (?, ?)", (body.session_id, existing["class_id"], body.class_id))
        except sqlite3.IntegrityError as exc:
            raise HTTPException(422, "Student IDs must be unique across the school.") from exc
        return {"ok": True}

    @router.put("/results")
    def save_results(body: ResultsBody, class_id: int, session_id: int, term: str, user=Depends(authenticated)):
        with connect() as db:
            assess = assessment(db, class_id, session_id, term)
            allowed = {s["name"]: s["id"] for s in subjects(db, class_id)}
            allowed_students = {s["id"] for s in roster(db, session_id, class_id)}
            if len({e.student_id for e in body.entries}) != len(body.entries):
                raise HTTPException(422, "Each student must appear once in a save.")
            for entry in body.entries:
                if entry.student_id not in allowed_students or set(entry.scores) != set(allowed):
                    raise HTTPException(422, "Marks must match students and subjects in the selected class.")
            if db.execute("UPDATE assessments SET revision=revision+1 WHERE id=? AND revision=?", (assess["id"], body.revision)).rowcount != 1:
                raise HTTPException(409, "Results changed in another window. Refresh before saving again.")
            for entry in body.entries:
                for name, score in entry.scores.items():
                    if score is None:
                        db.execute("DELETE FROM school_results WHERE assessment_id=? AND student_id=? AND subject_id=?", (assess["id"], entry.student_id, allowed[name]))
                    else:
                        total = score.total if score.total is not None else score.ca + score.exam
                        db.execute("INSERT INTO school_results VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(assessment_id,student_id,subject_id) DO UPDATE SET ca=excluded.ca, exam=excluded.exam, total=excluded.total", (assess["id"], entry.student_id, allowed[name], score.ca, score.exam, total))
        return {"ok": True}

    @router.put("/comments/{student_id}")
    def save_comment(student_id: int, body: CommentBody, class_id: int, session_id: int, term: str, user=Depends(authenticated)):
        with connect() as db:
            assess = assessment(db, class_id, session_id, term)
            if student_id not in {s["id"] for s in roster(db, session_id, class_id)}:
                raise HTTPException(404, "Student not found in this class.")
            db.execute("INSERT INTO report_comments VALUES (?, ?, ?) ON CONFLICT(assessment_id,student_id) DO UPDATE SET comment=excluded.comment", (assess["id"], student_id, body.comment.strip()))
        return {"ok": True}

    @router.put("/settings")
    def save_rules(body: SchoolRulesBody, user=Depends(authenticated)):
        if set(body.scale) != set(DEFAULT_SCALE) or any(not math.isfinite(v) for v in body.scale.values()):
            raise HTTPException(422, "Supply numeric boundaries for A through E.")
        try:
            analyze(pd.DataFrame(columns=["Student ID", "Name", "Subject"]), body.scale, body.pass_mark)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        with connect() as db:
            if db.execute("UPDATE school_settings SET scale=?, pass_mark=?, revision=revision+1 WHERE id=1 AND revision=?", (json.dumps(body.scale), body.pass_mark, body.revision)).rowcount != 1:
                raise HTTPException(409, "Grading rules changed. Refresh before saving again.")
        return {"ok": True}

    @router.post("/classes", status_code=201)
    def add_class(body: SchoolClassBody, user=Depends(authenticated)):
        name = body.name.strip()
        names = [s.strip() for s in body.subjects]
        reserved = {"student id", "name", "total", "average", "grade", "status", "position"}
        if not name or any(not s or len(s) > 80 or s.casefold() in reserved for s in names) or len({s.casefold() for s in names}) != len(names):
            raise HTTPException(422, "Enter a class name and unique, valid subject names.")
        try:
            with connect() as db:
                cid = db.execute("INSERT INTO school_classes (name) VALUES (?)", (name,)).lastrowid
                for s in names:
                    db.execute("INSERT OR IGNORE INTO subjects (name) VALUES (?)", (s,))
                    sid = db.execute("SELECT id FROM subjects WHERE name=?", (s,)).fetchone()[0]
                    db.execute("INSERT INTO class_subjects VALUES (?, ?)", (cid, sid))
                for session in db.execute("SELECT id FROM academic_sessions").fetchall():
                    for term in TERMS:
                        db.execute("INSERT INTO assessments (class_id, session_id, term) VALUES (?, ?, ?)", (cid, session["id"], term))
        except sqlite3.IntegrityError as exc:
            raise HTTPException(422, "This class name already exists.") from exc
        return {"id": cid}

    @router.post("/sessions", status_code=201)
    def add_session(body: SessionBody, user=Depends(authenticated)):
        start, end = map(int, body.name.split("/"))
        if end != start + 1:
            raise HTTPException(422, "Use consecutive years, for example 2026/2027.")
        try:
            with connect() as db:
                sid = db.execute("INSERT INTO academic_sessions (name) VALUES (?)", (body.name,)).lastrowid
                for c in db.execute("SELECT id FROM school_classes").fetchall():
                    for term in TERMS:
                        db.execute("INSERT INTO assessments (class_id,session_id,term) VALUES (?, ?, ?)", (c["id"], sid, term))
        except sqlite3.IntegrityError as exc:
            raise HTTPException(422, "This session already exists.") from exc
        return {"id": sid}

    return router
