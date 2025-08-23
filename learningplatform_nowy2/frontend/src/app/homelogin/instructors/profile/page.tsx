"use client";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft } from 'lucide-react';

const user = {
  name: "Anna Kowalska",
  role: "Teacher", // Możliwe wartości: Teacher, Student, Admin
  bio: "Passionate about teaching programming and helping students succeed.",
  img: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&h=256&facepad=2"
};

export default function ProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState({
    name: profile.name,
    bio: profile.bio,
    img: profile.img
  });

  const isTeacher = profile.role === "Teacher";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setProfile({ ...profile, ...form });
    setEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 w-full">
      {/* Header z przyciskiem powrotu */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/homelogin'}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 ease-in-out border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </button>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Profil instruktora
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col items-center">
        <Image src={profile.img} alt={profile.name} width={96} height={96} className="rounded-full border-4 border-[#4067EC] mb-4 object-cover" />
        {editMode ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col gap-4 border border-white/20">
            <input name="name" value={form.name} onChange={handleChange} className="border rounded-lg px-4 py-2" placeholder="Name" />
            <textarea name="bio" value={form.bio} onChange={handleChange} className="border rounded-lg px-4 py-2" placeholder="Bio" />
            <input name="img" value={form.img} onChange={handleChange} className="border rounded-lg px-4 py-2" placeholder="Profile image URL" />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} className="bg-[#4067EC] text-white px-6 py-2 rounded-lg font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105">Save</button>
              <button onClick={() => setEditMode(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold cursor-pointer transition duration-200 hover:bg-gray-300 hover:scale-105">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="font-bold text-2xl text-gray-800 mb-2">{profile.name}</div>
            <div className="text-lg text-gray-500 mb-4">{profile.role}</div>
            <div className="text-gray-700 text-center max-w-xl mb-4">{profile.bio}</div>
            {isTeacher && (
              <button onClick={() => setEditMode(true)} className="mt-2 bg-[#4067EC] text-white px-6 py-2 rounded-lg font-semibold cursor-pointer transition duration-200 hover:bg-[#3050b3] hover:scale-105">Edit Profile</button>
            )}
          </>
        )}
      </main>
    </div>
  );
} 