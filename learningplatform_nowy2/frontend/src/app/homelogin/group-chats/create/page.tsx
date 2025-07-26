"use client";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import PageTransition from "@/components/PageTransition";
import firebaseApp from "@/config/firebase";
import Link from "next/link";

interface UserOption {
  id: number;
  firebase_uid: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function CreateGroupChatPage() {
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [chatName, setChatName] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  // Pobierz wszystkich użytkowników z backendu
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      setError("");
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("Brak zalogowanego użytkownika");
          setUsersLoading(false);
          return;
        }
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`Błąd pobierania użytkowników: ${res.status}`);
        }
        const data = await res.json();
        setAllUsers(data);
      } catch (e: any) {
        setError(e.message || "Błąd pobierania użytkowników");
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleToggleUser = (user: UserOption) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Filtruj użytkowników na podstawie wyszukiwania
  const filteredUsers = searchTerm.length >= 3 ? allUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const firstName = user.first_name?.toLowerCase() || '';
    const lastName = user.last_name?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return firstName.startsWith(searchLower) ||
           lastName.startsWith(searchLower) ||
           email.startsWith(searchLower);
  }) : allUsers;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!chatName.trim()) {
      setError("Wprowadź nazwę czatu!");
      return;
    }
    if (selectedUsers.length === 0) {
      setError("Wybierz przynajmniej jednego uczestnika!");
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Brak zalogowanego użytkownika");
      // Uczestnicy: nauczyciel + wybrani użytkownicy (Firebase UID)
      const participants = [user.uid, ...selectedUsers.map((u) => u.firebase_uid).filter(uid => uid)];
      if (selectedUsers.some(u => !u.firebase_uid)) {
        setError("Niektórzy użytkownicy nie mają przypisanego Firebase UID. Skontaktuj się z administratorem.");
        setLoading(false);
        return;
      }
      await addDoc(collection(db, "groupChats"), {
        name: chatName,
        createdBy: user.uid,
        participants,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setChatName("");
      setSelectedUsers([]);
      setTimeout(() => {
        window.location.href = "/homelogin/group-chats";
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Błąd tworzenia czatu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center py-6 md:py-10 px-2 md:px-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-8 mx-auto">
          <Link href="/homelogin/group-chats" className="mb-4 text-[#4067EC] font-bold hover:underline inline-block">← Wszystkie czaty</Link>
          <h1 className="text-4xl md:text-5xl font-bold text-[#4067EC] mb-8">Utwórz nowy czat grupowy</h1>
          {error && (
            <div className="text-red-500 font-semibold mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 font-semibold mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              Czat utworzony pomyślnie! Przekierowywanie...
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xl font-semibold mb-2 mt-6">Nazwa czatu</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg mb-6 focus:outline-none focus:ring-2 focus:ring-[#4067EC]"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                maxLength={100}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xl font-semibold mb-2">Uczestnicy (zaznacz dowolnych użytkowników)</label>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Szukaj użytkowników (min. 3 znaki)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg mb-2 focus:outline-none focus:ring-2 focus:ring-[#4067EC]"
                />
                {searchTerm.length > 0 && searchTerm.length < 3 && (
                  <div className="text-sm text-orange-600 mb-2">
                    Wprowadź minimum 3 znaki aby wyszukać
                  </div>
                )}
                {searchTerm.length >= 3 && (
                  <div className="text-sm text-gray-600 mb-2">
                    Znaleziono: {filteredUsers.length} użytkowników
                  </div>
                )}
              </div>
              {usersLoading ? (
                <div className="text-center text-gray-500 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4067EC] mx-auto mb-2"></div>
                  Ładowanie użytkowników...
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border rounded-lg p-4 mb-8 text-lg">
                  {filteredUsers.length === 0 ? (
                    <span className="text-gray-400 text-base">
                      {searchTerm.length >= 3 ? `Brak wyników dla "${searchTerm}"` : 'Brak użytkowników do wyboru.'}
                    </span>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <label key={u.id} className="flex items-center gap-3 text-gray-700 hover:bg-gray-100 p-2 rounded cursor-pointer w-full">
                          <input
                            type="checkbox"
                            checked={selectedUsers.some((sel) => sel.id === u.id)}
                            onChange={() => handleToggleUser(u)}
                            className="accent-blue-600 w-5 h-5"
                            disabled={loading}
                          />
                          <span className="flex-1 text-base">
                            {u.first_name} {u.last_name} ({u.email}) [{u.role}]
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((u) => (
                    <span key={u.id} className="bg-[#4067EC] text-white rounded-full px-3 py-1 text-xs flex items-center gap-2">
                      {u.first_name} {u.last_name} ({u.email})
                      <button 
                        type="button" 
                        onClick={() => handleToggleUser(u)} 
                        className="ml-1 text-white hover:text-red-300"
                        disabled={loading}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-[#4067EC] text-white text-xl font-bold py-4 rounded-lg shadow-lg hover:bg-[#274bb6] transition-colors mt-6 focus:outline-none focus:ring-2 focus:ring-[#4067EC] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || usersLoading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Tworzenie...
                </span>
              ) : (
                "+ Utwórz czat"
              )}
            </button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
} 