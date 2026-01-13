/**
 * Ollama AI Agent with Sentry Instrumentation
 * Implements manual Sentry AI Agent Monitoring
 */

import { Ollama } from 'ollama';
import * as Sentry from '@sentry/node';
import { EcommerceClient, ecommerceTools, CartItem } from './ecommerce.js';

export interface AgentConfig {
  model: string;
  ollamaHost?: string;
  ecommerceClient: EcommerceClient;
  enableCostTracking?: boolean; // Enable simulated cost tracking for demos
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export class EcommerceAgent {
  private ollama: Ollama;
  private model: string;
  private ecommerceClient: EcommerceClient;
  private conversationHistory: Message[] = [];
  private enableCostTracking: boolean;
  private totalConversationCost: number = 0;

  constructor(config: AgentConfig) {
    this.ollama = new Ollama({ host: config.ollamaHost || 'http://localhost:11434' });
    this.model = config.model;
    this.ecommerceClient = config.ecommerceClient;
    this.enableCostTracking = config.enableCostTracking ?? false;

    // Initialize conversation with system prompt
    this.conversationHistory = [
      {
        role: 'system',
        content: `You are a helpful ecommerce shopping assistant. You can help users:
- Browse and search for products
- Get product details
- Place orders

Available tools:
- get_products: Get all available products
- search_products: Search for products by name or category
- get_product_details: Get details about a specific product by ID
- place_order: Place an order with items (requires productId and quantity for each item)

Always be helpful, accurate, and confirm order details before placing them.`
      }
    ];
  }

  /**
   * Calculate estimated cost for token usage
   * Based on typical LLM pricing (for demonstration/comparison purposes)
   * Ollama is free, but this helps visualize what costs would be with paid models
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    if (!this.enableCostTracking) {
      return 0;
    }

    // Pricing estimates (USD per 1M tokens) - typical for mid-tier models
    // Adjust these based on actual model pricing if using paid APIs
    const COST_PER_MILLION_INPUT = 0.15;   // e.g., GPT-3.5-turbo pricing
    const COST_PER_MILLION_OUTPUT = 0.60;  // Output tokens typically cost more

    const inputCost = (inputTokens / 1_000_000) * COST_PER_MILLION_INPUT;
    const outputCost = (outputTokens / 1_000_000) * COST_PER_MILLION_OUTPUT;
    
    return inputCost + outputCost;
  }

  /**
   * Execute a tool function
   */
  private async executeTool(toolName: string, args: any): Promise<any> {
    return await Sentry.startSpan(
      {
        op: 'gen_ai.execute_tool',
        name: `execute_tool ${toolName}`,
        attributes: {
          'gen_ai.tool.name': toolName,
          'gen_ai.tool.input': JSON.stringify(args),
        },
      },
      async (span) => {
        let result: any;

        try {
          switch (toolName) {
            case 'get_products':
              result = await this.ecommerceClient.getProducts();
              break;

            case 'search_products':
              result = await this.ecommerceClient.searchProducts(args.query);
              break;

            case 'get_product_details':
              result = await this.ecommerceClient.getProductById(args.productId);
              break;

            case 'place_order':
              // Handle items - might be string or array depending on model
              let items = args.items;
              if (typeof items === 'string') {
                try {
                  items = JSON.parse(items);
                } catch (e) {
                  console.error('Failed to parse items:', items);
                  items = [];
                }
              }
              result = await this.ecommerceClient.createOrder(
                items as CartItem[],
                args.customerEmail
              );
              break;

            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }

          span.setAttribute('gen_ai.tool.output', JSON.stringify(result));
          return result;
        } catch (error) {
          // Enhanced error tracking following Sentry best practices
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          // Mark span as failed (important for Sentry dashboard metrics)
          span.setStatus({ code: 2, message: 'tool_execution_failed' });
          
          // Set error attributes for AI Agent Monitoring
          span.setAttribute('gen_ai.tool.error', errorMessage);
          if (errorStack) {
            span.setAttribute('gen_ai.tool.error_stack', errorStack);
          }
          
          // Capture detailed error in Sentry with full context
          Sentry.captureException(error, {
            tags: {
              component: 'tool_execution',
              tool_name: toolName,
              error_type: 'tool_error',
            },
            contexts: {
              tool_context: {
                tool_name: toolName,
                tool_input: args,
                agent: 'Ecommerce Agent',
                failure_reason: errorMessage,
              },
            },
            level: 'error',
          });
          
          console.error(`   ❌ Tool execution error:`, errorMessage);
          throw error;
        }
      }
    );
  }

  /**
   * Make a request to the Ollama LLM
   */
  private async makeRequest(messages: Message[]): Promise<any> {
    return await Sentry.startSpan(
      {
        op: 'gen_ai.request',
        name: `request ${this.model}`,
        attributes: {
          'gen_ai.request.model': this.model,
          'gen_ai.request.messages': JSON.stringify(messages),
          'gen_ai.agent.name': 'Ecommerce Agent',
        },
      },
      async (span) => {
        try {
          const response = await this.ollama.chat({
            model: this.model,
            messages: messages as any,
            tools: ecommerceTools as any,
          });

          // Set response attributes
          if (response.message?.content) {
            span.setAttribute(
              'gen_ai.response.text',
              JSON.stringify([response.message.content])
            );
          }

          // Track token usage if available
          const inputTokens = response.prompt_eval_count || 0;
          const outputTokens = response.eval_count || 0;
          const totalTokens = inputTokens + outputTokens;

          if (inputTokens > 0) {
            span.setAttribute('gen_ai.usage.input_tokens', inputTokens);
          }
          if (outputTokens > 0) {
            span.setAttribute('gen_ai.usage.output_tokens', outputTokens);
          }
          if (totalTokens > 0) {
            span.setAttribute('gen_ai.usage.total_tokens', totalTokens);
          }

          // Calculate and track cost
          if (this.enableCostTracking && (inputTokens > 0 || outputTokens > 0)) {
            const requestCost = this.calculateCost(inputTokens, outputTokens);
            span.setAttribute('gen_ai.usage.cost_usd', requestCost);
            
            // Also track at conversation level
            span.setAttribute('conversation.cost_estimate_usd', requestCost);
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          span.setAttribute('gen_ai.request.error', errorMessage);
          if (errorStack) {
            span.setAttribute('gen_ai.request.error_stack', errorStack);
          }
          
          Sentry.captureException(error, {
            tags: {
              component: 'ollama_request',
              model: this.model,
            },
            contexts: {
              llm_context: {
                model: this.model,
                message_count: messages.length,
                tools_provided: ecommerceTools.length,
              },
            },
            level: 'error',
          });
          
          console.error(`❌ LLM request error:`, errorMessage);
          throw error;
        }
      }
    );
  }

  /**
   * Process user input and generate response
   */
  async chat(userMessage: string): Promise<string> {
    return await Sentry.startSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: 'invoke_agent Ecommerce Agent',
        attributes: {
          'gen_ai.request.model': this.model,
          'gen_ai.agent.name': 'Ecommerce Agent',
          'gen_ai.operation.name': 'chat',
        },
      },
      async (span) => {
        try {
          // Add user message to history
          this.conversationHistory.push({
            role: 'user',
            content: userMessage,
          });

          let totalInputTokens = 0;
          let totalOutputTokens = 0;
          let finalResponse = '';
          let iteration = 0; // Track iterations for debugging

          // Agent loop - may need multiple iterations for tool calls
          const maxIterations = 10;

          while (iteration < maxIterations) {
            iteration++;

            // Make request to LLM
            const response = await this.makeRequest(this.conversationHistory);

            // Track tokens
            if (response.prompt_eval_count) {
              totalInputTokens += response.prompt_eval_count;
            }
            if (response.eval_count) {
              totalOutputTokens += response.eval_count;
            }

            // Check if there are tool calls
            if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
              // Add assistant message with tool calls to history
              this.conversationHistory.push({
                role: 'assistant',
                content: response.message.content || '',
                tool_calls: response.message.tool_calls,
              });

              // Execute each tool call
              for (const toolCall of response.message.tool_calls) {
                const toolName = toolCall.function.name;
                // toolCall.function.arguments can be either a string or object depending on the Ollama version
                const toolArgs = typeof toolCall.function.arguments === 'string' 
                  ? JSON.parse(toolCall.function.arguments)
                  : toolCall.function.arguments;

                console.log(`\n🔧 Executing tool: ${toolName}`);
                console.log(`   Arguments:`, toolArgs);

                try {
                  const toolResult = await this.executeTool(toolName, toolArgs);
                  
                  console.log(`   ✅ Result:`, JSON.stringify(toolResult).substring(0, 200) + '...');

                  // Add tool result to history
                  this.conversationHistory.push({
                    role: 'tool',
                    content: JSON.stringify(toolResult),
                  });
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  console.error(`   ❌ Tool execution failed:`, errorMessage);
                  
                  // Return error info to the model so it can handle gracefully
                  this.conversationHistory.push({
                    role: 'tool',
                    content: JSON.stringify({ 
                      error: errorMessage,
                      tool: toolName,
                      status: 'failed'
                    }),
                  });
                }
              }

              // Continue loop to get final response
              continue;
            } else {
              // No more tool calls, we have the final response
              finalResponse = response.message?.content || '';
              
              this.conversationHistory.push({
                role: 'assistant',
                content: finalResponse,
              });

              break;
            }
          }

          // Calculate total tokens and cost for this conversation turn
          const totalTokens = totalInputTokens + totalOutputTokens;
          
          // Set final span attributes
          span.setAttribute('gen_ai.response.text', JSON.stringify([finalResponse]));
          span.setAttribute('gen_ai.usage.input_tokens', totalInputTokens);
          span.setAttribute('gen_ai.usage.output_tokens', totalOutputTokens);
          span.setAttribute('gen_ai.usage.total_tokens', totalTokens);

          // Track cost for this conversation turn
          if (this.enableCostTracking && totalTokens > 0) {
            const turnCost = this.calculateCost(totalInputTokens, totalOutputTokens);
            this.totalConversationCost += turnCost;
            
            span.setAttribute('gen_ai.usage.cost_usd', turnCost);
            span.setAttribute('conversation.cost_estimate_usd', this.totalConversationCost);
            
            console.log(`\n💰 Cost for this turn: $${turnCost.toFixed(6)}`);
            console.log(`💰 Total conversation cost: $${this.totalConversationCost.toFixed(6)}`);
          }

          return finalResponse;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          span.setAttribute('gen_ai.agent.error', errorMessage);
          if (errorStack) {
            span.setAttribute('gen_ai.agent.error_stack', errorStack);
          }
          
          Sentry.captureException(error, {
            tags: {
              component: 'agent_chat',
              agent: 'Ecommerce Agent',
              model: this.model,
            },
            contexts: {
              agent_context: {
                agent_name: 'Ecommerce Agent',
                model: this.model,
                conversation_length: this.conversationHistory.length,
                user_message: userMessage,
                iteration_count: iteration,
              },
            },
            level: 'error',
          });
          
          console.error(`\n❌ Agent error:`, errorMessage);
          throw error;
        }
      }
    );
  }

  /**
   * Reset conversation history
   */
  reset(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep system prompt
    this.totalConversationCost = 0; // Reset cost tracking
  }

  /**
   * Get total conversation cost
   */
  getTotalCost(): number {
    return this.totalConversationCost;
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return this.conversationHistory;
  }
}

