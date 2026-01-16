import { Send } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 border-t border-[#0F4C5C]/30 bg-[#1E293B] p-4">
      <div className="flex items-end space-x-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua pergunta sobre contabilidade..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-[#0F172A] text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C] disabled:opacity-50 disabled:cursor-not-allowed max-h-[72px] overflow-y-auto text-sm"
          style={{ minHeight: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="flex-shrink-0 bg-gradient-to-br from-[#0F4C5C] to-[#1a7a8a] text-white p-3 rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
