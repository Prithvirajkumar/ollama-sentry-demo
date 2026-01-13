# Sentry AI Agent Monitoring Integration Guide

This document explains how Sentry AI Agent Monitoring is implemented in this project.

## Overview

This project implements **manual instrumentation** for Sentry AI Agent Monitoring, as Ollama is not in the list of automatically instrumented libraries. The implementation follows Sentry's AI Agent Monitoring specification.

## Key Components

### 1. Sentry Initialization (`src/sentry.ts`)

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,  // Capture 100% of traces
  profilesSampleRate: 1.0, // Enable profiling
  integrations: [nodeProfilingIntegration()],
});
```

**Purpose:** Initialize Sentry with tracing enabled to capture AI agent operations.

### 2. Agent Invocation Span (`gen_ai.invoke_agent`)

**Location:** `src/agent.ts` - `EcommerceAgent.chat()` method

**Purpose:** Tracks the full lifecycle of handling a user request.

```typescript
await Sentry.startSpan({
  op: 'gen_ai.invoke_agent',
  name: 'invoke_agent Ecommerce Agent',
  attributes: {
    'gen_ai.request.model': this.model,
    'gen_ai.agent.name': 'Ecommerce Agent',
    'gen_ai.operation.name': 'chat',
  },
}, async (span) => {
  // ... agent logic ...
  span.setAttribute('gen_ai.response.text', JSON.stringify([finalResponse]));
  span.setAttribute('gen_ai.usage.input_tokens', totalInputTokens);
  span.setAttribute('gen_ai.usage.output_tokens', totalOutputTokens);
});
```

**Captured Data:**
- Agent name
- Model used
- Operation name
- Final response text
- Total token usage (input + output)

### 3. LLM Request Span (`gen_ai.request`)

**Location:** `src/agent.ts` - `EcommerceAgent.makeRequest()` method

**Purpose:** Monitors each individual request to the Ollama LLM.

```typescript
await Sentry.startSpan({
  op: 'gen_ai.request',
  name: `request ${this.model}`,
  attributes: {
    'gen_ai.request.model': this.model,
    'gen_ai.request.messages': JSON.stringify(messages),
    'gen_ai.agent.name': 'Ecommerce Agent',
  },
}, async (span) => {
  const response = await this.ollama.chat({ /* ... */ });
  
  span.setAttribute('gen_ai.response.text', JSON.stringify([response.message.content]));
  span.setAttribute('gen_ai.usage.input_tokens', response.prompt_eval_count);
  span.setAttribute('gen_ai.usage.output_tokens', response.eval_count);
});
```

**Captured Data:**
- Model name
- Input messages (full conversation context)
- Response text
- Token usage per request
- Errors (automatically captured)

### 4. Tool Execution Span (`gen_ai.execute_tool`)

**Location:** `src/agent.ts` - `EcommerceAgent.executeTool()` method

**Purpose:** Tracks each tool/function call made by the agent.

```typescript
await Sentry.startSpan({
  op: 'gen_ai.execute_tool',
  name: `execute_tool ${toolName}`,
  attributes: {
    'gen_ai.tool.name': toolName,
    'gen_ai.tool.input': JSON.stringify(args),
  },
}, async (span) => {
  const result = await /* execute tool */;
  
  span.setAttribute('gen_ai.tool.output', JSON.stringify(result));
});
```

**Captured Data:**
- Tool name
- Input arguments
- Output results
- Execution time
- Errors (if any)

## Data Flow Example

Here's what happens when a user asks "Show me products":

```
1. gen_ai.invoke_agent (starts)
   └─> User: "Show me products"
   
2. gen_ai.request (1st call)
   └─> Send to Ollama with tools
   └─> Response: [tool_call: get_products]
   
3. gen_ai.execute_tool
   └─> Tool: get_products
   └─> Input: {}
   └─> Output: [list of products]
   
4. gen_ai.request (2nd call)
   └─> Send tool results back to Ollama
   └─> Response: "Here are the available products..."
   
5. gen_ai.invoke_agent (completes)
   └─> Final response to user
   └─> Total tokens: input=234, output=56
```

## Viewing Data in Sentry

### 1. AI Monitoring Dashboard

Navigate to: **Your Project → AI Monitoring**

You'll see:
- **Token Usage Over Time** - Total tokens consumed
- **Average Latency** - Response times for operations
- **Tool Usage** - Which tools are called most often
- **Error Rates** - Percentage of failed operations

### 2. Trace View

Click on any trace to see:
- Full execution timeline
- Nested span structure
- Input/output for each operation
- Performance breakdown
- Error details (if any)

### 3. Example Trace Structure

```
invoke_agent Ecommerce Agent (2.3s)
├── request llama3.2 (0.8s)
│   ├── Tokens: 145 in, 23 out
│   └── Tool calls requested: get_products
├── execute_tool get_products (0.2s)
│   ├── Input: {}
│   └── Output: [5 products]
└── request llama3.2 (1.3s)
    ├── Tokens: 289 in, 87 out
    └── Final response generated
```

## Metrics Tracked

### Token Usage
- **Input Tokens** - Prompt tokens sent to model
- **Output Tokens** - Completion tokens generated
- **Total Tokens** - Sum of input + output

### Latency
- **Agent Invocation Time** - Total time to handle request
- **LLM Request Time** - Time for each model call
- **Tool Execution Time** - Time for each tool call

### Tool Usage
- **Tool Name** - Which tools are called
- **Call Frequency** - How often each tool is used
- **Success Rate** - Percentage of successful calls

### Errors
- **Error Type** - Exception class
- **Error Message** - Description
- **Stack Trace** - Full trace
- **Context** - Agent state, inputs, etc.

## Custom Attributes

You can add custom attributes to any span:

```typescript
span.setAttribute('custom.user_id', userId);
span.setAttribute('custom.session_id', sessionId);
span.setAttribute('custom.intent', detectedIntent);
```

These will be searchable in Sentry and can be used for filtering and analysis.

## Error Tracking

Errors are automatically captured and linked to traces:

```typescript
try {
  const result = await this.executeTool(toolName, args);
} catch (error) {
  // Error is automatically sent to Sentry with full context
  Sentry.captureException(error, {
    tags: {
      component: 'tool_execution',
      tool_name: toolName,
    },
  });
  throw error;
}
```

## Best Practices

### 1. Always Set Required Attributes

For AI Agent spans, always include:
- `gen_ai.request.model` - Model name
- `gen_ai.agent.name` - Agent identifier
- `gen_ai.response.text` - Response content
- `gen_ai.usage.input_tokens` - Input token count
- `gen_ai.usage.output_tokens` - Output token count

### 2. Use Meaningful Span Names

Good:
- `invoke_agent Ecommerce Agent`
- `request llama3.2`
- `execute_tool get_products`

Bad:
- `agent`
- `llm_call`
- `tool`

### 3. Include Context in Attributes

```typescript
attributes: {
  'gen_ai.request.model': 'llama3.2',
  'gen_ai.agent.name': 'Ecommerce Agent',
  'gen_ai.operation.name': 'product_search',  // ✅ Helpful context
  'custom.user_tier': 'premium',              // ✅ Business context
  'custom.conversation_turn': 3,              // ✅ Conversation state
}
```

### 4. Handle Errors Gracefully

Always wrap risky operations in try-catch:

```typescript
try {
  const result = await riskyOperation();
  span.setAttribute('result', JSON.stringify(result));
} catch (error) {
  span.setAttribute('error', String(error));
  Sentry.captureException(error);
  throw error;  // Re-throw if appropriate
}
```

### 5. Set Sampling Strategically

For production:
```typescript
Sentry.init({
  tracesSampleRate: 0.1,  // 10% sampling for cost control
  
  // OR use dynamic sampling
  tracesSampler: (samplingContext) => {
    // Sample 100% of errors
    if (samplingContext.parentSampled === false) return 0;
    if (samplingContext.attributes?.error) return 1.0;
    
    // Sample 10% of normal requests
    return 0.1;
  },
});
```

## Querying Data

### In Sentry Discover

Search for AI Agent operations:

```
span.op:gen_ai.invoke_agent
span.op:gen_ai.request
span.op:gen_ai.execute_tool
```

Filter by attributes:

```
gen_ai.agent.name:Ecommerce Agent
gen_ai.tool.name:get_products
gen_ai.request.model:llama3.2
```

### Performance Queries

Find slow requests:
```
span.op:gen_ai.request AND span.duration:>5s
```

Find high token usage:
```
gen_ai.usage.input_tokens:>1000
```

## Integration Checklist

- [x] Sentry SDK installed (`@sentry/node`)
- [x] Profiling integration added (`@sentry/profiling-node`)
- [x] Tracing enabled (`tracesSampleRate: 1.0`)
- [x] Agent invocation spans implemented
- [x] LLM request spans implemented
- [x] Tool execution spans implemented
- [x] Required attributes set on all spans
- [x] Token usage tracked
- [x] Error handling implemented
- [x] Custom attributes added for context

## Resources

- [Sentry AI Monitoring Docs](https://docs.sentry.io/product/ai-monitoring/)
- [Manual Instrumentation Guide](https://docs.sentry.io/platforms/javascript/guides/node/ai-monitoring/manual-instrumentation/)
- [Span Attributes Reference](https://docs.sentry.io/platforms/javascript/guides/node/ai-monitoring/manual-instrumentation/#span-attributes)

---

For questions or issues, refer to the main [README.md](./README.md) or [QUICKSTART.md](./QUICKSTART.md).

