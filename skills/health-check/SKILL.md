---
name: health-check
description: >
  Health monitoring for external APIs and services with proactive failure detection.
  Use this skill when: (1) checking availability of chat.z.ai before making requests,
  (2) monitoring API response times and error rates,
  (3) implementing health check endpoints for local services,
  (4) setting up automated health monitoring in development,
  (5) troubleshooting connectivity issues with external services.
  Also proactively use this at start of any session to verify chat.z.ai is available.
---

# Health Check Monitoring

## Purpose

External APIs (especially chat.z.ai) frequently experience 502 Bad Gateway errors.
This skill implements proactive health monitoring with failure detection, response time tracking,
and automated alerts to prevent issues before they affect users.

## Health Check Protocol

### Basic Health Check

```javascript
async function checkApiHealth(url) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD for minimal data transfer
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: response.ok,
      status: response.status,
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: false,
      error: error.message,
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage
const health = await checkApiHealth('https://chat.z.ai/health');
console.log(`chat.z.ai is ${health.healthy ? 'healthy' : 'unhealthy'}`);
```

### Multi-Endpoint Health Check

```javascript
async function checkMultipleEndpoints(endpoints) {
  const checks = await Promise.all(
    endpoints.map(async (endpoint) => {
      const health = await checkApiHealth(endpoint.url);
      return {
        name: endpoint.name,
        ...health
      };
    })
  );
  
  const results = {
    timestamp: new Date().toISOString(),
    overallHealthy: checks.every(c => c.healthy),
    endpoints: checks
  };
  
  // Log to worklog
  logHealthCheck(results);
  
  return results;
}

// Usage
const results = await checkMultipleEndpoints([
  { name: 'chat.z.ai', url: 'https://chat.z.ai/health' },
  { name: 'api.z.ai', url: 'https://api.z.ai/health' }
]);
```

## Failure Detection

### Consecutive Failure Counter

```javascript
class FailureTracker {
  constructor(threshold = 3) {
    this.consecutiveFailures = 0;
    this.failureThreshold = threshold;
    this.lastFailureTime = null;
  }
  
  recordFailure() {
    this.consecutiveFailures++;
    this.lastFailureTime = new Date().toISOString();
    
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.alert('FAILURE_THRESHOLD_EXCEEDED');
    }
  }
  
  recordSuccess() {
    if (this.consecutiveFailures > 0) {
      console.log(`Recovered from ${this.consecutiveFailures} consecutive failures`);
    }
    this.consecutiveFailures = 0;
  }
  
  alert(type) {
    const alert = {
      type: type,
      timestamp: new Date().toISOString(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime
    };
    
    console.error('HEALTH ALERT:', alert);
    logAlert(alert);
    
    // Could send to monitoring service, email, etc.
  }
}

// Usage
const failureTracker = new FailureTracker(3);

const health = await checkApiHealth('https://chat.z.ai/health');
if (!health.healthy) {
  failureTracker.recordFailure();
} else {
  failureTracker.recordSuccess();
}
```

### Response Time Monitoring

```javascript
class ResponseTimeMonitor {
  constructor(windowSize = 10, alertThreshold = 5000) {
    this.responseTimes = [];
    this.windowSize = windowSize;
    this.alertThreshold = alertThreshold;
  }
  
  record(responseTime) {
    this.responseTimes.push(responseTime);
    
    if (this.responseTimes.length > this.windowSize) {
      this.responseTimes.shift();
    }
    
    const avgResponseTime = this.getAverage();
    
    if (avgResponseTime > this.alertThreshold) {
      this.alert('SLOW_RESPONSE', avgResponseTime);
    }
  }
  
  getAverage() {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }
  
  alert(type, value) {
    const alert = {
      type: type,
      value: value,
      threshold: this.alertThreshold,
      timestamp: new Date().toISOString()
    };
    
    console.warn('PERFORMANCE ALERT:', alert);
  }
}

// Usage
const responseTimeMonitor = new ResponseTimeMonitor(10, 5000);

const health = await checkApiHealth('https://chat.z.ai/health');
responseTimeMonitor.record(health.responseTime);
```

## Automated Health Monitoring

### Polling Health Check

```javascript
class HealthMonitor {
  constructor(config) {
    this.endpoint = config.endpoint;
    this.interval = config.interval || 30000; // 30 seconds
    this.failureTracker = new FailureTracker(config.failureThreshold || 3);
    this.responseTimeMonitor = new ResponseTimeMonitor(
      config.windowSize || 10,
      config.alertThreshold || 5000
    );
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`Starting health monitor for ${this.endpoint}`);
    
    this.intervalId = setInterval(async () => {
      await this.check();
    }, this.interval);
  }
  
  stop() {
    if (!this.isRunning) return;
    
    clearInterval(this.intervalId);
    this.isRunning = false;
    console.log(`Stopped health monitor for ${this.endpoint}`);
  }
  
  async check() {
    try {
      const health = await checkApiHealth(this.endpoint);
      
      if (health.healthy) {
        this.failureTracker.recordSuccess();
      } else {
        this.failureTracker.recordFailure();
      }
      
      this.responseTimeMonitor.record(health.responseTime);
      
      return health;
    } catch (error) {
      this.failureTracker.recordFailure();
      console.error('Health check error:', error);
    }
  }
}

// Usage
const monitor = new HealthMonitor({
  endpoint: 'https://chat.z.ai/health',
  interval: 30000,
  failureThreshold: 3,
  windowSize: 10,
  alertThreshold: 5000
});

monitor.start();
// Monitor will run until stopped
// monitor.stop();
```

## chat.z.ai Specific Implementation

### Health Check Endpoint

```javascript
async function checkChatZaiHealth() {
  const url = 'https://chat.z.ai/health';
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'AgentToolkit/1.4.0'
      }
    });
    
    const health = {
      timestamp: new Date().toISOString(),
      status: response.status,
      healthy: response.ok,
      responseTime: Date.now() - startTime,
      contentType: response.headers.get('content-type')
    };
    
    // Log to worklog
    logHealthCheck('chat.z.ai', health);
    
    return health;
  } catch (error) {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      healthy: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
    
    logHealthCheck('chat.z.ai', health);
    return health;
  }
}
```

### Integration with Agent Workflow

```javascript
async function agentWorkflowWithHealthCheck() {
  // Step 1: Check health before making requests
  const health = await checkChatZaiHealth();
  
  if (!health.healthy) {
    console.warn('chat.z.ai is unhealthy, using fallback');
    return await fallbackProvider();
  }
  
  // Step 2: Make request with retry logic
  try {
    const response = await apiRetry.chatZaiRequest('/api/completions', options);
    return response;
  } catch (error) {
    console.error('Request failed after retries, checking health...');
    
    // Step 3: Re-check health after failure
    const recheckHealth = await checkChatZaiHealth();
    
    if (!recheckHealth.healthy) {
      console.warn('chat.z.ai confirmed unhealthy');
      return await fallbackProvider();
    }
    
    throw error;
  }
}
```

## Logging and Alerting

### Health Check Log Format

```javascript
function logHealthCheck(service, health) {
  const logEntry = {
    timestamp: health.timestamp,
    service: service,
    healthy: health.healthy,
    status: health.status,
    responseTime: health.responseTime,
    circuitBreakerState: circuitBreaker?.state || 'N/A'
  };
  
  // Append to worklog
  appendToWorklog(`HEALTH_CHECK: ${JSON.stringify(logEntry)}`);
}

function logAlert(alert) {
  const logEntry = {
    timestamp: alert.timestamp,
    type: alert.type,
    details: alert
  };
  
  // Append to worklog
  appendToWorklog(`HEALTH_ALERT: ${JSON.stringify(logEntry)}`);
  
  // Could also send to external monitoring
}
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| checkInterval | 30000ms | How often to perform health checks |
| requestTimeout | 5000ms | Timeout for health check requests |
| failureThreshold | 3 | Consecutive failures before alert |
| windowSize | 10 | Number of response times to track |
| alertThreshold | 5000ms | Average response time before alert |
| healthEndpoint | `/health` | Health check endpoint path |

## Best Practices

### DO
- Check health before making requests
- Log all health checks with timestamps
- Set appropriate timeouts
- Monitor response times, not just failures
- Use health checks to drive circuit breaker decisions
- Implement fallback when unhealthy

### DON'T
- Don't check health too frequently (rate limiting)
- Don't use health checks without retry logic
- Don't ignore consecutive failures
- Don't forget to stop monitors when done
- Don't make synchronous health checks (use async)

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| All health checks failing | Service is down | Check status page, use fallback |
| Health checks too slow | Timeout too high | Reduce requestTimeout |
| False positives | Threshold too sensitive | Increase failureThreshold |
| Memory leak growing | Monitors not stopped | Ensure monitors are stopped |
| Circuit breaker not tripping | Health checks passing | Check circuit breaker logic |

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/health-check.ts` | Core health check logic |
| `src/lib/health-monitor.ts` | Automated monitoring |
| `src/lib/chat-zai-health.ts` | chat.z.ai specific checks |
| `worklog.md` | Health check logs and alerts |

## Integration with Agent Toolkit

This skill works with:
- `api-retry` - to retry failed requests
- `fallback` - to switch to alternative providers
- `dev-watchdog` - for local server health monitoring

When implementing in a project:
1. Add this skill to `skills/` directory
2. Implement health check logic in `src/lib/health-check.ts`
3. Add health checks before API calls
4. Set up automated monitoring for development
5. Log all health checks to `worklog.md`
6. Integrate with circuit breaker from `api-retry`
