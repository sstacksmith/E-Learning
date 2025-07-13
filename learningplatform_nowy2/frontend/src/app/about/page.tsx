"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F1F4FE]">
      {/* Header/Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div 
            className="flex items-center cursor-pointer group transition-all duration-300" 
            onClick={() => router.push('/')}
          >
            <div className="relative overflow-hidden rounded-full">
              <Image 
                src="/puzzleicon.png" 
                alt="Puzzle Icon" 
                width={32} 
                height={32} 
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="ml-2 text-xl font-medium text-[#222] group-hover:text-[#4067EC] transition-colors duration-300">
              Cogito
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="px-2 py-2 text-gray-700 hover:text-[#4067EC]">Home</Link>
            <a href="#" className="px-2 py-2 text-[#4067EC]">About</a>
            <a href="#" className="px-2 py-2 text-gray-700 hover:text-[#4067EC]">Courses</a>
            <a href="#" className="px-2 py-2 text-gray-700 hover:text-[#4067EC]">Teachers</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="px-4 py-2 rounded text-[#4067EC] hover:bg-blue-50 transition-colors duration-300"
            >
              Log In
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 rounded bg-[#4067EC] text-white hover:bg-[#3155d4] transition-colors duration-300 shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#4067EC] mb-6">
            About Cogito
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We&apos;re a dedicated e-learning platform with a mission to provide 
            high-quality education accessible to everyone, everywhere.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-[#F1F4FE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2">
              <div className="relative rounded-xl overflow-hidden shadow-xl">
                <Image 
                  src="/rightbg.png" 
                  alt="Our Mission" 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#4067EC20] to-[#48646f40] z-0" />
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl font-bold text-[#4067EC] mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-6">
                At Cogito, our mission is to provide a free, world-class education for anyone, anywhere. 
                We believe that education is a fundamental right and that everyone deserves access to high-quality learning resources.
              </p>
              <p className="text-lg text-gray-600">
                We strive to create an environment where students can learn at their own pace, 
                with personalized content that adapts to their unique learning style and needs. 
                Our goal is to empower learners of all ages and backgrounds to reach their full potential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#4067EC] mb-12">What Makes Us Different</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#F1F4FE] p-8 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="w-14 h-14 rounded-full bg-[#4067EC] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Interactive Learning</h3>
              <p className="text-gray-600">
                Our platform features interactive lessons, quizzes, and exercises that engage students and make learning fun and effective.
              </p>
            </div>
            
            <div className="bg-[#F1F4FE] p-8 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="w-14 h-14 rounded-full bg-[#4067EC] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Adaptive Technology</h3>
              <p className="text-gray-600">
                Our learning system adapts to each student&apos;s needs, providing personalized recommendations and customized learning paths.
              </p>
            </div>
            
            <div className="bg-[#F1F4FE] p-8 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="w-14 h-14 rounded-full bg-[#4067EC] flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Community Support</h3>
              <p className="text-gray-600">
                We foster a supportive community of learners and educators who collaborate, share resources, and help each other succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-16 bg-[#F1F4FE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#4067EC] mb-12">Meet Our Team</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Team Member 1 */}
            <div className="bg-white p-6 rounded-xl shadow-sm text-center transition-all duration-300 hover:shadow-md">
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6">
                <div className="w-full h-full bg-[#4067EC30] flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#4067EC]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Sarah Johnson</h3>
              <p className="text-[#4067EC] font-medium mb-4">CEO & Founder</p>
              <p className="text-gray-600">
                Education enthusiast with over 15 years of experience in EdTech and online learning platforms.
              </p>
            </div>
            
            {/* Team Member 2 */}
            <div className="bg-white p-6 rounded-xl shadow-sm text-center transition-all duration-300 hover:shadow-md">
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6">
                <div className="w-full h-full bg-[#4067EC30] flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#4067EC]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Michael Chen</h3>
              <p className="text-[#4067EC] font-medium mb-4">CTO</p>
              <p className="text-gray-600">
                Tech expert with a passion for using technology to revolutionize education and improve access to learning.
              </p>
            </div>
            
            {/* Team Member 3 */}
            <div className="bg-white p-6 rounded-xl shadow-sm text-center transition-all duration-300 hover:shadow-md">
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6">
                <div className="w-full h-full bg-[#4067EC30] flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#4067EC]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Olivia Rodriguez</h3>
              <p className="text-[#4067EC] font-medium mb-4">Head of Content</p>
              <p className="text-gray-600">
                Former teacher with a background in curriculum development and a dedication to creating engaging educational content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-[#4067EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Want to Learn More?</h2>
          <p className="text-xl text-blue-100 mb-8">
            We&apos;d love to hear from you! Reach out to our team with questions, feedback, or partnership opportunities.
          </p>
          <a 
            href="mailto:contact@cogito.com" 
            className="inline-block px-8 py-4 rounded-md bg-white text-[#4067EC] text-lg font-bold hover:bg-blue-50 transition-all duration-300 shadow-lg"
          >
            Contact Us
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Image 
                  src="/puzzleicon.png" 
                  alt="Cogito Logo" 
                  width={32} 
                  height={32} 
                  className="invert"
                />
                <span className="ml-2 text-xl font-medium">Cogito</span>
              </div>
              <p className="text-gray-400 mb-4">Knowledge Treatment for Better Learning</p>
              <p className="text-gray-400 text-sm">
                A free, world-class education for anyone, anywhere.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Subjects</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Mathematics</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programming</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Science</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Languages</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Humanities</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">For Teachers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Parents</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Students</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">About</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Our Mission</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Team</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Cogito Learning Platform. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
