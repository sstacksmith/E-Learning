"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Providers from '@/components/Providers';

function AdminRegisterUserContent() {
  const { user, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.role !== "admin") {
    return null; // Panel widoczny tylko dla admina
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const ok = await register(email, password, role);
    setMessage(ok ? "Użytkownik zarejestrowany!" : "Błąd rejestracji.");
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-8 max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Rejestracja użytkownika (panel admina)</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded"
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value as any)}
          className="w-full px-4 py-2 border border-gray-300 rounded"
        >
          <option value="student">Uczeń</option>
          <option value="teacher">Nauczyciel</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="w-full py-2 bg-[#4067EC] text-white font-bold rounded hover:bg-[#3050b3] transition"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Rejestracja..." : "Zarejestruj użytkownika"}
        </button>
        {message && <div className={`text-center mt-2 ${message.includes("Błąd") ? "text-red-600" : "text-green-600"}`}>{message}</div>}
      </form>
    </div>
  );
}

export default function AdminRegisterUser() {
  return (
    <Providers>
      <AdminRegisterUserContent />
    </Providers>
  );
} 