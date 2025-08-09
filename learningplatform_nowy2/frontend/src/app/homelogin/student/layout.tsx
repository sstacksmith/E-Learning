import Link from "next/link";
import StudentRoute from '@/components/StudentRoute';
import ParentAccess from '@/components/ParentAccess';
import { useAuth } from '@/context/AuthContext';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';

  return (
    <StudentRoute>
      <ParentAccess>
        <div className="min-h-screen bg-[#F4F6FB] flex flex-col">
          {/* Minimalist Topbar */}
          <header className="w-full bg-white shadow-sm border-b flex items-center justify-between px-8 py-1 sticky top-0 z-50 h-14">
            {/* Dashboard/Home link on the left */}
            <Link href="/homelogin" className="text-[#4067EC] font-bold text-lg hover:underline mr-8">Dashboard</Link>
            <nav className="flex-1 flex items-center justify-center gap-8">
              {!isParent && (
                <>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Moje terminy</Link>
                  <Link href="/homelogin/group-chats" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Czat grupowy</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Repozytorium/Manuale</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Warunki</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Digiteka - Cyfrowe Materiały Dydaktyczne</Link>
                  <Link href="#" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Wsparcie</Link>
                </>
              )}
              <Link href="/homelogin/student/courses" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Moje kursy</Link>
              <Link href="/homelogin/student/grades" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Dziennik</Link>
              <Link href="/homelogin/student/tutors" className="text-sm text-gray-700 hover:text-[#4067EC] font-medium">Tutors</Link>
            </nav>
            <div className="flex items-center gap-4 ml-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-full hover:bg-[#F1F4FE] transition" aria-label="Powiadomienia">
                <svg className="w-6 h-6 text-[#4067EC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>
              {/* User avatar with initials */}
              <div className="w-9 h-9 rounded-full bg-[#4067EC] flex items-center justify-center text-white font-bold text-base">
                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            </div>
          </header>
          <main className="flex-1 w-full max-w-full mx-auto">{children}</main>
        </div>
      </ParentAccess>
    </StudentRoute>
  );
} 