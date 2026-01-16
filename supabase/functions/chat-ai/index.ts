// ... imports ...
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

interface ChatContext {
  empresa_nombre?: string;
  periodo_actual: string;
  empresa_ids?: string[];
  datos_contexto?: Record<string, unknown>;
}

interface ChatRequest {
  messages: ChatMessage[];
  context: ChatContext;
}

function buildSystemPrompt(context: ChatContext): string {
  const { periodo_actual } = context;

  let systemPrompt = `Você é um assistente contábil especializado em análise de dados financeiros e operacionais.

Contexto atual:
- Período de referência: ${periodo_actual}

Sua principal fonte de verdade absoluta para NÚMEROS e TOTAIS deve ser a ferramenta 'get_dashboard_data'. 

### REGRAS CRÍTICAS DE RESPOSTA:
1. **TOOL OBRIGATÓRIA**: Você DEVE chamar a ferramenta 'get_dashboard_data' para QUALQUER pergunta que envolva números, quantidades, faturamento, OS ou vendedores. NUNCA tente responder de cabeça ou inventar um número, mesmo que pareça óbvio.
2. **TOTAIS E MÉTRICAS**: Use SEMPRE os campos dentro do objeto 'resumo_os' e 'kpis' da ferramenta para informar quantidades totais. 
3. **NÃO CONTE AS LISTAS**: As listas detalhadas ('amostra_vendas_recentes', 'amostra_os_abertas', etc.) são apenas amostras limitadas. NUNCA conte os itens dessas listas; use os totais fornecidos no 'resumo_os'.
4. **Lógica de OS**: 
   - OS Abertas: Ordens abertas dentro do período solicitado.
   - OS Entregues: Ordens com entrega realizada dentro do período solicitado.
5. **Sincronia**: Seus dados são 100% idênticos aos do dashboard.
`;

  systemPrompt += `\n**Instruções ESTRITAS:**
- Responda APENAS ao que foi perguntado.
- Seja EXTREMAMENTE conciso e direto.
- NÃO dê recomendações, sugestões ou dicas.
- Use o contexto fornecido OU dados das ferramentas como fonte de verdade.
- NÃO invente informações.
- Responda em português brasileiro.
- Use R$ X.XXX,XX para valores.
`;

  return systemPrompt;
}

const DASHBOARD_TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'get_dashboard_data',
    description: 'Chame esta ferramenta para obter KPIs, totais de OS e vendas para um período. Obrigatório para QUALQUER resposta numérica.',
    parameters: {
      type: 'object',
      properties: {
        data_inicio: {
          type: 'string',
          description: 'Data de início no formato YYYY-MM-DD'
        },
        data_fim: {
          type: 'string',
          description: 'Data de fim no formato YYYY-MM-DD'
        }
      },
      required: ['data_inicio', 'data_fim']
    }
  }
};

async function getDashboardData(supabase: any, startDate: string, endDate: string, userId: string, contextEmpresaIds?: string[]) {
  let empresaIds = contextEmpresaIds;

  // 1. If no IDs provided in context, get user's associated companies
  if (!empresaIds || empresaIds.length === 0) {
    const { data: userCompanies, error: companiesError } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('usuario_id', userId);

    if (companiesError) throw new Error(`Erro ao buscar empresas: ${companiesError.message}`);
    empresaIds = userCompanies.map((uc: any) => uc.empresa_id);
  }

  if (!empresaIds || empresaIds.length === 0) {
    return { error: 'Usuário não possui empresas associadas ou nenhuma empresa selecionada.' };
  }

  // 2. Call the dedicated AI chat data RPC function
  const { data, error } = await supabase.rpc('get_ai_chat_data', {
    p_data_inicio: startDate,
    p_data_fim: endDate,
    p_empresa_ids: empresaIds
  });

  if (error) throw new Error(`Erro ao buscar dados para IA: ${error.message}`);

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const deepseekApiKey = Deno.env.get('CHAT_COMECCE');

    if (!supabaseUrl || !supabaseAnonKey || !deepseekApiKey) {
      throw new Error('Configuração incompleta');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: ChatRequest = await req.json();
    const { messages, context } = body;
    const systemPrompt = buildSystemPrompt(context);

    const initialMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log(`[chat-ai] Processando mensagem do usuário: ${messages[messages.length - 1].content}`);

    // First call to DeepSeek
    const response1 = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: initialMessages,
        tools: [DASHBOARD_TOOL_DEFINITION],
        stream: false,
        temperature: 0.1, // Lower temperature for more deterministic tool use
      }),
    });

    const data1 = await response1.json();
    const message1 = data1.choices?.[0]?.message;

    if (!message1) {
      throw new Error('Sem resposta da IA');
    }

    console.log(`[chat-ai] Resposta inicial da IA: ${message1.content || '(Tool Call)'}`);

    // Check for tool calls
    if (message1.tool_calls) {
      const toolCall = message1.tool_calls[0];
      if (toolCall.function.name === 'get_dashboard_data') {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[chat-ai] Executando tool get_dashboard_data: ${args.data_inicio} a ${args.data_fim}`);

        // Execute tool safely
        let toolResult;
        try {
          toolResult = await getDashboardData(supabase, args.data_inicio, args.data_fim, user.id, context.empresa_ids);
        } catch (err) {
          toolResult = { error: err.message };
        }

        // Append messages
        const followUpMessages = [
          ...initialMessages,
          message1,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          }
        ];

        // Second call to DeepSeek
        const response2 = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: followUpMessages,
            stream: true,
            temperature: 0.1,
          }),
        });

        return new Response(response2.body, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
      }
    }

    // If no tool call, re-stream the original response (or just return the content if we can't 'resume' the stream easily from a non-streamed request)
    // Since we did stream: false used for the first check, we now have the static content. We can wrap it in a stream or just send it if the client handles it.
    // However, the client expects SSE. So we should stream the static content.

    // Better approach: If no tool call, we can just send the content as SSE events.
    const staticContent = message1.content;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const lines = staticContent.split('\n');
        // Chunk it a bit to simulate streaming or just dump it
        const msg = { choices: [{ delta: { content: staticContent } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });

  } catch (error) {
    console.error('[chat-ai] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
