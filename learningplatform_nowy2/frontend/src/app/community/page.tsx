"use client";
import Link from "next/link";

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-[#F1F4FE] flex flex-col">
      <div className="max-w-5xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold text-[#4067EC] mb-6">Społeczność</h1>
        <p className="text-lg text-gray-700 mb-8">Dołącz do aktywnej społeczności rodziców i uczniów edukacji domowej. Wymieniaj się doświadczeniami, materiałami i inspiracjami!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col">
            <h2 className="text-xl font-semibold text-[#4067EC] mb-2">Forum dyskusyjne</h2>
            <ul className="text-gray-700 list-disc list-inside space-y-1">
              <li>Porady dla początkujących</li>
              <li>Egzaminy i formalności</li>
              <li>Motywacja i organizacja dnia</li>
              <li>Wspólne projekty</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col">
            <h2 className="text-xl font-semibold text-[#4067EC] mb-2">Grupy tematyczne</h2>
            <ul className="text-gray-700 list-disc list-inside space-y-1">
              <li>Edukacja wczesnoszkolna</li>
              <li>Nauka przez zabawę</li>
              <li>Egzaminy ósmoklasisty</li>
              <li>Rodziny wielodzietne</li>
            </ul>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col mb-12">
          <h2 className="text-xl font-semibold text-[#4067EC] mb-2">Wydarzenia online</h2>
          <ul className="text-gray-700 list-disc list-inside space-y-1">
            <li>Webinary z ekspertami</li>
            <li>Spotkania społeczności</li>
            <li>Warsztaty tematyczne</li>
            <li>Inspirujące historie rodzin</li>
          </ul>
        </div>
        <Link href="/homelogin" className="text-[#4067EC] hover:underline">Powrót na stronę główną</Link>
      </div>
    </div>
  );
} 