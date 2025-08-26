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
  participantEmails: string[]; // Dodaję emaile uczestników
  createdBy: string;
  createdAt: { seconds: number };
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    senderEmail: string; // Dodaję email nadawcy
    createdAt: { seconds: number };
  };
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderEmail: string; // Dodaję email nadawcy
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
    console.log('useEffect dla czatów - start, user:', user ? 'istnieje' : 'brak');
    
    if (!user) {
      console.log('Brak użytkownika - kończę useEffect');
      setLoading(false);
      return;
    }

    // Sprawdź czy użytkownik ma wymagane dane
    if (!user.uid) {
      console.error('Brak UID użytkownika');
      setLoading(false);
      return;
    }
    
    if (!user.email) {
      console.error('Brak emaila użytkownika');
      setLoading(false);
      return;
    }

    console.log('Użytkownik ma wymagane dane, tworzę query dla czatów');

    try {
      const chatsQuery = query(
        collection(db, 'groupChats'),
        where('participants', 'array-contains', user.uid)
      );

      console.log('Query utworzone, nasłuchuję zmian');

      const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
        console.log('Otrzymano snapshot czatów, liczba:', snapshot.docs.length);
        
        try {
          const chatsData: GroupChat[] = [];
          
          for (const chatDoc of snapshot.docs) {
            try {
              const chatData = chatDoc.data();
              console.log('Przetwarzam czat:', chatData.name);
              
              // Maksymalnie uproszczone pobieranie emaili - bez zapytań do Firestore
              const participantEmails: string[] = [];
              if (chatData.participants && chatData.participants.length > 0) {
                chatData.participants.forEach((uid: string) => {
                  if (uid === user.uid && user.email) {
                    participantEmails.push(user.email);
                  } else {
                    participantEmails.push(`Użytkownik ${uid.substring(0, 8)}...`);
                  }
                });
              }
              
              // Pobierz ostatnią wiadomość dla każdego czatu
              let lastMessage = undefined;
              try {
                const messagesQuery = query(
                  collection(db, 'groupChats', chatDoc.id, 'messages'),
                  orderBy('createdAt', 'desc'),
                  limit(1)
                );
                
                const messagesSnapshot = await getDocs(messagesQuery);
                
                if (!messagesSnapshot.empty) {
                  const lastMsgData = messagesSnapshot.docs[0].data();
                  lastMessage = {
                    text: lastMsgData.text || '',
                    senderId: lastMsgData.senderId || '',
                    senderName: lastMsgData.senderName || 'Nieznany',
                    senderEmail: lastMsgData.senderEmail || 'Nieznany nadawca',
                    createdAt: lastMsgData.createdAt
                  };
                }
              } catch (error) {
                console.error('Error fetching last message for chat', chatDoc.id, ':', error);
                // W przypadku błędu, nie dodawaj lastMessage
              }

              chatsData.push({
                id: chatDoc.id,
                name: chatData.name || 'Czat bez nazwy',
                description: chatData.description || '',
                participants: chatData.participants || [],
                participantEmails: participantEmails,
                createdBy: chatData.createdBy || '',
                createdAt: chatData.createdAt,
                lastMessage
              });
              
              console.log('Czat dodany do listy:', chatData.name);
              
            } catch (error) {
              console.error('Błąd podczas przetwarzania czatu:', chatDoc.id, error);
              // Kontynuuj z następnym czatem
            }
          }
          
          console.log('Wszystkie czaty przetworzone, liczba:', chatsData.length);
          
          // Sortuj czaty po ostatniej wiadomości
          chatsData.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return 1;
            return b.lastMessage.createdAt?.seconds - a.lastMessage.createdAt?.seconds;
          });
          
          setChats(chatsData);
          console.log('Czaty ustawione w stanie');
          
        } catch (error) {
          console.error('Błąd podczas przetwarzania czatów:', error);
          setChats([]);
        } finally {
          setLoading(false);
          console.log('Loading ustawione na false');
        }
      }, (error) => {
        console.error('Błąd w snapshot czatów:', error);
        setChats([]);
        setLoading(false);
      });

      return () => {
        console.log('Czyszczę subscription dla czatów');
        unsubscribe();
      };
      
    } catch (error) {
      console.error('Błąd podczas tworzenia query czatów:', error);
      setChats([]);
      setLoading(false);
    }
  }, [user]);

  // Pobierz wiadomości dla wybranego czatu
  useEffect(() => {
    if (!selectedChat) {
      console.log('Brak wybranego czatu - nie pobieram wiadomości');
      return;
    }

    if (!selectedChat.id) {
      console.error('Brak ID czatu');
      return;
    }

    console.log('Pobieram wiadomości dla czatu:', selectedChat.id);

    try {
      const messagesQuery = query(
        collection(db, 'groupChats', selectedChat.id, 'messages'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        try {
          console.log('Otrzymano snapshot wiadomości, liczba:', snapshot.docs.length);
          
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];
          
          console.log('Przetworzone wiadomości:', messagesData.length);
          setMessages(messagesData);
          
          // Scroll to bottom
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
          
        } catch (error) {
          console.error('Błąd podczas przetwarzania wiadomości:', error);
          setMessages([]);
        }
      }, (error) => {
        console.error('Błąd w snapshot wiadomości:', error);
        setMessages([]);
      });

      return () => {
        console.log('Czyszczę subscription dla wiadomości');
        unsubscribe();
      };
      
    } catch (error) {
      console.error('Błąd podczas tworzenia query wiadomości:', error);
      setMessages([]);
    }
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Podstawowe sprawdzenia
    if (!newMessage.trim()) {
      console.log('Wiadomość jest pusta');
      return;
    }
    
    if (!selectedChat) {
      console.log('Brak wybranego czatu');
      return;
    }
    
    if (!user) {
      console.log('Brak użytkownika');
      return;
    }
    
    if (!user.uid) {
      console.log('Brak UID użytkownika');
      return;
    }
    
    if (!user.email) {
      console.log('Brak emaila użytkownika');
      return;
    }

    setSending(true);
    
    try {
      console.log('Próba wysłania wiadomości:', {
        text: newMessage.trim(),
        senderId: user.uid,
        senderEmail: user.email,
        chatId: selectedChat.id
      });

      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.email || 'Nieznany użytkownik',
        senderEmail: user.email,
        createdAt: serverTimestamp()
      };

      console.log('Dane wiadomości:', messageData);

      await addDoc(collection(db, 'groupChats', selectedChat.id, 'messages'), messageData);

      console.log('Wiadomość wysłana pomyślnie');
      setNewMessage('');
      
    } catch (error) {
      console.error('Błąd podczas wysyłania wiadomości:', error);
      
      // Prosty komunikat błędu
      if (error instanceof Error) {
        console.error('Szczegóły błędu:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      // Nie pokazuj alertu - tylko loguj błąd
      console.error('Wiadomość nie została wysłana z powodu błędu');
      
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

  console.log('Renderuję komponent, stan:', {
    loading,
    chatsCount: chats.length,
    selectedChatId: selectedChat?.id,
    messagesCount: messages.length,
    user: user ? { uid: user.uid, email: user.email } : 'brak'
  });

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex flex-col overflow-hidden">
      {/* Modern Header */}
      <div className="mb-6 flex-shrink-0">
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

      {/* Chat Container - STAŁA WYSOKOŚĆ z overflow hidden */}
      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Modern Chats List */}
        <div className="lg:col-span-1">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl h-full overflow-hidden flex flex-col">
            <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10 flex-shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">Twoje czaty</h3>
              <p className="text-sm text-gray-600 mt-1">{chats.length} aktywnych rozmów</p>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
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
                                <span className="font-medium">
                                  {chat.lastMessage.senderEmail || chat.lastMessage.senderName || 'Nieznany nadawca'}:
                                </span>{' '}
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
              <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10 flex-shrink-0">
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
                
                {/* Lista uczestników */}
                <div className="mt-3 p-3 bg-white/50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Uczestnicy grupy:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedChat.participantEmails && selectedChat.participantEmails.length > 0 ? (
                      selectedChat.participantEmails.map((email, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200"
                        >
                          {email}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">Brak informacji o uczestnikach</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modern Messages - STAŁA WYSOKOŚĆ z scrollowaniem w środku */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-blue-50/30 min-h-0 max-h-[calc(100vh-435px)]">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>Brak wiadomości w tym czacie</p>
                    <p className="text-sm">Rozpocznij konwersację!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    console.log('Renderuję wiadomość:', message);
                    return (
                      <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                          message.senderId === user?.uid
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                            : 'bg-white border border-gray-100 text-gray-900'
                        }`}>
                          {/* Zawsze pokazuj email nadawcy */}
                          <div className={`text-xs font-semibold mb-2 px-2 py-1 rounded-lg inline-block ${
                            message.senderId === user?.uid
                              ? 'text-white/90 bg-white/20'
                              : 'text-blue-500 bg-blue-50'
                          }`}>
                            {message.senderEmail || message.senderName || 'Nieznany nadawca'}
                          </div>
                          <div className="text-sm leading-relaxed">{message.text}</div>
                          <div className={`text-xs mt-2 ${
                            message.senderId === user?.uid ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Modern Message Input - stała wysokość */}
              <form onSubmit={handleSendMessage} className="p-6 bg-white/50 backdrop-blur-sm border-t border-white/20 flex-shrink-0">
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