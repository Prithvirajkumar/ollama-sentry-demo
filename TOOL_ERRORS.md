# Tool Errors in AI Agent Monitoring

## What Are Tool Errors?

**Tool Errors** in Sentry's AI Agent Monitoring track failures when your AI agent attempts to execute external functions or APIs (called "tools"). This helps you identify whether failures are due to:

- ❌ The agent's logic
- ❌ External API failures  
- ❌ Invalid input data
- ❌ Network timeouts
- ❌ Permission issues

## Why Tool Errors Matter

In our ecommerce agent, tools are critical operations:
- `get_products` - Fetches product catalog
- `search_products` - Searches inventory
- `get_product_details` - Gets specific product info
- `place_order` - Creates customer orders

If any of these fail, the agent cannot complete its task. Tool Error tracking helps you:

1. **Identify failing tools** - Which tools have the highest error rate?
2. **Debug faster** - See exact inputs that caused failures
3. **Monitor dependencies** - Track external API reliability
4. **Improve UX** - Detect issues before users complain

## How We Implement Tool Error Tracking

### 1. Wrap Tool Execution in Sentry Span

```typescript
await Sentry.startSpan(
  {
    op: 'gen_ai.execute_tool',
    name: `execute_tool ${toolName}`,
    attributes: {
      'gen_ai.tool.name': toolName,
      'gen_ai.tool.input': JSON.stringify(args),
    },
  },
  async (span) => {
    // Tool execution here
  }
);
```

**Key Attributes:**
- `op: 'gen_ai.execute_tool'` - Marks this as a tool execution (required)
- `gen_ai.tool.name` - Tool identifier (required)
- `gen_ai.tool.input` - Arguments passed to tool (required)

### 2. Record Successful Execution

```typescript
const result = await this.ecommerceClient.getProducts();
span.setAttribute('gen_ai.tool.output', JSON.stringify(result));
```

This captures the tool's output for debugging and analysis.

### 3. Handle Errors Properly

```typescript
catch (error) {
  // CRITICAL: Mark span as failed
  span.setStatus({ code: 2, message: 'tool_execution_failed' });
  
  // Set error attributes
  span.setAttribute('gen_ai.tool.error', errorMessage);
  
  // Capture exception with context
  Sentry.captureException(error, {
    tags: { tool_name: toolName },
    contexts: {
      tool_context: {
        tool_name: toolName,
        tool_input: args,
        agent: 'Ecommerce Agent',
      },
    },
  });
  
  throw error; // Re-throw for agent to handle
}
```

**Critical Step:** `span.setStatus({ code: 2, ... })` 
- Code 2 = ERROR status
- This makes the tool call show as failed in Sentry dashboard
- Without this, errors won't appear in Tool Error metrics

## What You See in Sentry

### AI Agents Dashboard

Navigate to: **Your Project → AI Monitoring → Insights**

**Tools Segment** shows:
```
Tool Name          | Calls | Errors | Error Rate | Avg Duration
-------------------|-------|--------|------------|-------------
get_products       |   145 |      3 |      2.1%  |      234ms
search_products    |    87 |      1 |      1.1%  |      189ms
place_order        |    42 |      8 |     19.0%  |      456ms  ⚠️
get_product_details|    63 |      0 |      0.0%  |      123ms
```

**Red flags to watch:**
- High error rates (>5%)
- Specific tools failing consistently
- Increasing error trends

### Trace View

Click on any tool error to see:

```
invoke_agent Ecommerce Agent (3.2s) ❌
├── request llama3.2:1b (0.9s) ✓
│   └── Tokens: 234 in, 23 out
├── execute_tool place_order (0.8s) ❌
│   ├── Input: {"items": [...], "customerEmail": "user@example.com"}
│   ├── Error: "SyntaxError: Unexpected token '<'"
│   └── Stack: [full stack trace]
└── request llama3.2:1b (1.5s) ✓
    └── Response: "I apologize, there was an error..."
```

### Full Context Available

For each tool error, you can see:
- ✅ **Exact input** that triggered the failure
- ✅ **Full error message** and stack trace
- ✅ **Conversation context** leading to the call
- ✅ **Agent's response** after the error
- ✅ **User impact** - did it break the experience?

## Error Types in Our Implementation

### 1. Network Errors
```typescript
Error fetching products: SyntaxError: Unexpected token '<'
```
**Cause:** API returned HTML instead of JSON (likely 404/500)  
**Fix:** Check API endpoint, add retry logic

### 2. Validation Errors
```typescript
Error: Missing required parameter 'productId'
```
**Cause:** Agent provided invalid arguments  
**Fix:** Improve tool schema, add validation

### 3. Timeout Errors
```typescript
Error: Request timeout after 30000ms
```
**Cause:** External API too slow  
**Fix:** Increase timeout, add caching

### 4. Permission Errors
```typescript
Error: 403 Forbidden
```
**Cause:** Missing API credentials  
**Fix:** Check authentication, update credentials

## Best Practices

### ✅ DO:

1. **Always set span status on error**
   ```typescript
   span.setStatus({ code: 2, message: 'tool_execution_failed' });
   ```

2. **Capture input and output**
   ```typescript
   span.setAttribute('gen_ai.tool.input', JSON.stringify(args));
   span.setAttribute('gen_ai.tool.output', JSON.stringify(result));
   ```

3. **Include error details**
   ```typescript
   span.setAttribute('gen_ai.tool.error', errorMessage);
   span.setAttribute('gen_ai.tool.error_stack', errorStack);
   ```

4. **Add contextual tags**
   ```typescript
   Sentry.captureException(error, {
     tags: { tool_name, error_type },
     contexts: { tool_context: {...} }
   });
   ```

5. **Log for debugging**
   ```typescript
   console.error(`❌ Tool execution error:`, errorMessage);
   ```

### ❌ DON'T:

1. **Don't swallow errors silently**
   ```typescript
   // BAD: Error disappears
   catch (error) { 
     return null; 
   }
   ```

2. **Don't skip span status**
   ```typescript
   // BAD: Won't show as error in dashboard
   catch (error) {
     Sentry.captureException(error);
     // Missing: span.setStatus(...)
   }
   ```

3. **Don't capture without context**
   ```typescript
   // BAD: No way to debug
   catch (error) {
     Sentry.captureException(error);
   }
   ```

4. **Don't use generic error messages**
   ```typescript
   // BAD: Not helpful
   throw new Error("Something went wrong");
   
   // GOOD: Specific and actionable
   throw new Error(`Failed to fetch product ${productId}: ${response.status}`);
   ```

## Monitoring Tool Errors

### Set Up Alerts

In Sentry, configure alerts for:

1. **High Error Rate**
   - Trigger: Tool error rate > 5%
   - Action: Notify team immediately

2. **Specific Tool Failing**
   - Trigger: `place_order` errors > 3 in 5 minutes
   - Action: Page on-call engineer

3. **Error Spike**
   - Trigger: Tool errors increase by 200%
   - Action: Auto-rollback deployment

### Query Tool Errors

In Sentry Discover, search:

```
# All tool errors
span.op:gen_ai.execute_tool AND span.status:error

# Specific tool errors  
span.op:gen_ai.execute_tool AND gen_ai.tool.name:place_order AND span.status:error

# Recent errors
span.op:gen_ai.execute_tool AND span.status:error AND timestamp:>2024-12-29
```

## Testing Tool Errors

Create a test to trigger tool errors:

```typescript
// Test: Handle API failure gracefully
test('agent handles tool error', async () => {
  const mockClient = {
    getProducts: jest.fn().mockRejectedValue(new Error('API Down')),
  };
  
  const agent = new EcommerceAgent({
    model: 'llama3.2:1b',
    ecommerceClient: mockClient,
  });
  
  await expect(agent.chat('Show me products')).rejects.toThrow();
  
  // Verify error was captured in Sentry
  expect(Sentry.captureException).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      tags: { tool_name: 'get_products' }
    })
  );
});
```

## Real-World Example

Let's trace a tool error from our demo:

### Step 1: Agent receives request
```
User: "I'd like to buy a Blue Shirt"
```

### Step 2: Agent calls tool
```typescript
execute_tool place_order
Input: {
  items: [{ productId: 1, quantity: 1 }],
  customerEmail: "user@example.com"
}
```

### Step 3: Tool fails
```
Error: SyntaxError: Unexpected token '<'
  at JSON.parse (<anonymous>)
  at EcommerceClient.createOrder (ecommerce.ts:106)
```

### Step 4: Sentry captures
```typescript
Span Status: ERROR
Error: "Unexpected token '<'"
Context: {
  tool_name: "place_order",
  tool_input: {"items": [...], "customerEmail": "..."},
  agent: "Ecommerce Agent"
}
```

### Step 5: Agent handles gracefully
```
Agent: "I apologize, but I'm having trouble placing the order right now. 
       Please try again in a moment, or contact support at..."
```

### Step 6: Team investigates
- Check Sentry dashboard
- See `place_order` has 19% error rate
- Find API returning HTML instead of JSON
- Deploy fix to handle 500 errors better

## Summary

**Tool Errors** help you:
- 🔍 **Debug faster** - See exact failure points
- 📊 **Monitor reliability** - Track error rates over time
- 🚨 **Get alerted early** - Before users complain
- 🔧 **Improve tools** - Identify which need work
- 📈 **Measure impact** - Understand user experience

With proper instrumentation, you get full visibility into tool performance and can proactively fix issues.

---

**See also:**
- [SENTRY_INTEGRATION.md](./SENTRY_INTEGRATION.md) - Full Sentry setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [Sentry Tool Errors Docs](https://docs.sentry.io/product/ai-monitoring/)

