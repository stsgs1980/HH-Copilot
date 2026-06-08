# OAuth Removal Instructions

## Files to Modify

### 1. config.py
Remove OAuth-related configuration:

```python
# REMOVE THESE LINES:
# hh_client_id: str = Field(default="")
# hh_client_secret: str = Field(default="")
# hh_redirect_uri: str = Field(default="http://localhost:3000/auth/callback")

# REMOVE THESE PROPERTIES:
# @property
# def hh_auth_url(self) -> str:
#     return "https://hh.ru/oauth/authorize"

# @property
# def hh_token_url(self) -> str:
#     return "https://hh.ru/oauth/token"
```

### 2. .env.example
Remove OAuth credentials:

```env
# REMOVE THESE LINES:
# HH_CLIENT_ID=your_hh_client_id
# HH_CLIENT_SECRET=your_hh_client_secret
# HH_REDIRECT_URI=https://hh.ru/oauth/authorize
```

### 3. src/hh/auth.py
Delete entire file or replace with deprecation notice.

### 4. src/hh/api_client.py
Delete entire file or replace with deprecation notice.

## Import Updates

### Files that import OAuth modules:

#### src/bot/handlers/auth.py
Already updated to Playwright version.

#### src/hh/hybrid_client.py
Check for OAuth imports and update if needed.

#### src/worker/tasks.py
Remove any references to:
- `from src.hh.api_client import HHApiClient`
- `from src.hh.auth import HHAuth`

## Testing After Removal

1. Start bot: `python -m scripts.run_bot`
2. Test authentication flow
3. Test vacancy search
4. Test application to vacancy
5. Verify no OAuth-related errors in logs

## Verification Commands

```bash
# Check for remaining OAuth references
grep -r "oauth" src/ --include="*.py"
grep -r "OAuth" src/ --include="*.py"
grep -r "HHAuth" src/ --include="*.py"
grep -r "HHApiClient" src/ --include="*.py"

# Check for deprecated config values
grep -r "hh_client_id" src/ --include="*.py"
grep -r "hh_client_secret" src/ --include="*.py"
grep -r "hh_redirect_uri" src/ --include="*.py"
```

## Clean Environment Variables

Remove from production `.env`:
- `HH_CLIENT_ID`
- `HH_CLIENT_SECRET`
- `HH_REDIRECT_URI`

Add if not present:
- `HH_EMAIL` (optional, for re-auth)
- `HH_PASSWORD` (optional, for re-auth)

## Database Cleanup

Optional SQL to clean OAuth tokens:

```sql
-- Remove OAuth tokens (keep cookies for Playwright)
UPDATE users 
SET hh_access_token = NULL, 
    hh_refresh_token = NULL, 
    hh_token_expires_at = NULL
WHERE hh_cookies IS NOT NULL;
```

## Rollback Plan

If issues occur after removal:

1. Restore files from `deprecated/` directory
2. Restore environment variables
3. Restart services
4. Check for specific issues

## Success Criteria

- [ ] No OAuth imports in main code
- [ ] No OAuth configuration in .env
- [ ] All authentication uses Playwright
- [ ] No OAuth-related errors in logs
- [ ] All bot functions working correctly

## Post-Removal Validation

Run these tests to verify system works without OAuth:

1. Authentication flow test
2. Vacancy search test
3. Application test
4. Background worker test

---

Built with: Python 3.12 + Playwright