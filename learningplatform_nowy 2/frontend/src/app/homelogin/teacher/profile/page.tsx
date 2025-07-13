export default function TeacherProfile() {
  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">Mój profil</h1>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-2">Informacje o nauczycielu</h2>
        <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">(Tutaj pojawią się dane nauczyciela.)</p>
        <button className="bg-[#4067EC] text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg hover:bg-[#3155d4] transition-colors duration-200 text-sm sm:text-base font-semibold">Edytuj profil</button>
      </div>
    </div>
  );
} 