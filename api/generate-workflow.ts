import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdmin, verifyToken } from './_utils/supabase.js';
import { logEvent } from './_utils/logger.js';

const WORKFLOW_COST = 15; // TWD

// TapPay API endpoint
const TAPPAY_SANDBOX_URL = 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';
const TAPPAY_PROD_URL = 'https://prod.tappaysdk.com/tpc/payment/pay-by-prime';

// Lazy initialization to avoid cold start errors
let anthropic: Anthropic | null = null;

const getAnthropicClient = () => {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
};

// System prompts by language
const SYSTEM_PROMPTS: Record<string, string> = {
  'zh-TW': `你是一個專業的 AI Agent 工作流架構師與 DSL 生成引擎。
請將使用者的描述轉化為結構化的工作流數據。

核心原則：
1. 拓撲結構完整性：所有節點必須透過 'next' 與 'edges' 正確串接。
2. 節點 ID 一致性：'nodes.node_id'、'nodes.next' 以及 'edges.source/target' 的 ID 必須完全匹配。
3. 邏輯分支：'Condition' 節點必須有兩個輸出路徑，'next[0]' 代表 True (真)，'next[1]' 代表 False (假)。

節點指南：
- 'ScriptExecution': 處理 Python/Shell 代碼。
- 'MCPTool': 調用外部工具 (如 google_search)。
- 'AgentSkill': 當使用者提到特定技能模組或 "superpower" 時使用。務必填寫 config 中的 'provider' (例如 superpower) 和 'skill' (例如 brain_storm)。
- 'Condition': 邏輯判斷。
- 'AgentReasoning': AI 的思考步驟。

約束：
- 請使用繁體中文。
- 節點 ID 嚴禁包含空格。
- 務必確保 edges 陣列包含所有連線數據。`,

  'en': `You are a professional AI Agent workflow architect and DSL generation engine.
Transform user descriptions into structured workflow data.

Core Principles:
1. Topological Integrity: All nodes must be correctly connected via 'next' and 'edges'.
2. Node ID Consistency: IDs in 'nodes.node_id', 'nodes.next', and 'edges.source/target' must match exactly.
3. Logical Branching: 'Condition' nodes must have two output paths. 'next[0]' represents True, 'next[1]' represents False.

Node Guidelines:
- 'ScriptExecution': Handles Python/Shell code.
- 'MCPTool': Invokes external tools (e.g., google_search).
- 'AgentSkill': Use when user mentions specific skill modules or "superpower". Must fill in 'provider' (e.g., superpower) and 'skill' (e.g., brain_storm) in config.
- 'Condition': Logical decision making.
- 'AgentReasoning': AI's reasoning steps.

Constraints:
- Use English for all content.
- Node IDs must not contain spaces.
- Ensure the edges array contains all connection data.`,
};

// Schema descriptions by language
const SCHEMA_DESC: Record<string, Record<string, string>> = {
  'zh-TW': {
    confirmation: '簡短的自然語言確認，說明你已理解流程需求。',
    nodeId: '唯一標識符，建議使用小寫字母、數字及底線，不得包含空格。',
    nodeType: '必須是以下之一: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill',
    next: '此節點指向的下一個節點 ID 列表。',
    provider: "Agent Skill 的提供者，例如 'superpower'",
    skill: "具體的技能名稱，例如 'brain_storm'",
  },
  'en': {
    confirmation: 'A brief natural language confirmation that you understand the workflow requirements.',
    nodeId: 'Unique identifier. Use lowercase letters, numbers, and underscores only. No spaces allowed.',
    nodeType: 'Must be one of: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill',
    next: 'List of node IDs this node points to.',
    provider: "Agent Skill provider, e.g., 'superpower'",
    skill: "Specific skill name, e.g., 'brain_storm'",
  },
};

// Tool definition for structured output
const createWorkflowTool = (lang: string): Anthropic.Tool => {
  const desc = SCHEMA_DESC[lang] || SCHEMA_DESC['zh-TW'];
  return {
    name: 'generate_workflow',
    description: 'Generate a structured AI agent workflow based on user requirements',
    input_schema: {
      type: 'object' as const,
      properties: {
        confirmation: {
          type: 'string',
          description: desc.confirmation,
        },
        workflow: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Workflow name' },
            description: { type: 'string', description: 'Workflow description' },
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  node_id: { type: 'string', description: desc.nodeId },
                  node_type: { type: 'string', description: desc.nodeType },
                  description: { type: 'string' },
                  inputs: { type: 'array', items: { type: 'string' } },
                  outputs: { type: 'array', items: { type: 'string' } },
                  config: {
                    type: 'object',
                    properties: {
                      provider: { type: 'string', description: desc.provider },
                      skill: { type: 'string', description: desc.skill },
                    },
                  },
                  position: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                    required: ['x', 'y'],
                  },
                  next: {
                    type: 'array',
                    items: { type: 'string' },
                    description: desc.next,
                  },
                },
                required: ['node_id', 'node_type', 'description', 'inputs', 'outputs', 'position', 'next'],
              },
            },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  source: { type: 'string' },
                  target: { type: 'string' },
                  sourcePortIndex: { type: 'number' },
                  targetPortIndex: { type: 'number' },
                  label: { type: 'string' },
                  isLoop: { type: 'boolean' },
                },
                required: ['id', 'source', 'target', 'sourcePortIndex', 'targetPortIndex'],
              },
            },
          },
          required: ['name', 'description', 'nodes', 'edges'],
        },
      },
      required: ['confirmation', 'workflow'],
    },
  };
};

// Process TapPay payment
async function processTapPayPayment(
  prime: string,
  amount: number,
  userEmail: string,
  description: string
): Promise<{ success: boolean; recTradeId?: string; error?: { code: number; message: string } }> {
  const partnerKey = process.env.TAPPAY_PARTNER_KEY;
  const merchantId = process.env.TAPPAY_MERCHANT_ID;

  if (!partnerKey || !merchantId) {
    return { success: false, error: { code: -99, message: 'TapPay not configured' } };
  }

  const isProduction = process.env.VITE_TAPPAY_ENV === 'production';
  const apiUrl = isProduction ? TAPPAY_PROD_URL : TAPPAY_SANDBOX_URL;

  const tapPayRequest = {
    prime,
    partner_key: partnerKey,
    merchant_id: merchantId,
    details: description,
    amount,
    currency: 'TWD',
    cardholder: {
      phone_number: '',
      name: userEmail.split('@')[0] || 'User',
      email: userEmail,
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': partnerKey,
    },
    body: JSON.stringify(tapPayRequest),
  });

  const result = await response.json();

  if (result.status === 0) {
    return { success: true, recTradeId: result.rec_trade_id };
  } else {
    return { success: false, error: { code: result.status, message: result.msg } };
  }
}

// Log critical event to system_logs table
async function logCriticalEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  userEmail: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('system_logs').insert({
      level: 'critical',
      event: 'payment_failed_after_generation',
      user_id: userId,
      user_email: userEmail,
      details,
    });
  } catch (err) {
    console.error('Failed to log critical event:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyToken(req.headers.authorization || '');
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { prompt, language = 'zh-TW', prime } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!prime) {
    return res.status(400).json({ error: 'Payment information is required' });
  }

  const supabase = createSupabaseAdmin();
  const ip = req.headers['x-forwarded-for'] as string;

  // Rate limit check (5 requests per minute per user)
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_user_id: user.id,
    p_endpoint: 'generate-workflow',
    p_max_requests: 5
  });

  if (rateLimitError) {
    console.error('Rate limit check error:', rateLimitError);
  } else if (!allowed) {
    await logEvent('blocked', { reason: 'rate_limit', endpoint: 'generate-workflow' }, user.id, ip);
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  // Log API request
  await logEvent('api_request', {
    endpoint: 'generate-workflow',
    prompt_length: prompt.length
  }, user.id, ip);

  try {
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS['zh-TW'];
    const workflowTool = createWorkflowTool(language);
    const userPrompt = language === 'en'
      ? `User Requirements:\n"${prompt}"`
      : `使用者需求：\n"${prompt}"`;

    // Step 1: Generate workflow first
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      tools: [workflowTool],
      tool_choice: { type: 'tool', name: 'generate_workflow' },
      messages: [
        {
          role: 'user',
          content: userPrompt,
        }
      ],
    });

    // Extract tool use result
    const toolUseBlock = response.content.find(block => block.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      throw new Error('No tool use response from Claude');
    }
    const result = toolUseBlock.input;

    // Step 2: Process payment after successful generation
    const paymentResult = await processTapPayPayment(
      prime,
      WORKFLOW_COST,
      user.email || '',
      `生成 Flow - NT$${WORKFLOW_COST}`
    );

    if (!paymentResult.success) {
      // Generation succeeded but payment failed - log critical event
      await logCriticalEvent(supabase, user.id, user.email || '', {
        type: 'workflow',
        amount: WORKFLOW_COST,
        user_prompt: prompt,
        tappay_error: paymentResult.error,
      });

      await logEvent('payment_failed', {
        endpoint: 'generate-workflow',
        amount: WORKFLOW_COST,
        error: paymentResult.error,
      }, user.id, ip);

      return res.status(402).json({
        error: '付款失敗，請重試',
        payment_error: paymentResult.error,
      });
    }

    // Step 3: Record transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'charge',
      amount: -WORKFLOW_COST,
      description: 'Generate Workflow',
      stripe_payment_id: paymentResult.recTradeId,
      balance_after: 0, // Not using balance anymore
    });

    if (txError) {
      console.error('Transaction record error:', txError);
      // Non-critical - payment succeeded, just log the error
    }

    // Update total_spent
    await supabase.rpc('increment_total_spent', {
      p_user_id: user.id,
      p_amount: WORKFLOW_COST,
    }).catch(err => {
      console.error('Failed to update total_spent:', err);
    });

    await logEvent('charge', {
      amount: WORKFLOW_COST,
      endpoint: 'generate-workflow',
      rec_trade_id: paymentResult.recTradeId,
    }, user.id, ip);

    await logEvent('api_success', {
      endpoint: 'generate-workflow'
    }, user.id, ip);

    return res.status(200).json({ result });
  } catch (error) {
    console.error('Generate workflow error:', error);
    await logEvent('api_error', {
      endpoint: 'generate-workflow',
      error: String(error),
      errorType: error instanceof Error ? error.name : typeof error,
    }, user.id, ip);
    return res.status(500).json({ error: 'Failed to generate workflow' });
  }
}
