'use client';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Users, Clock, Send, Plus } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  participants: string[];
  participantEmails: string[]; // Dodaję emaile uczestników
  createdBy: string;
  createdAt: { seconds: number } | null;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    senderEmail: string; // Dodaję email nadawcy
    createdAt: { seconds: number } | null;
  };
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderEmail: string; // Dodaję email nadawcy
  createdAt: { seconds: number } | null;
}

interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
}

export default function GroupChatsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pobierz czaty grupowe nauczyciela
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
        
        // Pobierz emaile uczestników
        const participantEmails: string[] = [];
        if (chatData.participants && chatData.participants.length > 0) {
          try {
            // Ogranicz liczbę uczestników do 10, żeby uniknąć problemów z Firestore
            const limitedParticipants = chatData.participants.slice(0, 10);
            
            if (limitedParticipants.length > 0) {
              const usersQuery = query(
                collection(db, 'users'),
                where('uid', 'in', limitedParticipants)
              );
              const usersSnapshot = await getDocs(usersQuery);
              usersSnapshot.forEach(userDoc => {
                const userData = userDoc.data();
                if (userData.email) {
                  participantEmails.push(userData.email);
                }
              });
            }
          } catch (error) {
            console.error('Error fetching participant emails:', error);
            // W przypadku błędu, dodaj domyślne emaile
            chatData.participants.forEach((uid: string) => {
              if (uid === user.uid && user.email) {
                participantEmails.push(user.email);
              } else {
                participantEmails.push(`Użytkownik ${uid.substring(0, 8)}...`);
              }
            });
          }
        }
        
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
            senderEmail: lastMsgData.senderEmail || '',
            createdAt: lastMsgData.createdAt
          };
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
      }
      
      // Sortuj czaty po ostatniej wiadomości
      chatsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        if (!a.lastMessage.createdAt || !b.lastMessage.createdAt) return 0;
        return b.lastMessage.createdAt.seconds - a.lastMessage.createdAt.seconds;
      });
      
      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Pobierz dostępnych uczniów
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Pobierz kursy nauczyciela
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const teacherCourses = coursesSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.created_by === user?.email || 
                 data.teacherEmail === user?.email ||
                 (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(user?.email));
        });

        // Zbierz wszystkich uczniów z kursów nauczyciela
        const allStudentIds = new Set<string>();
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        for (const courseDoc of teacherCourses) {
          const courseData = courseDoc.data();
          const assignedUsers = courseData.assignedUsers || [];
          
          assignedUsers.forEach((userId: string) => {
            const isEmail = userId.includes('@');
            const userDoc = usersSnapshot.docs.find(doc => {
              const userData = doc.data();
              return isEmail ? userData.email === userId : userData.uid === userId;
            });
            
            if (userDoc) {
              const userData = userDoc.data();
              if (userData.role === 'student') {
                allStudentIds.add(userData.uid);
              }
            }
          });
        }

        // Konwertuj na User objects
        const students: User[] = [];
        for (const studentId of allStudentIds) {
          const userDoc = usersSnapshot.docs.find(doc => doc.data().uid === studentId);
          if (userDoc) {
            const userData = userDoc.data();
            students.push({
              uid: userData.uid,
              email: userData.email,
              displayName: userData.displayName || userData.email,
              role: userData.role
            });
          }
        }

        setAvailableStudents(students);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    if (user && showCreateChat) {
      fetchStudents();
    }
  }, [user, showCreateChat]);

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
        senderEmail: user.email, // Dodaj email nadawcy
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

  const handleCreateChat = async () => {
    if (!newChatName.trim() || selectedStudents.length === 0 || !user) return;

    try {
      const participants = [user.uid, ...selectedStudents];
      
      await addDoc(collection(db, 'groupChats'), {
        name: newChatName.trim(),
        description: newChatDescription.trim(),
        participants,
        participantEmails: [user.email, ...selectedStudents.map(id => availableStudents.find(s => s.uid === id)?.email || '')], // Dodaj emaile uczestników
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      // Reset form
      setNewChatName('');
      setNewChatDescription('');
      setSelectedStudents([]);
      setShowCreateChat(false);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Błąd podczas tworzenia czatu');
    }
  };

  const filteredStudents = availableStudents.filter(student =>
    student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: { seconds: number } | null) => {
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
    <div className="h-screen space-y-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Czat Grupowy</h2>
          <p className="text-gray-600">Komunikuj się ze swoimi uczniami</p>
        </div>
        <button
          onClick={() => setShowCreateChat(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nowy czat
        </button>
      </div>

      {/* Create Chat Modal */}
      {showCreateChat && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 w-full max-w-lg transform transition-all duration-300 ease-out scale-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl font-bold">💬</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Utwórz nowy czat grupowy</h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateChat(false);
                  setNewChatName('');
                  setNewChatDescription('');
                  setSelectedStudents([]);
                  setSearchTerm('');
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 text-lg font-medium">×</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nazwa czatu</label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="np. Matematyka 8A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Opis (opcjonalny)</label>
                <textarea
                  value={newChatDescription}
                  onChange={(e) => setNewChatDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Opis czatu..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Wybierz uczniów</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Szukaj uczniów..."
                />
                
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredStudents.map(student => (
                    <label key={student.uid} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.uid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.uid]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.uid));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{student.displayName} ({student.email})</span>
                    </label>
                  ))}
                </div>
                
                {selectedStudents.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Wybrano {selectedStudents.length} uczniów
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setShowCreateChat(false);
                  setNewChatName('');
                  setNewChatDescription('');
                  setSelectedStudents([]);
                  setSearchTerm('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateChat}
                disabled={!newChatName.trim() || selectedStudents.length === 0}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Utwórz czat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container - STAŁA WYSOKOŚĆ z overflow hidden */}
      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Chats List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Twoje czaty ({chats.length})</h3>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Brak czatów grupowych</p>
                  <p className="text-sm">Utwórz swój pierwszy czat!</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{chat.name}</h4>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Users className="h-3 w-3 mr-1" />
                      {chat.participants.length} uczestników
                    </div>
                    {chat.lastMessage && (
                      <>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">
                            {chat.lastMessage.senderEmail || chat.lastMessage.senderName || 'Nieznany nadawca'}:
                          </span>{' '}
                          {chat.lastMessage.text.length > 40 
                            ? chat.lastMessage.text.substring(0, 40) + '...' 
                            : chat.lastMessage.text}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTime(chat.lastMessage.createdAt)}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat.participants.length} uczestników
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Aktywny teraz
                  </div>
                </div>
                
                {/* Lista uczestników */}
                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Uczestnicy grupy:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedChat.participantEmails && selectedChat.participantEmails.length > 0 ? (
                      selectedChat.participantEmails.map((email, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200"
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

              {/* Messages - STAŁA WYSOKOŚĆ z scrollowaniem w środku */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[calc(100vh-435px)]">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === user?.uid
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.senderId !== user?.uid && (
                        <div className="text-xs font-medium mb-1 opacity-75">{message.senderName}</div>
                      )}
                      <div className="text-sm">{message.text}</div>
                      <div className={`text-xs mt-1 ${message.senderId === user?.uid ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - stała wysokość */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    disabled={sending}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Wybierz czat aby rozpocząć konwersację</p>
                <p className="text-sm">Kliknij na czat z listy po lewej stronie</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}