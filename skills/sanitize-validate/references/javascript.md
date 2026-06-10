# JavaScript/TypeScript Framework Examples

## React

### Validation with Zod + React Hook Form

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  email: z.string().email("Invalid email").max(254),
  password: z.string().min(8).regex(/[A-Z]/, "Need uppercase"),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
});

type FormData = z.infer<typeof formSchema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    // data is validated and typed
    fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      {/* ... */}
    </form>
  );
}
```

### Safe Rendering

```tsx
// SAFE -- React escapes by default
<div>{userInput}</div>

// DANGEROUS -- only use with sanitized content
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userHtml) }} />
```

---

## Next.js

### Server Action Validation

```typescript
'use server';

import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
});

export async function createPost(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const result = createPostSchema.safeParse(raw);

  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // result.data is validated
  await db.post.create({ data: result.data });
}
```

### API Route with Validation

```typescript
// app/api/users/route.ts
import { z } from 'zod';
import { NextResponse } from 'next/server';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = userSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }

  // Safe to use result.data
  const user = await db.user.create({ data: result.data });
  return NextResponse.json(user);
}
```

---

## Express

### Middleware Validation

```typescript
import { z } from 'zod';
import express from 'express';

const app = express();
app.use(express.json());

const validate = (schema: z.ZodType) => (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  req.body = result.data; // Replace with validated data
  next();
};

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

app.post('/register', validate(userSchema), async (req, res) => {
  // req.body is validated and typed
  const user = await db.user.create({ data: req.body });
  res.json(user);
});
```

### Security Middleware

```typescript
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet()); // Sets security headers
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
```

---

## NestJS

### DTO with Validation

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}
```

```typescript
// users.controller.ts
import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Post()
  create(@Body(ValidationPipe) dto: CreateUserDto) {
    // dto is validated
    return this.usersService.create(dto);
  }
}
```

### Global Validation Pipe

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,     // Strip non-whitelisted properties
  forbidNonWhitelisted: true, // Throw error for extra properties
  transform: true,     // Transform payloads to DTO instances
}));
```

---

## Vue

### VeeValidate + Zod

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const schema = toTypedSchema(
  z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })
);

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: schema,
});

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');

const onSubmit = handleSubmit((values) => {
  // values is validated
  console.log(values);
});
</script>

<template>
  <form @submit="onSubmit">
    <input v-model="email" v-bind="emailAttrs" />
    <span>{{ errors.email }}</span>
    <input v-model="password" v-bind="passwordAttrs" type="password" />
    <span>{{ errors.password }}</span>
    <button type="submit">Submit</button>
  </form>
</template>
```

### Safe Rendering

```vue
<!-- SAFE -- Vue escapes by default -->
<div>{{ userInput }}</div>

<!-- DANGEROUS -- only with sanitized content -->
<div v-html="sanitizedHtml"></div>

<script setup>
import DOMPurify from 'dompurify';

const sanitizedHtml = computed(() =>
  DOMPurify.sanitize(userHtml, { ALLOWED_TAGS: ['b', 'i', 'a'] })
);
</script>
```
