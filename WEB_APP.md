# SmartSchool web app

Bright Future School is a fictional school with a custom navy and gold crest. The interface uses React, Tailwind CSS and Recharts. Python + FastAPI handles authentication, validation and calculations. SQLite saves records.

## Open the presentation

Double-click **Run SmartSchool.cmd**, then click **Open presentation demo**. Open http://127.0.0.1:8000 if the server is already running. Keep the terminal window open; press Ctrl+C to stop it.

The demo button signs into the teacher account: username `teacher`, password `BrightFuture2026!`. The first setup needs internet access. Once dependencies are installed, the presentation runs locally.

See [SMARTSCHOOL_PRESENTATION.md](SMARTSCHOOL_PRESENTATION.md) for a short panel walkthrough and architecture explanation.

## Pages and behavior

- **Dashboard:** school totals, outstanding results (grade A), selected class average, pass rate, overall performance and top students.
- **Students:** add or edit ID, name and gender; register students in a class and academic session; view results.
- **Results:** enter subject totals or CA/exam scores. Python calculates total, average, grade, remark and position. Export saved results as CSV.
- **Analytics:** subject averages, grade distribution, highest-performing subjects, student performance, male/female averages and term-to-term averages. Select a grade to filter the student chart; select a student bar to open their report.
- **Student Report:** school crest, student details, CA, exam, total and subject grade; summary, editable teacher comment and signature lines. Print / Save PDF uses the browser's print dialog.
- **Settings:** edit school grading boundaries and pass mark; add classes and academic sessions; view the system architecture.

The demo has 12 fictional students, 2 classes, 5 subjects, session 2026/2027 and explicitly fictional records for all three terms. John's initial SS2 Science report has total 375, average 75.0%, grade A and position 3rd.

CA is out of 30 and exams are out of 70. Totals are out of 100. Total-only entry leaves the CA/exam breakdown blank. Missing scores remain pending and are excluded from complete-result averages and rankings. Equal averages share a position, with the next position skipped. All subjects have equal weight; exact averages determine grades and positions.

Student IDs are unique across the school. An existing ID can be registered in a new academic session with matching identity details; results are not copied. A student's class cannot be changed for a session once marks have been recorded.

School records are saved in `data/classroom.sqlite3`. The original web app's records remain in their existing table. Back up this database while the server is stopped. CSV result exports are reports, not complete database backups.

Conflicting mark or grading updates are rejected instead of overwriting newer records. Use Refresh school data to load changes saved in another browser window. Charts update after saving; updates are not pushed between windows automatically.

## Run manually

On another computer, install Python 3.11 or newer and Node.js 22.12 or newer first. From PowerShell in this folder:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd ci
npm.cmd run build
.\.venv\Scripts\python.exe launch.py
```

For development, use two terminals:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173. Vite forwards `/api` requests to Python. The built interface and API are served together on port 8000. API documentation is at http://127.0.0.1:8000/docs.

## Project map

| File | Purpose |
| --- | --- |
| `src/SchoolApp.tsx` | Login, navigation, selection and API calls |
| `src/SchoolPages.tsx` | Dashboard, student register, results grid, report and settings |
| `src/SchoolCharts.tsx` | Six interactive analytics charts |
| `src/SchoolForms.tsx` | Student, score, class and session forms |
| `src/styles.css` | Tailwind styles, mobile layout and A4 print layout |
| `public/school-logo.svg` | Bright Future School crest |
| `backend/school.py` | School database tables, login, validation, reports and analytics |
| `backend/main.py` | FastAPI entry point, static files and retained legacy API |
| `results.py` | Original grading, total, average and ranking calculations |
| `launch.py` | Starts Python and opens the browser |
| `app.py` | Original Streamlit interface |

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_api.py tests/test_school.py -q
npm.cmd run build
npm.cmd run test:ui
```

Backend checks cover authentication, validation, calculations, pending results, ties, persistence, session registration and conflicting updates. Browser checks use installed Chrome and a separate database on port 8001. They cover the six pages, student registration, score entry, report printing, teacher comments, grading changes, class setup and mobile navigation. Screenshots are saved in `.qa/`.

## Hosting

The included Dockerfile packages the built interface and Python API together:

```sh
docker build -t smartschool .
docker run --rm -p 8000:8000 -v smartschool-data:/data smartschool
```

Keep a persistent volume at `/data`, or set `CLASSROOM_DB` to another persistent database location. Use a single server instance with this SQLite configuration. Public hosting has not been performed or tested.

This presentation uses public demo teacher credentials. For real school records, replace them with private credentials, add teacher/student permissions and establish backups before deployment. Separate parent/student portals are outside this presentation's scope.
