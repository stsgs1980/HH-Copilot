---
name: api-retry
description: >
  Retry logic for HTTP requests with exponential backoff and circuit breaker pattern.
  Use this skill when: (1) making HTTP requests to external APIs,
  (2) encountering 502, 503, 504 errors from chat.z.ai or similar services,
  (3) implementing robust error handling for network operations,
  (4) creating API wrappers that need automatic retry behavior.
  Also proactively use this for all API calls to chat.z.ai due to frequent 502 errors.
---

# API Retry with Circuit Breaker

## Purpose

HTTP requests to external APIs (especially chat.z.ai) frequently fail with 502 Bad Gateway errors.
This skill implements a robust retry strategy with exponential backoff, circuit breaker,
and intelligent error detection to improve reliability.

## Retry Strategy

### Exponential Backoff

```javascript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,    // 1 second
  maxDelay: 10000,        // 10 seconds
  backoffMultiplier: 2
};

async function fetchWithRetry(url, options = {}) {
  let lastError;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Check if error is retryable
      if (!isRetryable(response.status)) {
        throw new Error(`Non-retryable status: ${response.status}`);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      );
      
      console.log(`Attempt ${attempt + 1} failed with status ${response.status}. Retrying in ${delay}ms...`);
      await sleep(delay);
      
    } catch (error) {
      lastError = error;
      
      if (attempt === retryConfig.maxRetries) {
        throw lastError;
      }
      
      // Network errors are always retryable
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      );
      
      console.log(`Network error on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function isRetryable(status) {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableStatuses.includes(status);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`Circuit breaker OPEN after ${this.failureCount} failures`);
    }
  }
}

// Usage
const circuitBreaker = new CircuitBreaker(5, 60000);

const response = await circuitBreaker.execute(async () => {
  return fetchWithRetry('https://chat.z.ai/api/...', options);
});
```

## Error Classification

| Status Code | Action | Reason |
|-------------|---------|---------|
| 200 | Success | Request succeeded |
| 401 | No retry | Authentication failed |
| 403 | No retry | Forbidden |
| 404 | No retry | Not found |
| 408 | Retry | Request timeout |
| 429 | Retry | Rate limited |
| 500 | Retry | Internal server error |
| 502 | Retry | Bad gateway |
| 503 | Retry | Service unavailable |
| 504 | Retry | Gateway timeout |

## Integration with chat.z.ai

### Wrapper Function

```javascript
async function chatZaiRequest(endpoint, options = {}) {
  const url = `https://chat.z.ai${endpoint}`;
  const circuitBreaker = new CircuitBreaker(5, 60000);
  
  return await circuitBreaker.execute(async () => {
    return await fetchWithRetry(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentToolkit/1.4.0',
        ...options.headers
      }
    });
  });
}

// Usage example
try {
  const response = await chatZaiRequest('/api/completions', {
    method: 'POST',
    body: JSON.stringify({ model: 'glm-4.7', messages })
  });
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Final error after all retries:', error);
  // Fallback to alternative provider
  return await fallbackProviderRequest(messages);
}
```

## Monitoring and Logging

### Metrics to Track

```javascript
const retryMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  retryCount: 0,
  circuitBreakerTrips: 0,
  averageResponseTime: 0
};

function logRetryAttempt(attempt, status, delay) {
  console.log({
    timestamp: new Date().toISOString(),
    attempt: attempt + 1,
    status: status,
    delay: delay,
    circuitBreakerState: circuitBreaker.state
  });
  
  retryMetrics.retryCount++;
}

function logCircuitBreakerTrip(state, duration) {
  console.log({
    timestamp: new Date().toISOString(),
    event: 'circuit_breaker_trip',
    fromState: state,
    duration: duration
  });
  
  retryMetrics.circuitBreakerTrips++;
}
```

## Best Practices

### DO
- Always use circuit breaker for external APIs
- Log all retry attempts with timestamps
- Implement timeout for each request
- Use exponential backoff, not linear
- Set reasonable max retries (3-5)
- Monitor circuit breaker state

### DON'T
- Don't retry on 401, 403, 404 errors
- Don't use fixed delay (use exponential backoff)
- Don't retry indefinitely (always set max)
- Don't ignore circuit breaker state
- Don't retry without logging

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| maxRetries | 3 | Maximum number of retry attempts |
| initialDelay | 1000ms | Initial delay before first retry |
| maxDelay | 10000ms | Maximum delay between retries |
| backoffMultiplier | 2 | Multiplier for exponential backoff |
| circuitThreshold | 5 | Failures before circuit breaker trips |
| circuitTimeout | 60000ms | Time before circuit breaker resets |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| All requests failing | Circuit breaker stuck OPEN | Check timeout, manually reset |
| Too many retries | Network flapping | Increase initialDelay |
| Slow responses | Max delay too high | Reduce maxDelay |
| Circuit breaker not tripping | Threshold too high | Reduce circuitThreshold |

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/api-retry.ts` | Core retry logic |
| `src/lib/circuit-breaker.ts` | Circuit breaker implementation |
| `src/lib/chat-zai-wrapper.ts` | chat.z.ai specific wrapper |
| `worklog.md` | Log retry attempts and circuit breaker events |

## Integration with Agent Toolkit

This skill works with:
- `health-check` - to verify API availability before retrying
- `fallback` - to switch to alternative providers
- `dev-watchdog` - to monitor local server health

When implementing in a project:
1. Add this skill to `skills/` directory
2. Implement retry logic in `src/lib/api-retry.ts`
3. Wrap all chat.z.ai API calls with retry logic
4. Log retry attempts to `worklog.md`
5. Monitor circuit breaker state in development
