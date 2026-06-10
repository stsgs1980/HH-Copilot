---
name: z-ai-web-dev-sdk
description: >
  Comprehensive integration guide for Z.ai Web Development SDK (z-ai-web-dev-sdk).
  Covers chat completions, image generation, web search, function invocation,
  and best practices for building AI-powered features in Z.ai sandbox environment.
  Activate when: using z-ai-web-dev-sdk, building AI features, calling chat.z.ai APIs,
  implementing chatbot, image generation, web search, or any AI model integration.
---

# Z.ai Web Development SDK (z-ai-web-dev-sdk)

## Purpose

The `z-ai-web-dev-sdk` is the official SDK for interacting with Z.ai's AI capabilities
within the sandbox environment. It provides a unified interface for:

- **Chat Completions** -- LLM-powered text generation with configurable models,
  system prompts, temperature, and token limits
- **Image Generation** -- AI-powered image creation with multiple aspect ratios
  and base64 response handling
- **Web Search** -- Real-time web search via function invocation for up-to-date
  information retrieval
- **Function Invocation** -- General-purpose function calling mechanism for
  accessing Z.ai platform services

This skill ensures agents use the SDK correctly, safely, and in compliance
with Z.ai sandbox constraints.

---

## Installation & Setup

### Prerequisites

The SDK is pre-installed in the Z.ai sandbox environment. No additional
installation is required.

### Import Pattern

```typescript
import ZAI from 'z-ai-web-dev-sdk';

// Create a singleton instance (reuse across requests)
const zai = new ZAI();
```

### Critical Constraint

The SDK **MUST only be used in backend code** (API routes, server actions).
It relies on server-side environment variables and authentication that are
not available in the browser.

```typescript
// CORRECT: API route (backend)
// File: src/app/api/chat/route.ts
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  const zai = new ZAI();
  // ... use SDK here
}

// FORBIDDEN: Client component
// File: src/components/ChatWidget.tsx
// import ZAI from 'z-ai-web-dev-sdk'; // NEVER DO THIS
```

---

## Chat Completions

### Basic Usage

```typescript
import ZAI from 'z-ai-web-dev-sdk';

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  options: {
    temperature?: number;
    max_tokens?: number;
    model?: string;
  } = {}
): Promise<ChatResponse> {
  const zai = new ZAI();

  const messages: ChatRequest['messages'] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const response = await zai.chat.completions.create({
    model: options.model || 'glm-4.7',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048
  });

  return response as ChatResponse;
}
```

### Full Example with Error Handling

```typescript
// File: src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant. Respond concisely and accurately.'
      },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ];

    const completion = await zai.chat.completions.create({
      model: 'glm-4.7',
      messages,
      temperature: 0.7,
      max_tokens: 2048
    });

    const reply = completion.choices?.[0]?.message?.content || 'No response generated.';

    return NextResponse.json({
      reply,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Chat completion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
```

### Multi-turn Conversation

```typescript
// File: src/app/api/conversation/route.ts
import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  const { conversationHistory, newMessage } = await request.json();

  const messages: ConversationMessage[] = [
    {
      role: 'system',
      content: 'You are a knowledgeable coding assistant specializing in TypeScript and React.'
    },
    // Include previous conversation turns for context
    ...conversationHistory,
    // Append the new user message
    {
      role: 'user',
      content: newMessage
    }
  ];

  const completion = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages,
    temperature: 0.5,        // Lower for more deterministic code responses
    max_tokens: 4096          // Higher for code generation
  });

  return Response.json({
    message: completion.choices[0].message.content,
    usage: completion.usage
  });
}
```

---

## Image Generation

### CLI Tool: z-ai-generate

For static assets (favicons, logos, backgrounds, hero images), use the
`z-ai-generate` CLI tool directly from the terminal:

```bash
# Generate a 1024x1024 image
z-ai-generate "A modern minimalist logo for a tech startup, dark background, blue accent" --size 1024x1024 --output /home/z/my-project/download/logo.png

# Generate a 1344x768 banner
z-ai-generate "Abstract technology background with gradient mesh, dark theme" --size 1344x768 --output /home/z/my-project/download/banner.png

# Generate a 64x64 favicon
z-ai-generate "Simple geometric favicon, letter Z, gradient background" --size 1024x1024 --output /home/z/my-project/download/favicon.png
```

### Supported Sizes

| Size | Aspect Ratio | Use Case |
|------|-------------|----------|
| 1024x1024 | 1:1 | Logo, icon, favicon (scaled down) |
| 768x1344 | 9:16 | Portrait, mobile wallpaper |
| 864x1152 | 3:4 | Portrait photo, card image |
| 1344x768 | 16:9 | Banner, hero image, presentation |
| 1152x864 | 4:3 | Landscape photo, thumbnail |
| 1440x720 | 2:1 | Wide banner, panorama |
| 720x1440 | 1:2 | Tall graphic, story format |

### SDK-based Image Generation (Dynamic)

For user-triggered image generation within the application:

```typescript
// File: src/app/api/generate-image/route.ts
import ZAI from 'z-ai-web-dev-sdk';
import { writeFile } from 'fs/promises';
import path from 'path';

const zai = new ZAI();

const SUPPORTED_SIZES = [
  '1024x1024', '768x1344', '864x1152',
  '1344x768', '1152x864', '1440x720', '720x1440'
] as const;

type ImageSize = typeof SUPPORTED_SIZES[number];

export async function POST(request: Request) {
  try {
    const { prompt, size = '1024x1024' } = await request.json();

    // Validate inputs
    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!SUPPORTED_SIZES.includes(size)) {
      return Response.json(
        { error: `Invalid size. Supported: ${SUPPORTED_SIZES.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate image via SDK
    const result = await zai.images.generate({
      prompt,
      size: size as ImageSize,
      response_format: 'b64_json'
    });

    // Save to download directory
    const filename = `generated_${Date.now()}.png`;
    const filepath = path.join('/home/z/my-project/download', filename);

    const buffer = Buffer.from(result.data[0].b64_json, 'base64');
    await writeFile(filepath, buffer);

    return Response.json({
      success: true,
      filename,
      filepath: `/download/${filename}`
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return Response.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
```

---

## Web Search

### Function Invocation

Web search is accessed through the SDK's function invocation mechanism:

```typescript
import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

interface SearchFunctionResultItem {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date?: string;
  favicon?: string;
}

interface SearchResult {
  results: SearchFunctionResultItem[];
}

async function webSearch(
  query: string,
  numResults: number = 5
): Promise<SearchResult> {
  // Maximum 10 results per query
  const safeNum = Math.min(Math.max(numResults, 1), 10);

  const result = await zai.functions.invoke('web_search', {
    query,
    num: safeNum
  });

  return result as SearchResult;
}
```

### Full Search API Route Example

```typescript
// File: src/app/api/search/route.ts
import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return Response.json(
      { error: 'Search query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const result = await zai.functions.invoke('web_search', {
      query,
      num: 5
    });

    const results = (result as { results: Array<{
      url: string;
      name: string;
      snippet: string;
      host_name: string;
      rank: number;
      date?: string;
    }> }).results || [];

    return Response.json({
      query,
      count: results.length,
      results: results.map(item => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        source: item.host_name,
        rank: item.rank,
        date: item.date || null
      }))
    });

  } catch (error) {
    console.error('Web search error:', error);
    return Response.json(
      { error: 'Search request failed' },
      { status: 500 }
    );
  }
}
```

### Caching Search Results

```typescript
// File: src/lib/search-cache.ts
import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

// In-memory cache with TTL
const searchCache = new Map<string, {
  data: unknown;
  timestamp: number;
}>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function cachedWebSearch(query: string, num: number = 5) {
  const cacheKey = `${query}:${num}`;
  const cached = searchCache.get(cacheKey);

  // Return cached result if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`Cache hit for: ${query}`);
    return cached.data;
  }

  // Fetch fresh results
  const result = await zai.functions.invoke('web_search', { query, num });

  // Store in cache
  searchCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}
```

---

## Error Handling

### Integration with api-retry Skill

All SDK calls should be wrapped with retry logic from the `api-retry` skill:

```typescript
// File: src/lib/zai-wrapper.ts
import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

// Retry configuration matching api-retry skill
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRetryable = lastError.message.includes('502') ||
        lastError.message.includes('503') ||
        lastError.message.includes('504') ||
        lastError.message.includes('timeout');

      if (!isRetryable || attempt === RETRY_CONFIG.maxRetries) {
        throw lastError;
      }

      const delay = Math.min(
        RETRY_CONFIG.initialDelay *
          Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );

      console.warn(`[z-ai-web-dev-sdk] ${label} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

// Wrapped chat completion with retry
export async function resilientChatCompletion(
  systemPrompt: string,
  userMessage: string
) {
  return withRetry(async () => {
    const completion = await zai.chat.completions.create({
      model: 'glm-4.7',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2048
    });
    return completion;
  }, 'chatCompletion');
}

// Wrapped image generation with retry (longer timeout)
export async function resilientImageGeneration(
  prompt: string,
  size: string = '1024x1024'
) {
  return withRetry(async () => {
    const result = await zai.images.generate({
      prompt,
      size,
      response_format: 'b64_json'
    });
    return result;
  }, 'imageGeneration');
}

// Wrapped web search with retry
export async function resilientWebSearch(
  query: string,
  num: number = 5
) {
  return withRetry(async () => {
    const result = await zai.functions.invoke('web_search', { query, num });
    return result;
  }, 'webSearch');
}
```

### Error Response Pattern

```typescript
// File: src/app/api/ai/route.ts
import { NextResponse } from 'next/server';
import { resilientChatCompletion } from '@/lib/zai-wrapper';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const completion = await resilientChatCompletion(
      'You are a helpful assistant.',
      message
    );

    return NextResponse.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    // Never expose SDK error details to end users
    console.error('[z-ai-web-dev-sdk] Error:', error);

    return NextResponse.json(
      { error: 'AI service is temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}
```

---

## Environment Constraints

### Backend-Only Enforcement

| Location | Allowed? | Reason |
|----------|----------|--------|
| `app/api/**/route.ts` | YES | Server-side API route |
| `app/actions/*.ts` (server actions) | YES | Server-side execution |
| `lib/*.ts` (imported by server code) | YES | Server-side utilities |
| `components/**/*.tsx` (client) | NO | Client bundle -- SDK not available |
| `hooks/*.ts` (client hooks) | NO | Client-side execution |
| `app/page.tsx` (client component) | NO | Rendered in browser |
| `middleware.ts` | NO | Edge runtime -- SDK not compatible |

### Why Backend-Only?

1. **Authentication**: SDK uses server-side credentials that must not be exposed
   to the client
2. **Bundle Size**: SDK is large and would bloat the client bundle
3. **Environment Variables**: SDK relies on process.env values only available
   on the server
4. **Security**: API keys and tokens must never reach the browser

### Architecture Pattern

```text
Browser (Client)                    Server (Backend)
  |                                      |
  |  fetch('/api/chat')                  |
  |------------------------------------->|
  |                                      |  zai.chat.completions.create()
  |                                      |-----------------------------> chat.z.ai
  |                                      |<-----------------------------|
  |  { reply: "..." }                   |
  |<-------------------------------------|
  |                                      |
```

---

## Best Practices

### DO

- Create a **singleton** ZAI instance and reuse it across requests
- Always include a **system prompt** for chat completions to control behavior
- Set **explicit temperature** and **max_tokens** for predictable results
- Use **lower temperature** (0.3-0.5) for factual/code tasks
- Use **higher temperature** (0.7-0.9) for creative tasks
- **Validate** response structure before rendering to the user
- **Save** generated images to `/home/z/my-project/download/`
- **Cache** web search results to reduce API calls
- **Log** all SDK interactions with request/response metadata
- Use the **api-retry** skill wrapper for all SDK calls
- Check **health-check** before making SDK calls in long-running processes
- Keep **image prompts descriptive** for better generation quality

### DON'T

- **NEVER** import z-ai-web-dev-sdk in client components or pages
- **NEVER** hardcode API keys or authentication tokens
- **NEVER** make SDK calls in useEffect hooks or client-side event handlers
- **NEVER** store base64 image data in React state (use file system or object URLs)
- **NEVER** expose raw SDK error messages to end users
- **NEVER** set max_tokens excessively high (wastes tokens, increases latency)
- **NEVER** skip error handling -- SDK calls can fail with 502, 503, 504
- **NEVER** make SDK calls in a tight loop without rate limiting
- **NEVER** assume the response shape -- always validate and type responses

---

## Integration with Other Skills

| Skill | Integration Point |
|-------|------------------|
| `api-retry` | Wrap all SDK calls with exponential backoff and circuit breaker |
| `health-check` | Verify chat.z.ai availability before SDK calls in critical paths |
| `fallback` | Switch to alternative AI providers when SDK is unavailable |
| `dev-watchdog` | Monitor dev server health when building features that use the SDK |
| `git-checkpoint` | Create checkpoints before modifying SDK integration code |
| `sanitize-validate` | Validate user input before passing to SDK as prompts |
| `sanitize-validate` | Sanitize web search results before rendering |

### Recommended Integration Order

1. Set up `health-check` to monitor chat.z.ai availability
2. Implement `api-retry` wrapper for all SDK calls
3. Configure `fallback` for provider failover
4. Build SDK-powered features with `sanitize-validate` for inputs
5. Use `git-checkpoint` before each major SDK integration milestone

---

## File Locations

### Where to Place SDK Integration Code

| File | Purpose |
|------|---------|
| `src/lib/zai-wrapper.ts` | SDK singleton, retry wrapper, shared utilities |
| `src/lib/search-cache.ts` | Web search result caching |
| `src/app/api/chat/route.ts` | Chat completions API endpoint |
| `src/app/api/generate-image/route.ts` | Image generation API endpoint |
| `src/app/api/search/route.ts` | Web search API endpoint |
| `src/types/zai.ts` | TypeScript interfaces for SDK responses |
| `worklog.md` | SDK interaction logs with request/response metadata |

### Project File Structure

```text
src/
  lib/
    zai-wrapper.ts          # SDK singleton + retry wrapper
    search-cache.ts         # Web search caching
  types/
    zai.ts                  # TypeScript interfaces
  app/
    api/
      chat/
        route.ts            # Chat completions endpoint
      generate-image/
        route.ts            # Image generation endpoint
      search/
        route.ts            # Web search endpoint
```

---

## Configuration Reference

| Parameter | Default | Recommended Range | Notes |
|-----------|---------|-------------------|-------|
| `model` | glm-4.7 | glm-4.7 | Default Z.ai model |
| `temperature` | 0.7 | 0.1 - 1.0 | Lower = deterministic, higher = creative |
| `max_tokens` | 2048 | 256 - 4096 | Limit response length to reduce cost |
| `image.size` | 1024x1024 | See Supported Sizes | Match to use case |
| `search.num` | 5 | 1 - 10 | Maximum 10 results per query |
| `retry.maxRetries` | 3 | 2 - 5 | Balance reliability vs latency |
| `retry.initialDelay` | 1000ms | 500 - 2000ms | First retry delay |
| `cache.ttl` | 5 min | 1 - 30 min | Web search cache duration |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| SDK import fails in client | Client-side import | Move to API route, verify no client import |
| 502 Bad Gateway on chat | chat.z.ai overloaded | Apply api-retry, check health-check |
| Empty response from chat | max_tokens too low or prompt issue | Increase max_tokens, check messages |
| Image generation timeout | Complex prompt or server load | Retry with simpler prompt, increase timeout |
| Web search returns 0 results | Query too specific or API issue | Simplify query, check health |
| Base64 image too large | Memory pressure | Save to disk immediately, do not store in state |
| Rate limiting (429) | Too many requests | Implement caching, reduce call frequency |
| SDK not found | Not in dependencies | Verify package is installed in package.json |

---

## Integration with Agent Toolkit

When implementing in a project:
1. Place this skill file in `skills/z-ai-web-dev-sdk/`
2. Create `src/lib/zai-wrapper.ts` with the retry wrapper
3. Define TypeScript interfaces in `src/types/zai.ts`
4. Build API routes in `src/app/api/` for each capability
5. Integrate with `api-retry` for all SDK calls
6. Add `health-check` before critical SDK operations
7. Configure `fallback` for graceful degradation
8. Log all SDK interactions to `worklog.md`
