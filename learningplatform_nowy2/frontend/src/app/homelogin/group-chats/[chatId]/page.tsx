"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, startAfter, updateDoc, setDoc, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase-config";
import PageTransition from "@/components/PageTransition";
import firebaseApp from "@/config/firebase";
import Link from "next/link";

interface Message {
  id: string;
  senderId: string;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  createdAt: any;
}

interface UserInfo {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface ParticipantInfo {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const MESSAGES_PER_PAGE = 50;

export default function GroupChatView() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const lastMessageRef = useRef<any>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantsData, setParticipantsData] = useState<ParticipantInfo[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [showManageParticipants, setShowManageParticipants] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || !lastMessageRef.current || !chatId) return;
    
    try {
      const q = query(
        collection(db, "groupChats", chatId, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(lastMessageRef.current),
        limit(MESSAGES_PER_PAGE)
      );
      
      const snapshot = await getDocs(q);
      const olderMessages: Message[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));
      
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages.reverse(), ...prev]);
        lastMessageRef.current = snapshot.docs[snapshot.docs.length - 1];
        setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Błąd podczas ładowania starszych wiadomości:", error);
    }
  }, [hasMoreMessages, chatId, db]);

  useEffect(() => {
    if (!chatId) return;
    
    setLoading(true);
    setParticipantsLoading(true);
    
    const chatDoc = doc(db, "groupChats", chatId);
    const unsubChat = onSnapshot(chatDoc, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data();
        setChatName(chatData.name || "Czat grupowy");
        const participantUids = chatData.participants || [];
        setParticipants(participantUids);
        setParticipantsLoading(false);
        
        fetchParticipantsData(participantUids);
        
        const checkTeacherStatus = async () => {
          try {
            const user = auth.currentUser;
            if (user) {
              const token = await user.getIdTokenResult();
              setIsTeacher(token.claims.role === "teacher");
            }
          } catch (error) {
            console.error("Błąd podczas sprawdzania roli:", error);
          }
        };
        checkTeacherStatus();
      }
    });

    const q = query(
      collection(db, "groupChats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(MESSAGES_PER_PAGE)
    );
    
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs.reverse());
      setLoading(false);
      
      if (snapshot.docs.length > 0) {
        lastMessageRef.current = snapshot.docs[snapshot.docs.length - 1];
      }
      
      setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
      
      if (msgs.length > 0) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    });

    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId, db]);

  useEffect(() => {
    if (auth.currentUser && chatId) {
      setDoc(
        doc(getFirestore(firebaseApp), "groupChats", chatId, "readStatus", auth.currentUser.uid),
        { lastRead: serverTimestamp() },
        { merge: true }
      );
    }
  }, [chatId, auth.currentUser]);

  const fetchParticipantsData = async (participantIds: string[]) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:8000/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      
      if (res.ok) {
        const allUsers = await res.json();
        const participantsInfo: ParticipantInfo[] = [];
        
        participantIds.forEach(participantId => {
          let userData = allUsers.find((u: any) => u.firebase_uid === participantId);
          if (!userData && participantId.includes('@')) {
            userData = allUsers.find((u: any) => u.email === participantId);
          }
          if (userData) {
            participantsInfo.push({
              uid: userData.firebase_uid,
              email: userData.email,
              firstName: userData.first_name || '',
              lastName: userData.last_name || '',
              role: userData.role || 'student'
            });
          } else {
            participantsInfo.push({
              uid: participantId,
              email: participantId.includes('@') ? participantId : '',
              firstName: '',
              lastName: '',
              role: 'student'
            });
          }
        });
        
        setParticipantsData(participantsInfo);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania danych uczestników:", error);
    }
  };

  useEffect(() => {
    if (!chatId || messages.length === 0) return;
    
    const uniqueSenders = Array.from(new Set(messages.map(m => m.senderId)));
    const fetchUsers = async () => {
      const newUserMap: Record<string, UserInfo> = { ...userMap };
      
      await Promise.all(uniqueSenders.map(async (senderId) => {
        if (!newUserMap[senderId]) {
          if (auth.currentUser && senderId === auth.currentUser.uid) {
            newUserMap[senderId] = {
              uid: senderId,
              displayName: auth.currentUser.displayName || auth.currentUser.email || "Użytkownik",
              photoURL: auth.currentUser.photoURL || null,
              firstName: auth.currentUser.displayName?.split(" ")[0] || "",
              lastName: auth.currentUser.displayName?.split(" ")[1] || "",
              email: auth.currentUser.email || undefined
            };
          } else {
            const participant = participantsData.find(p => p.uid === senderId || p.email === senderId);
            if (participant) {
              newUserMap[senderId] = {
                uid: senderId,
                displayName: `${participant.firstName} ${participant.lastName}`.trim() || participant.email || "Nieznany użytkownik",
                photoURL: null,
                firstName: participant.firstName,
                lastName: participant.lastName,
                email: participant.email
              };
            } else {
              newUserMap[senderId] = {
                uid: senderId,
                displayName: "Nieznany użytkownik",
                photoURL: null
              };
            }
          }
        }
      }));
      
      setUserMap(newUserMap);
    };
    
    fetchUsers();
  }, [messages, chatId, auth.currentUser, participantsData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || (!newMessage.trim() && !file)) return;
    
    setSending(true);
    let fileUrl = undefined;
    let fileType = undefined;
    let fileName = undefined;
    
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      if (!allowedTypes.includes(file.type)) {
        alert("Dozwolone typy plików: jpg, png, pdf, docx, xlsx");
        setSending(false);
        return;
      }
      
      try {
        const storageRef = ref(storage, `courses/chatFiles/${chatId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
        fileType = file.type;
        fileName = file.name;
      } catch (error) {
        console.error("Błąd podczas uploadu pliku:", error);
        alert("Błąd podczas wysyłania pliku. Spróbuj ponownie.");
        setSending(false);
        return;
      }
    }
    
    const messageData: any = {
      senderId: user.uid || user.email,
      createdAt: serverTimestamp(),
    };
    
    if (newMessage.trim()) {
      messageData.text = newMessage;
    }
    
    if (fileUrl) {
      messageData.fileUrl = fileUrl;
      messageData.fileType = fileType;
      messageData.fileName = fileName;
    }
    
    try {
      await addDoc(collection(db, "groupChats", chatId, "messages"), messageData);
      setNewMessage("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Błąd podczas wysyłania wiadomości:", error);
      alert("Błąd podczas wysyłania wiadomości. Spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
        if (isAtBottom) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      }
    }
  }, [messages]);

  const addParticipant = async (userUid: string, userEmail?: string) => {
    if (!isTeacher) return;
    
    try {
      if (!userUid) {
        alert("Błąd: użytkownik nie ma przypisanego Firebase UID");
        return;
      }
      
      if (participants.includes(userUid)) {
        alert("Ten użytkownik jest już w czacie");
        return;
      }
      
      const newParticipants = [...participants, userUid];
      await updateDoc(doc(db, "groupChats", chatId), {
        participants: newParticipants
      });
    } catch (error) {
      console.error("Błąd podczas dodawania uczestnika:", error);
      alert("Błąd podczas dodawania uczestnika");
    }
  };

  const removeParticipant = async (userUid: string) => {
    if (!isTeacher) return;
    
    try {
      const newParticipants = participants.filter(p => p !== userUid);
      await updateDoc(doc(db, "groupChats", chatId), {
        participants: newParticipants
      });
    } catch (error) {
      console.error("Błąd podczas usuwania uczestnika:", error);
      alert("Błąd podczas usuwania uczestnika");
    }
  };

  const fetchFiles = async () => {
    if (!chatId) return;
    
    try {
      setFilesLoading(true);
      const q = query(
        collection(db, "groupChats", chatId, "messages"),
        where("fileUrl", "!=", null),
        orderBy("fileUrl"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      const filesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((msg: any) => msg.fileUrl);
      
      setFiles(filesList);
    } catch (error) {
      console.error("Błąd podczas pobierania plików:", error);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) {
      const newFiles = messages.filter(msg => msg.fileUrl);
      setFiles(newFiles);
    }
  }, [messages]);

  const participantMap: Record<string, ParticipantInfo> = {};
  participantsData.forEach(p => {
    if (p.uid) participantMap[p.uid] = p;
    if (p.email) participantMap[p.email] = p;
  });

  return (
    <PageTransition>
      <div className="min-h-screen h-screen w-full bg-[#F8F9FB] flex flex-col">
        <div className="flex-1 w-full h-full bg-white rounded-2xl shadow-lg p-12 flex flex-row gap-8">
          <div className="flex-1 flex flex-col min-h-full">
            <div className="flex items-center mb-4">
              <Link href="/homelogin/group-chats" className="mr-4 text-[#4067EC] font-bold hover:underline">← Wszystkie czaty</Link>
              <h1 className="text-4xl md:text-5xl font-bold text-[#4067EC] mb-8">{chatName}</h1>
            </div>
            
            <div className="flex flex-1 gap-4">
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4 messages-container">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4067EC] mx-auto mb-2"></div>
                      Ładowanie wiadomości...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Brak wiadomości w tym czacie.</div>
                  ) : (
                    <>
                      {hasMoreMessages && (
                        <div className="text-center mb-4">
                          <button
                            onClick={loadMoreMessages}
                            className="text-[#4067EC] text-sm hover:underline px-3 py-1 rounded hover:bg-blue-50"
                          >
                            Załaduj starsze wiadomości
                          </button>
                        </div>
                      )}
                      
                      <ul className="space-y-6 messages-container overflow-y-auto flex-1 px-4 text-lg">
                        {messages.map((msg, idx) => {
                          const isCurrentUser = auth.currentUser && msg.senderId === auth.currentUser.uid;
                          const sender = participantMap[msg.senderId] || {};
                          const displayName = isCurrentUser
                            ? 'Ty'
                            : (sender.firstName && sender.lastName
                                ? `${sender.firstName} ${sender.lastName}`
                                : sender.email || "Nieznany użytkownik");
                          return (
                            <li key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex items-start gap-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold text-gray-600">
                                  {displayName[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'justify-end' : ''}`}> 
                                    <span className={`font-semibold text-sm ${isCurrentUser ? 'text-[#4067EC]' : 'text-gray-800'}`}>{displayName}</span>
                                    <span className="text-xs text-gray-400">{msg.createdAt && msg.createdAt.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                                  </div>
                                  {msg.text && (
                                    <span className={`rounded-lg px-3 py-2 mt-1 text-sm break-words ${isCurrentUser ? "bg-[#4067EC] text-white" : "bg-gray-200 text-gray-900"}`}>{msg.text}</span>
                                  )}
                                  {msg.fileUrl && (
                                    <div className="mt-2">
                                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#4067EC] hover:underline text-sm">
                                        📎 {msg.fileName}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </ul>
                    </>
                  )}
                </div>
                
                <form onSubmit={handleSend} className="flex gap-2 items-center mt-2">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#4067EC]"
                    placeholder="Napisz wiadomość..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    maxLength={1000}
                    autoFocus
                    disabled={sending}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                    className="hidden"
                    id="file-upload"
                    disabled={sending}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer px-3 py-2 bg-gray-200 rounded-lg border border-gray-300 hover:bg-gray-300 text-xs md:text-sm">
                    📎
                  </label>
                  {file && (
                    <span className="text-xs text-gray-600 max-w-[120px] truncate">{file.name}</span>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#4067EC] text-white rounded-lg font-bold shadow-lg hover:bg-black hover:text-white transition-colors text-lg border-2 border-[#4067EC] focus:outline-none focus:ring-2 focus:ring-[#4067EC] disabled:opacity-50"
                    disabled={(!newMessage.trim() && !file) || sending}
                  >
                    {sending ? "Wysyłanie..." : "Wyślij"}
                  </button>
                </form>
              </div>
              
              <div className="w-[400px] min-h-full bg-gray-50 rounded-lg p-6 hidden md:block text-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-[#4067EC]">Uczestnicy ({participants.length})</h3>
                  {isTeacher && (
                    <button
                      onClick={() => setShowManageParticipants(!showManageParticipants)}
                      className="text-xs bg-[#4067EC] text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      {showManageParticipants ? 'Zamknij' : 'Zarządzaj'}
                    </button>
                  )}
                </div>
                
                {participantsLoading ? (
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4067EC] mx-auto mb-2"></div>
                    Ładowanie...
                  </div>
                ) : participantsData.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">
                    Brak danych uczestników
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participantsData.map((participant, index) => {
                      const isCurrentUser = auth.currentUser && participant.uid === auth.currentUser.uid;
                      const displayName = participant.firstName && participant.lastName 
                        ? `${participant.firstName} ${participant.lastName}`
                        : participant.email;
                      
                      return (
                        <div key={participant.uid} className={`flex items-center justify-between p-2 rounded ${isCurrentUser ? 'bg-[#4067EC] text-white' : 'bg-white'}`}>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                              {displayName[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate font-medium">
                                {isCurrentUser ? 'Ty' : displayName}
                              </div>
                              {participant.role && (
                                <div className="text-xs opacity-75 truncate">
                                  {participant.role === 'teacher' ? 'Nauczyciel' : 'Uczeń'}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isTeacher && !isCurrentUser && showManageParticipants && (
                            <button
                              onClick={() => removeParticipant(participant.uid)}
                              className="text-red-500 hover:text-red-700 text-xs ml-2"
                              title="Usuń z czatu"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {isTeacher && showManageParticipants && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dodaj uczestnika</h4>
                    <AddParticipantModal 
                      onAdd={addParticipant}
                      currentParticipants={participants}
                      onClose={() => setShowManageParticipants(false)}
                    />
                  </div>
                )}
              </div>
              
              <div className="w-[400px] min-h-full bg-gray-50 rounded-lg p-6 hidden lg:block ml-6 text-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-[#4067EC]">Pliki ({files.length})</h3>
                </div>
                
                {filesLoading ? (
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4067EC] mx-auto mb-2"></div>
                    Ładowanie...
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    Brak plików w tym czacie
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {files.map((file) => {
                      const getFileIcon = (fileType: string) => {
                        if (fileType?.includes('image')) return '🖼️';
                        if (fileType?.includes('pdf')) return '📄';
                        if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
                        if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
                        return '📎';
                      };
                      
                      const getFileType = (fileType: string) => {
                        if (fileType?.includes('image')) return 'Obraz';
                        if (fileType?.includes('pdf')) return 'PDF';
                        if (fileType?.includes('word') || fileType?.includes('document')) return 'Dokument';
                        if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return 'Arkusz';
                        return 'Plik';
                      };
                      
                      return (
                        <div key={file.id} className="bg-white rounded p-2 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileIcon(file.fileType)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" title={file.fileName}>
                                {file.fileName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {getFileType(file.fileType)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-1">
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-[#1a237e] text-white px-2 py-1 rounded hover:bg-black transition-colors font-bold shadow"
                            >
                              Otwórz
                            </a>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                            >
                              Pobierz
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function AddParticipantModal({ 
  onAdd, 
  currentParticipants, 
  onClose 
}: { 
  onAdd: (uid: string, email?: string) => void; 
  currentParticipants: string[]; 
  onClose: () => void; 
}) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const auth = getAuth(firebaseApp);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        
        if (res.ok) {
          const users = await res.json();
          const availableUsers = users.filter((u: any) => {
            if (!u.firebase_uid) {
              return false;
            }
            return !currentParticipants.includes(u.firebase_uid);
          });
          setAllUsers(availableUsers);
        }
      } catch (error) {
        console.error("Błąd podczas pobierania użytkowników:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [currentParticipants]);

  const filteredUsers = searchTerm.length >= 3 ? allUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const firstName = user.first_name?.toLowerCase() || '';
    const lastName = user.last_name?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    
    return firstName.startsWith(searchLower) ||
           lastName.startsWith(searchLower) ||
           email.startsWith(searchLower);
  }) : allUsers;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="mb-3">
        <input
          type="text"
          placeholder="Szukaj użytkowników (min. 3 znaki)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-base"
        />
        {searchTerm.length > 0 && searchTerm.length < 3 && (
          <div className="text-xs text-orange-600 mt-1">
            Wprowadź minimum 3 znaki aby wyszukać
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="text-center text-gray-500 text-base">Ładowanie...</div>
      ) : (
        <div>
          <div className="text-sm text-gray-600 mb-2">
            Znaleziono: {filteredUsers.length} użytkowników
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-gray-500 text-base text-center py-4">
                {searchTerm.length >= 3 ? 'Brak wyników dla "' + searchTerm + '"' : 'Brak dostępnych użytkowników'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={`${user.firebase_uid || user.email}-${user.id}`} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-base truncate">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={() => onAdd(user.firebase_uid)}
                    className="text-[#4067EC] hover:text-blue-700 text-sm font-medium ml-3 px-3 py-1 bg-blue-50 rounded"
                  >
                    Dodaj
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 