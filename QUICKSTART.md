# Quick Start Guide

Get up and running with the Ollama Ecommerce Agent in 5 minutes!

## Prerequisites Check

Before starting, verify you have:

1. ✅ **Node.js 18+** 
   ```bash
   node --version
   # Should show v18.0.0 or higher
   ```

2. ✅ **Ollama installed and running**
   ```bash
   ollama --version
   ollama list
   # Should show available models
   ```

3. ✅ **Sentry account** (free tier works!)
   - Sign up at https://sentry.io
   - Create a new project (Node.js)
   - Copy your DSN

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
npm install
```

### Step 2: Pull Ollama Model (2 min)

```bash
# Recommended: llama3.2 (good balance of speed and capability)
ollama pull llama3.2

# OR use a smaller/faster model
ollama pull llama3.2:1b

# OR use a larger/more capable model
ollama pull llama3.1
```

### Step 3: Configure Environment (1 min)

Create a `.env` file:

```bash
cat > .env << 'EOF'
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
ECOMMERCE_BASE_URL=https://application-monitoring-react-dot-sales-engineering-sf.appspot.com
ECOMMERCE_SE_PARAM=prithvi
EOF
```

**Important:** Replace `https://your-sentry-dsn@sentry.io/your-project-id` with your actual Sentry DSN!

### Step 4: Run Demo (1 min)

```bash
npm run dev demo
```

This will run an automated demo showing:
- Product browsing
- Product search
- Order placement

## What You'll See

### In Your Terminal:
```
🤖 Ollama Ecommerce Agent with Sentry Monitoring

Configuration:
  Model: llama3.2
  Ollama Host: http://localhost:11434
  Ecommerce Store: https://...?se=prithvi

✅ Agent initialized

🎬 Demo Mode - Running predefined conversation
...
🔧 Executing tool: get_products
   Arguments: {}
   Result: [{"id":1,"name":"Blue Shirt"...
...
```

### In Sentry Dashboard:
1. Go to your Sentry project
2. Navigate to **AI Monitoring** section
3. You'll see:
   - 📊 Token usage graphs
   - ⏱️ Latency metrics
   - 🔧 Tool execution traces
   - 🔍 Full conversation traces

## Try Interactive Mode

After the demo, try chatting with the agent:

```bash
npm run dev
```

Then type messages like:
- "What products do you have?"
- "Search for shoes"
- "I want to buy a blue shirt"

## Troubleshooting

### "Model not found"
```bash
ollama pull llama3.2
```

### "Connection refused"
```bash
# Make sure Ollama is running
ollama serve
```

### No Sentry data
- Check your DSN is correct in `.env`
- Look for "✅ Sentry initialized successfully" in output
- Wait 30 seconds for data to appear

## Next Steps

1. ✅ View traces in Sentry AI Monitoring
2. ✅ Try different models (`llama3.1`, `mistral`, etc.)
3. ✅ Modify the agent to add new tools
4. ✅ Integrate with your own ecommerce API

## Need Help?

- [Full README](./README.md) - Complete documentation
- [Sentry AI Monitoring Docs](https://docs.sentry.io/product/ai-monitoring/)
- [Ollama Documentation](https://github.com/ollama/ollama)

---

Happy coding! 🚀

