import React from 'react';
import Link from 'next/link';
import { HiOutlineBookOpen, HiArrowLeft } from 'react-icons/hi2';

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 relative">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/homelogin" className="flex items-center space-x-2">
            <div className="relative overflow-hidden rounded-full h-8 w-8 bg-[#4067EC] flex items-center justify-center">
              <HiOutlineBookOpen className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-semibold text-[#4067EC]">Biblioteka cyfrowa</span>
          </Link>
          <Link href="/homelogin" className="flex items-center px-6 py-2 bg-white text-[#4067EC] font-bold rounded-lg border-2 border-[#4067EC] shadow-lg hover:bg-[#4067EC] hover:text-white focus:outline-none focus:ring-4 focus:ring-[#4067EC]/40 transition-all duration-150 gap-2">
            <HiArrowLeft className="w-5 h-5" />
            Powrót do panelu głównego
          </Link>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-xl w-full mt-12">
          <div className="flex flex-col items-center mb-6">
            <HiOutlineBookOpen className="text-[#4067EC] w-16 h-16 mb-2" />
            <h1 className="text-3xl font-bold text-[#4067EC] mb-2">Twoja Biblioteka</h1>
            <p className="text-gray-600 text-center">W tym miejscu znajdziesz wszystkie swoje materiały cyfrowe, e-booki, notatki i zasoby edukacyjne. Wkrótce pojawią się tu nowe funkcje!</p>
          </div>
          <div className="border-t border-gray-200 my-6" />
          <div className="flex flex-col items-center space-y-4">
            <span className="text-gray-400">Brak zasobów do wyświetlenia.</span>
            <button className="bg-[#4067EC] text-white px-6 py-2 rounded-md font-medium hover:bg-[#3155d4] transition-colors">Dodaj zasób</button>
          </div>
        </div>
      </main>
    </div>
  );
} 