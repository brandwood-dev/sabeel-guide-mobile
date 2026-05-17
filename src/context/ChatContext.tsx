import React, { createContext, useContext, useState } from 'react';

export interface ChatItem {
    id: string;
    name: string;
    type: 'Pilgrim' | 'Accompanying' | 'Group';
    group: string;
    lastMessage: string;
    time: string;
    unread: number;
    photo: string;
    online: boolean;
}

const initialChats: ChatItem[] = [
    {
        id: '1',
        name: 'Ahmed Mohammed',
        type: 'Pilgrim',
        group: 'Makkah Luxury',
        lastMessage: "I'm near the entrance, where is the bus?",
        time: '12:45 PM',
        unread: 2,
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        online: true,
    },
    {
        id: '2',
        name: 'Fatima Zahra (Accompanying)',
        type: 'Accompanying',
        group: 'Makkah Luxury',
        lastMessage: 'All documents are ready for the group.',
        time: '11:20 AM',
        unread: 0,
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        online: false,
    },
    {
        id: '3',
        name: 'Madinah Express Group',
        type: 'Group',
        group: 'Voyage #124',
        lastMessage: 'Omar: We have arrived safely at the mosque.',
        time: 'Yesterday',
        unread: 5,
        photo: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=100',
        online: true,
    },
    {
        id: '4',
        name: 'Yousuf Islam',
        type: 'Pilgrim',
        group: 'Standard Package',
        lastMessage: 'Thank you for your help yesterday!',
        time: 'Monday',
        unread: 0,
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
        online: false,
    },
];

interface ChatContextType {
    chats: ChatItem[];
    addGroupChat: (groupName: string, groupId: string) => void;
}

const ChatContext = createContext<ChatContextType>({
    chats: initialChats,
    addGroupChat: () => { },
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const [chats, setChats] = useState<ChatItem[]>(initialChats);

    const addGroupChat = (groupName: string, groupId: string) => {
        const exists = chats.find(c => c.id === `group-${groupId}`);
        if (exists) return; // Already added

        const newChat: ChatItem = {
            id: `group-${groupId}`,
            name: `${groupName} — Chat Groupe`,
            type: 'Group',
            group: groupName,
            lastMessage: 'Groupe créé. Commencez à discuter !',
            time: 'Maintenant',
            unread: 1,
            photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=2C5F2D&color=fff`,
            online: true,
        };

        setChats(prev => [newChat, ...prev]);
    };

    return (
        <ChatContext.Provider value={{ chats, addGroupChat }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
