/**
 * Ecommerce API Client
 * Provides tool functions for interacting with the ecommerce store
 */

export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
  product?: Product;
}

export interface Order {
  id?: string;
  items: CartItem[];
  total: number;
  customerEmail?: string;
  status?: string;
}

export class EcommerceClient {
  private baseUrl: string;
  private seParam: string;

  constructor(baseUrl: string, seParam: string) {
    this.baseUrl = baseUrl;
    this.seParam = seParam;
  }

  /**
   * Get list of available products
   */
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products?se=${this.seParam}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      // Return mock data if API fails
      return [
        { id: 1, name: "Blue Shirt", price: 29.99, category: "clothing" },
        { id: 2, name: "Red Pants", price: 49.99, category: "clothing" },
        { id: 3, name: "Black Shoes", price: 79.99, category: "footwear" },
        { id: 4, name: "White Hat", price: 19.99, category: "accessories" },
        { id: 5, name: "Green Jacket", price: 99.99, category: "clothing" }
      ];
    }
  }

  /**
   * Search products by name or category
   */
  async searchProducts(query: string): Promise<Product[]> {
    const allProducts = await this.getProducts();
    const lowerQuery = query.toLowerCase();
    return allProducts.filter(
      p => p.name.toLowerCase().includes(lowerQuery) ||
           (p.category && p.category.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get product details by ID
   */
  async getProductById(productId: number): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find(p => p.id === productId) || null;
  }

  /**
   * Create an order
   */
  async createOrder(items: CartItem[], customerEmail?: string): Promise<Order> {
    try {
      // Calculate total
      const products = await this.getProducts();
      let total = 0;
      
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          total += product.price * item.quantity;
        }
      }

      const order: Order = {
        id: `ORDER-${Date.now()}`,
        items,
        total,
        customerEmail,
        status: 'pending'
      };

      // Try to send order to API
      const response = await fetch(`${this.baseUrl}/api/orders?se=${this.seParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        const data = await response.json();
        return { ...order, ...data };
      }

      // Return order even if API fails
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      // Return order anyway for demo purposes
      const products = await this.getProducts();
      let total = 0;
      
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          total += product.price * item.quantity;
        }
      }

      return {
        id: `ORDER-${Date.now()}`,
        items,
        total,
        customerEmail,
        status: 'pending'
      };
    }
  }
}

/**
 * Tool definitions for the AI agent
 */
export const ecommerceTools = [
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: 'Get a list of all available products in the store',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products by name or category',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query (product name or category)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Get detailed information about a specific product by its ID',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'number',
            description: 'The ID of the product'
          }
        },
        required: ['productId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'place_order',
      description: 'Place an order with the specified items. Each item should have a productId and quantity.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of items to order',
            items: {
              type: 'object',
              properties: {
                productId: {
                  type: 'number',
                  description: 'The ID of the product'
                },
                quantity: {
                  type: 'number',
                  description: 'The quantity to order'
                }
              },
              required: ['productId', 'quantity']
            }
          },
          customerEmail: {
            type: 'string',
            description: 'Customer email address (optional)'
          }
        },
        required: ['items']
      }
    }
  }
];

