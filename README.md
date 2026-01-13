# Ollama Ecommerce Agent with Sentry AI Monitoring

An AI-powered shopping assistant built with Ollama that can browse products, search inventory, and place orders - fully instrumented with Sentry AI Agent Monitoring.

## Features

🤖 **AI-Powered Shopping Assistant**
- Browse and search products
- Get detailed product information
- Place orders with natural language

📊 **Comprehensive Sentry Monitoring**
- Token usage tracking
- Latency monitoring
- Tool execution tracking
- Error reporting
- Full trace context

🛠️ **Tool Functions**
- `get_products` - List all available products
- `search_products` - Search by name or category
- `get_product_details` - Get specific product info
- `place_order` - Create orders with items

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** installed and running locally
   ```bash
   # Install Ollama: https://ollama.ai/
   
   # Pull a model (e.g., llama3.2)
   ollama pull llama3.2
   
   # Verify Ollama is running
   ollama list
   ```

3. **Sentry Account**
   - Sign up at [sentry.io](https://sentry.io)
   - Create a new project
   - Get your DSN (Data Source Name)

## Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```bash
   cp env.example.txt .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Sentry Configuration (REQUIRED for monitoring)
   SENTRY_DSN=your_sentry_dsn_here

   # Ollama Configuration
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=llama3.2

   # Ecommerce Store Configuration
   ECOMMERCE_BASE_URL=https://application-monitoring-react-dot-sales-engineering-sf.appspot.com
   ECOMMERCE_SE_PARAM=prithvi
   ```

## Usage

### Development Mode (Interactive Chat)

Start an interactive chat session with the agent:

```bash
npm run dev
```

This will start an interactive REPL where you can chat with the agent:

```
You: Hi! What products do you have?
🤖 Agent: Let me check our available products for you...
```

**Available commands:**
- Type any message to chat with the agent
- `exit` - Quit the application
- `reset` - Clear conversation history
- `history` - View full conversation history

### Demo Mode (Automated Demo)

Run a predefined conversation to demonstrate the agent's capabilities:

```bash
npm run dev demo
```

This will run through a scripted conversation that:
1. Lists available products
2. Searches for clothing items
3. Places an order

### Production Build

Build and run the production version:

```bash
npm run build
npm start
```

## Example Conversations

### Browse Products
```
You: What products are available?
Agent: [Lists all products with names, prices, and categories]
```

### Search Products
```
You: Show me all clothing items
Agent: [Returns filtered list of clothing products]
```

### Place an Order
```
You: I want to buy a Blue Shirt and Red Pants, 1 of each
Agent: [Executes tool calls and places order]
Order confirmed! Order ID: ORDER-1234567890
Total: $79.98
```

## Sentry AI Agent Monitoring

This project implements Sentry's AI Agent Monitoring using manual instrumentation. The following spans are tracked:

### 1. Agent Invocation (`gen_ai.invoke_agent`)
Tracks the full lifecycle of the agent handling a user request.

### 2. LLM Requests (`gen_ai.request`)
Monitors each request to the Ollama model including:
- Model name
- Input messages
- Response text
- Token usage (input/output tokens)

### 3. Tool Execution (`gen_ai.execute_tool`)
Captures every tool call with:
- Tool name
- Input arguments
- Output results
- Execution time

### Viewing Data in Sentry

1. **Navigate to AI Monitoring** in your Sentry project
2. **View Insights:**
   - Token usage over time
   - Average latency per operation
   - Tool usage frequency
   - Error rates and types

3. **Drill into Traces:**
   - Click on any trace to see the full execution flow
   - View timing breakdown for each span
   - See all tool calls and their results
   - Investigate errors with full context

## Project Structure

```
.
├── src/
│   ├── index.ts          # Main entry point with interactive/demo modes
│   ├── agent.ts          # Agent implementation with Sentry instrumentation
│   ├── ecommerce.ts      # Ecommerce API client and tool definitions
│   └── sentry.ts         # Sentry initialization
├── package.json
├── tsconfig.json
├── .env                  # Your environment variables (create this)
├── env.example.txt       # Environment template
└── README.md
```

## Architecture

### Agent Flow

1. **User Input** → Agent receives message
2. **Agent Invocation Span** starts
3. **LLM Request Span** → Send to Ollama with tools
4. **Tool Calls** (if needed):
   - **Tool Execution Span** for each tool
   - Execute function
   - Return result
5. **LLM Request Span** → Get final response
6. **Return to User**
7. All spans close with metrics

### Sentry Instrumentation

Each operation is wrapped in Sentry spans following the AI Agent Monitoring specification:

```typescript
await Sentry.startSpan(
  {
    op: 'gen_ai.invoke_agent',
    name: 'invoke_agent Ecommerce Agent',
    attributes: {
      'gen_ai.request.model': 'llama3.2',
      'gen_ai.agent.name': 'Ecommerce Agent',
    },
  },
  async (span) => {
    // Agent logic here
    span.setAttribute('gen_ai.usage.input_tokens', tokens);
    span.setAttribute('gen_ai.response.text', response);
  }
);
```

## Troubleshooting

### Ollama Connection Issues

**Error:** `fetch failed` or `ECONNREFUSED`

**Solution:**
1. Verify Ollama is running: `ollama list`
2. Check the host: `http://localhost:11434`
3. Try: `curl http://localhost:11434/api/tags`

### Model Not Found

**Error:** `model not found`

**Solution:**
```bash
ollama pull llama3.2
# or your preferred model
```

### Sentry Not Receiving Data

**Check:**
1. DSN is correctly set in `.env`
2. Look for "✅ Sentry initialized successfully" in console
3. Check for "📊 Sending event to Sentry" messages
4. Verify your Sentry project is active

### No Tool Calls

**Issue:** Agent doesn't use tools

**Solutions:**
1. Use a more capable model (llama3.2 or higher recommended)
2. Be more explicit in your requests
3. Check that tools are properly registered

## Development

### Adding New Tools

1. **Define the tool in `ecommerce.ts`:**
   ```typescript
   export const ecommerceTools = [
     {
       type: 'function',
       function: {
         name: 'my_new_tool',
         description: 'What this tool does',
         parameters: { /* ... */ }
       }
     }
   ];
   ```

2. **Implement the handler in `agent.ts`:**
   ```typescript
   case 'my_new_tool':
     result = await this.ecommerceClient.myNewMethod(args);
     break;
   ```

3. **Add method to `EcommerceClient` in `ecommerce.ts`**

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Sentry AI Monitoring](https://docs.sentry.io/product/ai-monitoring/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

## License

ISC

## Demo Store

This project uses the Sentry demo ecommerce store:
- URL: https://application-monitoring-react-dot-sales-engineering-sf.appspot.com/?se=prithvi
- Purpose: Demonstrate Sentry's monitoring capabilities
- Managed by: Sentry team

---

Built with ❤️ to demonstrate Sentry AI Agent Monitoring capabilities

# ollama-sentry-demo
