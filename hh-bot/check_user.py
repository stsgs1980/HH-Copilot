import sqlite3
conn = sqlite3.connect("data/hh_bot.db")
cursor = conn.cursor()
cursor.execute("SELECT * FROM users")
for row in cursor.fetchall():
    print(row)
