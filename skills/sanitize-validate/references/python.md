# Python Framework Examples

## FastAPI

### Pydantic Model Validation

```python
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=1, max_length=50)

    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Must contain uppercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Must contain digit')
        return v


@app.post("/users")
async def create_user(user: UserCreate):
    # user is validated and typed
    return await db.users.create(user.dict())
```

### File Upload Security

```python
import magic
from fastapi import UploadFile, HTTPException

ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/webp'
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB

@app.post("/upload")
async def upload_file(file: UploadFile):
    # Check size
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large")

    # Check magic bytes, not Content-Type
    mime = magic.from_buffer(content, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Invalid file type")

    # Generate safe filename
    safe_name = f"{uuid.uuid4()}.{mime.split('/')[1]}"
    path = f"/uploads/{safe_name}"

    with open(path, "wb") as f:
        f.write(content)

    return {"filename": safe_name}
```

---

## Django

### Form Validation

```python
from django import forms
from django.core.validators import MinLengthValidator

class UserForm(forms.Form):
    email = forms.EmailField(max_length=254)
    password = forms.CharField(
        min_length=8,
        max_length=100,
        widget=forms.PasswordInput,
        validators=[MinLengthValidator(8)]
    )
    name = forms.CharField(min_length=1, max_length=50)

    def clean_password(self):
        password = self.cleaned_data['password']
        if not any(c.isupper() for c in password):
            raise forms.ValidationError("Must contain uppercase")
        return password


def register_view(request):
    if request.method == 'POST':
        form = UserForm(request.POST)
        if form.is_valid():
            # form.cleaned_data is validated
            User.objects.create_user(**form.cleaned_data)
    else:
        form = UserForm()
    return render(request, 'register.html', {'form': form})
```

### Model Validation

```python
from django.db import models
from django.core.exceptions import ValidationError

class User(models.Model):
    email = models.EmailField(max_length=254, unique=True)
    name = models.CharField(max_length=50)

    def clean(self):
        super().clean()
        # Custom validation logic
        if '@' in self.name:
            raise ValidationError("Name cannot contain @")
```

### Template Safety

```html
<!-- SAFE -- Django escapes by default -->
<div>{{ user_input }}</div>

<!-- DANGEROUS -- only with sanitized content -->
<div>{{ sanitized_html|safe }}</div>
```

```python
import nh3

def view(request):
    user_html = request.POST.get('content', '')
    # Allow-list sanitization
    sanitized_html = nh3.clean(
        user_html,
        tags={'b', 'i', 'a', 'p'},
        attributes={'a': {'href'}}
    )
    return render(request, 'template.html', {'sanitized_html': sanitized_html})
```

---

## Flask

### WTForms Validation

```python
from flask import Flask, request, render_template
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, validators

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'

class RegistrationForm(FlaskForm):
    email = StringField('Email', [
        validators.Email(),
        validators.Length(max=254)
    ])
    password = PasswordField('Password', [
        validators.Length(min=8, max=100),
        validators.EqualTo('confirm', message='Passwords must match')
    ])
    confirm = PasswordField('Confirm Password')


@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        # form.data is validated
        create_user(form.email.data, form.password.data)
    return render_template('register.html', form=form)
```

### Request Validation with Pydantic

```python
from pydantic import BaseModel, EmailStr, validator
from flask import request, jsonify

class UserInput(BaseModel):
    email: EmailStr
    name: str

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        user = UserInput(**request.json)
    except ValidationError as e:
        return jsonify({'error': e.errors()}), 400

    # user is validated
    return jsonify(user.dict())
```

---

## SQLAlchemy Safe Queries

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

# SAFE -- parameterized query
def get_user_by_email(db: Session, email: str):
    return db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": email}
    ).fetchone()

# SAFE -- ORM
def get_user_by_email_orm(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

# DANGEROUS -- SQL injection!
def get_user_unsafe(db: Session, email: str):
    return db.execute(
        text(f"SELECT * FROM users WHERE email = '{email}'")
    ).fetchone()  # NEVER do this
```

---

## General Python Security

### HTML Sanitization with nh3

```python
import nh3

def sanitize_html(html: str) -> str:
    """Sanitize HTML with allow-list approach."""
    return nh3.clean(
        html,
        tags={'p', 'b', 'i', 'a', 'ul', 'ol', 'li'},
        attributes={'a': {'href', 'title'}},
        strip_comments=True,
    )
```

### URL Parameter Encoding

```python
from urllib.parse import quote, urlencode

# Single parameter
safe_value = quote(user_input, safe='')

# Build query string
params = {'q': user_search, 'page': 1}
safe_url = f"/search?{urlencode(params)}"
```

### Path Traversal Prevention

```python
import os
from pathlib import Path

def safe_path(base_dir: str, filename: str) -> str:
    """Prevent path traversal attacks."""
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()

    # Ensure target is inside base
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal detected")

    return str(target)
```
