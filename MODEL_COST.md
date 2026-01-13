# Model Cost Tracking in AI Agent Monitoring

## What is Model Cost?

**Model Cost** in Sentry's AI Agent Monitoring tracks the financial expenditure of your Large Language Model (LLM) usage. It helps you:

- 💰 **Understand spending** - See daily/monthly LLM costs
- 📊 **Compare models** - Which models are most cost-effective?
- 🚨 **Catch cost spikes** - Alert on unexpected high spend
- 🔍 **Optimize usage** - Identify expensive conversations

## Why It's Empty (By Default)

**Ollama runs locally and is FREE!** 🎉

Unlike cloud APIs (OpenAI, Anthropic, etc.), Ollama:
- ✅ Runs on your own hardware
- ✅ No per-token charges
- ✅ No API fees
- ✅ Unlimited usage

**However**, for demonstration and comparison purposes, we've added **simulated cost tracking** to help you visualize what costs would be with paid models.

## Enabling Cost Tracking

### Option 1: Environment Variable

Add to your `.env` file:

```bash
ENABLE_COST_TRACKING=true
```

Then restart the agent:

```bash
npm run dev demo
```

### Option 2: Programmatically

```typescript
const agent = new EcommerceAgent({
  model: 'llama3.2:1b',
  ecommerceClient,
  enableCostTracking: true, // Enable cost simulation
});
```

## Cost Calculation

Our implementation uses **typical mid-tier LLM pricing** for estimation:

```typescript
// Pricing per 1 million tokens (USD)
Input tokens:  $0.15 / 1M  (e.g., GPT-3.5-turbo)
Output tokens: $0.60 / 1M  (output typically costs more)
```

### Example Calculation

```
Conversation:
- Input: 1,200 tokens
- Output: 300 tokens

Cost calculation:
- Input:  (1,200 / 1,000,000) × $0.15 = $0.00018
- Output: (300 / 1,000,000) × $0.60   = $0.00018
- Total:                                $0.00036
```

## What You'll See

### In Terminal

When cost tracking is enabled:

```bash
🤖 Ollama Ecommerce Agent with Sentry Monitoring

Configuration:
  Model: llama3.2:1b
  Cost Tracking: Enabled

================================================================================
You: Hi! Can you show me what products are available?
================================================================================

🔧 Executing tool: get_products
   ✅ Result: [5 products]

💰 Cost for this turn: $0.000234
💰 Total conversation cost: $0.000234

🤖 Agent: Here are the available products...
```

### In Sentry Dashboard

Navigate to: **Your Project → AI Monitoring → Insights → Models**

**Model Cost Widget:**
```
Model              | Requests | Cost (30d) | Avg Cost/Request
-------------------|----------|------------|------------------
llama3.2:1b       |      487 |    $0.142  |        $0.000291
gpt-4o            |      234 |   $12.45   |        $0.053205  💰
claude-3.5-sonnet |      156 |    $8.73   |        $0.055962  💰
```

### In Trace View

Click any conversation to see:

```
invoke_agent Ecommerce Agent (3.2s)
├── Cost: $0.000234
├── Tokens: 1,456 (1,123 in + 333 out)
│
├── request llama3.2:1b (0.9s)
│   ├── Cost: $0.000087
│   └── Tokens: 567 in, 45 out
│
├── execute_tool get_products (0.2s)
│
└── request llama3.2:1b (2.1s)
    ├── Cost: $0.000147
    └── Tokens: 556 in, 288 out
```

## Span Attributes for Cost

We set these attributes on each span:

### Per-Request Attributes

```typescript
'gen_ai.usage.input_tokens': 1123,
'gen_ai.usage.output_tokens': 333,
'gen_ai.usage.total_tokens': 1456,
'gen_ai.usage.cost_usd': 0.000234,
```

### Conversation-Level Attributes

```typescript
'conversation.cost_estimate_usd': 0.000712, // Cumulative cost
```

## Real-World Cost Examples

### OpenAI GPT-4o Pricing (as of 2024)

```
Input:  $5.00 per 1M tokens
Output: $15.00 per 1M tokens

Example conversation:
- Input: 2,000 tokens  → $0.010
- Output: 500 tokens   → $0.0075
- Total: $0.0175 per conversation
```

If you have **1,000 conversations/day**:
- Daily cost: $17.50
- Monthly cost: $525
- Annual cost: $6,387

### Anthropic Claude 3.5 Sonnet

```
Input:  $3.00 per 1M tokens
Output: $15.00 per 1M tokens

Same 1,000 conversations/day:
- Daily cost: $13.50
- Monthly cost: $405
- Annual cost: $4,928
```

### Ollama (Local)

```
Input:  $0.00
Output: $0.00
Total:  $0.00 forever! 🎉
```

**Only cost:** Hardware (one-time investment)

## Setting Up Cost Alerts in Sentry

### 1. High Daily Spend Alert

```
Alert Name: High LLM Costs
Condition: SUM(gen_ai.usage.cost_usd) > $100
Period: 24 hours
Action: Email engineering team
```

### 2. Cost Spike Alert

```
Alert Name: Cost Spike Detected
Condition: Cost increased by > 200% vs previous day
Action: Page on-call engineer
```

### 3. Per-Request Cost Alert

```
Alert Name: Expensive Request
Condition: gen_ai.usage.cost_usd > $1.00
Action: Notify immediately (possible bug)
```

## Querying Costs in Sentry

### Total Cost This Month

```
span.op:gen_ai.invoke_agent 
  AND timestamp:>2024-12-01
```

Then aggregate: `SUM(gen_ai.usage.cost_usd)`

### Cost by Model

```
span.op:gen_ai.request
  GROUP BY gen_ai.request.model
  AGGREGATE SUM(gen_ai.usage.cost_usd)
```

### Most Expensive Conversations

```
span.op:gen_ai.invoke_agent
  ORDER BY conversation.cost_estimate_usd DESC
  LIMIT 10
```

### Cost Over Time

```
span.op:gen_ai.invoke_agent
  GROUP BY date
  AGGREGATE SUM(gen_ai.usage.cost_usd)
```

## Cost Optimization Strategies

### 1. Use Smaller Models for Simple Tasks

```typescript
// Expensive: GPT-4 for everything
const agent = new Agent({ model: 'gpt-4o' }); // $5/1M input

// Better: Use appropriate models
const simpleAgent = new Agent({ model: 'gpt-3.5-turbo' }); // $0.50/1M
const complexAgent = new Agent({ model: 'gpt-4o' });

// Route based on complexity
if (isSimpleQuery) {
  response = await simpleAgent.chat(query);
} else {
  response = await complexAgent.chat(query);
}
```

**Potential savings:** 90%

### 2. Cache Responses

```typescript
const cache = new Map();

async function cachedQuery(query: string) {
  if (cache.has(query)) {
    return cache.get(query); // $0 cost
  }
  
  const response = await agent.chat(query);
  cache.set(query, response);
  return response;
}
```

**Savings:** Varies by repetition rate

### 3. Limit Context Window

```typescript
// Expensive: Include entire conversation
const messages = conversationHistory; // 10,000 tokens

// Better: Summarize old messages
const messages = [
  systemPrompt,
  summarizeOldMessages(conversationHistory.slice(0, -5)),
  ...conversationHistory.slice(-5) // Last 5 messages
];
```

**Savings:** 50-70%

### 4. Use Streaming for Better UX

```typescript
// Streaming doesn't reduce costs, but improves perceived performance
// Users see results faster = better experience per dollar spent
const stream = await ollama.chat({ 
  model: 'llama3.2:1b',
  messages,
  stream: true 
});
```

### 5. Switch to Local Models (Ollama)

```typescript
// Cloud: $5-$15 per 1M tokens
const cloudAgent = new Agent({ 
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_KEY 
});

// Local: $0 per token (after hardware investment)
const localAgent = new Agent({ 
  model: 'llama3.2:1b',
  ollamaHost: 'http://localhost:11434'
});
```

**Savings:** 100% ongoing costs!

## Comparing Costs: Cloud vs Local

### Cloud (GPT-4o)

**Pros:**
- ✅ Best quality
- ✅ No hardware needed
- ✅ Instant setup
- ✅ Always latest models

**Cons:**
- ❌ Ongoing per-request costs
- ❌ Can spike unexpectedly
- ❌ Data sent to third party

**Cost:** $5-$15 per 1M tokens

### Local (Ollama)

**Pros:**
- ✅ Zero ongoing costs
- ✅ Full data privacy
- ✅ Predictable expenses
- ✅ Offline capable

**Cons:**
- ❌ Hardware investment needed
- ❌ Quality may vary
- ❌ Slower on CPU
- ❌ Manual updates

**Cost:** $0 per token (hardware: $500-$5000 one-time)

## ROI Calculator

How many requests to break even with Ollama?

```
Hardware: $2,000 (good GPU)
Cloud cost: $0.01 per request (average)

Break-even: $2,000 / $0.01 = 200,000 requests

If you do:
- 100 requests/day  → Break-even in 5.5 years
- 1,000 requests/day → Break-even in 200 days
- 10,000 requests/day → Break-even in 20 days ✅
```

## Testing Cost Tracking

Run the demo with cost tracking enabled:

```bash
# 1. Enable in .env
echo "ENABLE_COST_TRACKING=true" >> .env

# 2. Run demo
npm run dev demo

# 3. Check output for cost info
# You should see:
# 💰 Cost for this turn: $0.000XXX
# 💰 Total conversation cost: $0.000XXX
```

Then check Sentry:
1. Go to **AI Monitoring → Insights → Models**
2. Look for **Model Cost** widget
3. Click traces to see per-request costs

## Summary

**Model Cost tracking helps you:**

- 🎯 **Budget** - Know your LLM spend
- 📊 **Optimize** - Find expensive operations
- 🚨 **Alert** - Catch cost spikes early
- 💰 **Compare** - Cloud vs Local ROI

**For Ollama users:**
- Cost is $0, but tracking helps demonstrate value
- Use it for comparison when considering cloud APIs
- Track "equivalent cost" to show savings vs paid models

**For Cloud API users:**
- Essential for controlling costs
- Set up alerts to avoid surprises
- Optimize based on actual usage data

---

**See also:**
- [TOOL_ERRORS.md](./TOOL_ERRORS.md) - Tool error tracking
- [SENTRY_INTEGRATION.md](./SENTRY_INTEGRATION.md) - Full Sentry setup
- [Sentry Cost Tracking Docs](https://docs.sentry.io/product/ai-monitoring/)

