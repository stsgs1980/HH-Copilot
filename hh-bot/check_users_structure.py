import sqlite3
conn = sqlite3.connect("data/hh_bot.db")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(users)")
for col in cursor.fetchall():
    print(col)
