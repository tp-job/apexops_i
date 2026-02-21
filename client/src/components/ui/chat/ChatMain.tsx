import { memo } from 'react';
import type { ChatRoom } from './utils/chatTypes';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from './utils/chatTypes';
import { MdCall, MdInfo, MdVideocam } from 'react-icons/md';

export interface ChatMainProps {
  room: ChatRoom;
  messages: ChatMessage[];
  currentUserId: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isTyping?: boolean;
}

const RoomAvatarSmall = memo(function RoomAvatarSmall({ room }: { room: ChatRoom }) {
  const size = 'w-10 h-10';
  if (room.avatar) {
    return (
      <img
        alt={room.name}
        className={`${size} rounded-full object-cover`}
        src={room.avatar}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full ${room.initialsColor ?? 'bg-dark-surface-2 text-dark-text-secondary'} flex items-center justify-center font-bold text-sm border border-dark-border`}
    >
      {room.initials ?? room.name.charAt(0).toUpperCase()}
    </div>
  );
});

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mt-2 px-2">
      <div className="bg-dark-surface-2 px-4 py-3 rounded-2xl flex items-center gap-1.5 w-16 justify-center">
        <div
          className="w-1.5 h-1.5 bg-dark-text-secondary rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-1.5 h-1.5 bg-dark-text-secondary rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-1.5 h-1.5 bg-dark-text-secondary rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}

function ChatMainComponent({
  room,
  messages,
  currentUserId,
  inputValue,
  onInputChange,
  onSend,
  isTyping = false,
}: ChatMainProps) {
  return (
    <main className="flex-1 flex flex-col bg-dark-bg min-w-0">
      <header className="h-16 px-4 flex items-center justify-between border-b border-dark-border bg-dark-bg/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <RoomAvatarSmall room={room} />
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{room.name}</h2>
            <span
              className={`text-xs ${room.isOnline ? 'text-green' : 'text-dark-text-secondary'}`}
            >
              {room.isOnline ? 'Active now' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-dark-surface-2 text-dark-text-secondary hover:text-white transition-colors"
            aria-label="Call"
          >
            <MdCall className="text-[22px]" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-dark-surface-2 text-dark-text-secondary hover:text-white transition-colors"
            aria-label="Video"
          >
            <MdVideocam className="text-[22px]" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-dark-surface-2 text-dark-text-secondary hover:text-white transition-colors"
            aria-label="Info"
          >
            <MdInfo className="text-[22px]" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden px-2">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            className="h-full"
          />
        </div>
        {isTyping && <TypingIndicator />}
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
        />
      </div>
    </main>
  );
}

export const ChatMain = memo(ChatMainComponent);
