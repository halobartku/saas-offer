import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from 'express-rate-limit';

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
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      system: context ? `Additional context: ${JSON.stringify(context)}` : undefined,
    });

    const response = JSON.parse(message.content[0].text) as AIResponse;
    
    // Validate the response
    if (!SUPPORTED_ACTIONS.includes(response.action as SupportedAction)) {
      throw new Error('Invalid action received from AI');
    }

    return response;
  } catch (error) {
    console.error('AI Processing Error:', error);
    throw new Error('Failed to process AI request: ' + error.message);
  }
}

// Action handlers for each supported action
export const actionHandlers = {
  create_offer: async (parameters: Record<string, any>) => {
    try {
      const { clientId, products } = parameters;
      if (!clientId || !products || !Array.isArray(products)) {
        throw new Error('Invalid parameters for offer creation');
      }

      const result = await db.transaction(async (tx) => {
        const offer = await tx.insert(offers).values({
          clientId,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        const offerItems = products.map(product => ({
          offerId: offer[0].id,
          productId: product.id,
          quantity: product.quantity || 1,
          unitPrice: product.unitPrice,
          discount: product.discount || 0,
        }));

        await tx.insert(offerItems).values(offerItems);
        return offer[0];
      });

      return { 
        success: true, 
        message: 'Offer created successfully', 
        data: result 
      };
    } catch (error) {
      console.error('Error creating offer:', error);
      throw new Error('Failed to create offer: ' + error.message);
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
      throw new Error('Failed to generate report: ' + error.message);
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
      throw new Error('Failed to fetch offer status: ' + error.message);
    }
  },
};
