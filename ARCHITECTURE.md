# Architecture Overview

This document provides a comprehensive overview of the system architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                   (CLI / Interactive Mode)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ecommerce Agent                            │
│                      (src/agent.ts)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🔵 gen_ai.invoke_agent span                             │  │
│  │                                                           │  │
│  │  ┌────────────────────┐      ┌─────────────────────┐    │  │
│  │  │                    │      │                     │    │  │
│  │  │  🟢 LLM Request    │      │  🟡 Tool Execution  │    │  │
│  │  │  gen_ai.request    │◄────►│  gen_ai.execute_tool│    │  │
│  │  │                    │      │                     │    │  │
│  │  └─────────┬──────────┘      └──────────┬──────────┘    │  │
│  │            │                             │               │  │
│  └────────────┼─────────────────────────────┼───────────────┘  │
│               │                             │                  │
└───────────────┼─────────────────────────────┼──────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌────────────────────────────────┐
│    Ollama (Local LLM)     │   │   Ecommerce Client             │
│    - Model: llama3.2      │   │   (src/ecommerce.ts)           │
│    - Tool calling         │   │   - get_products()             │
│    - Conversation         │   │   - search_products()          │
└───────────────────────────┘   │   - get_product_details()      │
                                │   - place_order()              │
                                └────────────┬───────────────────┘
                                             │
                                             ▼
                                ┌────────────────────────────────┐
                                │   Ecommerce API                │
                                │   (Sentry Demo Store)          │
                                └────────────────────────────────┘

                All operations instrumented with
                        ▼
                ┌─────────────────┐
                │   Sentry.io     │
                │ - Traces        │
                │ - Metrics       │
                │ - Errors        │
                └─────────────────┘
```

## Component Breakdown

### 1. User Interface (`src/index.ts`)

**Responsibility:** Handle user interactions

**Modes:**
- **Interactive Mode:** Real-time chat with the agent
- **Demo Mode:** Automated demonstration script

**Key Functions:**
- `interactiveMode()` - REPL for user input
- `demoMode()` - Run predefined conversation
- Command handling (exit, reset, history)

### 2. Ecommerce Agent (`src/agent.ts`)

**Responsibility:** Core AI agent logic with Sentry instrumentation

**Key Components:**

#### Message History
- Maintains conversation context
- System prompt for agent behavior
- Full message history for context

#### Agent Loop
```typescript
while (hasToolCalls) {
  1. Send messages to LLM → gen_ai.request
  2. If tool calls needed:
     - Execute each tool → gen_ai.execute_tool
     - Add results to history
     - Continue loop
  3. Else:
     - Return final response
}
```

#### Sentry Instrumentation
- **Agent Span:** Wraps entire conversation turn
- **Request Spans:** Each LLM call
- **Tool Spans:** Each tool execution

### 3. Ecommerce Client (`src/ecommerce.ts`)

**Responsibility:** Interface with ecommerce API

**API Methods:**
```typescript
getProducts(): Product[]
  └─> GET /api/products

searchProducts(query): Product[]
  └─> Filter products locally

getProductById(id): Product
  └─> Find in product list

createOrder(items, email): Order
  └─> POST /api/orders
```

**Tool Definitions:**
- OpenAI-compatible function definitions
- JSON schema for parameters
- Passed to Ollama for tool calling

### 4. Sentry Initialization (`src/sentry.ts`)

**Responsibility:** Configure Sentry SDK

**Configuration:**
```typescript
{
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,      // 100% of traces
  profilesSampleRate: 1.0,     // Enable profiling
  integrations: [profiling],   // CPU profiling
  environment: 'development',  // Environment tag
}
```

## Data Flow

### Example: "Show me clothing items"

```
1. User Input
   │
   ├─> Interactive Mode receives input
   │
   └─> agent.chat("Show me clothing items")

2. Agent Invocation (Sentry Span Starts)
   │
   ├─> Create span: gen_ai.invoke_agent
   │   Attributes:
   │   - model: llama3.2
   │   - agent: Ecommerce Agent
   │   - operation: chat
   │
   └─> Add message to history

3. First LLM Request (Sentry Span)
   │
   ├─> Create span: gen_ai.request
   │   Attributes:
   │   - model: llama3.2
   │   - messages: [full history]
   │
   ├─> ollama.chat({ messages, tools })
   │
   └─> Response: tool_call[search_products]
       Set attributes:
       - response.text: ""
       - input_tokens: 234
       - output_tokens: 23

4. Tool Execution (Sentry Span)
   │
   ├─> Create span: gen_ai.execute_tool
   │   Attributes:
   │   - tool.name: search_products
   │   - tool.input: {"query": "clothing"}
   │
   ├─> ecommerceClient.searchProducts("clothing")
   │
   └─> Result: [Blue Shirt, Red Pants, ...]
       Set attributes:
       - tool.output: [products array]

5. Second LLM Request (Sentry Span)
   │
   ├─> Create span: gen_ai.request
   │   Messages now include tool result
   │
   ├─> ollama.chat({ messages (with tool result) })
   │
   └─> Response: "I found 3 clothing items..."
       Set attributes:
       - response.text: "I found 3..."
       - input_tokens: 456
       - output_tokens: 87

6. Agent Completes (Sentry Span Ends)
   │
   ├─> Set final attributes:
   │   - response.text: "I found 3..."
   │   - input_tokens: 690 (total)
   │   - output_tokens: 110 (total)
   │
   └─> Return response to user

7. Display to User
   │
   └─> Console: "🤖 Agent: I found 3 clothing items..."
```

## Span Hierarchy

```
gen_ai.invoke_agent (2.3s)
│
├─ gen_ai.request #1 (0.8s)
│  ├─ Input: User message + history
│  ├─ Output: Tool call request
│  └─ Tokens: 234 in, 23 out
│
├─ gen_ai.execute_tool (0.2s)
│  ├─ Tool: search_products
│  ├─ Input: {"query": "clothing"}
│  └─ Output: [3 products]
│
└─ gen_ai.request #2 (1.3s)
   ├─ Input: History + tool result
   ├─ Output: Final response
   └─ Tokens: 456 in, 87 out

Total: 2.3s, 690 tokens in, 110 tokens out
```

## Technology Stack

### Core Dependencies

```json
{
  "ollama": "^0.5.9",           // Ollama Node.js client
  "@sentry/node": "^8.44.0",    // Sentry SDK
  "@sentry/profiling-node": "^8.44.0",  // Profiling
  "dotenv": "^16.4.7",          // Environment variables
  "undici": "^6.21.0"           // Fetch polyfill
}
```

### Dev Dependencies

```json
{
  "@types/node": "^22.10.5",    // Node.js types
  "typescript": "^5.7.2",        // TypeScript compiler
  "tsx": "^4.19.2"               // TS execution
}
```

## File Structure

```
/Users/prithvi/Development/2026/Ollama demo/
│
├── src/
│   ├── index.ts          # Entry point
│   ├── agent.ts          # Agent implementation
│   ├── ecommerce.ts      # API client + tools
│   ├── sentry.ts         # Sentry initialization
│   └── global.d.ts       # TypeScript declarations
│
├── examples/
│   └── custom-usage.ts   # Usage examples
│
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env                  # Environment variables
│
├── README.md             # Main documentation
├── QUICKSTART.md         # 5-minute guide
├── ARCHITECTURE.md       # This file
├── SENTRY_INTEGRATION.md # Sentry details
│
└── setup.sh              # Setup script
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | Yes* | - | Sentry project DSN (*optional for testing) |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `llama3.2` | Model to use |
| `ECOMMERCE_BASE_URL` | No | Sentry demo store | API base URL |
| `ECOMMERCE_SE_PARAM` | No | `prithvi` | SE parameter |

### TypeScript Configuration

```json
{
  "target": "ES2022",
  "module": "ES2022",
  "moduleResolution": "bundler",
  "types": ["node"],
  "strict": true
}
```

## Performance Characteristics

### Latency

**Typical Response Times:**
- Agent invocation: 2-5 seconds
- LLM request: 1-3 seconds each
- Tool execution: 50-200ms each

**Factors:**
- Model size (llama3.2:1b < llama3.2 < llama3.1)
- Hardware (CPU/GPU, RAM)
- Conversation length (context size)
- Network (for API calls)

### Token Usage

**Typical Token Counts:**
- System prompt: ~100 tokens
- User message: 10-50 tokens
- Tool definitions: ~300 tokens
- Response: 50-200 tokens

**Cost Implications:**
- Ollama is free (local)
- Sentry has generous free tier
- API calls negligible

### Scalability

**Current Design:**
- Single conversation at a time
- In-memory conversation history
- Synchronous tool execution

**For Production:**
- Add conversation persistence
- Implement conversation limits
- Add rate limiting
- Use async tool execution
- Add caching layer

## Security Considerations

### 1. Environment Variables
- Never commit `.env` file
- Use secrets management in production
- Rotate Sentry DSN if exposed

### 2. User Input
- Currently no input validation
- Add sanitization for production
- Limit message length
- Prevent injection attacks

### 3. API Access
- Ecommerce client has no auth
- Add authentication in production
- Rate limit API calls
- Validate all inputs

### 4. Sentry Data
- Contains conversation history
- May include PII
- Configure data scrubbing
- Set appropriate retention

## Extending the System

### Adding New Tools

1. **Define in `ecommerce.ts`:**
```typescript
{
  type: 'function',
  function: {
    name: 'new_tool',
    description: '...',
    parameters: { /* schema */ }
  }
}
```

2. **Implement handler in `agent.ts`:**
```typescript
case 'new_tool':
  result = await this.ecommerceClient.newMethod(args);
  break;
```

3. **Add method to `EcommerceClient`**

### Adding Multi-Agent Support

1. Create separate agent classes
2. Implement handoff span:
```typescript
Sentry.startSpan({
  op: 'gen_ai.handoff',
  name: 'handoff from Agent A to Agent B'
}, () => {});
```

### Adding Memory/Context

1. Add vector database (e.g., ChromaDB)
2. Store conversation summaries
3. Retrieve relevant context
4. Add to system prompt

## Monitoring & Observability

### Sentry Dashboards

**Metrics to Monitor:**
- Request volume
- Average latency
- Token usage trends
- Error rates
- Tool usage frequency

**Alerts to Set:**
- High error rate (>5%)
- Slow responses (>10s)
- High token usage (>10k/hour)

### Logging

**Current Implementation:**
- Console logs for debugging
- Sentry for errors
- Tool execution logs

**For Production:**
- Structured logging (JSON)
- Log aggregation (ELK, Datadog)
- Log levels (debug, info, warn, error)

## Testing Strategy

### Unit Tests
```typescript
test('agent handles tool calls', async () => {
  const agent = new EcommerceAgent({ /* ... */ });
  const response = await agent.chat('show products');
  expect(response).toContain('products');
});
```

### Integration Tests
```typescript
test('full conversation flow', async () => {
  // Test multi-turn conversation
  // Verify tool calls
  // Check Sentry spans
});
```

### E2E Tests
```typescript
test('order placement workflow', async () => {
  // Complete order flow
  // Verify API calls
  // Check Sentry traces
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Model not found" | Model not pulled | `ollama pull llama3.2` |
| "Connection refused" | Ollama not running | `ollama serve` |
| No Sentry data | Invalid DSN | Check `.env` file |
| Slow responses | Large model | Use smaller model |
| Tool not called | Vague prompt | Be more explicit |

---

For implementation details, see [README.md](./README.md)  
For Sentry specifics, see [SENTRY_INTEGRATION.md](./SENTRY_INTEGRATION.md)  
For quick setup, see [QUICKSTART.md](./QUICKSTART.md)

