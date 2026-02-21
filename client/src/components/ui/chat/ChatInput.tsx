import { memo, useCallback } from 'react';
import { MdAttachFile, MdFavorite, MdSentimentSatisfied } from 'react-icons/md';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

function ChatInputComponent({
  value,
  onChange,
  onSend,
  placeholder = 'Message...',
  disabled = false,
}: ChatInputProps) {
  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSend();
    }
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <footer className="sticky bottom-0 left-0 right-0 p-4 bg-dark-bg border-t border-dark-border/30 shrink-0">
      <div className="relative bg-dark-surface-2 border border-dark-border rounded-2xl px-4 py-2 flex items-center gap-3 focus-within:border-blue-primary/50 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] transition-all">
        <button
          type="button"
          className="text-dark-text-secondary hover:text-white transition-colors shrink-0"
          aria-label="Emoji"
        >
          <MdSentimentSatisfied className="text-[22px]" />
        </button>
        <input
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-dark-text-secondary text-[15px] h-9 p-0 min-w-0"
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Message input"
        />
        <div className="flex items-center gap-2 border-l border-dark-border pl-3 ml-1 shrink-0">
          <button
            type="button"
            className="text-dark-text-secondary hover:text-white transition-colors"
            aria-label="Attach"
          >
            <MdAttachFile className="text-[22px]" />
          </button>
          {value.trim() ? (
            <button
              type="button"
              className="bg-blue-primary text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-blue-secondary transition-colors"
              onClick={handleSubmit}
            >
              Send
            </button>
          ) : (
            <button
              type="button"
              className="text-dark-text-secondary hover:text-white transition-colors"
              aria-label="Like"
            >
              <MdFavorite className="text-[22px]" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}

export const ChatInput = memo(ChatInputComponent);
