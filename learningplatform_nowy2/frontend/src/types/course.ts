export interface Section {
  id: string;
  name: string;
  type: string;
  deadline?: string;
  contents: Content[];
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  user_id: string;
  content: string;
  submitted_at: string;
  file_url?: string;
}

export interface Content {
  id: string;
  name: string;
  fileUrl?: string;
  link?: string;
  text?: string;
  type: 'file' | 'link' | 'text' | 'video';
  duration_minutes?: number;
}

export interface Course {
  // Podstawowe informacje
  id: string;
  title: string;
  description: string;
  slug: string;
  
  // Metadane
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
  
  // Kategorie i tagi
  subject: string;
  year_of_study: number;
  level?: string;
  category?: number;
  category_name?: string;
  
  // Zasoby
  thumbnail?: string;
  pdfUrls: string[];
  links: string[];
  sections: Section[];
  
  // Uprawnienia i dostęp
  teacherEmail: string;
  instructor_name?: string;
  assignedUsers: string[];
  
  // Statystyki i postęp
  progress?: number;
  total_time?: number;
  last_accessed?: string;
  completed_at?: string;
  
  // Dodatkowe pola specyficzne dla Firebase
  firebase_id?: string;
  metadata?: Record<string, unknown>;
}
