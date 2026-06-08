# HH Bot - System Architecture

## System Overview

HH Bot is a distributed job automation system consisting of multiple services that work together to automatically search, score, and apply to relevant vacancies on HH.ru.

## Architecture Diagram

```text
+-------------------+     +-------------------+     +-------------------+
|   Telegram Bot    |     |   FastAPI API    |     |   Background     |
|   (aiogram)       |     |   (REST)         |     |   Worker         |
|                   |     |                   |     |   (Celery)       |
+--------+----------+     +---------+---------+     +--------+----------+
         |                         |                         |
         |                         |                         |
         +-------------------------+---------+---------------+
                                       |
                                       v
                                +------------------+
                                |   PostgreSQL/    |
                                |   SQLite         |
                                |   Database       |
                                +------------------+
                                       |
                                       v
                                +------------------+
                                |   Playwright     |
                                |   Browser Engine |
                                +------------------+
                                       |
                                       v
                                +------------------+
                                |   HH.ru          |
                                |   Website        |
                                +------------------+
```

## Core Components

### 1. Telegram Bot Service (`src/bot/`)

**Purpose**: User interface for job automation via Telegram

**Key Modules**:
- `dispatcher.py` - Bot setup and startup
- `handlers/` - Command and callback handlers
- `keyboards/` - Inline keyboards for user interaction
- `states/` - FSM states for conversation flow

**Handlers**:
- `auth.py` - Playwright-based authentication
- `search.py` - Vacancy search and browsing
- `apply.py` - Application to vacancies
- `resume.py` - Resume management
- `negotiations.py` - Employer chat management
- `settings.py` - User preferences

**Data Flow**:
```
User Command -> Handler -> Service Layer -> Database/HH.ru
User Response -> Handler -> Action -> Update User
```

### 2. FastAPI Backend (`src/api/`)

**Purpose**: REST API for web dashboard and external integrations

**Key Modules**:
- `app.py` - FastAPI application setup
- `auth.py` - Authentication endpoints
- `resumes.py` - Resume management endpoints
- `vacancies.py` - Vacancy management endpoints
- `negotiations.py` - Negotiation endpoints
- `stats.py` - Statistics and reporting

**API Endpoints**:
```
POST /api/auth/login              - Start Playwright auth
GET  /api/auth/login-status       - Check auth progress
POST /api/auth/solve-captcha      - Submit CAPTCHA
POST /api/auth/verify-2fa         - Submit 2FA code
GET  /api/auth/status             - Check authorization status
GET  /api/resumes                 - Get user resumes
POST /api/resumes/sync            - Sync resumes from HH.ru
GET  /api/vacancies               - Get stored vacancies
POST /api/vacancies/search        - Search new vacancies
POST /api/vacancies/apply         - Apply to vacancy
GET  /api/negotiations            - Get negotiations
POST /api/negotiations/message    - Send message
```

### 3. Background Worker (`src/worker/`)

**Purpose**: Asynchronous task processing and periodic operations

**Key Modules**:
- `celery_app.py` - Celery configuration
- `tasks.py` - Background task implementations

**Periodic Tasks**:
```
periodic_vacancy_search (every 30 min):
  - For each authorized user
  - Search new vacancies
  - Score against resumes
  - Auto-apply if configured
  - Notify user of results

check_new_negotiations (every 15 min):
  - Check for new messages
  - Update negotiation status
  - Notify user of new messages

refresh_expired_tokens (every 2 hours):
  - Refresh HH.ru cookies
  - Verify session validity
  - Re-authenticate if needed
```

### 4. HH.ru Integration (`src/hh/`)

**Purpose**: Playwright-based browser automation for HH.ru operations

**Key Modules**:
- `browser_auth.py` - Login flow with CAPTCHA/2FA handling
- `browser_client.py` - Browser operations (apply, messages, scraping)
- `hybrid_client.py` - Unified client interface
- `selectors.py` - CSS selectors for HH.ru pages
- `anti_detect.py` - Human-like behavior simulation
- `models.py` - HH.ru data models

**Authentication Flow**:
```
1. User provides email/password
2. Playwright launches Chromium browser
3. Navigate to HH.ru login page
4. Fill credentials with human-like typing
5. Handle CAPTCHA if detected
6. Handle 2FA if required
7. Extract cookies on success
8. Save cookies to database
9. Close browser session
```

**Browser Operations**:
```
apply_to_vacancy():
  - Navigate to vacancy page
  - Click "Apply" button
  - Handle alerts/relocation
  - Fill cover letter (optional)
  - Submit application
  - Verify success

send_message():
  - Navigate to negotiation page
  - Find message input
  - Fill message text
  - Send message
  - Verify delivery

scrape_vacancy():
  - Navigate to vacancy page
  - Extract title, company, salary
  - Extract skills, description
  - Parse location, experience
  - Return structured data
```

### 5. Matching Engine (`src/matching/`)

**Purpose**: Multi-factor scoring for vacancy-resume relevance

**Key Module**:
- `engine.py` - Scoring algorithms

**Scoring Components**:
```
Total Score = Weighted Sum of:

1. Embedding Similarity (30% weight)
   - Semantic similarity between vacancy and resume
   - Uses token overlap approximation (MVP)
   - Future: OpenAI embeddings

2. Skills Overlap (25% weight)
   - Jaccard similarity of skill sets
   - Partial match bonus for related skills
   - Returns matched/missing skills

3. Experience Match (20% weight)
   - Required vs actual experience years
   - Bonus for exceeding requirements
   - Penalty for insufficient experience

4. Position Title (15% weight)
   - Token overlap of position titles
   - Checks experience positions
   - Case-insensitive matching

5. Education Relevance (10% weight)
   - Base score for having education
   - Bonus for field-of-study match
   - Multi-degree bonus
```

**Scoring Process**:
```
Input: Vacancy + Resume
  -> Extract features (skills, experience, position, education)
  -> Calculate individual scores
  -> Apply weighted sum
  -> Return MatchResult (total score + breakdown)
  -> Filter by minimum threshold (default 70%)
```

### 6. Services Layer (`src/services/`)

**Purpose**: Business logic and orchestration

**Key Services**:
```
VacancyService:
  - Search parameter building
  - Vacancy storage and retrieval
  - Status management (new, applied, failed, skipped)

ResumeService:
  - Resume sync from HH.ru
  - Skills extraction
  - Experience formatting
  - Resume data management

NegotiationService:
  - Application orchestration
  - Cover letter generation
  - Batch processing
  - Negotiation sync
  - Rate limiting

RateLimiter:
  - Daily reply limit enforcement
  - Application cooldowns
  - Error counting
```

### 7. AI Integration (`src/ai/`)

**Purpose**: Cover letter generation and relevance assessment

**Key Modules**:
```
cover_letter.py:
  - OpenAI GPT-4o-mini integration
  - Prompt engineering
  - Content validation
  - Fallback templates

prompts.py:
  - System prompts for AI
  - User prompt templates
  - Career change handling

sanitizer.py:
  - Input sanitization
  - Prompt injection prevention
  - Content validation
```

**Cover Letter Generation**:
```
Input: Vacancy details + Resume skills
  -> Sanitize inputs
  -> Build AI prompt
  -> Call OpenAI API
  -> Validate output
  -> Return letter or fallback
```

## Database Schema

### Tables

**Users**:
```sql
id, email, password_hash, name, telegram_id,
hh_access_token (deprecated), hh_refresh_token (deprecated),
hh_cookies (Playwright), hh_email, is_authorized,
apply_mode, career_direction, min_match_score,
created_at, updated_at
```

**Resumes**:
```sql
id, user_id, hh_resume_id, title, position,
salary_from, salary_to, salary_currency,
skills (JSON), experience (JSON), education (JSON),
about, city, is_active, raw_data,
created_at, updated_at
```

**Vacancies**:
```sql
id, user_id, hh_vacancy_id, title, company,
salary_from, salary_to, salary_currency,
location, experience, employment, schedule,
skills (JSON), description, url,
match_score, status, cover_letter,
applied_at, raw_data,
created_at, updated_at
```

**Negotiations**:
```sql
id, user_id, vacancy_id, hh_negotiation_id,
employer_name, vacancy_title, state,
last_message, last_message_at, has_unread,
raw_data,
created_at, updated_at
```

**UserSettings**:
```sql
id, user_id,
search_area, search_specialization, search_experience,
search_employment, search_schedule,
exclude_keywords, include_keywords,
ai_tone, max_letter_words,
daily_reply_limit, auto_reply_enabled,
search_interval_min,
created_at
```

**ActivityLog**:
```sql
id, user_id, action, details, vacancy_id,
created_at
```

## Technology Stack Details

### Backend Frameworks

**FastAPI**:
- High-performance async framework
- Automatic API documentation
- Type hints validation
- WebSocket support

**aiogram**:
- Modern Telegram bot framework
- FSM (Finite State Machine)
- Router-based handlers
- Middleware support

**Playwright**:
- Browser automation
- Multi-browser support
- Network interception
- Screenshot/video capture

**Celery**:
- Distributed task queue
- Periodic task scheduling
- Result backend
- Task retries

### Database

**SQLite (Development)**:
- Zero configuration
- Single file storage
- Suitable for single user

**PostgreSQL (Production)**:
- Multi-user support
- Better performance
- ACID compliance
- Connection pooling

### ML/AI

**scikit-learn**:
- Text processing
- Similarity calculations
- Feature extraction

**OpenAI API**:
- GPT-4o-mini for cover letters
- Embedding support (future)
- Relevance assessment

## Data Flow Diagrams

### Authentication Flow

```text
User                  Bot                   BrowserAuth              Database
 |                      |                         |                      |
 |-- /start ----------->|                         |                      |
 |                      |-- Create session ------>|                      |
 |<-- Enter email ------|                         |                      |
 |-- email ------------>|                         |                      |
 |                      |-- Store email ---------->|                      |
 |<-- Enter password --|                         |                      |
 |-- password -------->|                         |                      |
 |                      |-- start_login() ------------------------------>|
 |                      |                         |-- Launch browser     |
 |                      |                         |-- Navigate to login  |
 |                      |                         |-- Fill credentials   |
 |                      |                         |-- Handle CAPTCHA/2FA |
 |                      |                         |-- Extract cookies    |
 |                      |<-- save_cookies() -----|                      |
 |<-- [SUCCESS] --------|                         |                      |
```

### Vacancy Search Flow

```text
User                  Bot                  MatchingEngine         HybridClient          HH.ru
 |                      |                         |                       |        |
 |-- Search query ---->|                         |                       |        |
 |                      |-- Get user skills       |                       |        |
 |                      |<---------------------->|                       |        |
 |                      |-- build_search_params() |                       |        |
 |                      |-- search_vacancies() ------------------------------>|
 |                      |                         |                       |-- Search page
 |                      |                         |                       |-- Parse results
 |                      |<-- vacancy list --------|                       |        |
 |                      |-- score_batch() --------------------------------->|
 |                      |                         |                       |-- Scrape details
 |                      |                         |                       |-- Score each
 |                      |<-- scored vacancies -----|                       |        |
 |                      |-- Save to database ------------------------------>|
 |<-- Results list -----|                         |                       |        |
```

### Application Flow

```text
User                  Bot              NegotiationService    HybridClient        HH.ru
 |                      |                       |                  |            |
 |-- Apply command ---->|                       |                  |            |
 |                      |-- get_resume()        |                  |            |
 |                      |-- generate_letter() -->|                  |            |
 |                      |                       |-- apply_to_vacancy() ------------------>|
 |                      |                       |                  |-- Navigate
 |                      |                       |                  |-- Click apply
 |                      |                       |                  |-- Fill letter
 |                      |                       |                  |-- Submit
 |                      |                       |<-- success --------|            |
 |                      |<-- [APPLIED] ---------|                  |            |
 |<-- Result ------------|                       |                  |            |
```

## Deployment Architecture

### Development Environment
```text
Single Machine:
  - Telegram Bot (port: none)
  - FastAPI (port: 8000)
  - Celery Worker (port: none)
  - Redis (port: 6379)
  - SQLite (file-based)
```

### Production Environment
```text
Docker Containers:
  - Bot Container (restart: always)
  - API Container (restart: always)
  - Worker Container (restart: always)
  - Redis Container (managed volume)
  - PostgreSQL Container (managed volume)
```

### Scalability Considerations

**Horizontal Scaling**:
- Multiple bot instances (user partitioning)
- Multiple worker instances (task distribution)
- API behind load balancer
- Redis cluster for session management

**Vertical Scaling**:
- More CPU for Playwright operations
- More RAM for browser instances
- Faster storage for database

## Security Architecture

### Authentication
- Playwright cookies instead of OAuth tokens
- Email/password not stored in database
- Session verification on each operation
- Automatic re-authentication on session expiry

### Data Protection
- Database encryption at rest
- HTTPS/TLS for communications
- Environment variables for secrets
- No password storage

### Anti-Detection
- Human-like timing delays
- Gaussian distribution for actions
- Random reading pauses
- Long pauses between operations
- Realistic typing simulation

## Monitoring and Logging

### Log Levels
```
DEBUG: Detailed diagnostic information
INFO: General operational messages
WARNING: Something unexpected but recoverable
ERROR: Error that prevented operation
CRITICAL: System failure
```

### Key Metrics
- Authentication success rate
- Vacancy search success rate
- Application success rate
- Response times
- Error rates
- Resource usage

## Error Handling Strategy

### Browser Errors
- Retry with backoff
- Screenshot capture for debugging
- User notification with error details
- Graceful degradation

### API Errors
- Circuit breaker pattern
- Automatic retries
- Fallback to alternative methods
- User notification

### Database Errors
- Transaction rollback
- Retry for transient errors
- Logging for investigation
- User notification

## Performance Optimization

### Caching Strategy
- Redis for session caching
- Database query caching
- Playwright context reuse
- Search result caching

### Async Operations
- All I/O operations are async
- Concurrent request handling
- Background task processing
- Non-blocking database operations

### Resource Management
- Browser context pooling
- Connection pooling
- Memory management
- Rate limiting

## Testing Strategy

### Unit Tests
- Individual component testing
- Mock external dependencies
- Fast execution
- High coverage

### Integration Tests
- Component interaction testing
- Database integration
- API endpoint testing
- Browser automation testing

### End-to-End Tests
- Complete workflow testing
- Real HH.ru interaction
- User scenario validation
- Performance testing

## Future Architecture Considerations

### Microservices Migration
- Separate bot service
- Separate API service
- Separate worker service
- Independent scaling

### Event-Driven Architecture
- Message queue integration
- Event sourcing
- CQRS pattern
- Real-time updates

### Advanced AI Integration
- Better embeddings
- RAG for resume matching
- ChatGPT integration
- Custom ML models

---

Built with: Python 3.12 + FastAPI + Playwright + Celery + PostgreSQL