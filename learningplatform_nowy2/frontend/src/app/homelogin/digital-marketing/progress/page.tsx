"use client";
import Link from "next/link";
import Image from "next/image";

export default function ProgressPage() {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Progress</h1>
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center">
          <div className="mb-4 text-lg text-gray-700">Progress Chart</div>
          <svg viewBox="0 0 200 80" className="w-full h-24">
            <rect x="20" y="40" width="20" height="30" fill="#4067EC" rx="4" />
            <rect x="50" y="30" width="20" height="40" fill="#4067EC" rx="4" />
            <rect x="80" y="20" width="20" height="50" fill="#4067EC" rx="4" />
            <rect x="110" y="10" width="20" height="60" fill="#4067EC" rx="4" />
            <rect x="140" y="25" width="20" height="45" fill="#4067EC" rx="4" />
          </svg>
        </div>
      </main>
    </div>
  );
} 