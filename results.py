"""The calculation functions, kept separate so you can explain and test them."""
import pandas as pd

DEFAULT_SCALE = {"A": 70, "B": 60, "C": 50, "D": 45, "E": 40}
RESERVED = {"Total", "Average", "Grade", "Status", "Position"}


def grade(mark, scale=None):
    scale = DEFAULT_SCALE if scale is None else scale
    for letter in ("A", "B", "C", "D", "E"):
        if mark >= scale[letter]:
            return letter
    return "F"


def validate_marks(data):
    """Return clean marks, or raise a useful error without inventing missing marks."""
    if not data.columns.is_unique:
        raise ValueError("Column names must be unique.")
    if not {"Student ID", "Name"}.issubset(data.columns):
        raise ValueError("Include Student ID and Name columns.")
    subjects = [c for c in data.columns if c not in ("Student ID", "Name")]
    if not subjects:
        raise ValueError("Include at least one subject column.")
    if any(not str(c).strip() or c in RESERVED for c in subjects):
        raise ValueError("Use non-empty subject names other than Total, Average, Grade, Status or Position.")
    clean = data.dropna(how="all").copy()
    for column in ("Student ID", "Name"):
        if clean[column].isna().any():
            raise ValueError(f"Every student needs a {column}.")
        clean[column] = clean[column].astype(str).str.strip()
        if clean[column].eq("").any():
            raise ValueError(f"Every student needs a {column}.")
    if clean["Student ID"].str.casefold().duplicated().any():
        raise ValueError("Student IDs must be unique. Names may be the same.")
    for subject in subjects:
        marks = pd.to_numeric(clean[subject], errors="coerce")
        if marks.isna().any() or not marks.between(0, 100).all():
            raise ValueError(f"{subject}: enter a number between 0 and 100 for every student.")
        clean[subject] = marks.astype(float)
    return clean.reset_index(drop=True), subjects


def analyze(data, scale=None, pass_mark=40):
    scale = DEFAULT_SCALE if scale is None else scale
    boundaries = [scale[k] for k in ("A", "B", "C", "D", "E")]
    if not (100 >= boundaries[0] > boundaries[1] > boundaries[2] > boundaries[3] > boundaries[4] >= 0):
        raise ValueError("Grade boundaries must descend strictly from A to E, between 0 and 100.")
    if not 0 <= pass_mark <= 100:
        raise ValueError("Pass mark must be between 0 and 100.")
    results, subjects = validate_marks(data)
    results["Total"] = results[subjects].sum(axis=1)
    # Grade and rank use the unrounded average; rounding is only for display.
    averages = results[subjects].mean(axis=1)
    results["Average"] = averages
    results["Grade"] = averages.apply(lambda mark: grade(mark, scale))
    results["Status"] = averages.apply(lambda mark: "Pass" if mark >= pass_mark else "Needs improvement")
    results["Position"] = averages.rank(method="min", ascending=False).astype(int)
    return results.sort_values(["Position", "Student ID"]).reset_index(drop=True), subjects
