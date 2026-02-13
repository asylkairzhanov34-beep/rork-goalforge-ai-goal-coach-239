const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const MODEL = 'gpt-5-mini';

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  if (!key) {
    console.error('[OpenAI] No API key found in EXPO_PUBLIC_OPENAI_API_KEY');
  }
  return key;
}

export interface OpenAIFunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
}

export interface OpenAIInputMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

export interface FunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export type InputItem = OpenAIInputMessage | FunctionCallOutput;

export interface FunctionCallItem {
  id: string;
  type: 'function_call';
  name: string;
  arguments: string;
  call_id: string;
}

export interface MessageItem {
  id: string;
  type: 'message';
  role: string;
  content: { type: string; text?: string }[];
}

export type OutputItem = FunctionCallItem | MessageItem | Record<string, unknown>;

export interface OpenAIResponse {
  id: string;
  output: OutputItem[];
  usage?: Record<string, unknown>;
  error?: { message: string; code: string };
}

export async function callOpenAI(params: {
  input: string | InputItem[];
  tools?: OpenAIFunctionTool[];
  instructions?: string;
  previousResponseId?: string;
}): Promise<OpenAIResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    input: params.input,
    store: true,
  };

  if (params.instructions) {
    body.instructions = params.instructions;
  }
  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
  }
  if (params.previousResponseId) {
    body.previous_response_id = params.previousResponseId;
  }

  console.log('[OpenAI] Calling API with model:', MODEL);
  console.log('[OpenAI] Input type:', typeof params.input === 'string' ? 'string' : 'array');
  console.log('[OpenAI] Tools count:', params.tools?.length || 0);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI] API error:', response.status, errorText);
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[OpenAI] Response received, output items:', data.output?.length || 0);

  if (data.error) {
    console.error('[OpenAI] Response error:', data.error);
    throw new Error(data.error.message || 'OpenAI returned an error');
  }

  return data as OpenAIResponse;
}

export function extractTextFromResponse(response: OpenAIResponse): string {
  const texts: string[] = [];
  for (const item of response.output) {
    if (item.type === 'message') {
      const msg = item as MessageItem;
      for (const content of msg.content) {
        if (content.type === 'output_text' && content.text) {
          texts.push(content.text);
        } else if (content.type === 'text' && content.text) {
          texts.push(content.text);
        }
      }
    }
  }
  return texts.join('\n').trim();
}

export function extractFunctionCalls(response: OpenAIResponse): FunctionCallItem[] {
  return response.output.filter(
    (item): item is FunctionCallItem => item.type === 'function_call'
  );
}
