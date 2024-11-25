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
    // Implement offer creation logic
    return { success: true, message: 'Offer created successfully' };
  },
  update_offer: async (parameters: Record<string, any>) => {
    // Implement offer update logic
    return { success: true, message: 'Offer updated successfully' };
  },
  view_pipeline: async (parameters: Record<string, any>) => {
    // Implement pipeline view logic
    return { success: true, data: { /* pipeline data */ } };
  },
  manage_client: async (parameters: Record<string, any>) => {
    // Implement client management logic
    return { success: true, message: 'Client information updated' };
  },
  generate_report: async (parameters: Record<string, any>) => {
    // Implement report generation logic
    return { success: true, data: { /* report data */ } };
  },
  get_status: async (parameters: Record<string, any>) => {
    // Implement status check logic
    return { success: true, data: { /* status data */ } };
  },
};
