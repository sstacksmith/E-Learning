"use client";
import Link from "next/link";
import Image from "next/image";

const notifications = [
  { title: "Course Update", message: "Your course has new content.", time: "2h ago" },
  { title: "Message from Instructor", message: "Check your inbox for feedback.", time: "1d ago" },
  { title: "Reminder", message: "Complete your assignment.", time: "3d ago" },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 bg-white border-b">
        <div className="flex items-center gap-2">
          <Image src="/puzzleicon.png" alt="Logo" width={32} height={32} />
          <span className="text-xl font-bold text-[#4067EC]">COGITO</span>
        </div>
        <Link href="/homelogin" className="bg-[#4067EC] text-white px-4 py-2 rounded-lg font-semibold">Dashboard</Link>
      </header>
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Notifications</h1>
        <div className="space-y-6 max-w-2xl mx-auto">
          {notifications.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow p-6">
              <div className="font-semibold text-lg text-gray-800 mb-1">{item.title}</div>
              <div className="text-gray-600 mb-1">{item.message}</div>
              <div className="text-xs text-gray-400">{item.time}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 