import { memo } from 'react';
import type { ChatRoom } from './utils/chatTypes';

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
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
        )}
      </div>
    );
  }
  return (
    <div className="relative shrink-0">
      <div
        className={`${size} rounded-full ${room.initialsColor ?? 'bg-white/5 text-gray-400'} flex items-center justify-center font-bold text-sm border border-white/10`}
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
          ? 'bg-white/10 border-l-2 border-brand-accent'
          : 'hover:bg-white/5 border-l-2 border-transparent'
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
          <span className="text-[11px] text-gray-400 shrink-0">
            {room.lastMessageTime ?? ''}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className={`text-sm truncate ${room.unreadCount > 0 ? 'text-white font-semibold' : 'text-gray-400'}`}
          >
            {room.lastMessage ?? ''}
          </span>
          {room.unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand-accent text-brand-dark text-[10px] font-bold flex items-center justify-center shrink-0">
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
  onSelectRoom,
  className = '',
}: ChatSidebarProps) {
  return (
    <aside
      className={`w-full bg-transparent border-t border-white/10 flex flex-col flex-1 min-h-0 ${className}`}
      aria-label="Conversations"
    >
      <div className="px-4 py-3 shrink-0 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
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
