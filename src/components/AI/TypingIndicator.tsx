export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-4 py-3">
      <div className="flex items-center space-x-2 bg-[#0F4C5C]/20 rounded-2xl px-4 py-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-[#0F4C5C] rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-[#0F4C5C] rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-[#0F4C5C] rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }}></div>
        </div>
        <span className="text-xs text-gray-400 ml-2">Digitando...</span>
      </div>
    </div>
  );
}
