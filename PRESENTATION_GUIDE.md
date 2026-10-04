# Your five-minute presentation

Use this as a practice outline and explain it in your own words.

## 0:00–0:40 · The problem

Teachers need to turn student marks into useful results. Manually calculating averages and grades takes time and can cause errors. This project uses Python to calculate results and show class performance interactively.

## 0:40–1:10 · Project objectives

Enter or import marks, calculate totals and averages, assign grades, show performance charts, and export results.

## 1:10–3:10 · Live demonstration

Load the fictional sample class. Show the class average, pass rate, subject averages and grade distribution. Choose Daniel James in the individual report. Edit his Mathematics mark from 32 to 62 and save the table. Explain why his average changes from 35 to 45 and his grade changes from F to D. Demonstrate duplicate-ID validation, then export a report.

## 3:10–4:20 · Python concepts

Explain variables and arithmetic for totals; conditions for grading; lists and dictionaries for subjects and records; functions to organize the logic; validation to prevent incorrect input; CSV handling to save and load data; and pandas to analyze the results. Streamlit provides the interactive interface. Mention which concepts were covered in your training and which you learned while building the project.

## 4:20–5:00 · Limitations and next steps

The current version assumes equal subject weights and stores work during a session. CSV downloads preserve the marks for later import. Possible future features include a database, teacher login and printable report cards.

## Questions to practise

- How is the average calculated? Total subject marks divided by the number of subjects.
- Why is 70 an A? It is the lower boundary in the confirmed grading scale; it can be changed in the sidebar.
- Can a student pass overall but fail one subject? Yes. Overall status uses the average, and individual subject warnings show where support is needed.
- What happens with missing marks? The app rejects incomplete records and asks for valid marks.
- Why use student IDs? Different students may share a name; each ID identifies one record.
- What happens when averages tie? They share a position, and the next position is skipped.
- Where is the information saved? In the current session until you download the marks CSV. There is no database in this version.

Before presenting, practise explaining `grade()` and `analyze()` without reading every line. Describe the assistance you used honestly, and focus on the parts you understand and can change yourself.
