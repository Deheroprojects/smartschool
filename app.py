"""Run with: python -m streamlit run app.py"""
from pathlib import Path

import pandas as pd
import streamlit as st

from results import DEFAULT_SCALE, RESERVED, analyze, grade, validate_marks

st.set_page_config(page_title="Student Results Analyzer", page_icon="🎓", layout="wide")
st.title("🎓 Student Results Analyzer")
st.write("Turn student marks into grades, class summaries and performance charts.")

if "marks" not in st.session_state:
    st.session_state.marks = pd.DataFrame({
        "Student ID": pd.Series(dtype="str"), "Name": pd.Series(dtype="str"),
        "Mathematics": pd.Series(dtype="float"), "English": pd.Series(dtype="float"),
        "Science": pd.Series(dtype="float"),
    })
    st.session_state.version = 0


def replace_marks(data):
    st.session_state.marks = data
    st.session_state.version += 1


with st.sidebar:
    st.header("Grading rules")
    scale = {letter: st.number_input(f"Minimum for {letter}", 0, 100, minimum)
             for letter, minimum in DEFAULT_SCALE.items()}
    pass_mark = st.number_input("Pass mark", 0, 100, 40)
    st.caption("All subjects have equal weight. Overall pass/fail uses the student's average.")
    st.caption("Grades use the exact average before display rounding. Equal averages share a position; the next position is skipped.")
    st.divider()
    if st.button("Load sample class", width="stretch"):
        sample = pd.read_csv(Path(__file__).with_name("sample_marks.csv"), dtype={"Student ID": str})
        replace_marks(sample)
        st.rerun()
    st.caption("Loading the sample replaces the current class. Download your marks first if needed.")
    st.caption("Work is kept during this session. Download marks to save them, then import them next time.")

entry, dashboard, individual, explanation = st.tabs([
    "1 · Enter marks", "2 · Class dashboard", "3 · Student report", "4 · How it works"
])

with entry:
    st.subheader("Set up your class")
    with st.expander("Change subjects (before entering marks)"):
        with st.form("subjects"):
            names = st.text_input("Subject names, separated by commas", "Mathematics, English, Science")
            if st.form_submit_button("Set subjects"):
                subjects = [s.strip() for s in names.split(",")]
                if not st.session_state.marks.empty:
                    st.error("Subjects can only be changed while the class is empty.")
                elif not all(subjects) or len({s.casefold() for s in subjects}) != len(subjects):
                    st.error("Enter unique, non-empty subject names.")
                elif any(s.casefold() in {x.casefold() for x in RESERVED | {"Student ID", "Name"}} for s in subjects):
                    st.error("Use subject names other than the student or result column names.")
                else:
                    replace_marks(pd.DataFrame({
                        "Student ID": pd.Series(dtype="str"), "Name": pd.Series(dtype="str"),
                        **{s: pd.Series(dtype="float") for s in subjects},
                    }))
                    st.rerun()

    upload = st.file_uploader("Import marks from CSV", type="csv")
    st.caption("CSV columns: Student ID, Name, then one column per subject. Marks must be from 0 to 100.")
    if upload is not None and st.button("Import this CSV"):
        try:
            imported = pd.read_csv(upload, dtype={"Student ID": str}, keep_default_na=False)
            clean, _ = validate_marks(imported)
            replace_marks(clean)
            st.rerun()
        except (ValueError, pd.errors.ParserError, UnicodeDecodeError) as error:
            st.error(f"Could not import: {error}")

    current = st.session_state.marks
    subjects = list(current.columns[2:])
    st.subheader("Add a student")
    with st.form(f"new_student_{st.session_state.version}", clear_on_submit=True):
        left, right = st.columns(2)
        student_id = left.text_input("Student ID")
        name = right.text_input("Student name")
        inputs = st.columns(min(4, len(subjects)))
        marks = {subject: inputs[i % len(inputs)].number_input(subject, 0.0, 100.0, 0.0, 1.0)
                 for i, subject in enumerate(subjects)}
        if st.form_submit_button("Add student"):
            row = {"Student ID": student_id, "Name": name, **marks}
            candidate = pd.concat([current, pd.DataFrame([row])], ignore_index=True)
            try:
                clean, _ = validate_marks(candidate)
                replace_marks(clean)
                st.rerun()
            except ValueError as error:
                st.error(str(error))

    st.subheader("Edit your class")
    st.caption("Edit cells or add/delete rows, then click Save table changes to update the analysis.")
    with st.form(f"edit_marks_{st.session_state.version}"):
        edited = st.data_editor(
            current, num_rows="dynamic", hide_index=True, width="stretch",
            column_config={s: st.column_config.NumberColumn(s, min_value=0, max_value=100, required=True)
                           for s in subjects},
        )
        if st.form_submit_button("Save table changes"):
            try:
                clean, _ = validate_marks(edited)
                replace_marks(clean)
                st.rerun()
            except ValueError as error:
                st.error(str(error))
    st.download_button("Download marks for later", st.session_state.marks.to_csv(index=False).encode("utf-8-sig"),
                       "student_marks.csv", "text/csv")

try:
    results, subjects = analyze(st.session_state.marks, scale, pass_mark)
except ValueError as error:
    st.error(str(error))
    st.stop()

with dashboard:
    if results.empty:
        st.info("Add a student or load the sample class to see your dashboard.")
    else:
        st.subheader("Class overview")
        metrics = st.columns(4)
        metrics[0].metric("Students", len(results))
        metrics[1].metric("Class average", f"{results['Average'].mean():.2f}%")
        metrics[2].metric("Highest average", f"{results['Average'].max():.2f}%")
        metrics[3].metric("Pass rate", f"{results['Status'].eq('Pass').mean() * 100:.1f}%")
        left, right = st.columns(2)
        with left:
            st.write("**Average mark by subject**")
            st.bar_chart(results[subjects].mean().rename("Average mark"), color="#2563eb")
        with right:
            st.write("**Overall grade distribution**")
            counts = results["Grade"].value_counts().reindex(list("ABCDEF"), fill_value=0)
            st.bar_chart(counts.rename("Students"), color="#16a34a")
        st.subheader("Results table")
        selected = st.multiselect("Filter table by grade", list("ABCDEF"), default=list("ABCDEF"))
        filtered = results[results["Grade"].isin(selected)]
        st.caption("Overview and charts show the whole class. The filter applies to this table and its download.")
        st.dataframe(filtered, hide_index=True, width="stretch",
                     column_config={"Average": st.column_config.NumberColumn(format="%.2f")})
        st.download_button("Download displayed results", filtered.to_csv(index=False).encode("utf-8-sig"),
                           "student_results.csv", "text/csv")

with individual:
    if results.empty:
        st.info("Add students to view individual reports.")
    else:
        names = results.set_index("Student ID")["Name"].to_dict()
        chosen = st.selectbox("Choose a student", results["Student ID"].tolist(),
                              format_func=lambda sid: f"{names[sid]} ({sid})")
        row = results.loc[results["Student ID"].eq(chosen)].iloc[0]
        st.subheader(row["Name"])
        st.write(f"Average: **{row['Average']:.2f}%** · Grade: **{row['Grade']}** · Position: **{row['Position']}** · {row['Status']}")
        report = pd.DataFrame({"Mark": [row[s] for s in subjects],
                               "Grade": [grade(row[s], scale) for s in subjects]}, index=subjects)
        st.bar_chart(report["Mark"], color="#2563eb")
        st.dataframe(report, width="stretch")
        needs_support = [s for s in subjects if row[s] < pass_mark]
        if needs_support:
            st.warning("Subjects below the pass mark: " + ", ".join(needs_support))
        else:
            st.success("This student meets the pass mark in every subject.")

with explanation:
    st.subheader("The Python behind the project")
    st.write("1. Validate names, unique student IDs and marks between 0 and 100.")
    st.write("2. Add subject marks to find each student's total.")
    st.write("3. Divide the total by the number of subjects to find the average.")
    st.write("4. Compare the exact average with grade boundaries and the pass mark.")
    st.write("5. Rank the averages and summarize the class with charts.")
    st.code('''def grade(mark):
    if mark >= 70:
        return "A"
    elif mark >= 60:
        return "B"
    elif mark >= 50:
        return "C"
    elif mark >= 45:
        return "D"
    elif mark >= 40:
        return "E"
    return "F"''', language="python")
    st.caption("This teaching example uses the default scale. The working calculation in results.py uses the editable sidebar values.")
