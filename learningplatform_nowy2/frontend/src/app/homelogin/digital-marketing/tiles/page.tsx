"use client";
import Link from "next/link";
import Image from "next/image";

const tiles = [
  { title: "Analytics", description: "Track your marketing performance.", icon: "/puzzleicon.png" },
  { title: "Campaigns", description: "Manage your ad campaigns.", icon: "/puzzleicon.png" },
  { title: "Leads", description: "View and manage your leads.", icon: "/puzzleicon.png" },
];

export default function TilesPage() {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Feature Tiles</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {tiles.map((tile) => (
            <div key={tile.title} className="bg-white rounded-2xl shadow p-6 flex flex-col items-center gap-4">
              <Image src={tile.icon} alt={tile.title} width={48} height={48} className="rounded-lg" />
              <div className="font-semibold text-lg text-gray-800">{tile.title}</div>
              <div className="text-sm text-gray-500 text-center">{tile.description}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 