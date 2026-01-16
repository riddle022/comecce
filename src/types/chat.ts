export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface FloatingAIChatProps {
  initialMessage?: string;
}
