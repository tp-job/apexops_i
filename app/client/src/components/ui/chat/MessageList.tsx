import { useRef, useCallback } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from './utils/chatTypes';
import { formatDateSeparator } from './utils/chatApi';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  className?: string;
}

/** Renders a date separator between message groups when date changes */
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <span className="text-[11px] font-medium text-dark-text-secondary bg-dark-surface-2/50 px-3 py-1 rounded-full">
        {date}
      </span>
    </div>
  );
}

export function MessageList({ messages, currentUserId, className = '' }: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const isOwn = useCallback(
    (msg: ChatMessage) => msg.senderId === currentUserId,
    [currentUserId]
  );

  const showAvatar = useCallback(
    (index: number) => {
      if (index === 0) return true;
      const msg = messages[index];
      const prev = messages[index - 1];
      return prev.senderId !== msg.senderId;
    },
    [messages]
  );

  const showSenderName = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (msg.senderId === currentUserId) return false;
      return showAvatar(index);
    },
    [messages, currentUserId, showAvatar]
  );

  const getDateSeparator = useCallback((index: number) => {
    const msg = messages[index];
    const prev = messages[index - 1];
    if (!prev) return formatDateSeparator(msg.createdAt);
    const prevDate = new Date(prev.createdAt).toDateString();
    const currDate = new Date(msg.createdAt).toDateString();
    return prevDate !== currDate ? formatDateSeparator(msg.createdAt) : null;
  }, [messages]);

  const itemContent = useCallback(
    (index: number) => {
      const message = messages[index];
      const dateSep = getDateSeparator(index);
      const own = isOwn(message);
      const showAv = showAvatar(index);
      const showName = showSenderName(index);

      return (
        <div className="px-2 py-1">
          {dateSep && <DateSeparator date={dateSep} />}
          <MessageBubble
            message={message}
            isOwn={own}
            showAvatar={showAv}
            showSenderName={showName}
            currentUserId={currentUserId}
          />
        </div>
      );
    },
    [messages, currentUserId, isOwn, showAvatar, showSenderName, getDateSeparator]
  );

  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center text-dark-text-secondary text-sm ${className}`}>
        No messages yet. Say hi!
      </div>
    );
  }

  const computeItemKey = useCallback((_index: number, message: ChatMessage) => message.id, []);

  return (
    <Virtuoso
      ref={virtuosoRef}
      className={className}
      data={messages}
      itemContent={itemContent}
      computeItemKey={computeItemKey}
      followOutput="smooth"
      initialTopMostItemIndex={messages.length - 1}
      style={{ height: '100%' }}
    />
  );
}
