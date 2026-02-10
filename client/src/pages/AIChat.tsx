import React, { useState, useRef, useEffect } from 'react';
import {
    Menu,
    Plus,
    MessageSquare,
    Settings,
    Activity,
    HelpCircle,
    Send,
    Image as ImageIcon,
    Mic,
    User,
    Bot,
    Sparkles,
    Code,
    Compass,
    Lightbulb,
    MoreVertical,
    X
} from 'lucide-react';

// --- Types ---

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
}

// --- API Helper ---

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const generateResponse = async (history: Message[], prompt: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                history: history.map(msg => ({
                    role: msg.role,
                    text: msg.text
                }))
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('AI API Error:', errorData);

            if (response.status === 429) {
                return "⚠️ Rate limit exceeded. Please wait a moment and try again.";
            }

            if (response.status === 403) {
                return "⚠️ AI service access denied. Please check your API key configuration.";
            }

            return errorData.error || "Sorry, I encountered an error. Please try again.";
        }

        const data = await response.json();
        return data.text || "I couldn't generate a response.";
    } catch (error) {
        console.error("Generation failed", error);
        return "Sorry, I couldn't connect to the AI service. Please check if the server is running.";
    }
};

// --- Components ---

const SidebarAI = ({
    isOpen,
    setIsOpen,
    sessions,
    currentSessionId,
    onNewChat,
    onSelectChat,
    onDeleteChat
}: {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    sessions: ChatSession[];
    currentSessionId: string | null;
    onNewChat: () => void;
    onSelectChat: (id: string) => void;
    onDeleteChat?: (id: string) => void;
}) => {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Content */}
            <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-[280px] bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-r border-light-border dark:border-dark-border/50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Header with Logo */}
                <div className="p-4 flex items-center gap-3 border-b border-dark-border/30">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember to-wine flex items-center justify-center shadow-lg shadow-ember/20">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-sm font-semibold text-dark-text-primary">ApexOps AI</h1>
                        <p className="text-xs text-dark-text-secondary">Powered by Gemini</p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-dark-surface-2 rounded-lg text-dark-text-secondary hover:text-dark-text-primary transition-colors lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="p-3">
                    <button
                        onClick={() => {
                            onNewChat();
                            if (window.innerWidth < 1024) setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-ember to-wine hover:from-ember/90 hover:to-wine/90 text-white rounded-xl transition-all shadow-md shadow-ember/20 hover:shadow-lg hover:shadow-ember/30 font-medium text-sm"
                    >
                        <Plus size={18} />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* Recent Chats List */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    <div className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary px-3 mb-2 uppercase tracking-wider">
                        Chat History
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            <MessageSquare size={32} className="mx-auto text-dark-text-secondary/50 mb-2" />
                            <p className="text-sm text-dark-text-secondary">No conversations yet</p>
                            <p className="text-xs text-dark-text-secondary/70">Start a new chat to begin</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`group flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all cursor-pointer ${currentSessionId === session.id
                                        ? 'bg-ember/20 text-ember border-l-2 border-ember'
                                        : 'text-dark-text hover:bg-dark-surface-2'
                                        }`}
                                    onClick={() => {
                                        onSelectChat(session.id);
                                        if (window.innerWidth < 1024) setIsOpen(false);
                                    }}
                                >
                                    <MessageSquare size={16} className={currentSessionId === session.id ? 'text-ember' : 'text-light-text-secondary dark:text-dark-text-secondary group-hover:text-peach'} />
                                    <span className="truncate flex-1 text-light-text-primary dark:text-dark-text-primary">{session.title}</span>
                                    {onDeleteChat && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteChat(session.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-global-red/20 rounded text-dark-text-secondary hover:text-global-red transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom Section */}
                <div className="mt-auto border-t border-dark-border/30">
                    {/* Quick Actions */}
                    <div className="p-2 space-y-0.5">
                        <MenuButton icon={<Settings size={16} />} label="Settings" />
                        <MenuButton icon={<HelpCircle size={16} />} label="Help & FAQ" />
                    </div>

                    {/* Status Bar */}
                    <div className="px-4 py-3 bg-dark-surface-2/50 flex items-center gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo to-wine flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-global-green rounded-full border-2 border-dark-surface-2"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark-text-primary truncate">Developer</p>
                            <p className="text-xs text-dark-text-secondary">Online</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const MenuButton = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-surface-2 rounded-lg transition-colors">
        <span className="text-dark-text-secondary">{icon}</span>
        {label}
    </button>
);

const SuggestionCard = ({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="bg-dark-surface hover:bg-dark-surface-2 p-4 rounded-xl text-left transition-all flex flex-col gap-3 h-40 justify-between group border border-dark-border/50 hover:border-ember/30 hover:shadow-lg hover:shadow-ember/10"
    >
        <div className="p-2.5 bg-gradient-to-br from-ember/20 to-wine/20 w-fit rounded-xl text-ember group-hover:text-peach transition-colors">
            {icon}
        </div>
        <span className="text-dark-text-secondary text-sm font-medium group-hover:text-dark-text-primary transition-colors line-clamp-2">{text}</span>
    </button>
);

const ChatMessage = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 w-full max-w-4xl mx-auto px-4 py-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden ${isUser
                    ? 'bg-gradient-to-br from-indigo to-navy'
                    : 'bg-gradient-to-br from-ember to-wine'
                }`}>
                {isUser ? (
                    <User size={18} className="text-white" />
                ) : (
                    <Sparkles size={18} className="text-white" />
                )}
            </div>

            <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`text-xs font-medium mb-1.5 ${isUser ? 'text-indigo' : 'text-ember'}`}>
                    {isUser ? 'You' : 'ApexOps AI'}
                </div>
                <div className={`prose prose-invert max-w-none text-[15px] leading-relaxed whitespace-pre-wrap ${isUser
                        ? 'text-dark-text-primary bg-dark-surface px-4 py-3 rounded-2xl rounded-tr-sm border border-dark-border/50'
                        : 'text-dark-text'
                    }`}>
                    {message.text}
                </div>
            </div>
        </div>
    );
};

export default function AIChat() {
    const [sidebarAIOpen, setSidebarAIOpen] = useState(true);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Ref for auto-scrolling
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [sessions, currentSessionId, isLoading]);

    // Handle textarea auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const currentSession = sessions.find(s => s.id === currentSessionId);
    const currentMessages = currentSession?.messages || [];

    const createNewSession = () => {
        const newId = Date.now().toString();
        const newSession: ChatSession = {
            id: newId,
            title: 'New Chat',
            messages: []
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        return newSession;
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() || isLoading) return;

        let session = currentSession;
        if (!session) {
            session = createNewSession();
        }

        // Optimistic Update
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend,
            timestamp: Date.now()
        };

        // Update state immediately
        setSessions(prev => prev.map(s => {
            if (s.id === session!.id) {
                return {
                    ...s,
                    messages: [...s.messages, userMsg],
                    title: s.messages.length === 0 ? textToSend.slice(0, 30) + '...' : s.title
                };
            }
            return s;
        }));

        setInput('');
        setIsLoading(true);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // API Call
        const responseText = await generateResponse(session.messages, textToSend);

        const modelMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: Date.now()
        };

        setSessions(prev => prev.map(s => {
            if (s.id === session!.id) {
                return {
                    ...s,
                    messages: [...s.messages, modelMsg]
                };
            }
            return s;
        }));

        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDeleteChat = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) {
            setCurrentSessionId(null);
        }
    };

    return (
        <div className="flex h-screen font-sans overflow-hidden">
            <SidebarAI
                isOpen={sidebarAIOpen}
                setIsOpen={setSidebarAIOpen}
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={() => setCurrentSessionId(null)}
                onSelectChat={setCurrentSessionId}
                onDeleteChat={handleDeleteChat}
            />

            <main className="flex-1 flex flex-col relative w-full h-full max-w-full">
                {/* Top Bar */}
                <div className="p-3 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-dark-bg/95 backdrop-blur-sm z-10 border-b border-light-border dark:border-dark-border/30">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarAIOpen(true)}
                            className="lg:hidden p-2 hover:bg-dark-surface-2 rounded-lg text-dark-text-secondary hover:text-dark-text-primary transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ember to-wine flex items-center justify-center">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <span className="text-base font-semibold text-dark-text-primary">ApexOps AI</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentSessionId && (
                            <button
                                onClick={() => setCurrentSessionId(null)}
                                className="px-3 py-1.5 text-sm bg-dark-surface hover:bg-dark-surface-2 rounded-lg text-dark-text-secondary hover:text-dark-text-primary transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">New Chat</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto">
                    {!currentSessionId || currentMessages.length === 0 ? (
                        // Welcome Screen
                        <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col h-full justify-center min-h-[500px]">
                            <div className="mb-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ember via-wine to-indigo flex items-center justify-center mx-auto mb-6 shadow-lg shadow-ember/30">
                                    <Sparkles size={32} className="text-white" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-peach via-ember to-wine bg-clip-text text-transparent mb-3">
                                    Hello, Developer!
                                </h1>
                                <p className="text-lg text-dark-text-secondary max-w-md mx-auto">
                                    I'm your AI assistant. Ask me anything about coding, debugging, or any topic you're curious about.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <SuggestionCard
                                    icon={<Compass size={22} />}
                                    text="Plan a trip to explore the street food of Bangkok"
                                    onClick={() => handleSend("Plan a trip to explore the street food of Bangkok")}
                                />
                                <SuggestionCard
                                    icon={<Lightbulb size={22} />}
                                    text="Explain the theory of relativity like I'm five"
                                    onClick={() => handleSend("Explain the theory of relativity like I'm five")}
                                />
                                <SuggestionCard
                                    icon={<Code size={22} />}
                                    text="Write a Python script to automate file renaming"
                                    onClick={() => handleSend("Write a Python script to automate file renaming")}
                                />
                                <SuggestionCard
                                    icon={<Sparkles size={22} />}
                                    text="Help me debug a React component"
                                    onClick={() => handleSend("Help me debug a React component that's not rendering correctly")}
                                />
                            </div>
                        </div>
                    ) : (
                        // Messages List
                        <div className="py-4">
                            {currentMessages.map((msg) => (
                                <ChatMessage key={msg.id} message={msg} />
                            ))}

                            {isLoading && (
                                <div className="flex gap-4 w-full max-w-4xl mx-auto p-4">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember to-wine flex items-center justify-center flex-shrink-0">
                                        <Sparkles size={18} className="text-white animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-2 h-9">
                                        <div className="w-2 h-2 bg-ember rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-wine rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-peach rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        <span className="text-sm text-dark-text-secondary ml-2">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gradient-to-t from-white via-white dark:from-dark-bg dark:via-dark-bg to-transparent">
                    <div className="max-w-4xl mx-auto">
                        <div className="relative bg-dark-surface rounded-2xl border border-dark-border focus-within:border-ember/50 focus-within:shadow-lg focus-within:shadow-ember/10 transition-all">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything..."
                                className="w-full bg-transparent text-dark-text-primary placeholder-dark-text-secondary px-5 py-4 pr-24 rounded-2xl resize-none focus:outline-none max-h-[200px] min-h-[56px] overflow-y-auto"
                                rows={1}
                            />

                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                <button className="p-2 text-dark-text-secondary hover:text-peach hover:bg-dark-surface-2 rounded-xl transition-colors">
                                    <ImageIcon size={18} />
                                </button>
                                <button className="p-2 text-dark-text-secondary hover:text-peach hover:bg-dark-surface-2 rounded-xl transition-colors">
                                    <Mic size={18} />
                                </button>
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={`p-2.5 rounded-xl transition-all ${input.trim() && !isLoading
                                            ? 'bg-gradient-to-r from-ember to-wine text-white shadow-md shadow-ember/30 hover:shadow-lg hover:shadow-ember/40'
                                            : 'bg-dark-surface-2 text-dark-text-secondary cursor-not-allowed'
                                        }`}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        <p className="text-center text-xs text-dark-text-secondary/70 mt-3">
                            AI can make mistakes. Consider checking important information.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}