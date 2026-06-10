---
name: sanitize-validate
description: >
  Input sanitization, validation, and security hardening for user-facing applications.
  Use this skill when the user works with user input, form data, API request handling,
  database queries, authentication fields, file uploads, or any data that comes from
  external sources. Also activate when the user mentions XSS, SQL injection, CSRF,
  input cleaning, data validation, form security, or OWASP-related topics. Even if
  the user just says "secure this endpoint" or "check my form handler" or "sanitize
  this field" — trigger this skill. The core principle: never trust external data.
---

# Sanitize & Validate — Input Security Skill

## Core Principle

**Never trust external data.** Every piece of data that enters your system from outside
(user input, API payloads, URL parameters, file uploads, cookies, headers) must pass
through a three-stage pipeline before it touches your database, renders on a page, or
gets passed to another system.

The pipeline order matters:

```
1. SANITIZE  — Clean the data (remove dangerous content, normalize format)
2. VALIDATE  — Check the data (does it meet business rules?)
3. ESCAPE    — Contextual encoding for output (HTML, SQL, URL, CLI)
```

Each stage serves a different purpose. Skipping any of them creates a vulnerability.

---

## Stage 1: Sanitize (Clean)

Sanitization transforms dirty input into safe, normalized data. It does NOT reject input —
it fixes it. Think of it as a shower for data before letting it into your house.

### What Sanitization Does

| Operation | Example Input | Example Output |
|-----------|--------------|----------------|
| Trim whitespace | `"  ivan@mail.com "` | `"ivan@mail.com"` |
| Strip HTML tags | `"<b>Hi</b>"` | `"Hi"` |
| Normalize case | `"Ivan@Mail.COM"` | `"ivan@mail.com"` |
| Remove control chars | `"text\x00null"` | `"textnull"` |
| Normalize unicode | `"caf\u00e9"` | `"cafe"` (NFC) |
| Encode special chars | `<script>alert(1)</script>` | `&lt;script&gt;alert(1)&lt;/script&gt;` |

### Critical Rule: Sanitize Per Output Context

The SAME data needs different sanitization depending on WHERE it will be used:

- **HTML output** → escape `<`, `>`, `&`, `"`, `'` → use DOMPurify or html-escape
- **SQL queries** → use parameterized queries (prepared statements), NOT string escaping
- **URL parameters** → use `encodeURIComponent()` / `urllib.parse.quote()`
- **CLI arguments** → NEVER pass raw user input to shell commands
- **JavaScript context** → use `JSON.stringify()` for embedding in `<script>` tags
- **CSS context** → escape non-alphanumeric chars, validate color values

### Common Mistakes in Sanitization

**MISTAKE 1: Using regex to strip HTML**

```javascript
// BROKEN — regex can't parse HTML reliably
value.replace(/<[^>]*>?/gm, '')
// Fails on: "a < b && b > c" → removes "b && b >"
// Fails on: "<script>alert(1)" → doesn't match (no closing >)
```

Instead, use a proper HTML sanitizer library (see Recommended Libraries below).

**MISTAKE 2: Only sanitizing on the client side**

Client-side sanitization is UX only. An attacker can bypass it with curl, Postman, or
a modified browser. Sanitization and validation MUST happen on the server.

**MISTAKE 3: Sanitizing before validation**

Always validate first if you want to give meaningful error messages. If you sanitize first,
you might mask the fact that the user entered something invalid. However, if the sanitization
removes content the user intentionally provided, validate on the ORIGINAL input first.

### Recommended Libraries

| Language | Library | Use Case |
|----------|---------|----------|
| JavaScript (browser) | **DOMPurify** | HTML sanitization (removes XSS while keeping safe HTML) |
| JavaScript (Node.js) | **sanitize-html** | Server-side HTML sanitization |
| JavaScript/TypeScript | **Zod** | Schema validation + type coercion (not sanitization) |
| JavaScript/TypeScript | **Valibot** | Lightweight alternative to Zod |
| JavaScript/TypeScript | **escape-html** | Minimal HTML entity escaping |
| Python | **nh3** | Fast HTML sanitization (Python port of Ammonia) |
| Python | **bleach** | HTML sanitization (legacy, maintained by Mozilla) |
| Python | **marshmallow** | Schema validation + serialization |
| Python | **pydantic** | Data validation + type coercion |
| PHP | `htmlspecialchars()` | Built-in HTML escaping |
| PHP | `filter_var()` | Built-in input filtering and validation |

---

## Stage 2: Validate (Check)

Validation checks whether data meets your business rules. Unlike sanitization, validation
REJECTS invalid data — it returns errors, not cleaned data.

### Validation Returns Detailed Errors, Not Just true/false

Modern validation libraries return structured error objects that tell you exactly what is
wrong, so you can show helpful messages to users:

```typescript
// Zod example
const emailSchema = z.string().email("Invalid email format");
const result = emailSchema.safeParse("not-an-email");
if (!result.success) {
  // result.error.issues = [{ path: ["email"], message: "Invalid email format" }]
}
```

### Validation Checklist by Field Type

| Field Type | Rules to Check |
|-----------|---------------|
| Email | Valid format (RFC 5322 simplified), length ≤ 254 chars |
| Password | Min 8 chars, mixed case + digit + special char (policy varies) |
| Phone | Valid pattern for region, digits only after stripping formatting |
| Name | Letters and spaces only (policy varies for unicode names) |
| Age/Number | Integer, min/max range for the context |
| URL | Valid URL format, allowed protocols (http/https only) |
| Date | Valid date, not in the future for birth dates, etc. |
| Text/Comment | Max length, no empty after trim |
| File upload | Allowed MIME types, max size, filename sanitization |
| ID/UUID | Valid format, exists in database (if applicable) |

### Common Validation Mistakes

**MISTAKE 1: Confusing R-squared with accuracy**

```python
# WRONG label for regression metrics
print(f"Accuracy: {model.score(X_test, y_test):.2f}")
# model.score() for LinearRegression returns R-squared, NOT accuracy

# CORRECT
print(f"R-squared: {model.score(X_test, y_test):.2f}")
```

**MISTAKE 2: Accepting any string from the client without length checks**

An attacker can send a 10MB string in a "username" field. Always set max length.

**MISTAKE 3: Using `typeof` for runtime type checking in TypeScript**

```typescript
// BROKEN — TypeScript types are erased at runtime
function handle(input: string) { /* input can be anything at runtime */ }

// CORRECT — use runtime validation
const inputSchema = z.string();
const result = inputSchema.safeParse(rawInput);
```

---

## Stage 3: Escape (Contextual Encoding)

Even after sanitization and validation, you must encode data for its OUTPUT context.
This is the last line of defense.

### Escape for HTML

```javascript
// Use a library — never write your own
import escapeHtml from 'escape-html';
const safe = escapeHtml(userInput);
```

```python
import html
safe = html.escape(user_input)
```

### Escape for SQL — Always Use Parameterized Queries

```javascript
// CORRECT — parameterized query
const result = await db.query('SELECT * FROM users WHERE email = $1', [userEmail]);

// WRONG — string interpolation (SQL injection)
const result = await db.query(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

```python
# CORRECT — parameterized query
cursor.execute("SELECT * FROM users WHERE email = %s", (user_email,))

# WRONG — f-string (SQL injection)
cursor.execute(f"SELECT * FROM users WHERE email = '{user_email}'")
```

### Escape for URLs

```javascript
const safeParam = encodeURIComponent(userInput);
// Use in URL: `/search?q=${safeParam}`
```

```python
from urllib.parse import quote
safe_param = quote(user_input)
```

---

## Complete Example: User Registration Endpoint

This example shows all three stages working together in a Node.js/Express API:

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import escapeHtml from 'escape-html';

// Stage 1: Define validation schema
const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Invalid email format").max(254),
  bio: z.string().max(500).optional(),
});

// Stage 2: Validate + Sanitize
app.post('/api/register', async (req, res) => {
  // Step 2a: Validate raw input
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }

  // Step 2b: Sanitize validated data
  const clean = {
    username: result.data.username.toLowerCase(),
    email: result.data.email.toLowerCase(),
    bio: result.data.bio
      ? DOMPurify.sanitize(result.data.bio, { ALLOWED_TAGS: [] }) // strip all HTML
      : null,
  };

  // Step 2c: Store in database (parameterized query — no manual escaping)
  await db.query(
    'INSERT INTO users (username, email, bio) VALUES ($1, $2, $3)',
    [clean.username, clean.email, clean.bio]
  );

  res.status(201).json({ message: 'Registration successful' });
});
```

---

## Framework-Specific Guidance

When working within specific frameworks, follow their built-in security patterns.
Read the appropriate reference file for detailed patterns:

- **references/javascript.md** — React, Next.js, Express, NestJS, Vue patterns
- **references/python.md** — FastAPI, Django, Flask patterns

### Quick Reference by Framework

| Framework | Sanitize HTML | Validate Input | Escape Output |
|-----------|--------------|----------------|---------------|
| React | Auto-escapes JSX expressions | Zod/Valibot + useForm | Auto-escaped in JSX (unless `dangerouslySetInnerHTML`) |
| Next.js | Same as React + `next/image` | Server actions: Zod validation | `next/image` for images, auto-escape for text |
| Vue | `v-html` is UNSAFE by default | VeeValidate + Zod | Auto-escaped in `{{ }}`, use `v-html` only with sanitized content |
| Express | Middleware: `helmet`, `express-rate-limit` | Zod in route handler | Template engine auto-escape (EJS, Pug) |
| NestJS | Pipes + DTOs | `class-validator` + `class-transformer` | Template engine |
| FastAPI | Pydantic models (auto-validate) | Pydantic `Field()` constraints | Jinja2 auto-escape (ON by default) |
| Django | Auto-escape in templates | Forms + Model validation | Auto-escaped in templates (unless `\|safe`) |

---

## Security Checklist

Before deploying any endpoint that handles user input, verify:

- [ ] All user input is validated with a schema (Zod, Pydantic, class-validator, etc.)
- [ ] HTML content is sanitized with DOMPurify / sanitize-html / nh3 (not regex)
- [ ] SQL queries use parameterized statements (never string interpolation)
- [ ] Output is auto-escaped or manually escaped for its context
- [ ] File uploads validate MIME type, file size, and sanitize filename
- [ ] Rate limiting is applied to auth endpoints (login, registration, password reset)
- [ ] No user input is passed to `eval()`, `exec()`, `child_process`, or `os.system()`
- [ ] Cookies use `httpOnly`, `secure`, and `sameSite` flags
- [ ] CSRF tokens are used for state-changing requests (POST/PUT/DELETE)
- [ ] Error messages don't leak internal implementation details

---

## What This Skill Does NOT Cover

This skill focuses on input sanitization and validation. It does NOT replace:
- Authentication/authorization frameworks (OAuth, JWT, Passport, etc.)
- Full OWASP Top 10 coverage (use a dedicated security audit for that)
- Infrastructure security (HTTPS, CORS headers — use `helmet` / `cors` middleware)
- Penetration testing
