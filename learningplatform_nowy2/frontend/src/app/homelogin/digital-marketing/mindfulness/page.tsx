"use client";
import Link from "next/link";
import Image from "next/image";

const mindfulnessResources = [
  { title: "Mindful Breathing", type: "Exercise", duration: "10 min" },
  { title: "Guided Meditation", type: "Audio", duration: "20 min" },
  { title: "Stress Relief Tips", type: "Article", duration: "5 min read" },
];

export default function MindfulnessPage() {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mindfulness Resources</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {mindfulnessResources.map((item) => (
            <div key={item.title} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
              <div className="font-semibold text-lg text-gray-800">{item.title}</div>
              <div className="text-sm text-gray-500">{item.type}</div>
              <div className="text-xs text-gray-400">{item.duration}</div>
              <button className="mt-2 bg-[#4067EC] text-white px-4 py-2 rounded-lg font-semibold">Start</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 