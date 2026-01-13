/**
 * Ollama Ecommerce Agent Demo
 * Demonstrates AI agent with Sentry instrumentation
 */

import 'dotenv/config';
import * as readline from 'readline';
import { initializeSentry } from './sentry.js';
import { EcommerceClient } from './ecommerce.js';
import { EcommerceAgent } from './agent.js';

// Initialize Sentry
initializeSentry(process.env.SENTRY_DSN);

// Configuration
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ECOMMERCE_BASE_URL = process.env.ECOMMERCE_BASE_URL || 
  'https://application-monitoring-react-dot-sales-engineering-sf.appspot.com';
const ECOMMERCE_SE_PARAM = process.env.ECOMMERCE_SE_PARAM || 'prithvi';
const ENABLE_COST_TRACKING = process.env.ENABLE_COST_TRACKING === 'true';

console.log('\n🤖 Ollama Ecommerce Agent with Sentry Monitoring\n');
console.log('Configuration:');
console.log(`  Model: ${OLLAMA_MODEL}`);
console.log(`  Ollama Host: ${OLLAMA_HOST}`);
console.log(`  Ecommerce Store: ${ECOMMERCE_BASE_URL}?se=${ECOMMERCE_SE_PARAM}`);
console.log(`  Cost Tracking: ${ENABLE_COST_TRACKING ? 'Enabled' : 'Disabled (Ollama is free!)'}`);
console.log('');

// Initialize ecommerce client
const ecommerceClient = new EcommerceClient(ECOMMERCE_BASE_URL, ECOMMERCE_SE_PARAM);

// Initialize agent
const agent = new EcommerceAgent({
  model: OLLAMA_MODEL,
  ollamaHost: OLLAMA_HOST,
  ecommerceClient,
  enableCostTracking: ENABLE_COST_TRACKING,
});

console.log('✅ Agent initialized\n');

// Interactive mode
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('💬 Interactive Mode');
  console.log('   Type your message and press Enter');
  console.log('   Type "exit" to quit');
  console.log('   Type "reset" to clear conversation history');
  console.log('   Type "history" to see conversation history\n');

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      const message = input.trim();

      if (!message) {
        askQuestion();
        return;
      }

      if (message.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        process.exit(0);
        return;
      }

      if (message.toLowerCase() === 'reset') {
        agent.reset();
        console.log('🔄 Conversation history reset\n');
        askQuestion();
        return;
      }

      if (message.toLowerCase() === 'history') {
        console.log('\n📝 Conversation History:');
        console.log(JSON.stringify(agent.getHistory(), null, 2));
        console.log('');
        askQuestion();
        return;
      }

      try {
        console.log('\n🤔 Agent is thinking...\n');
        const response = await agent.chat(message);
        console.log(`\n🤖 Agent: ${response}\n`);
      } catch (error) {
        console.error('\n❌ Error:', error);
        console.log('');
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Demo mode - predefined conversation
async function demoMode() {
  console.log('🎬 Demo Mode - Running predefined conversation\n');

  const demoQueries = [
    "Hi! Can you show me what products are available?",
    "I'm interested in clothing items. Can you search for those?",
    "I'd like to buy a Blue Shirt and Red Pants. Can you place an order for 1 of each?",
  ];

  for (const query of demoQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`You: ${query}`);
    console.log('='.repeat(80));
    
    try {
      const response = await agent.chat(query);
      console.log(`\n🤖 Agent: ${response}\n`);
      
      // Wait a bit between queries
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('\n❌ Error:', error);
    }
  }

  console.log('\n✅ Demo completed!\n');
  console.log('📊 Check your Sentry dashboard to see AI Agent monitoring data:');
  console.log('   - Token usage');
  console.log('   - Latency');
  console.log('   - Tool calls');
  console.log('   - Error tracking\n');
}

// Main
async function main() {
  const mode = process.argv[2];

  if (mode === 'demo') {
    await demoMode();
    process.exit(0);
  } else {
    await interactiveMode();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

