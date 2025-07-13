"use client";
import Link from "next/link";
import Image from "next/image";

const marketingCourses = [
  { title: "SEO Fundamentals", level: "Beginner", progress: 45, img: "/thumb.png" },
  { title: "Social Media Marketing", level: "Intermediate", progress: 70, img: "/thumb.png" },
  { title: "Email Campaigns", level: "Advanced", progress: 20, img: "/thumb.png" },
];

export default function DigitalMarketingPage() {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Digital Marketing Courses</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {marketingCourses.map((course) => (
            <div key={course.title} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Image src={course.img} alt={course.title} width={48} height={48} className="rounded-lg" />
                <div>
                  <div className="font-semibold text-lg text-gray-800">{course.title}</div>
                  <div className="text-sm text-gray-500">{course.level}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Progress</div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-[#4067EC] h-3 rounded-full" style={{ width: `${course.progress}%` }}></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{course.progress}% completed</div>
              </div>
              <button className="mt-4 bg-[#4067EC] text-white px-4 py-2 rounded-lg font-semibold">Continue</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 