#!/bin/bash
cd /home/z/my-project/hh-bot
export PYTHONPATH=/home/z/my-project/hh-bot
unset DATABASE_URL
exec python -c "
import os, sys, threading, time
if 'DATABASE_URL' in os.environ:
    del os.environ['DATABASE_URL']
sys.path.insert(0, '.')

import uvicorn

# Keep process alive
def keep_alive():
    while True:
        time.sleep(60)

t = threading.Thread(target=keep_alive, daemon=True)
t.start()

uvicorn.run('src.api.app:app', host='0.0.0.0', port=8000, log_level='info', limit_concurrency=10)
"
