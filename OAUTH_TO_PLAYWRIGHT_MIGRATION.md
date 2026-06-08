# OAuth to Playwright Migration Guide

## Overview

This document describes the migration from deprecated OAuth authentication to Playwright-based authentication in HH Bot.

## Background

HH.ru discontinued the Applicant API on December 15, 2025. The old OAuth-based authentication is no longer functional and must be replaced with Playwright browser automation.

## Files Created

### New Files (Playwright Auth)
1. `src/bot/handlers/auth_playwright.py` - Complete Playwright auth handler
2. `src/bot/handlers/auth_new.py` - Alternative implementation (backup)
3. `src/bot/states/states_updated.py` - Updated FSM states for Playwright flow

### Legacy Files (OAuth - To be Removed)
1. `src/hh/auth.py` - OAuth authentication (321 lines)
2. `src/hh/api_client.py` - API client with OAuth (323 lines)
3. `src/bot/handlers/auth.py` - Current OAuth-based handler

## Migration Steps

### Step 1: Backup Current Files
```bash
cp src/bot/handlers/auth.py src/bot/handlers/auth_oauth_backup.py
cp src/hh/auth.py src/hh/auth_oauth_backup.py
cp src/hh/api_client.py src/hh/api_client_oauth_backup.py
```

### Step 2: Update FSM States
Replace `src/bot/states/states.py` with `src/bot/states/states_updated.py`:

```bash
cp src/bot/states/states_updated.py src/bot/states/states.py
```

### Step 3: Update Bot Handler
Replace `src/bot/handlers/auth.py` with Playwright version:

```bash
cp src/bot/handlers/auth_new.py src/bot/handlers/auth.py
```

### Step 4: Update Dispatcher
Update `src/bot/dispatcher.py` to use new auth handler (if needed).

### Step 5: Test the Flow
1. Start Telegram bot
2. Send `/start` command
3. Enter email when prompted
4. Enter password when prompted
5. Handle CAPTCHA if appears
6. Handle 2FA if required

## New Authentication Flow

### 1. Start Command
```
User: /start
Bot: [WELCOME] Добро пожаловать в HH Bot!...
Bot: [AUTH] Введите ваш email от аккаунта HH.ru:
```

### 2. Email Input
```
User: myemail@example.com
Bot: [OK] Email сохранен...
Bot: Теперь введите ваш пароль от аккаунта HH.ru:
```

### 3. Password Input
```
User: mypassword
Bot: [PROCESSING] Запускаю авторизацию через браузер...
```

### 4a. Success
```
Bot: [OK] Авторизация успешна!...
```

### 4b. CAPTCHA Required
```
Bot: [CAPTCHA] Обнаружена CAPTCHA. Введите текст с картинки:
[CAPTCHA Image]
User: [enters CAPTCHA text]
Bot: [OK] Авторизация успешна! CAPTCHA пройдена.
```

### 4c. 2FA Required
```
Bot: [2FA] Требуется код подтверждения.
[2FA Screenshot]
Bot: Введите код из SMS или email:
User: [enters 2FA code]
Bot: [OK] Авторизация успешна! 2FA пройдена.
```

## Configuration Updates

### Remove from .env
```env
# Remove these deprecated OAuth credentials
# HH_CLIENT_ID=your_hh_client_id
# HH_CLIENT_SECRET=your_hh_client_secret
# HH_REDIRECT_URI=https://hh.ru/oauth/authorize
```

### Add to .env
```env
# Add Playwright credentials (optional, for re-auth)
HH_EMAIL=your_hh_email
HH_PASSWORD=your_hh_password
```

## Database Changes

### User Model Fields
- `hh_access_token` - Can be set to NULL (no longer used)
- `hh_refresh_token` - Can be set to NULL (no longer used)
- `hh_cookies` - Now PRIMARY authentication storage
- `hh_email` - Used for Playwright login and re-auth

## API Changes

### Python Backend
No changes required - FastAPI already uses Playwright authentication:
- `POST /api/auth/login` - Already uses Playwright
- `GET /api/auth/status` - Already checks cookies
- `POST /api/auth/solve-captcha` - Already implemented
- `POST /api/auth/verify-2fa` - Already implemented

### Frontend
No changes required - Next.js API routes already proxy to backend.

## Testing Checklist

- [ ] Email validation works
- [ ] Password input accepted
- [ ] Playwright browser launches correctly
- [ ] CAPTCHA detection and display works
- [ ] CAPTCHA solution submission works
- [ ] 2FA code input works
- [ ] Successful login saves cookies
- [ ] Failed login shows appropriate error
- [ ] Logout clears authentication
- [ ] Re-auth with saved credentials works

## Rollback Plan

If issues occur, rollback to OAuth version:

```bash
# Restore files
cp src/bot/handlers/auth_oauth_backup.py src/bot/handlers/auth.py
cp src/hh/auth_oauth_backup.py src/hh/auth.py
cp src/hh/api_client_oauth_backup.py src/hh/api_client.py

# Restart bot
python -m scripts.run_bot
```

## Troubleshooting

### Issue: Playwright Browser Not Found
**Solution**: Install Playwright browsers
```bash
python -m playwright install chromium --with-deps
```

### Issue: CAPTCHA Not Displaying
**Solution**: Check bot permissions for sending photos

### Issue: 2FA Code Not Accepted
**Solution**: Ensure code is numeric only, no spaces

### Issue: Cookies Not Saving
**Solution**: Check database permissions and User model

## Performance Considerations

- Playwright auth takes 30-60 seconds (vs 5-10 seconds for OAuth)
- Browser resources required (RAM, CPU)
- Session pool management needed for multiple users

## Security Notes

- Passwords are NOT stored in database
- Only cookies are persisted
- Email stored for re-auth convenience (optional)
- All browser sessions are cleaned up after auth

## Migration Timeline

1. **Day 1**: Test new auth flow in development
2. **Day 2**: Update production with rollback plan ready
3. **Day 3**: Monitor for issues and user feedback
4. **Day 7**: Remove OAuth backup files if stable

## Support

For issues during migration:
1. Check logs for detailed error messages
2. Verify Playwright installation
3. Test browser automation independently
4. Check HH.ru for login page changes

---

Built with: Python 3.12 + Playwright + aiogram