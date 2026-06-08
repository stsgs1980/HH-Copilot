import sqlite3
conn = sqlite3.connect("data/hh_bot.db")
cursor = conn.cursor()
cursor.execute("SELECT id, hh_resume_id, title, user_id FROM resumes")
for row in cursor.fetchall():
    print(row)
