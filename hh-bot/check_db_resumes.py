import sqlite3
conn = sqlite3.connect("data/hh_bot.db")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(resumes)")
print("Columns:", [col[1] for col in cursor.fetchall()])
cursor.execute("SELECT id, title FROM resumes")
for row in cursor.fetchall():
    print(row)
