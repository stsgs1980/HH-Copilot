import sqlite3
conn = sqlite3.connect("data/hh_bot.db")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
    print(f"{table[0]}: {cursor.fetchone()[0]} rows")
