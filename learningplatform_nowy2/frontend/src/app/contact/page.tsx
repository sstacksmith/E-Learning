"use client";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F1F4FE] flex flex-col">
      <div className="max-w-5xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold text-[#4067EC] mb-6">Kontakt</h1>
        <p className="text-lg text-gray-700 mb-8">Masz pytania lub chcesz się z nami skontaktować? Napisz do nas, a odpowiemy najszybciej jak to możliwe!</p>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col mb-12">
          <h2 className="text-xl font-semibold text-[#4067EC] mb-2">Dane kontaktowe</h2>
          <ul className="text-gray-700 list-disc list-inside space-y-1">
            <li>Email: <a href="mailto:pomoc@cogito.pl" className="text-[#4067EC] hover:underline">pomoc@cogito.pl</a></li>
            <li>Telefon: <a href="tel:+48123456789" className="text-[#4067EC] hover:underline">+48 123 456 789</a></li>
            <li>Godziny pracy: pon-pt 9:00-17:00</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col mb-12">
          <h2 className="text-xl font-semibold text-[#4067EC] mb-2">Zapraszamy do kontaktu</h2>
          <p className="text-gray-700">Chętnie odpowiemy na Twoje pytania dotyczące platformy, współpracy lub wsparcia technicznego. Skorzystaj z powyższych danych lub napisz do nas przez formularz na stronie (wkrótce dostępny).</p>
        </div>
        <Link href="/homelogin" className="text-[#4067EC] hover:underline">Powrót na stronę główną</Link>
      </div>
    </div>
  );
} 