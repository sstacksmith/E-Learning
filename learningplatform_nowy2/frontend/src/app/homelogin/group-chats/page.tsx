'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Users, Send, ArrowLeft } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  participants: string[];
  createdBy: string;
  createdAt: { seconds: number };
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    createdAt: { seconds: number };
  };
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: { seconds: number };
}

export default function StudentGroupChatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pobierz czaty grupowe ucznia
  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, 'groupChats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData: GroupChat[] = [];
      
      for (const chatDoc of snapshot.docs) {
        const chatData = chatDoc.data();
        
        // Pobierz ostatnią wiadomość dla każdego czatu
        const messagesQuery = query(
          collection(db, 'groupChats', chatDoc.id, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        let lastMessage = undefined;
        
        if (!messagesSnapshot.empty) {
          const lastMsgData = messagesSnapshot.docs[0].data();
          lastMessage = {
            text: lastMsgData.text || '',
            senderId: lastMsgData.senderId || '',
            senderName: lastMsgData.senderName || 'Nieznany',
            createdAt: lastMsgData.createdAt
          };
        }

        chatsData.push({
          id: chatDoc.id,
          name: chatData.name || 'Czat bez nazwy',
          description: chatData.description || '',
          participants: chatData.participants || [],
          createdBy: chatData.createdBy || '',
          createdAt: chatData.createdAt,
          lastMessage
        });
      }
      
      // Sortuj czaty po ostatniej wiadomości
      chatsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return b.lastMessage.createdAt?.seconds - a.lastMessage.createdAt?.seconds;
      });
      
      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Pobierz wiadomości dla wybranego czatu
  useEffect(() => {
    if (!selectedChat) return;

    const messagesQuery = query(
      collection(db, 'groupChats', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(messagesData);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'groupChats', selectedChat.id, 'messages'), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: (user as any).displayName || user.email,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Błąd podczas wysyłania wiadomości');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: { seconds: number }) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      {/* Modern Header */}
      <div className="mb-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/homelogin')}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Powrót do strony głównej
              </button>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Czat Grupowy
                </h2>
                <p className="text-gray-600">Komunikuj się z nauczycielami i innymi uczniami</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Modern Chats List */}
        <div className="lg:col-span-1">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl h-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10">
              <h3 className="font-bold text-gray-900 text-lg">Twoje czaty</h3>
              <p className="text-sm text-gray-600 mt-1">{chats.length} aktywnych rozmów</p>
            </div>
            <div className="overflow-y-auto h-full">
              {chats.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-gray-600 font-medium mb-2">Brak czatów grupowych</p>
                  <p className="text-sm text-gray-500">Nauczyciel może dodać Cię do czatu</p>
                </div>
              ) : (
                <div className="p-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-4 m-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedChat?.id === chat.id 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-[1.02]' 
                          : 'bg-white/50 hover:bg-white/80 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedChat?.id === chat.id 
                            ? 'bg-white/20' 
                            : 'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}>
                          <Users className={`h-5 w-5 ${
                            selectedChat?.id === chat.id ? 'text-white' : 'text-white'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold truncate ${
                            selectedChat?.id === chat.id ? 'text-white' : 'text-gray-900'
                          }`}>
                            {chat.name}
                          </h4>
                          <div className={`flex items-center text-sm mt-1 ${
                            selectedChat?.id === chat.id ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            <Users className="h-3 w-3 mr-1" />
                            {chat.participants.length} uczestników
                          </div>
                          {chat.lastMessage && (
                            <>
                              <div className={`text-sm mt-2 ${
                                selectedChat?.id === chat.id ? 'text-white/90' : 'text-gray-600'
                              }`}>
                                <span className="font-medium">{chat.lastMessage.senderName}:</span>{' '}
                                {chat.lastMessage.text.length > 35 
                                  ? chat.lastMessage.text.substring(0, 35) + '...' 
                                  : chat.lastMessage.text}
                              </div>
                              <div className={`text-xs mt-1 ${
                                selectedChat?.id === chat.id ? 'text-white/70' : 'text-gray-400'
                              }`}>
                                {formatTime(chat.lastMessage.createdAt)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modern Chat Area */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl h-full flex flex-col overflow-hidden">
              {/* Modern Chat Header */}
              <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{selectedChat.name}</h3>
                      <p className="text-sm text-gray-600">
                        {selectedChat.participants.length} uczestników
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700 font-medium">Aktywny</span>
                  </div>
                </div>
              </div>

              {/* Modern Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-blue-50/30">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                      message.senderId === user?.uid
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                        : 'bg-white border border-gray-100 text-gray-900'
                    }`}>
                      {message.senderId !== user?.uid && (
                        <div className="text-xs font-semibold mb-2 text-blue-500 bg-blue-50 px-2 py-1 rounded-lg inline-block">
                          {message.senderName}
                        </div>
                      )}
                      <div className="text-sm leading-relaxed">{message.text}</div>
                      <div className={`text-xs mt-2 ${
                        message.senderId === user?.uid ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Modern Message Input */}
              <form onSubmit={handleSendMessage} className="p-6 bg-white/50 backdrop-blur-sm border-t border-white/20">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Napisz wiadomość..."
                      disabled={sending}
                      className="w-full border-0 bg-white rounded-2xl px-6 py-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-xl transition-all duration-200 disabled:opacity-50 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-10 w-10 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 mb-2">Wybierz czat aby rozpocząć</p>
                <p className="text-gray-600">Kliknij na czat z listy po lewej stronie</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
