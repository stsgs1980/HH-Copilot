import http.client
import ssl
import json
import sys
import urllib.parse

with open(sys.argv[1], "r", encoding="utf-8") as f:
    content = f.read()

encoded = urllib.parse.urlencode({"out": "json", "content": content})

ctx = ssl.create_default_context()
conn = http.client.HTTPSConnection("validator.w3.org", context=ctx, timeout=30)
conn.request(
    "POST",
    "/nu/",
    body=encoded.encode("utf-8"),
    headers={
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0",
    },
)
resp = conn.getresponse()
print(f"Status: {resp.status}")
data = resp.read().decode("utf-8")
print(f"Response length: {len(data)}")
print(f"First 500 chars: {data[:500]}")
conn.close()
