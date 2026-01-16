import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ChevronDown, Sparkles, AlertCircle } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';
import { sendChatMessage } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const { user } = useAuth();
  const { filters } = useGlobalFilters();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      const welcomeMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: 'Olá! Sou seu assistente contábil. Em que posso ajudá-lo hoje?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome]);

  const formatPeriodo = (dataInicio: string, dataFim: string): string => {
    const [ano, mes] = dataInicio.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  const getErrorMessage = (error: Error): string => {
    const errorCode = error.message;

    switch (errorCode) {
      case 'AUTH_REQUIRED':
      case 'AUTH_EXPIRED':
        return '🔒 Sua sessão expirou. Por favor, faça login novamente para continuar.';
      case 'FORBIDDEN':
        return '🚫 Você não tem permissão para usar este recurso.';
      case 'FUNCTION_NOT_FOUND':
        return '⚠️ O serviço de chat não está disponível no momento. Entre em contato com o suporte.';
      case 'NETWORK_ERROR':
        return '🌐 Erro de conexão. Verifique sua internet e tente novamente.';
      case 'SERVER_ERROR':
        return '🔧 Erro no servidor. Tente novamente em alguns instantes.';
      case 'CONFIG_ERROR':
        return '⚙️ Erro de configuração. Entre em contato com o suporte técnico.';
      case 'STREAM_ERROR':
        return '📡 Erro ao receber resposta. Tente novamente.';
      case 'NO_COMPANIES':
        return '🏢 Selecione ao menos uma empresa nos filtros para usar o chat.';
      default:
        console.error('Erro desconhecido:', error);
        return '❌ Erro ao processar sua mensagem. Tente novamente ou recarregue a página.';
    }
  };

  const handleSendMessage = async (content: string) => {
    console.log('[FloatingAIChat] Iniciando envio de mensagem');
    console.log('[FloatingAIChat] Usuário autenticado:', !!user);
    console.log('[FloatingAIChat] Empresas selecionadas:', filters.empresaIds.length);

    if (!user) {
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: '🔒 Você precisa estar autenticado para usar o chat. Por favor, faça login.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    if (filters.empresaIds.length === 0) {
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: '🏢 Por favor, selecione ao menos uma empresa nos filtros globais para que eu possa ajudá-lo com dados específicos.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const aiMessageId = crypto.randomUUID();
    const aiMessage: ChatMessageType = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
    setStreamingMessageId(aiMessageId);

    try {
      const chatMessages = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: msg.content
      }));

      chatMessages.push({
        role: 'user',
        content
      });

      const context = {
        periodo_actual: formatPeriodo(filters.dataInicio, filters.dataFim),
        empresa_ids: filters.empresaIds
      };

      console.log('[FloatingAIChat] Enviando para chatService...');
      await sendChatMessage(chatMessages, context, (chunk) => {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: msg.content + chunk }
            : msg
        ));
      });
      console.log('[FloatingAIChat] Mensagem enviada com sucesso');
    } catch (error) {
      console.error('[FloatingAIChat] Erro ao enviar mensagem:', error);
      const errorMsg = error instanceof Error ? getErrorMessage(error) : 'Erro desconhecido';
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, content: errorMsg }
          : msg
      ));
    } finally {
      setIsTyping(false);
      setStreamingMessageId(null);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#0F4C5C] to-[#1a7a8a] text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-40 flex items-center justify-center group animate-pulse hover:animate-none"
        aria-label="Abrir chat do assistente"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <>
      <div className={`fixed z-40 bg-[#0F172A] border border-[#0F4C5C]/30 shadow-2xl transition-all duration-300 ${isOpen ? 'animate-in fade-in slide-in-from-bottom-4' : ''
        } bottom-24 right-6 w-[380px] lg:w-[420px] h-[550px] lg:h-[600px] max-h-[80vh] rounded-2xl`}>
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 h-[60px] bg-gradient-to-r from-[#0F4C5C] to-[#0F4C5C]/80 px-4 flex items-center justify-between border-b border-[#0F4C5C]/50 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1a7a8a] to-[#0F4C5C] rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Assistente Contábil</h3>
                <div className="flex items-center space-x-1.5">
                  {user ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-300">Online</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-300">Não autenticado</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleChat}
                className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                aria-label="Minimizar chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={toggleChat}
                className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                aria-label="Fechar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && !streamingMessageId && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
        </div>
      </div>

      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#0F4C5C] to-[#1a7a8a] text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-40 flex items-center justify-center group"
        aria-label="Abrir chat do assistente"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    </>
  );
}
