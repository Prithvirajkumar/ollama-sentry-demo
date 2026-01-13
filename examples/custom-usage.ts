/**
 * Custom Usage Example
 * Shows how to integrate the agent into your own application
 */

import 'dotenv/config';
import { initializeSentry } from '../src/sentry.js';
import { EcommerceClient } from '../src/ecommerce.js';
import { EcommerceAgent } from '../src/agent.js';

// Initialize Sentry
initializeSentry(process.env.SENTRY_DSN);

async function customExample() {
  console.log('🎯 Custom Agent Usage Example\n');

  // 1. Create ecommerce client
  const ecommerceClient = new EcommerceClient(
    process.env.ECOMMERCE_BASE_URL || 'https://application-monitoring-react-dot-sales-engineering-sf.appspot.com',
    process.env.ECOMMERCE_SE_PARAM || 'prithvi'
  );

  // 2. Create agent
  const agent = new EcommerceAgent({
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    ollamaHost: process.env.OLLAMA_HOST,
    ecommerceClient,
  });

  console.log('✅ Agent initialized\n');

  // 3. Example: Automated shopping workflow
  console.log('📝 Running automated shopping workflow...\n');

  try {
    // Step 1: Get product recommendations
    const response1 = await agent.chat(
      "I'm looking for clothing items under $50. What do you recommend?"
    );
    console.log(`🤖 Agent: ${response1}\n`);

    // Step 2: Ask for specific product
    const response2 = await agent.chat(
      "Tell me more about the Blue Shirt"
    );
    console.log(`🤖 Agent: ${response2}\n`);

    // Step 3: Place order
    const response3 = await agent.chat(
      "Great! I'll take one Blue Shirt. My email is customer@example.com"
    );
    console.log(`🤖 Agent: ${response3}\n`);

    console.log('✅ Workflow completed successfully!');
    console.log('\n📊 Check Sentry to see all the traces and metrics!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  // 4. You can also access conversation history
  const history = agent.getHistory();
  console.log(`\n📝 Total messages in conversation: ${history.length}`);
}

// Example: Error handling with Sentry
async function errorHandlingExample() {
  console.log('\n🔍 Error Handling Example\n');

  const ecommerceClient = new EcommerceClient(
    'https://invalid-url.com', // Invalid URL to trigger error
    'test'
  );

  const agent = new EcommerceAgent({
    model: 'llama3.2',
    ecommerceClient,
  });

  try {
    await agent.chat("Show me products");
  } catch (error) {
    console.log('✅ Error was caught and sent to Sentry');
    console.log('   Check your Sentry dashboard to see the error report');
  }
}

// Example: Using the ecommerce client directly
async function directClientExample() {
  console.log('\n🛍️ Direct Client Usage Example\n');

  const client = new EcommerceClient(
    process.env.ECOMMERCE_BASE_URL || 'https://application-monitoring-react-dot-sales-engineering-sf.appspot.com',
    process.env.ECOMMERCE_SE_PARAM || 'prithvi'
  );

  // Get all products
  const products = await client.getProducts();
  console.log(`Found ${products.length} products:`);
  products.forEach(p => console.log(`  - ${p.name}: $${p.price}`));

  // Search for products
  const clothingItems = await client.searchProducts('clothing');
  console.log(`\nFound ${clothingItems.length} clothing items`);

  // Place order directly
  const order = await client.createOrder([
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 1 },
  ], 'test@example.com');
  console.log(`\nOrder placed: ${order.id}`);
  console.log(`Total: $${order.total.toFixed(2)}`);
}

// Run examples
async function main() {
  const example = process.argv[2] || 'custom';

  switch (example) {
    case 'custom':
      await customExample();
      break;
    case 'error':
      await errorHandlingExample();
      break;
    case 'direct':
      await directClientExample();
      break;
    default:
      console.log('Unknown example. Options: custom, error, direct');
  }
}

main().catch(console.error);

