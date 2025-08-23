"use client";

import LessonSchedule from '@/components/LessonSchedule';
import Providers from '@/components/Providers';
import { ArrowLeft, Calendar, Clock, Plus, Settings, Download } from 'lucide-react';

function SchedulePageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Full Width Header */}
      <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.location.href = '/homelogin'}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ease-in-out font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Powrót
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Plan lekcji
                </h1>
                <p className="text-sm text-slate-600 mt-1">Zarządzaj swoim harmonogramem</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all duration-200">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all duration-200">
                <Download className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">32</div>
                <div className="text-sm text-slate-600">Lekcje w tygodniu</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">5</div>
                <div className="text-sm text-slate-600">Dni nauki</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">8</div>
                <div className="text-sm text-slate-600">Lekcje dziennie</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">45</div>
                <div className="text-sm text-slate-600">Minut lekcji</div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Container - Full Width */}
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden">
          <div className="p-6 md:p-8 lg:p-10">
            <LessonSchedule />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Providers>
      <SchedulePageContent />
    </Providers>
  );
} 