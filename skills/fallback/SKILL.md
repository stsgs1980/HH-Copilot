---
name: fallback
description: >
  Fallback provider strategy for when primary APIs (chat.z.ai) are unavailable.
  Use this skill when: (1) chat.z.ai returns 502/503/504 errors repeatedly,
  (2) health check shows chat.z.ai is unhealthy,
  (3) circuit breaker is OPEN for chat.z.ai,
  (4) implementing multi-provider resilience in applications,
  (5) setting up automatic failover for critical services.
  Also proactively use this when api-retry and health-check indicate chat.z.ai is unreliable.
---

# Fallback Provider Strategy

## Purpose

External APIs (especially chat.z.ai) frequently experience downtime with 502/503/504 errors.
This skill implements a fallback provider strategy that automatically switches to alternative
services when the primary provider fails, ensuring continuous operation.

## Provider Configuration

### Provider Interface

```javascript
class Provider {
  constructor(config) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.models = config.models;
    this.priority = config.priority; // 1 = highest priority
    this.enabled = config.enabled || true;
  }
  
  async chat(messages, options = {}) {
    throw new Error('Subclass must implement chat method');
  }
  
  async healthCheck() {
    throw new Error('Subclass must implement healthCheck method');
  }
}
```

### chat.z.ai Provider

```javascript
class ChatZaiProvider extends Provider {
  constructor(apiKey) {
    super({
      name: 'chat.z.ai',
      baseUrl: 'https://chat.z.ai',
      apiKey: apiKey,
      models: ['glm-4.7', 'glm-5', 'glm-5.1'],
      priority: 1
    });
  }
  
  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || this.models[0],
        messages: messages
      })
    });
    
    if (!response.ok) {
      throw new Error(`chat.z.ai error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

### Anthropic Provider (Fallback)

```javascript
class AnthropicProvider extends Provider {
  constructor(apiKey) {
    super({
      name: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: apiKey,
      models: ['claude-sonnet-4.6', 'claude-opus-4.6'],
      priority: 2
    });
  }
  
  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || this.models[0],
        max_tokens: options.maxTokens || 4096,
        messages: messages
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          model: 'claude-haiku-4.5',
          max_tokens: 10,
          messages: [{role: 'user', content: 'test'}]
        }),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

### OpenRouter Provider (Alternative)

```javascript
class OpenRouterProvider extends Provider {
  constructor(apiKey) {
    super({
      name: 'openrouter',
      baseUrl: 'https://openrouter.ai/api',
      apiKey: apiKey,
      models: ['anthropic/claude-sonnet-4.6', 'google/gemini-pro'],
      priority: 3
    });
  }
  
  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/Sts8987/agent-toolkit',
        'X-Title': 'Agent Toolkit'
      },
      body: JSON.stringify({
        model: options.model || this.models[0],
        messages: messages
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

## Fallback Manager

### Provider Selection Logic

```javascript
class FallbackManager {
  constructor(providers) {
    this.providers = providers.filter(p => p.enabled);
    this.currentProvider = this.providers[0];
    this.failureCount = 0;
    this.failureThreshold = 3;
    this.healthCheckInterval = 30000; // 30 seconds
    this.isMonitoring = false;
  }
  
  async chat(messages, options = {}) {
    const providersToTry = this.getProvidersInPriorityOrder();
    
    for (const provider of providersToTry) {
      try {
        console.log(`Attempting ${provider.name}...`);
        
        const result = await provider.chat(messages, options);
        
        // Success - update current provider
        this.currentProvider = provider;
        this.failureCount = 0;
        
        this.logProviderSwitch(provider, 'SUCCESS');
        return result;
        
      } catch (error) {
        console.error(`${provider.name} failed:`, error.message);
        this.failureCount++;
        
        // Check if we should switch providers
        if (this.shouldSwitchProvider()) {
          this.currentProvider = this.getNextProvider();
          this.logProviderSwitch(this.currentProvider, 'FALLBACK');
        }
      }
    }
    
    // All providers failed
    throw new Error('All providers failed');
  }
  
  getProvidersInPriorityOrder() {
    // Prioritize current provider, then others by priority
    const providers = [...this.providers];
    const currentIndex = providers.indexOf(this.currentProvider);
    
    if (currentIndex > 0) {
      providers.splice(currentIndex, 1);
      providers.unshift(this.currentProvider);
    }
    
    return providers.sort((a, b) => a.priority - b.priority);
  }
  
  shouldSwitchProvider() {
    // Switch if too many failures
    if (this.failureCount >= this.failureThreshold) {
      return true;
    }
    
    // Switch if current provider is unhealthy
    if (!this.currentProvider.enabled) {
      return true;
    }
    
    return false;
  }
  
  getNextProvider() {
    const currentIndex = this.providers.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % this.providers.length;
    return this.providers[nextIndex];
  }
  
  logProviderSwitch(provider, reason) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      from: this.currentProvider?.name || 'N/A',
      to: provider.name,
      reason: reason,
      failureCount: this.failureCount
    };
    
    console.log('PROVIDER SWITCH:', logEntry);
    this.appendLog(logEntry);
  }
  
  appendLog(entry) {
    const logLine = `PROVIDER_SWITCH: ${JSON.stringify(entry)}\n`;
    appendToWorklog(logLine);
  }
}
```

### Health Monitoring Integration

```javascript
class FallbackManagerWithHealth extends FallbackManager {
  constructor(providers, healthMonitor) {
    super(providers);
    this.healthMonitor = healthMonitor;
  }
  
  async startHealthMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Starting provider health monitoring...');
    
    this.healthCheckIntervalId = setInterval(async () => {
      await this.checkAllProviders();
    }, this.healthCheckInterval);
  }
  
  stopHealthMonitoring() {
    if (!this.isMonitoring) return;
    
    clearInterval(this.healthCheckIntervalId);
    this.isMonitoring = false;
    console.log('Stopped provider health monitoring');
  }
  
  async checkAllProviders() {
    for (const provider of this.providers) {
      const isHealthy = await provider.healthCheck();
      
      if (!isHealthy && provider === this.currentProvider) {
        console.warn(`${provider.name} is unhealthy, switching provider`);
        this.currentProvider = this.getNextProvider();
        this.failureCount = 0;
        this.logProviderSwitch(this.currentProvider, 'UNHEALTHY');
      }
      
      provider.enabled = isHealthy;
    }
  }
}
```

## Configuration and Initialization

### Environment Variables

```bash
# chat.z.ai (Primary)
CHAT_ZAI_API_KEY=your_api_key

# Anthropic (Fallback 1)
ANTHROPIC_API_KEY=your_anthropic_key

# OpenRouter (Fallback 2)
OPENROUTER_API_KEY=your_openrouter_key
```

### Provider Setup

```javascript
// Initialize providers from environment variables
const providers = [
  new ChatZaiProvider(process.env.CHAT_ZAI_API_KEY),
  new AnthropicProvider(process.env.ANTHROPIC_API_KEY),
  new OpenRouterProvider(process.env.OPENROUTER_API_KEY)
].filter(p => p.apiKey); // Only add providers with API keys

// Create fallback manager
const fallbackManager = new FallbackManagerWithHealth(
  providers,
  new HealthMonitor(providers)
);

// Start health monitoring
fallbackManager.startHealthMonitoring();
```

## Usage Examples

### Basic Fallback

```javascript
async function chatWithFallback(messages) {
  try {
    return await fallbackManager.chat(messages, {
      model: 'glm-4.7',
      maxTokens: 4096
    });
  } catch (error) {
    console.error('All providers failed:', error);
    // Could show error to user, cache request, etc.
    throw error;
  }
}
```

### Provider-Specific Configuration

```javascript
async function chatWithModelPreference(messages, preferredModel) {
  // Try preferred model first
  try {
    return await fallbackManager.currentProvider.chat(messages, {
      model: preferredModel
    });
  } catch (error) {
    // Fall back to default model
    console.warn(`${preferredModel} failed, using default`);
    return await fallbackManager.chat(messages);
  }
}
```

### Status Monitoring

```javascript
function getFallbackStatus() {
  return {
    currentProvider: fallbackManager.currentProvider.name,
    allProviders: fallbackManager.providers.map(p => ({
      name: p.name,
      priority: p.priority,
      enabled: p.enabled,
      healthy: p.enabled // Simplified - should be actual health
    })),
    failureCount: fallbackManager.failureCount,
    isMonitoring: fallbackManager.isMonitoring
  };
}

// Log status periodically
setInterval(() => {
  const status = getFallbackStatus();
  appendToWorklog(`FALLBACK_STATUS: ${JSON.stringify(status)}\n`);
}, 60000); // Every minute
```

## Best Practices

### DO
- Always use fallback for critical services
- Monitor provider health continuously
- Log all provider switches with reasons
- Set reasonable failure thresholds
- Configure multiple fallback providers
- Handle all-provider-failure gracefully

### DON'T
- Don't rely on single provider
- Don't ignore health check failures
- Don't switch providers too frequently
- Don't forget to stop monitoring
- Don't expose API keys in logs
- Don't hardcode provider priorities (use config)

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| failureThreshold | 3 | Failures before switching providers |
| healthCheckInterval | 30000ms | How often to check provider health |
| providerTimeout | 5000ms | Timeout for health checks |
| maxProviders | 3 | Maximum number of providers to configure |
| logFallbackSwitches | true | Log provider switches to worklog |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Always using fallback | Primary provider API key invalid | Check environment variables |
| Too many switches | Failure threshold too low | Increase failureThreshold |
| Slow health checks | Timeout too high | Reduce providerTimeout |
| Providers not switching | Monitoring not started | Call startHealthMonitoring() |
| All providers failing | Network issue or all keys invalid | Check connectivity and API keys |

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/provider.ts` | Base provider interface |
| `src/lib/chat-zai-provider.ts` | chat.z.ai implementation |
| `src/lib/anthropic-provider.ts` | Anthropic fallback |
| `src/lib/openrouter-provider.ts` | OpenRouter fallback |
| `src/lib/fallback-manager.ts` | Fallback logic and monitoring |
| `.env.example` | Required environment variables |
| `worklog.md` | Provider switch logs |

## Integration with Agent Toolkit

This skill works with:
- `api-retry` - for retry logic within providers
- `health-check` - for provider health monitoring
- `dev-watchdog` - for local server health

When implementing in a project:
1. Add this skill to `skills/` directory
2. Configure providers in environment variables
3. Implement fallback manager in `src/lib/fallback-manager.ts`
4. Start health monitoring on application startup
5. Log all provider switches to `worklog.md`
6. Handle all-provider-failure gracefully

## Security Notes

- Never commit API keys to version control
- Use `.env.example` for required variables
- Rotate API keys regularly
- Monitor provider usage and costs
- Implement rate limiting per provider
