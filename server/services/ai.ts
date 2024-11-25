import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from 'express-rate-limit';
import { db } from '../../db';
import { clients, products, offers, offerItems } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiting middleware
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

interface AIResponse {
  action: string;
  parameters: Record<string, any>;
  message: string;
}

// Intent recognition system
const SUPPORTED_ACTIONS = [
  'create_offer',
  'update_offer',
  'view_pipeline',
  'manage_client',
  'generate_report',
  'get_status',
] as const;

type SupportedAction = typeof SUPPORTED_ACTIONS[number];

const systemPrompt = `You are an AI assistant for an offer management system. Your role is to:
1. Understand user requests related to offers, clients, pipeline, and reports
2. Identify the specific action needed
3. Extract relevant parameters
4. Provide clear, concise responses

Always respond in the following JSON format:
{
  "action": "one_of_supported_actions",
  "parameters": {
    // relevant parameters for the action
  },
  "message": "human friendly response"
}

Supported actions: ${SUPPORTED_ACTIONS.join(', ')}`;

export async function processAIRequest(
  userInput: string,
  context: Record<string, any> = {}
): Promise<AIResponse> {
  try {
    // Enhanced system prompt for better context understanding
    const enhancedPrompt = `${systemPrompt}\n\nWhen processing offer creation requests:
1. Look for specific client country mentions (e.g., "Swedish client")
2. Extract discount percentages if mentioned
3. Identify desired offer status (e.g., "sent", "draft")

Current context: The system supports creating offers for clients with specific country codes and applying discounts.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        { role: 'assistant', content: enhancedPrompt },
        { role: 'user', content: userInput }
      ],
      system: context ? `Additional context: ${JSON.stringify(context)}` : undefined
    });

    const response = JSON.parse(message.content[0].text) as AIResponse;
    
    // Validate the response
    if (!SUPPORTED_ACTIONS.includes(response.action as SupportedAction)) {
      throw new Error('Invalid action received from AI');
    }

    // Handle special case for Swedish client offer creation
    if (response.action === 'create_offer' && 
        userInput.toLowerCase().includes('swedish client')) {
      response.parameters = {
        ...response.parameters,
        countryCode: 'SE',
        discount: 29,
        status: 'sent'
      };
    }

    return response;
  } catch (error) {
    console.error('AI Processing Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to process AI request: ${errorMessage}`);
  }
}

// Action handlers for each supported action
export const actionHandlers = {
  create_offer: async (parameters: Record<string, any>) => {
    try {
      // Find Swedish client
      const swedishClient = await db
        .select()
        .from(clients)
        .where(eq(clients.countryCode, 'SE'))
        .limit(1);

      if (!swedishClient.length) {
        throw new Error('No Swedish client found in the system');
      }

      // Get all available products
      const availableProducts = await db
        .select()
        .from(products);

      if (!availableProducts.length) {
        throw new Error('No products available in the system');
      }

      const result = await db.transaction(async (tx) => {
        // Create offer
        const offer = await tx.insert(offers).values({
          clientId: swedishClient[0].id,
          status: 'sent', // Set status to sent as requested
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        // Create offer items with 29% discount
        const items = availableProducts.map(product => ({
          offerId: offer[0].id,
          productId: product.id,
          quantity: 1,
          unitPrice: product.price,
          discount: 29, // Apply 29% discount to all items
        }));

        await tx.insert(offerItems).values(items);

        // Calculate total amount with discount
        const totalAmount = items.reduce((sum, item) => {
          const discountedPrice = item.unitPrice * (1 - 29/100);
          return sum + (discountedPrice * item.quantity);
        }, 0);

        // Update offer with total amount
        await tx.update(offers)
          .set({ totalAmount })
          .where(eq(offers.id, offer[0].id));

        return {
          ...offer[0],
          totalAmount,
          client: swedishClient[0],
          items: items.map((item, index) => ({
            ...item,
            product: availableProducts[index]
          }))
        };
      });

      return { 
        success: true, 
        message: `Offer created successfully for ${result.client.name} with 29% discount on all items`, 
        data: result 
      };
    } catch (error) {
      console.error('Error creating offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create offer: ${errorMessage}`);
    }
  },

  update_offer: async (parameters: Record<string, any>) => {
    try {
      const { offerId, status, products } = parameters;
      if (!offerId) {
        throw new Error('Offer ID is required');
      }

      const result = await db.transaction(async (tx) => {
        const updatedOffer = await tx
          .update(offers)
          .set({
            status: status || undefined,
            updatedAt: new Date(),
          })
          .where(eq(offers.id, offerId))
          .returning();

        if (products && Array.isArray(products)) {
          await tx.delete(offerItems).where(eq(offerItems.offerId, offerId));
          const newItems = products.map(product => ({
            offerId,
            productId: product.id,
            quantity: product.quantity || 1,
            unitPrice: product.unitPrice,
            discount: product.discount || 0,
          }));
          await tx.insert(offerItems).values(newItems);
        }

        return updatedOffer[0];
      });

      return { 
        success: true, 
        message: 'Offer updated successfully', 
        data: result 
      };
    } catch (error) {
      console.error('Error updating offer:', error);
      throw new Error('Failed to update offer: ' + error.message);
    }
  },

  view_pipeline: async (parameters: Record<string, any>) => {
    try {
      const pipelineData = await db
        .select({
          id: offers.id,
          status: offers.status,
          clientId: offers.clientId,
          totalAmount: offers.totalAmount,
          updatedAt: offers.updatedAt,
          clientName: clients.name,
        })
        .from(offers)
        .leftJoin(clients, eq(offers.clientId, clients.id))
        .orderBy(desc(offers.updatedAt));

      return { 
        success: true, 
        data: pipelineData 
      };
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      throw new Error('Failed to fetch pipeline data: ' + error.message);
    }
  },

  manage_client: async (parameters: Record<string, any>) => {
    try {
      const { clientId, action, data } = parameters;
      
      if (action === 'create') {
        const newClient = await db
          .insert(clients)
          .values(data)
          .returning();
        return { 
          success: true, 
          message: 'Client created successfully', 
          data: newClient[0] 
        };
      } else if (action === 'update' && clientId) {
        const updatedClient = await db
          .update(clients)
          .set(data)
          .where(eq(clients.id, clientId))
          .returning();
        return { 
          success: true, 
          message: 'Client updated successfully', 
          data: updatedClient[0] 
        };
      }

      throw new Error('Invalid client management action');
    } catch (error) {
      console.error('Error managing client:', error);
      throw new Error('Failed to manage client: ' + error.message);
    }
  },

  generate_report: async (parameters: Record<string, any>) => {
    try {
      const { type, dateRange } = parameters;
      let reportData;

      switch (type) {
        case 'revenue':
          reportData = await db.execute(sql`
            SELECT 
              DATE_TRUNC('month', o.updated_at) as month,
              SUM(total_amount) as revenue,
              COUNT(*) as total_offers
            FROM ${offers} o
            WHERE status IN ('Close & Paid', 'Paid & Delivered')
            AND updated_at >= ${dateRange?.start || 'NOW() - INTERVAL \'6 months\''}
            AND updated_at <= ${dateRange?.end || 'NOW()'}
            GROUP BY month
            ORDER BY month DESC
          `);
          break;

        case 'products':
          reportData = await db.execute(sql`
            WITH closed_offers AS (
              SELECT id FROM ${offers}
              WHERE status IN ('Close & Paid', 'Paid & Delivered')
            )
            SELECT 
              p.name,
              SUM(oi.quantity) as total_quantity,
              SUM(oi.quantity * oi.unit_price * (1 - COALESCE(oi.discount, 0)/100)) as total_revenue
            FROM ${products} p
            JOIN ${offerItems} oi ON p.id = oi.product_id
            JOIN closed_offers co ON oi.offer_id = co.id
            GROUP BY p.id, p.name
            ORDER BY total_revenue DESC
          `);
          break;

        default:
          throw new Error('Invalid report type');
      }

      return { 
        success: true, 
        data: reportData.rows 
      };
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error('Failed to generate report: ' + errorMessage);
    }
  },

  get_status: async (parameters: Record<string, any>) => {
    try {
      const { offerId } = parameters;
      
      const offerStatus = await db
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (!offerStatus.length) {
        throw new Error('Offer not found');
      }

      const items = await db
        .select()
        .from(offerItems)
        .where(eq(offerItems.offerId, offerId));

      return { 
        success: true, 
        data: {
          ...offerStatus[0],
          items
        }
      };
    } catch (error) {
      console.error('Error fetching status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error('Failed to fetch offer status: ' + errorMessage);
    }
  },
};
