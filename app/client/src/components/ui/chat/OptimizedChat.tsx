import type { FC } from 'react';
import { MdForum } from 'react-icons/md';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { useChatController } from './logic/useChatController';

export const OptimizedChat: FC = () => {
  const {
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    currentUser,
    currentMessages,
    inputValue,
    setInputValue,
    handleSend,
    isTyping,
  } = useChatController();

  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-dark-bg text-white overflow-hidden">
      <ChatSidebar
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        currentUserName={currentUser.name}
        onSelectRoom={setSelectedRoomId}
      />

      {selectedRoom ? (
        <ChatMain
          room={selectedRoom}
          messages={currentMessages}
          currentUserId={currentUser.id}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isTyping={isTyping}
        />
      ) : (
        <main className="flex-1 flex items-center justify-center bg-dark-bg">
          <div className="text-center space-y-4 px-4">
            <div className="w-20 h-20 rounded-full bg-dark-surface-2 flex items-center justify-center mx-auto">
              <MdForum className="text-4xl text-dark-text-secondary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Your Messages</h3>
              <p className="text-dark-text-secondary text-sm mt-1">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default OptimizedChat;
