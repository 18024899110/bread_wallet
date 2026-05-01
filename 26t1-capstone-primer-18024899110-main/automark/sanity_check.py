"""
Public sanity checks for the student grading system.
Students can run: docker compose --profile debug up automark
These tests are visible and verify basic correctness.
"""
import requests
import psycopg2
import time
import sys

time.sleep(3)

def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)

# Health
r = requests.get("http://backend:5000/")
if r.status_code != 200:
    fail("Backend health check failed")

# Students list
r = requests.get("http://backend:5000/students")
print("Status", r.status_code)
if r.status_code != 200:
    fail("GET /students failed")

data = r.json()
if not data:
    fail("No students returned")

# Database reachable and has data
conn = psycopg2.connect(
    host="db", database="marksdb", user="marksuser", password="markspass"
)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM students;")
if cur.fetchone()[0] < 1:
    fail("Database empty")
cur.close()
conn.close()

# Stats endpoint exists and returns required keys
r = requests.get("http://backend:5000/stats")
if r.status_code != 200:
    fail("GET /stats failed (implement the /stats endpoint)")
try:
    stats = r.json()
except Exception:
    fail("GET /stats did not return valid JSON")
for key in ("count", "average", "min", "max"):
    if key not in stats:
        fail(f"GET /stats must include '{key}'")

# Create student and verify it persists
create = requests.post(
    "http://backend:5000/students",
    json={"name": "Sanity Student", "course": "COMP1531", "mark": 50},
)
if create.status_code != 200:
    fail("POST /students failed (check create_student and db.insert_student)")
r2 = requests.get("http://backend:5000/students")
names = [s.get("name") for s in r2.json()]
if "Sanity Student" not in names:
    fail("New student did not persist (ensure you are using the db.py methods or double check your docker volume)")

print("SANITY CHECK PASSED")
