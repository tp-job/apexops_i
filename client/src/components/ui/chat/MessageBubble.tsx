import { memo } from 'react';
import type { ChatMessage } from './utils/chatTypes';
import { formatMessageTime } from './utils/chatApi';

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  currentUserId: string;
}

function MessageBubbleComponent({
  message,
  isOwn,
  showAvatar,
  showSenderName,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex ${isOwn ? 'flex-col items-end' : 'items-end gap-3'} group relative`}
      data-message-id={message.id}
    >
      {!isOwn && (
        showAvatar && message.senderAvatar ? (
          <img
            alt={message.senderName}
            className="w-8 h-8 rounded-full object-cover shrink-0"
            src={message.senderAvatar}
          />
        ) : (
          <div className="w-8 shrink-0" aria-hidden />
        )
      )}

      <div className={`max-w-[70%] flex flex-col gap-1 ${isOwn ? 'items-end' : ''}`}>
        {showSenderName && !isOwn && (
          <span className="text-[11px] text-dark-text-secondary ml-1">
            {message.senderName}
          </span>
        )}

        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''} group/msg`}>
          <div
            className={`px-4 py-2.5 rounded-2xl text-[15px] leading-snug text-white shadow-sm ${
              isOwn
                ? 'bg-blue-primary rounded-br-none'
                : message.isSystem
                  ? 'bg-dark-surface-2/80 border border-dark-border'
                  : 'bg-dark-surface-2 rounded-bl-none'
            }`}
          >
            {message.content}
          </div>
        </div>

        <span
          className="text-[10px] text-dark-text-secondary/60 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden
        >
          {formatMessageTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
