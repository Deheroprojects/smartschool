# SmartSchool Results Analytics System

**School:** Bright Future School. **Motto:** Learn. Lead. Excel.

The school name, crest and student records are fictional presentation material.

## Start

Double-click **Run SmartSchool.cmd**. The browser opens at http://127.0.0.1:8000. Click **Open presentation demo**. Keep the terminal window open while presenting.

The teacher login is real: username `teacher`, password `BrightFuture2026!`. The demo button signs into this account for you. These public demo credentials are for the local presentation, not a deployed school system.

## What to say first

“SmartSchool helps a school enter student marks, calculate results automatically and understand performance through charts. React provides the interface, Python processes the marks, and SQLite saves the records.”

## A simple demonstration

1. **Dashboard:** show 12 students, 2 classes, 5 subjects and 6 outstanding results. Outstanding means grade A. Explain that school totals cover the selected session, while class averages cover the selected class and term.
2. **Students:** point out ID, name, gender, class and session. Add a student if you want to show the form. Their result stays pending until marks are entered.
3. **Results:** show John and Mary’s five subjects. Edit a total and click Save marks. Python automatically recalculates total, average, grade, remark and position. Use CA & exam to enter a detailed breakdown.
4. **Analytics:** show subject averages, grade distribution, strongest subjects, student performance, male/female averages and term-to-term averages. Select another class or term. The three seeded terms are explicitly fictional demo data.
5. **Student Report:** select John Doe. The initial report has a total of 375, average of 75.0%, grade A and position 3rd. Mathematics is CA 25 + exam 53 = 78. Print / Save PDF produces the school report sheet.
6. **Settings:** show the grade boundaries and open View system architecture.

The full-screen icon starts presentation mode. Navigation remains available across the top. Press Escape or the icon again to leave.

## Understand the three parts

| Part | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React + Tailwind CSS + Recharts | Pages, forms, school branding and charts |
| Backend | Python + FastAPI | Authentication, validation, calculations, remarks and ranking |
| Database | SQLite | Students, classes, subjects, academic sessions, results and users |

The flow is: **Enter marks → Python calculates → SQLite saves → React displays.**

The original `results.py` still calculates grades, totals, averages and positions. `backend/school.py` adds the school records, CA/exam scores and analytics. `src/SchoolApp.tsx` connects the pages to the API.

## Answers to likely panel questions

- **How are results calculated?** Add subject totals and divide by the number of subjects. Compare the exact average with grade boundaries. Rank complete results from highest average to lowest.
- **What about missing marks?** Keep them empty. An incomplete result has no overall grade, average or position and is excluded from charts that require a complete result.
- **How are ties handled?** Equal averages share the same position; the next position is skipped.
- **What is CA?** Continuous assessment, out of 30. The exam is out of 70. They add to a subject total out of 100.
- **What if only the total is entered?** The report shows the total and leaves CA/exam blank rather than inventing a breakdown.
- **Does closing the browser lose data?** No. Submitted changes remain in SQLite. Unsaved input must be saved first.
- **Are the gender comparisons causal?** No. They are descriptive averages of the recorded complete results, with the group sizes shown.
- **Can it serve a real school?** This version is a local demonstration with public teacher credentials. Deployment would need private credentials, user permissions and backups.

School records live in `data/classroom.sqlite3`. The previous app’s class records remain in their original table; the new school demonstration uses separate tables in the same database.
