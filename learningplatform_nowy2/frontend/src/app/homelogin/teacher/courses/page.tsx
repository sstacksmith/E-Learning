"use client";
import { useState, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../../../config/firebase';
import Link from "next/link";

interface Course {
  id: number;
  title: string;
  description: string;
  year_of_study: number;
  is_active: boolean;
  created_at: string;
}

const SUBJECTS = [
  'Matematyka',
  'Język polski',
  'Język angielski',
  'Fizyka',
  'Chemia',
  'Biologia',
  'Historia',
  'Geografia',
  'Informatyka',
  'Wychowanie fizyczne',
];

export default function TeacherCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    year_of_study: 1,
    subject: SUBJECTS[0],
    links: [''],
    pdfs: [] as File[],
    pdfUrls: [] as string[],
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('firebaseToken') || localStorage.getItem('accessToken') || localStorage.getItem('token'))
        : null;
      const response = await fetch('/api/courses/', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewCourse({ ...newCourse, pdfs: Array.from(e.target.files) });
    }
  };

  const handleLinkChange = (idx: number, value: string) => {
    const links = [...newCourse.links];
    links[idx] = value;
    setNewCourse({ ...newCourse, links });
  };

  const addLinkField = () => {
    setNewCourse({ ...newCourse, links: [...newCourse.links, ''] });
  };

  const removeLinkField = (idx: number) => {
    const links = [...newCourse.links];
    links.splice(idx, 1);
    setNewCourse({ ...newCourse, links });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);
    let pdfUrls: string[] = [];
    
    try {
      console.log("Starting course creation process...");
      
      // Upload PDF files to Firebase Storage
      if (newCourse.pdfs.length > 0) {
        console.log(`Uploading ${newCourse.pdfs.length} PDF files...`);
        const storage = getStorage();
        for (const file of newCourse.pdfs) {
          const storageRef = ref(storage, `courses/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          pdfUrls.push(url);
        }
        console.log("PDF uploads completed");
      }
      
      setUploading(false);
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('firebaseToken') || localStorage.getItem('accessToken') || localStorage.getItem('token'))
        : null;
      console.log("Firebase token available:", !!token);
      
      const requestData = {
        ...newCourse,
        pdfUrls,
        links: newCourse.links.filter(l => l.trim() !== ''),
      };
      console.log("Request data:", requestData);
      
      const response = await fetch('/api/courses/', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(`Server error: ${errorData.detail || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log("Course created successfully:", data);
      setSuccess('Course created successfully!');
      setNewCourse({ title: '', description: '', year_of_study: 1, subject: SUBJECTS[0], links: [''], pdfs: [], pdfUrls: [] });
      fetchCourses();
    } catch (err: any) {
      console.error("Course creation error:", err);
      setError(`Failed to create course: ${err.message || 'Unknown error'}`);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">Moje kursy</h1>
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-solid border-[#4067EC] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-2 text-gray-600 text-sm sm:text-base">Loading courses...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 mb-4 text-sm sm:text-base">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
              <Link href={`/homelogin/teacher/courses/${course.id}`} className="block hover:underline">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
              </Link>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">{course.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-500">Year {course.year_of_study}</span>
                <span className={`px-2 py-1 rounded text-xs sm:text-sm ${course.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{course.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">Utwórz nowy kurs</h2>
        {success && <div className="bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded mb-4 text-sm sm:text-base">{success}</div>}
        <form onSubmit={handleCreateCourse} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tytuł kursu</label>
            <input 
              type="text" 
              value={newCourse.title} 
              onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} 
              className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors duration-200" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Przedmiot</label>
            <select 
              value={newCourse.subject} 
              onChange={e => setNewCourse({ ...newCourse, subject: e.target.value })} 
              className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors duration-200" 
              required
            >
              {SUBJECTS.map(subj => <option key={subj} value={subj}>{subj}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Opis</label>
            <textarea 
              value={newCourse.description} 
              onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} 
              className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors duration-200" 
              rows={3} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Rok nauki</label>
            <select 
              value={newCourse.year_of_study} 
              onChange={e => setNewCourse({ ...newCourse, year_of_study: Number(e.target.value) })} 
              className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors duration-200" 
              required
            >
              {[1,2,3,4,5].map(year => <option key={year} value={year}>Rok {year}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Pliki PDF</label>
            <input 
              type="file" 
              accept="application/pdf" 
              multiple 
              onChange={handlePdfChange} 
              className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors duration-200" 
            />
            {newCourse.pdfs.length > 0 && (
              <ul className="mt-2 text-xs sm:text-sm text-gray-600 list-disc list-inside">
                {newCourse.pdfs.map((file, idx) => <li key={idx}>{file.name}</li>)}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Odnośniki (linki)</label>
            {newCourse.links.map((link, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input 
                  type="url" 
                  value={link} 
                  onChange={e => handleLinkChange(idx, e.target.value)} 
                  className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-[#4067EC] transition-colors duration-200" 
                  placeholder="https://..." 
                />
                {newCourse.links.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeLinkField(idx)} 
                    className="text-red-500 font-bold px-2 hover:text-red-700 transition-colors duration-200"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={addLinkField} 
              className="text-[#4067EC] hover:underline text-xs sm:text-sm transition-colors duration-200"
            >
              + Dodaj kolejny link
            </button>
          </div>
          <button 
            type="submit" 
            className="w-full bg-[#4067EC] text-white py-2 rounded-lg hover:bg-[#3155d4] transition-colors duration-200 text-sm sm:text-base font-semibold" 
            disabled={uploading}
          >
            {uploading ? 'Przesyłanie...' : 'Utwórz kurs'}
          </button>
        </form>
      </div>
    </div>
  );
} 