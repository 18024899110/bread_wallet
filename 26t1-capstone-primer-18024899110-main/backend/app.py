from flask import Flask, jsonify, request
from flask_cors import CORS

import db

app = Flask(__name__)
CORS(app)

# Instructions:
# - Use the functions in backend/db.py in your implementation.
# - You are free to use additional data structures in your solution
# - You must define and tell your tutor one edge case you have devised and how you have addressed this


def _error(message, status=404):
    return jsonify({"error": message}), status


def _parse_json():
    data = request.get_json(silent=True)
    if data is None or not isinstance(data, dict):
        return None, _error("Invalid JSON body")
    return data, None


def _validate_name_course(name, course):
    if not isinstance(name, str) or name.strip() == "":
        return "name is required"
    if not isinstance(course, str) or course.strip() == "":
        return "course is required"
    return None


def _validate_mark(mark):
    if not isinstance(mark, int):
        return "mark must be an integer"
    if mark < 0 or mark > 100:
        return "mark must be between 0 and 100"
    return None


@app.route("/students")
def get_students():
    """
    Route to fetch all students from the database
    return: Array of student objects
    """
    return jsonify(db.get_all_students()), 200


@app.route("/students", methods=["POST"])
def create_student():
    """
    Route to create a new student
    param name: The name of the student (from request body)
    param course: The course the student is enrolled in (from request body)
    param mark: The mark the student received (from request body)
    return: The created student if successful
    """

    student_data, err = _parse_json()
    if err:
        return err

    name = student_data.get("name")
    course = student_data.get("course")
    mark = student_data.get("mark", 0)

    msg = _validate_name_course(name, course)
    if msg:
        return _error(msg)

    msg = _validate_mark(mark)
    if msg:
        return _error(msg)

    created = db.insert_student(name.strip(), course.strip(), mark)
    return jsonify(created), 200


@app.route("/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    """
    Route to update student details by id
    param name: The name of the student (from request body)
    param course: The course the student is enrolled in (from request body)
    param mark: The mark the student received (from request body)
    return: The updated student if successful
    """
    student_data, err = _parse_json()
    if err:
        return err

    # allow partial updates
    name = student_data.get("name", None)
    course = student_data.get("course", None)
    mark = student_data.get("mark", None)

    if name is not None and (not isinstance(name, str) or name.strip() == ""):
        return _error("name must be a non-empty string")
    if course is not None and (not isinstance(course, str) or course.strip() == ""):
        return _error("course must be a non-empty string")
    if mark is not None:
        msg = _validate_mark(mark)
        if msg:
            return _error(msg)

    updated = db.update_student(
        student_id,
        name=name.strip() if isinstance(name, str) else name,
        course=course.strip() if isinstance(course, str) else course,
        mark=mark,
    )
    if not updated:
        return _error("student not found")
    return jsonify(updated), 200


@app.route("/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    """
    Route to delete student by id
    return: The deleted student
    """
    deleted = db.delete_student(student_id)
    if not deleted:
        return _error("student not found")
    return jsonify(deleted), 200


@app.route("/stats")
def get_stats():
    """
    Route to show the stats of all student marks 
    return: An object with the stats (count, average, min, max)
    """
    students = db.get_all_students()
    marks = [s.get("mark") for s in students if isinstance(s.get("mark"), int)]

    if len(marks) == 0:
        # Edge-case: empty DB (or no valid marks) returns zeros instead of error
        return jsonify({"count": 0, "average": 0, "min": 0, "max": 0}), 200

    count = len(marks)
    total = sum(marks)
    average = total / count
    return (
        jsonify(
            {
                "count": count,
                "average": average,
                "min": min(marks),
                "max": max(marks),
            }
        ),
        200,
    )


@app.route("/")
def health():
    """Health check."""
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
