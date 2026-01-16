import { supabase } from '../lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatContext {
  empresa_nombre?: string;
  periodo_actual: string;
  datos_contexto?: Record<string, unknown>;
}

interface ChatRequest {
  messages: ChatMessage[];
  context: ChatContext;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  context: ChatContext,
  onChunk: (chunk: string) => void
): Promise<void> {
  console.log('[ChatService] Iniciando envio de mensagem...');
  console.log('[ChatService] Contexto:', context);
  console.log('[ChatService] Número de mensagens:', messages.length);

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    console.error('[ChatService] Token de autenticação não encontrado');
    throw new Error('AUTH_REQUIRED');
  }

  console.log('[ChatService] Token obtido com sucesso');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('[ChatService] VITE_SUPABASE_URL não configurado');
    throw new Error('CONFIG_ERROR');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/chat-ai`;
  console.log('[ChatService] URL da API:', apiUrl);

  const body: ChatRequest = {
    messages,
    context
  };

  console.log('[ChatService] Enviando requisição...');

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error('[ChatService] Erro de rede ao fazer fetch:', error);
    throw new Error('NETWORK_ERROR');
  }

  console.log('[ChatService] Status da resposta:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ChatService] Erro na resposta:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });

    if (response.status === 401) {
      throw new Error('AUTH_EXPIRED');
    } else if (response.status === 403) {
      throw new Error('FORBIDDEN');
    } else if (response.status === 404) {
      throw new Error('FUNCTION_NOT_FOUND');
    } else if (response.status >= 500) {
      throw new Error('SERVER_ERROR');
    }

    throw new Error(`HTTP_ERROR_${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error('[ChatService] Reader não disponível');
    throw new Error('STREAM_ERROR');
  }

  console.log('[ChatService] Iniciando leitura do stream...');
  const decoder = new TextDecoder();
  let chunksReceived = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('[ChatService] Stream finalizado. Total de chunks:', chunksReceived);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log('[ChatService] Recebido marcador [DONE]');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              chunksReceived++;
              onChunk(parsed.choices[0].delta.content);
            }
          } catch (e) {
            console.warn('[ChatService] Erro ao parsear chunk SSE:', e, 'Data:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
    console.log('[ChatService] Reader liberado');
  }
}
