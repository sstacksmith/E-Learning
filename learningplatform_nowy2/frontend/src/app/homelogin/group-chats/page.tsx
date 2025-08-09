"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import PageTransition from "@/components/PageTransition";
import firebaseApp from "@/config/firebase";

interface GroupChat {
  id: string;
  name: string;
  participants: string[];
  createdBy: string;
  createdAt: { seconds: number; };
}

function UnreadCount({ chatId, userUid }: { chatId: string, userUid: string }) {
  const [count, setCount] = useState<string | number>("");

  useEffect(() => {
    if (!chatId || !userUid) return;
    let unsub = false;
    async function fetchUnread() {
      // 1. Pobierz lastRead
      const readStatusDoc = await getDoc(doc(getFirestore(firebaseApp), "groupChats", chatId, "readStatus", userUid));
      const lastRead = readStatusDoc.exists() ? readStatusDoc.data().lastRead?.toDate() : null;
      let q;
      if (lastRead) {
        q = query(
          collection(getFirestore(firebaseApp), "groupChats", chatId, "messages"),
          where("createdAt", ">", lastRead)
        );
      } else {
        q = collection(getFirestore(firebaseApp), "groupChats", chatId, "messages");
      }
      const snapshot = await getDocs(q);
      if (unsub) return;
      const unread = snapshot.size;
      setCount(unread > 99 ? "99+" : unread === 0 ? "Jesteś na bieżąco" : unread);
    }
    fetchUnread();
    return () => { unsub = true; };
  }, [chatId, userUid]);

  return (
    <span className="ml-auto text-xs font-bold text-[#4067EC] bg-[#EAF0FF] px-2 py-1 rounded-full">
      {count}
    </span>
  );
}

export default function GroupChatsPage() {
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const [userUid, setUserUid] = useState<string>("");

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeChats: (() => void) | undefined;

    const initializeChats = async () => {
      try {
        unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
          if (user) {
            setUserUid(user.uid);
            try {
              const token = await user.getIdTokenResult();
              setIsTeacher(token.claims.role === "teacher");
              // Pobierz czaty, w których uczestniczy użytkownik
              const q = query(
                collection(db, "groupChats"),
                where("participants", "array-contains", user.uid)
              );
              unsubscribeChats = onSnapshot(q, (snapshot) => {
                const chatList: GroupChat[] = snapshot.docs.map((doc) => ({ 
                  id: doc.id, 
                  ...doc.data() 
                } as GroupChat));
                setChats(chatList);
                setLoading(false);
                setError("");
              }, () => {
                setError("Błąd podczas ładowania czatów");
                setLoading(false);
              });
            } catch {
              setError("Błąd autoryzacji");
              setLoading(false);
            }
          } else {
            setLoading(false);
            setError("Brak zalogowanego użytkownika");
          }
        });
      } catch {
        setError("Błąd inicjalizacji aplikacji");
        setLoading(false);
      }
    };

    initializeChats();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeChats) unsubscribeChats();
    };
  }, [auth, db]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center py-6 md:py-10 px-2 md:px-8">
        <div className="w-full flex justify-start mb-8">
          <Link
            href="/homelogin"
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg font-bold shadow-lg transition-colors text-lg md:text-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            ← Wróć do panelu głównego
          </Link>
        </div>
        <div className="w-full max-w-full bg-white rounded-2xl shadow-lg p-8 md:p-12 mx-auto min-h-[70vh]">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-[#4067EC]">Chaty grupowe</h1>
            {isTeacher && (
              <Link
                href="/homelogin/group-chats/create"
                className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg font-bold shadow-lg transition-colors text-xl md:text-2xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                + Utwórz czat
              </Link>
            )}
          </div>
          {error && (
            <div className="text-red-500 font-semibold mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4067EC] mx-auto mb-2"></div>
              Ładowanie czatów...
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nie uczestniczysz w żadnych czatach grupowych.
              {isTeacher && (
                <div className="mt-2">
                  <Link
                    href="/homelogin/group-chats/create"
                    className="text-[#4067EC] hover:underline"
                  >
                    Utwórz pierwszy czat
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-8">
              {chats.map((chat) => (
                <li key={chat.id} className="border border-gray-200 rounded-lg p-8 bg-gray-50 hover:bg-[#F1F4FE] transition-colors">
                  <Link href={`/homelogin/group-chats/${chat.id}`} className="font-bold text-[#4067EC] text-2xl md:text-3xl hover:underline">
                    {chat.name}
                  </Link>
                  <div className="text-lg text-gray-500 mt-2">Uczestników: {chat.participants.length}</div>
                  {chat.createdAt && (
                    <div className="text-md text-gray-400 mt-1">
                      Utworzono: {chat.createdAt.seconds ? new Date(chat.createdAt.seconds * 1000).toLocaleDateString("pl-PL") : ""}
                    </div>
                  )}
                  <UnreadCount chatId={chat.id} userUid={userUid} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageTransition>
  );
} 