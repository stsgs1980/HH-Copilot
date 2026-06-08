"""Run the FastAPI API server for the web dashboard."""

import os
import sys

# Remove DATABASE_URL from environment — it's set by the Next.js/Prisma project
# and conflicts with our SQLAlchemy URL format (file: vs sqlite+aiosqlite:///)
if "DATABASE_URL" in os.environ:
    del os.environ["DATABASE_URL"]

# Ensure hh-bot is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn


def main():
    uvicorn.run(
        "src.api.app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
        limit_concurrency=20,
        timeout_keep_alive=30,
    )


if __name__ == "__main__":
    main()
