'use client';
import React from 'react';
import { HiOutlineBookOpen } from 'react-icons/hi2';
import { ArrowLeft } from 'lucide-react';

export default function LibraryPage() {
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
            Biblioteka cyfrowa
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-8 max-w-xl w-full border border-white/20">
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