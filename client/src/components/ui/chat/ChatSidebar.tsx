import { memo } from 'react';
import type { ChatRoom } from './utils/chatTypes';
import { MdEditSquare } from 'react-icons/md';

export interface ChatSidebarProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  currentUserName: string;
  onSelectRoom: (roomId: string) => void;
  className?: string;
}

const RoomAvatar = memo(function RoomAvatar({
  room,
  size = 'w-12 h-12',
}: {
  room: ChatRoom;
  size?: string;
}) {
  if (room.avatar) {
    return (
      <div className="relative shrink-0">
        <img
          alt={room.name}
          className={`${size} rounded-full object-cover`}
          src={room.avatar}
        />
        {room.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green border-2 border-dark-bg rounded-full" />
        )}
      </div>
    );
  }
  return (
    <div className="relative shrink-0">
      <div
        className={`${size} rounded-full ${room.initialsColor ?? 'bg-dark-surface-2 text-dark-text-secondary'} flex items-center justify-center font-bold text-sm border border-dark-border`}
      >
        {room.initials ?? room.name.charAt(0).toUpperCase()}
      </div>
    </div>
  );
});

interface SidebarRowProps {
  room: ChatRoom;
  isSelected: boolean;
  onSelect: () => void;
}

const SidebarRow = memo(function SidebarRow({ room, isSelected, onSelect }: SidebarRowProps) {
  return (
    <button
      type="button"
      className={`w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
        isSelected
          ? 'bg-dark-surface-2/40 border-l-2 border-blue-primary'
          : 'hover:bg-dark-surface-2/20 border-l-2 border-transparent'
      }`}
      onClick={onSelect}
    >
      <RoomAvatar room={room} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm truncate ${isSelected ? 'font-bold text-white' : 'font-medium text-white'}`}
          >
            {room.name}
          </span>
          <span className="text-[11px] text-dark-text-secondary shrink-0">
            {room.lastMessageTime ?? ''}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className={`text-sm truncate ${room.unreadCount > 0 ? 'text-white font-semibold' : 'text-dark-text-secondary'}`}
          >
            {room.lastMessage ?? ''}
          </span>
          {room.unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

function ChatSidebarComponent({
  rooms,
  selectedRoomId,
  currentUserName,
  onSelectRoom,
  className = '',
}: ChatSidebarProps) {
  return (
    <aside
      className={`w-[320px] lg:w-[360px] bg-dark-bg border-r border-dark-border flex flex-col shrink-0 ${className}`}
      aria-label="Conversations"
    >
      <header className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-dark-border/50">
        <h2 className="text-lg font-bold text-white truncate">{currentUserName}</h2>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-dark-surface-2 text-dark-text-secondary hover:text-white transition-colors"
          aria-label="New chat"
        >
          <MdEditSquare className="text-[22px]" />
        </button>
      </header>

      <div className="px-2 py-2 shrink-0">
        <span className="text-xs font-semibold text-dark-text-secondary uppercase tracking-wide px-2">
          Chats
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" aria-label="Conversation list">
        {rooms.map((room) => (
          <SidebarRow
            key={room.id}
            room={room}
            isSelected={selectedRoomId === room.id}
            onSelect={() => onSelectRoom(room.id)}
          />
        ))}
      </nav>
    </aside>
  );
}

export const ChatSidebar = memo(ChatSidebarComponent);
