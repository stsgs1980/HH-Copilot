# HH Bot - Automated Job Search System

Telegram bot for automatic response to relevant vacancies on HH.ru with AI-powered matching and browser automation.

## Project Overview

HH Bot is a comprehensive automation system that:
- Searches for relevant vacancies on HH.ru
- Scores and matches vacancies against user resumes
- Automatically applies to suitable positions
- Manages negotiations with employers
- Provides Telegram bot and web dashboard interfaces

## Features

- [W] Playwright-based browser automation for HH.ru
- [W] AI-powered cover letter generation (OpenAI GPT-4o-mini)
- [W] Multi-factor vacancy matching engine
- [W] Telegram bot interface
- [W] Web dashboard (Next.js)
- [W] Automatic and semi-automatic application modes
- [W] Real-time negotiation monitoring
- [W] Anti-detection measures and human-like behavior

## Technology Stack

### Backend (Python)
- FastAPI 0.110+ - REST API
- aiogram 3.13+ - Telegram bot framework
- Playwright 1.45+ - Browser automation
- SQLAlchemy 2.0+ - Database ORM
- Celery 5.4+ - Background tasks
- Redis 5.0+ - Task queue broker
- OpenAI 1.35+ - AI integration
- scikit-learn 1.5+ - ML matching engine

### Frontend (Next.js)
- Next.js (React framework)
- TypeScript
- Tailwind CSS

### Database
- SQLite (development)
- PostgreSQL (production ready)

## Prerequisites

- Python 3.12+
- Node.js 18+
- Redis server
- Telegram bot token
- OpenAI API key (for cover letters)
- HH.ru account credentials

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd hh-bot
```

### 2. Python Backend Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -e .

# Install Playwright browsers
python -m playwright install chromium --with-deps
```

### 3. Frontend Setup (Optional)

```bash
cd src/app
npm install
npm run build
```

### 4. Configuration

Create `.env` file in root directory:

```env
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_here

# HH.ru Credentials (for Playwright auth)
HH_EMAIL=your_hh_email
HH_PASSWORD=your_hh_password

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/hh_bot.db

# Redis
REDIS_URL=redis://localhost:6379/0

# Browser
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# Rate Limits
DAILY_REPLY_LIMIT=50
MIN_MATCH_SCORE=70

# Anti-Detection
ANTI_DETECT_ENABLED=true
GAUSSIAN_MEAN_SEC=10.0
GAUSSIAN_STDDEV_SEC=4.0
READING_PAUSE_MIN_SEC=5.0
READING_PAUSE_MAX_SEC=12.0
LONG_PAUSE_EVERY_N=5
LONG_PAUSE_DURATION_SEC=30.0

# Matching Engine
EMBEDDING_WEIGHT=0.30
SKILLS_WEIGHT=0.25
EXPERIENCE_WEIGHT=0.20
POSITION_WEIGHT=0.15
EDUCATION_WEIGHT=0.10
```

### 5. Database Initialization

```bash
python -c "from src.db.database import init_db; import asyncio; asyncio.run(init_db())"
```

## Running the Application

### Option 1: Run Individually

```bash
# Start Telegram Bot
python -m scripts.run_bot

# Start FastAPI Backend
python -m scripts.run_api

# Start Background Worker
python -m scripts.run_worker
```

### Option 2: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Development Mode

```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - Bot
python -m scripts.run_bot

# Terminal 3 - API
uvicorn src.api.app:app --reload --port 8000

# Terminal 4 - Worker
celery -A src.worker.celery_app worker --loglevel=info --beat
```

## Usage

### Via Telegram Bot

1. Start your Telegram bot: `/start`
2. Authorize with HH.ru (email + password)
3. Upload or sync your resumes
4. Search for vacancies
5. Apply to suitable positions

### Via Web Dashboard

1. Access dashboard at `http://localhost:3000`
2. Configure search parameters
3. View and manage vacancies
4. Monitor applications and negotiations

## Project Structure

```
hh-bot/
├── src/
│   ├── api/           # FastAPI REST API
│   ├── bot/           # Telegram bot handlers
│   ├── db/            # Database models and repositories
│   ├── hh/            # HH.ru integration (Playwright)
│   ├── matching/      # Matching engine
│   ├── services/      # Business logic layer
│   ├── utils/         # Utilities and helpers
│   └── worker/        # Celery background tasks
├── tests/             # Test files
├── data/              # Database files
├── docker-compose.yml # Docker configuration
└── README.md          # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Start Playwright authentication
- `GET /api/auth/status` - Check authorization status
- `POST /api/auth/solve-captcha` - Submit CAPTCHA solution
- `POST /api/auth/verify-2fa` - Submit 2FA code

### Resumes
- `GET /api/resumes` - Get user resumes
- `POST /api/resumes/sync` - Sync resumes from HH.ru

### Vacancies
- `GET /api/vacancies` - Get stored vacancies
- `POST /api/vacancies/search` - Search new vacancies
- `POST /api/vacancies/apply` - Apply to vacancy

### Negotiations
- `GET /api/negotiations` - Get negotiations list
- `POST /api/negotiations/message` - Send message

## Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_matching.py

# Run with coverage
pytest --cov=src tests/
```

## Troubleshooting

### Browser Automation Issues

**Problem**: Playwright cannot connect to browser
**Solution**: 
```bash
python -m playwright install chromium --with-deps
```

### Database Lock Issues

**Problem**: SQLite database locked
**Solution**: Stop all processes and delete `.db-wal` files

### Redis Connection Issues

**Problem**: Worker cannot connect to Redis
**Solution**: Ensure Redis is running on `localhost:6379`

### Telegram Bot Not Responding

**Problem**: Bot does not respond to commands
**Solution**: Check `BOT_TOKEN` in `.env` file

## Development Workflow

1. Create feature branch
2. Make changes with tests
3. Run tests: `pytest`
4. Run linting: `ruff check src/`
5. Commit with conventional commits
6. Push and create PR

## Contributing

1. Follow UNICODE_POLICY v2.1 - no emoji in code
2. Write tests for new features
3. Update documentation
4. Follow PEP 8 style guide
5. Use type hints for functions

## Security Notes

- Never commit `.env` file
- Use environment variables for secrets
- Rotate API keys regularly
- Use HTTPS in production
- Implement rate limiting

## Performance Optimization

- Use PostgreSQL for production
- Enable Redis caching
- Configure Celery worker count
- Use database indexes
- Monitor resource usage

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create GitHub issue
- Check existing documentation
- Review troubleshooting section

## Roadmap

- [ ] Enhanced anti-detection measures
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Integration with other job platforms

---

Built with: Python 3.12 + FastAPI + Playwright + Celery + Next.js