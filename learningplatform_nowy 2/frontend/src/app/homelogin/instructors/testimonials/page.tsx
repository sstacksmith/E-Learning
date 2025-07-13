"use client";
import Link from "next/link";
import Image from "next/image";

const testimonials = [
  { user: "John Doe", text: "Great instructor! Learned a lot.", img: "/puzzleicon.png" },
  { user: "Jane Smith", text: "Very helpful and clear explanations.", img: "/puzzleicon.png" },
  { user: "Alex Johnson", text: "Highly recommend!", img: "/puzzleicon.png" },
];

export default function TestimonialsPage() {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Testimonials</h1>
        <div className="space-y-6 max-w-2xl mx-auto">
          {testimonials.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
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