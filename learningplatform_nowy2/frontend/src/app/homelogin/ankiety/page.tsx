import React from 'react';

export default function AnkietyPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <div className="bg-white bg-opacity-90 rounded-2xl shadow-lg p-8 max-w-xl w-full flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#4067EC]">Ankiety uczniowskie</h1>
            <p className="text-sm text-blue-600">Twoja opinia o kursach</p>
          </div>
        </div>
        <div className="text-center text-gray-700 mb-6">
          <p className="text-base sm:text-lg">
            Twoja opinia jest dla nas <span className="font-bold underline">bardzo ważna</span>!<br/>
            Chcemy, aby nauka była <span className="font-semibold">przyjemna, skuteczna i szybka</span>, dlatego zależy nam na Twoim zdaniu.<br/>
            Podziel się swoimi wrażeniami z kursów i pomóż nam tworzyć jeszcze lepszą platformę!
          </p>
        </div>
        <a
          href="#"
          className="inline-block bg-[#4067EC] text-white font-bold px-8 py-3 rounded-lg shadow hover:bg-blue-700 hover:scale-105 transition text-lg mt-2"
        >
          Przejdź do ankiety
        </a>
      </div>
    </div>
  );
} 