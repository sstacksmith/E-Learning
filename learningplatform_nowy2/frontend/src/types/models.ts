import { FirebaseDocument } from './firebase';

export interface User extends FirebaseDocument {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'student' | 'teacher' | 'admin';
  isActive: boolean;
  lastLogin: string | null;
  metadata: Record<string, unknown>;
}

export interface Course extends FirebaseDocument {
  title: string;
  description: string;
  slug: string;
  thumbnail: string;
  level: string;
  subject: string;
  year_of_study: number;
  category?: number;
  category_name?: string;
  is_active: boolean;
  teacherEmail: string;
  instructor_name?: string;
  assignedUsers: string[];
  sections: Section[];
  pdfUrls: string[];
  links: string[];
  progress?: number;
  total_time?: number;
  last_accessed?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface Section extends FirebaseDocument {
  name: string;
  type: string;
  deadline?: string;
  contents: Content[];
  submissions?: Submission[];
  order: number;
}

export interface Content extends FirebaseDocument {
  name: string;
  type: 'file' | 'link' | 'text' | 'video';
  fileUrl?: string;
  link?: string;
  text?: string;
  duration_minutes?: number;
  order: number;
}

export interface Submission extends FirebaseDocument {
  user_id: string;
  content: string;
  submitted_at: string;
  file_url?: string;
  grade?: number;
  feedback?: string;
}

export interface Quiz extends FirebaseDocument {
  title: string;
  description: string;
  subject: string;
  course_id: string;
  questions: Question[];
  max_attempts: number;
  time_limit?: number;
  passing_score?: number;
}

export interface Question extends FirebaseDocument {
  content: string;
  type: 'text' | 'math' | 'mixed' | 'open';
  answers: Answer[];
  points: number;
  order: number;
}

export interface Answer extends FirebaseDocument {
  content: string;
  type: 'text' | 'math' | 'mixed';
  is_correct: boolean;
  explanation?: string;
}

export interface QuizAttempt extends FirebaseDocument {
  user_id: string;
  quiz_id: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  answers: Record<string, string>;
  time_spent?: number;
}

export interface Grade extends FirebaseDocument {
  user_id: string;
  course_id: string;
  value: number;
  comment?: string;
  graded_by: string;
  graded_at: string;
}

export interface Event extends FirebaseDocument {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  type: 'assignment' | 'exam' | 'meeting' | 'other';
  course_id?: string;
  participants: string[];
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface Notification extends FirebaseDocument {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeEntry extends FirebaseDocument {
  user_id: string;
  course_id?: string;
  duration: number;
  activity_type: 'course' | 'quiz' | 'assignment' | 'other';
  metadata?: Record<string, unknown>;
}

export interface Badge extends FirebaseDocument {
  name: string;
  description: string;
  icon_url: string;
  type: 'achievement' | 'skill' | 'participation';
  level: number;
  requirements: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UserStats extends FirebaseDocument {
  user_id: string;
  total_time: number;
  completed_courses: number;
  average_grade: number;
  badges_earned: number;
  current_streak: number;
  best_streak: number;
  last_activity: string;
  metadata?: Record<string, unknown>;
}
