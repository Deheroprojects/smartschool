# SmartSchool Results Analytics System

## Bright Future School presentation

The school app uses **React, Tailwind CSS and Recharts**, a **Python + FastAPI** backend, and **SQLite**. It includes a custom navy and gold school crest. Your original calculation code in `results.py` still calculates grades, totals, averages and positions.

**Double-click `Run SmartSchool.cmd`, then click Open presentation demo.** The launcher prepares dependencies, builds the interface and opens your browser at http://127.0.0.1:8000. Keep its terminal window open while presenting. Python and Node.js are already installed on this computer.

The six pages are Dashboard, Students, Results, Analytics, Student Report and Settings. The fictional demo includes 12 students, 2 classes, 5 subjects and three terms. You can register students, enter totals or CA/exam scores, compare performance, export results, and print a school report sheet.

Start with [SMARTSCHOOL_PRESENTATION.md](SMARTSCHOOL_PRESENTATION.md) for the panel walkthrough and a simple explanation of the architecture. [WEB_APP.md](WEB_APP.md) has technical setup and verification instructions.

## Original Streamlit prototype

The instructions below describe the original `app.py` prototype, which is still available separately.

A beginner-friendly Python presentation project: enter student marks, calculate grades and display performance charts. The sample class is fictional.

## Run on Windows

Install Python if needed from https://www.python.org/downloads/. Include Python in PATH during installation. Extract the project ZIP and open its folder in VS Code. Open Terminal > New Terminal and run these commands one at a time:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run app.py
```

If your computer uses `py` instead of `python`, use `py -m venv .venv` for the first command. Installation needs internet access. Once installed, the app runs locally without internet. Open the localhost address shown in the terminal. Stop it with Ctrl+C. To run it again, use the last command in the same folder.

## First demonstration

1. Click **Load sample class** in the sidebar.
2. Open **Class dashboard** and explain the four summary numbers and charts.
3. Open **Student report**, select Daniel James and identify his low subject marks.
4. Return to **Enter marks**, change Daniel's Mathematics mark from 32 to 62, and click **Save table changes**. His average changes from 35 to 45 and his grade from F to D.
5. Add a student with a unique ID. Try adding the same ID again to show validation.
6. Filter the class results to grade A and download the displayed results.
7. Download the raw marks to save your work. You can import this marks file at your next session.

## Rules and limitations

- All marks are out of 100. Every student must have a mark in every subject. Missing values are rejected, rather than assumed to be zero.
- A: 70 and above; B: 60 to below 70; C: 50 to below 60; D: 45 to below 50; E: 40 to below 45; F: below 40. Decimal scores use these same boundaries.
- The default overall pass mark is 40. Pass/fail uses the average, so a student can pass overall while needing support in one subject. The individual report flags those subjects.
- All subjects have equal weight. Grade, pass/fail and rank use exact averages. Displayed averages round to two decimal places.
- Ties share a position and skip the next position: 1, 1, 3.
- The sidebar lets you change grade boundaries and the pass mark.
- Edit subjects while the class is empty, or import a marks CSV with different subject columns.
- Imports and loading the sample replace the current class. Download marks first to preserve them.
- Data is kept in the current browser session, not a database. Save by downloading raw marks and reload by importing them. The calculated results export is for reporting and is not the raw marks import format.
- This is a classroom demonstration, with no login system or permanent records database.

## Learn the code

Start with `results.py`: `grade` demonstrates loops and conditions, `validate_marks` demonstrates data checks, and `analyze` calculates totals, averages, grades and positions. Then read `app.py`, which connects these functions to the interface. `sample_marks.csv` supplies demonstration data.

Official Streamlit references: https://docs.streamlit.io/get-started/tutorials/create-an-app and https://docs.streamlit.io/develop/api-reference/data/st.data_editor.
