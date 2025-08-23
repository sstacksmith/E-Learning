"use client";
import Image from "next/image";
import { ArrowLeft } from 'lucide-react';

const testimonials = [
  { user: "John Doe", text: "Great instructor! Learned a lot.", img: "/puzzleicon.png" },
  { user: "Jane Smith", text: "Very helpful and clear explanations.", img: "/puzzleicon.png" },
  { user: "Alex Johnson", text: "Highly recommend!", img: "/puzzleicon.png" },
];

export default function TestimonialsPage() {
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
            Opinie i referencje
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6 max-w-2xl mx-auto">
          {testimonials.map((item, idx) => (
            <div key={idx} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 flex items-center gap-4 border border-white/20 hover:shadow-xl transition-all duration-300">
              <Image src={item.img} alt={item.user} width={48} height={48} className="rounded-full" />
              <div>
                <div className="font-semibold text-lg text-gray-800">{item.user}</div>
                <div className="text-gray-600">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 