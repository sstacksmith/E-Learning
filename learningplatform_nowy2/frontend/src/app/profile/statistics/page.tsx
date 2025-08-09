'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import useApi from '@/hooks/useApi';
import { useTimeTracking } from '@/context/TimeTrackingContext';
import { RadialProgress } from '@/components/RadialProgress';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { calculateBadgeLevel, getAllBadgeConfigs } from '@/utils/badges';
import Image from 'next/image';
import { GradesChart } from '@/components/GradesChart';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Interfejsy
interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
  isNew?: boolean;
}

interface Course {
  id: string;
  title: string;
  slug?: string;
  thumbnail: string;
  progress: number;
  lastAccessed: string;
  totalTime: number;
  completedAt?: string;
  streak?: number;
}

interface UserStats {
  level: number;
  experience: number;
  experienceToNextLevel: number;
  points: number;
  totalTimeSpent: number;
  loginStreak: number;
  completedCourses: number;
  timeSpentData: Array<{
    date: string;
    minutes: number;
  }>;
  activeCourses: Course[];
  recentCourses: Course[];
  completedCoursesList: Course[];
  badges: Badge[];
  overallProgress: number;
  dailyBonus: {
    available: boolean;
    streak: number;
    nextBonusTime: string;
  };
  grades: {
    [key: number]: number; // Mapowanie oceny na liczbę wystąpień
  };
}

interface ApiResponse {
  timeSpentData: Array<{ date: string; minutes: number }>;
  activeCourses: number;
  totalTimeSpent: number;
}

interface ApiError {
  message?: string;
}

// (nieużywane) formatDate pozostawiono do ewentualnych etykiet X w przyszłości
// const formatDate = (...) => { ... }

// Funkcja pomocnicza do generowania dat
const generateDates = (timeRange: 'day' | 'week' | 'month' | 'year' | 'all', offset = 0): string[] => {
  const now = new Date();
  const dates: string[] = [];

  switch (timeRange) {
    case 'day': {
      // 24 godziny bieżącego dnia
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      for (let i = 0; i < 24; i++) {
        const date = new Date(startOfDay);
        date.setHours(i);
        dates.push(date.toISOString());
      }
      break;
    }
    case 'week': {
      // 7 dni tygodnia, zaczynając od poprzedniego poniedziałku
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
      startOfWeek.setDate(startOfWeek.getDate() + (offset * 7)); // Przesunięcie o tygodnie
      startOfWeek.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString());
      }
      break;
    }
    case 'month': {
      // Wszystkie dni miesiąca
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
      
      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(startOfMonth);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString());
      }
      break;
    }
    case 'year': {
      // 12 miesięcy
      const startOfYear = new Date(now.getFullYear() + offset, 0, 1);
      for (let i = 0; i < 12; i++) {
        const date = new Date(startOfYear);
        date.setMonth(i);
        dates.push(date.toISOString());
      }
      break;
    }
    case 'all': {
      // 60 miesięcy (5 lat) z przesunięciem
      const startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 5); // Rozpocznij 5 lat temu
      startDate.setMonth(startDate.getMonth() + offset);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 60; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        dates.push(date.toISOString());
      }
      break;
    }
  }

  return dates;
};

// Interfejs dla danych z Firebase
interface FirebaseTimeEntry {
  timestamp: string;
  duration: number;
  page: string;
}

// Funkcja do obliczania odznak
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateBadges = (timeEntries: FirebaseTimeEntry[], courses: Course[]): Badge[] => {
  const badges: Badge[] = [];
  const badgeConfigs = getAllBadgeConfigs();
  const now = new Date();

  // Oblicz całkowity czas
  const totalTime = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);

  // Oblicz najdłuższy czas w jeden dzień
  const timeByDay = new Map<string, number>();
  timeEntries.forEach(entry => {
    const date = new Date(entry.timestamp).toDateString();
    timeByDay.set(date, (timeByDay.get(date) || 0) + entry.duration);
  });
  const maxDailyTime = Math.max(...Array.from(timeByDay.values()));

  // Sprawdź każdy typ odznaki
  badgeConfigs.forEach(config => {
    let value = 0;

    switch (config.type) {
      case 'time':
        value = config.id === 'sprinter' ? maxDailyTime : totalTime;
        break;
      case 'courses':
        value = courses.filter(c => c.completedAt).length;
        break;
      case 'streak':
        value = courses.reduce((max, c) => Math.max(max, c.streak || 0), 0);
        break;
    }

    const level = calculateBadgeLevel(config.id, value);
    if (level) {
      badges.push({
        id: config.id,
        name: `${config.name} ${level.icon}`,
        description: `${config.description} - Poziom ${level.level}`,
        iconUrl: `/badges/${config.id}_${level.level}.svg`,
        earnedAt: now.toISOString(),
        isNew: false // TODO: Implementacja sprawdzania nowych odznak
      });
    }
  });

  return badges;
};

// Funkcja do obliczania ogólnego postępu
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateOverallProgress = (courses: Course[]): number => {
  if (!courses.length) return 0;
  const totalProgress = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
  return Math.round(totalProgress / courses.length);
};

// Funkcja do grupowania czasu według dat
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const groupTimeByDate = (entries: FirebaseTimeEntry[], timeRange: 'day' | 'week' | 'month' | 'year' | 'all'): { date: string; minutes: number }[] => {
  const dates = generateDates(timeRange, 0);
  const groupedData = new Map<string, number>();
  
  // Inicjalizuj wszystkie daty zerami
  dates.forEach(date => {
    groupedData.set(date, 0);
  });

  // Grupuj wpisy według dat
  entries.forEach(entry => {
    const entryDate = new Date(entry.timestamp);
    let key = '';

    switch (timeRange) {
      case 'day':
        // Grupuj po godzinach
        entryDate.setMinutes(0, 0, 0);
        key = entryDate.toISOString();
        break;
      case 'week':
      case 'month':
        // Grupuj po dniach
        entryDate.setHours(0, 0, 0, 0);
        key = entryDate.toISOString();
        break;
      case 'year':
        // Grupuj po miesiącach
        entryDate.setDate(1);
        entryDate.setHours(0, 0, 0, 0);
        key = entryDate.toISOString();
        break;
      case 'all':
        // Grupuj po miesiącach
        entryDate.setDate(1);
        entryDate.setHours(0, 0, 0, 0);
        key = entryDate.toISOString();
        break;
    }

    // Znajdź najbliższą datę z wygenerowanych
    const closestDate = dates.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev).getTime() - new Date(key).getTime());
      const currDiff = Math.abs(new Date(curr).getTime() - new Date(key).getTime());
      return prevDiff < currDiff ? prev : curr;
    });

    groupedData.set(closestDate, (groupedData.get(closestDate) || 0) + entry.duration);
  });

  // Konwertuj mapę na tablicę
  return dates.map(date => ({
    date,
    minutes: Math.round(groupedData.get(date) || 0)
  }));
};

// Funkcja do generowania podziałki
const generateYAxisTicks = (maxMinutes: number, timeRange: 'day' | 'week' | 'month' | 'year' | 'all'): number[] => {
  const numberOfTicks = 6;
  
  if (timeRange === 'day') {
    // Dzień: min 10 min
    const maxMinutesRounded = Math.ceil(maxMinutes / 10) * 10;
    const step = Math.max(Math.floor(maxMinutesRounded / (numberOfTicks - 1)), 10);
    return Array.from({ length: numberOfTicks }, (_, i) => i * step);
  } else {
    // Pozostałe: dynamiczne minuty (bez wymuszania 1h). Dla dużych wartości i tak pokażemy godziny w formatTime
    const roundedMax = Math.ceil(maxMinutes / 10) * 10; // do pełnych 10 min
    const step = Math.max(Math.floor(roundedMax / (numberOfTicks - 1)), 5); // min 5 min
    return Array.from({ length: numberOfTicks }, (_, i) => i * step);
  }
};

// Funkcja do formatowania czasu
const formatTime = (minutes: number, timeRange: 'day' | 'week' | 'month' | 'year' | 'all'): string => {
  if (timeRange === 'day') {
    // Dla widoku dziennego: pokazuj tylko minuty
    return `${minutes}min`;
  } else {
    // Dla innych widoków: pokazuj godziny i minuty
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
};

export default function StatisticsPage() {
  const { user, loading: authLoading } = useAuth();
  const api = useApi();
  const { currentSessionTime } = useTimeTracking();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [timeOffset, setTimeOffset] = useState(0);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [animatingBadge, setAnimatingBadge] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [recentCoursesLocal, setRecentCoursesLocal] = useState<Course[]>([]);
  const [gradesLocal, setGradesLocal] = useState<{ [key: number]: number }>({});
  const [gradesAvg, setGradesAvg] = useState<number>(0);
  const [gradeSubjects, setGradeSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [seriesData, setSeriesData] = useState<Array<{ date: string; minutes: number }>>([]);
  const [xLabels, setXLabels] = useState<string[]>([]);
  const retryCount = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Funkcja do animacji liczb
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const animateValue = useCallback((start: number, end: number, duration: number, callback: (value: number) => void) => {
    const startTime = performance.now();
    
    const update = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Funkcja easing dla płynniejszej animacji
      const easeOutQuad = (t: number) => t * (2 - t);
      const currentValue = start + (end - start) * easeOutQuad(progress);
      
      callback(Math.round(currentValue));
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }, []);

  // Funkcja do animacji elementów przy scrollowaniu
  const handleScroll = useCallback(() => {
    if (!statsRef.current) return;
    
    const elements = statsRef.current.querySelectorAll('[data-animate]');
    const windowHeight = window.innerHeight;
    
    elements.forEach((element: Element) => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top <= windowHeight * 0.8;
      
      if (isVisible && element instanceof HTMLElement) {
        element.classList.add('animate-in');
        element.removeAttribute('data-animate');
      }
    });
  }, []);

  // Pojedyncza funkcja do ładowania danych
  const loadStats = useCallback(async (range: typeof selectedTimeRange, offset: number) => {
    if (!user?.uid) {
      console.log('No user UID available for loading stats');
      return;
    }

    // Zapobiegaj wielokrotnym wywołaniom
    if (loading || authLoading) {
      console.log('Already loading or auth loading, skipping...');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      retryCount.current = 0;
      
      console.log(`Loading stats for user ${user.uid}, range: ${range}, offset: ${offset}`);
      
      const response = await api.get(`/api/users/${user.uid}/stats/?time_range=${range}&offset=${offset}`);
      
      console.log('Stats response received:', response);
      
      if (response && (response as ApiResponse).timeSpentData) {
        console.log('Time spent data:', (response as ApiResponse).timeSpentData);
        console.log('Active courses:', (response as ApiResponse).activeCourses);
        console.log('Total time spent:', (response as ApiResponse).totalTimeSpent);
        console.log('Full response object:', JSON.stringify(response, null, 2));
        
        // Sprawdź format dat
        (response as ApiResponse).timeSpentData.forEach((entry: { date: string; minutes: number }, index: number) => {
          console.log(`Entry ${index}: date="${entry.date}", minutes=${entry.minutes}`);
          try {
            const date = new Date(entry.date);
            console.log(`  Parsed date: ${date.toISOString()}, valid: ${!isNaN(date.getTime())}`);
          } catch (error) {
            console.error(`  Error parsing date: ${error}`);
          }
        });
      }
      
      setStats(response as UserStats);
    } catch (err: unknown) {
      console.error('Error loading stats:', err);
      
      if (retryCount.current < 3) {
        retryCount.current += 1;
        console.log(`Retrying... Attempt ${retryCount.current}/3`);
        
        retryTimeoutRef.current = setTimeout(() => {
          loadStats(range, offset);
        }, 1000 * retryCount.current);
      } else {
        setError((err as ApiError)?.message || 'Nie udało się załadować statystyk');
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user, api, authLoading, loading]);

  // Efekt scroll
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Sprawdź widoczne elementy przy pierwszym renderowaniu
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Normalizacja danych w pełną siatkę X dla zakresów
  useEffect(() => {
    const normalize = () => {
      const now = new Date();
      if (!stats?.timeSpentData) {
        setSeriesData([]);
        setXLabels([]);
        return;
      }
      const input = stats.timeSpentData;
      const map = new Map<string, number>();
      input.forEach((p) => map.set(new Date(p.date).toISOString(), p.minutes));

      const out: { date: string; minutes: number }[] = [];
      const labels: string[] = [];

      if (selectedTimeRange === 'day') {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        for (let h = 0; h < 24; h += 1) {
          const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
          const iso = slot.toISOString();
          const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
          const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h + 1);
          const val = stats.timeSpentData
            .filter(p => {
              const pd = new Date(p.date);
              return pd >= from && pd < to;
            })
            .reduce((a, b) => a + b.minutes, 0);
          out.push({ date: iso, minutes: val });
          labels.push(slot.toLocaleTimeString('pl-PL', { hour: '2-digit' }));
        }
      } else if (selectedTimeRange === 'week') {
        // poniedziałek -> niedziela bieżącego tygodnia z offsetem
        const base = new Date(now);
        const day = base.getDay() || 7; // 1..7, gdzie 1=poniedziałek
        base.setDate(base.getDate() - (day - 1) + timeOffset * 7);
        for (let i = 0; i < 7; i += 1) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
          const val = input
            .filter(p => {
              const pd = new Date(p.date);
              return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth() && pd.getDate() === d.getDate();
            })
            .reduce((a, b) => a + b.minutes, 0);
          out.push({ date: iso, minutes: val });
          labels.push(d.toLocaleDateString('pl-PL', { weekday: 'short' }));
        }
      } else if (selectedTimeRange === 'month') {
        // pełny miesiąc z offsetem
        const base = new Date(now.getFullYear(), now.getMonth() + timeOffset, 1);
        const year = base.getFullYear();
        const month = base.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d += 1) {
          const iso = new Date(year, month, d).toISOString();
          const val = input
            .filter(p => {
              const pd = new Date(p.date);
              return pd.getFullYear() === year && pd.getMonth() === month && pd.getDate() === d;
            })
            .reduce((a, b) => a + b.minutes, 0);
          out.push({ date: iso, minutes: val });
          labels.push(String(d).padStart(2, '0'));
        }
      } else if (selectedTimeRange === 'year') {
        // pełny rok z offsetem
        const year = now.getFullYear() + timeOffset;
        for (let m = 0; m < 12; m += 1) {
          const first = new Date(year, m, 1);
          const next = new Date(year, m + 1, 1);
          const val = input
            .filter(p => {
              const pd = new Date(p.date);
              return pd >= first && pd < next;
            })
            .reduce((a, b) => a + b.minutes, 0);
          out.push({ date: first.toISOString(), minutes: val });
          labels.push(first.toLocaleDateString('pl-PL', { month: 'short' }));
        }
      } else {
        out.push(...input);
      }

      setSeriesData(out);
      setXLabels(labels);
    };
    normalize();
  }, [stats, selectedTimeRange, timeOffset]);

  // Automatyczne ładowanie danych przy pierwszym załadowaniu
  useEffect(() => {
    console.log('useEffect triggered - user:', user?.uid, 'stats:', !!stats, 'authLoading:', authLoading);
    if (user && !stats && !authLoading) {
      console.log('Auto-loading stats for user:', user.uid);
      loadStats(selectedTimeRange, timeOffset);
    } else {
      console.log('Skipping auto-load - conditions not met');
    }
  }, [user, authLoading, loadStats, selectedTimeRange, stats, timeOffset]); // Używamy authLoading

  // Pobierz ostatnio aktywne kursy użytkownika z Firestore (przypisane do usera)
  useEffect(() => {
      const fetchRecentFromFirestore = async () => {
      if (!user) return;
      try {
        // 1) Odczytaj aktywności z kolekcji courseActivity posortowane po lastAccessed
        const actCol = collection(db, 'courseActivity');
        const actSnap = await getDocs(actCol);
        type ActivityDoc = { id: string; userId?: string; courseId?: string; lastAccessed?: unknown };
        const userActs: ActivityDoc[] = actSnap.docs
          .map(d => {
            const raw = d.data() as Record<string, unknown>;
            // Usuń potencjalne id
            if (Object.prototype.hasOwnProperty.call(raw, 'id')) {
              (raw as Record<string, unknown>)['id'] = undefined;
            }
            const withoutId: Omit<ActivityDoc, 'id'> = raw as Omit<ActivityDoc, 'id'>;
            return { id: d.id, ...withoutId } as ActivityDoc;
          })
          .filter(a => a.userId === user.uid)
          .sort((a, b) => {
            const toMillis = (val: unknown): number => {
              if (!val) return 0;
              const obj = val as { toDate?: () => Date; seconds?: number };
              if (typeof obj === 'object' && obj && typeof obj.toDate === 'function') return obj.toDate()!.getTime();
              if (typeof obj === 'object' && obj && typeof obj.seconds === 'number') return (obj.seconds || 0) * 1000;
              if (typeof val === 'string') return Date.parse(val);
              return 0;
            };
            const at = toMillis(a.lastAccessed);
            const bt = toMillis(b.lastAccessed);
            return bt - at;
          });

        // 2) Pobierz metadane kursów dla zapisanych aktywności
        const coursesCol = collection(db, 'courses');
        const coursesSnap = await getDocs(coursesCol);
        const coursesMap = new Map<string, Record<string, unknown>>();
        coursesSnap.docs.forEach(docu => coursesMap.set(docu.id, { ...(docu.data() as Record<string, unknown>), id: docu.id }));

        const recentFromActivity: Course[] = userActs.map((a: ActivityDoc) => {
          const c = coursesMap.get(String(a.courseId || '')) || {};
          const assignedUsers: string[] = (c.assignedUsers as string[]) || [];
          const isAssigned = assignedUsers.includes(user.uid) || assignedUsers.includes(user.email || '');
          if (!isAssigned) return null as unknown as Course;
          const ts = a.lastAccessed as { toDate?: () => Date } | string | undefined;
          const last = ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function'
            ? ts.toDate().toISOString()
            : (typeof ts === 'string' ? ts : new Date().toISOString());
          return {
            id: String(c.id || a.courseId || ''),
            title: String(c.title || 'Kurs'),
            slug: typeof c.slug === 'string' ? c.slug : undefined,
            thumbnail: String(c.thumbnail || ''),
            progress: Number((c as { progress?: number }).progress || 0),
            lastAccessed: last,
            totalTime: Number((c as { totalTime?: number }).totalTime || 0),
          } as Course;
        }).filter(Boolean) as Course[];

        // 3) Fallback: jeśli brak aktywności, pokaż przypisane kursy jak dotychczas
        if (recentFromActivity.length > 0) {
          setRecentCoursesLocal(recentFromActivity.slice(0, 9));
        } else {
          const snap = await getDocs(coursesCol);
          const assigned = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as { [key: string]: unknown; slug?: string; assignedUsers?: string[]; title?: string; thumbnail?: string; progress?: number; lastAccessed?: string; totalTime?: number; }) }))
            .filter((c) => {
              const assignedUsers: string[] = (c.assignedUsers as string[]) || [];
              return assignedUsers.includes(user.uid) || assignedUsers.includes(user.email || '');
            })
            .map((c) => ({
              id: String(c.id),
              title: String(c.title || 'Kurs'),
              slug: typeof c.slug === 'string' ? c.slug : undefined,
              thumbnail: String(c.thumbnail || ''),
              progress: Number(c.progress || 0),
              lastAccessed: String(c.lastAccessed || new Date().toISOString()),
              totalTime: Number(c.totalTime || 0),
            })) as Course[];
          setRecentCoursesLocal(assigned);
        }
      } catch (e) {
        console.error('Failed to fetch recent courses from Firestore', e);
        setRecentCoursesLocal([]);
      }
    };
    fetchRecentFromFirestore();
  }, [user]);

  // Pobierz oceny użytkownika z Firestore i policz średnią
  useEffect(() => {
    const fetchGrades = async () => {
      if (!user?.uid) return;
      try {
        const gradesCol = collection(db, 'grades');
        const qGrades = query(gradesCol, where('studentId', '==', user.uid));
        const snap = await getDocs(qGrades);
        const counts: { [key: number]: number } = {};
        const subjects = new Set<string>();
        const numeric: number[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const subject: string = (data.subject as string) || '';
          if (subject) subjects.add(subject);
          // próba konwersji oceny (obsługa np. "5+" jako 5.5)
          let val = data.grade;
          if (typeof val === 'string') {
            const plus = val.includes('+');
            const num = parseFloat(val);
            if (!isNaN(num)) {
              val = plus ? num + 0.5 : num;
            }
          }
          const g = Math.round(Number(val));
          if (!Number.isNaN(g)) {
            counts[g] = (counts[g] || 0) + 1;
            numeric.push(Number(val));
          }
        });
        setGradesLocal(counts);
        const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : 0;
        setGradesAvg(Number(avg.toFixed(2)));
        setGradeSubjects(Array.from(subjects));
      } catch (e) {
        console.error('Failed to fetch grades', e);
        setGradesLocal({});
        setGradesAvg(0);
        setGradeSubjects([]);
      }
    };
    fetchGrades();
  }, [user]);

  // Funkcje nawigacji
  const handleTimeRangeChange = (newRange: typeof selectedTimeRange) => {
    setSelectedTimeRange(newRange);
    setTimeOffset(0);
  };

  const handleOffsetChange = (newOffset: number) => {
    setTimeOffset(newOffset);
    // Usuwamy automatyczne ładowanie - użytkownik musi kliknąć "Załaduj dane"
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePrevious = () => {
    if (selectedTimeRange === 'week') handleOffsetChange(timeOffset - 1);
    if (selectedTimeRange === 'month') handleOffsetChange(timeOffset - 1);
    if (selectedTimeRange === 'year') handleOffsetChange(timeOffset - 1);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNext = () => {
    if (selectedTimeRange === 'week' && timeOffset < 0) handleOffsetChange(timeOffset + 1);
    if (selectedTimeRange === 'month' && timeOffset < 0) handleOffsetChange(timeOffset + 1);
    if (selectedTimeRange === 'year' && timeOffset < 0) handleOffsetChange(timeOffset + 1);
  };

  // Oblicz maksymalną wartość i podziałkę dla wykresu
  const maxMinutes = seriesData.length ? Math.max(...(seriesData.map(d => d.minutes) || [0]), 
    selectedTimeRange === 'day' ? 10 : 60) : 60; // Minimum 10min dla dnia, 1h dla innych
  const yAxisTicks = generateYAxisTicks(maxMinutes, selectedTimeRange);

  // Całkowity czas zależny od wybranego zakresu (sumujemy to co faktycznie widać na wykresie)
  const totalInSelectedRange = useMemo(() => {
    const base = seriesData.reduce((acc, p) => acc + (p.minutes || 0), 0);
    // Doliczamy bieżącą sesję tylko dla widoku "Dzień" i bieżącego dnia (offset 0)
    const sessionAddon = selectedTimeRange === 'day' && timeOffset === 0 ? currentSessionTime : 0;
    return base + sessionAddon;
  }, [seriesData, selectedTimeRange, timeOffset, currentSessionTime]);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Zaloguj się</h2>
          <p className="text-gray-600">Musisz być zalogowany, aby zobaczyć statystyki.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Przycisk powrotu */}
      <button
        onClick={() => router.push('/homelogin')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#4067EC] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Powrót do panelu</span>
      </button>
      {/* Wskaźnik aktualnej sesji */}
      {currentSessionTime > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-blue-800">Aktywna sesja nauki</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-900">
                {Math.floor(currentSessionTime / 60)}h {currentSessionTime % 60}m
              </div>
              <div className="text-sm text-blue-600">
                Dzisiejsza sesja
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center gap-4">
        <select
          value={selectedTimeRange}
          onChange={(e) => handleTimeRangeChange(e.target.value as typeof selectedTimeRange)}
          disabled={loading}
          className="block w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
        >
          <option value="day">Dzisiaj (godziny)</option>
          <option value="week">Tydzień (dni)</option>
          <option value="month">Miesiąc (dni)</option>
          <option value="year">Rok (miesiące)</option>
          <option value="all">5 lat (miesiące)</option>
        </select>

        {/* Przycisk do ręcznego ładowania danych */}
        <button
          onClick={() => loadStats(selectedTimeRange, timeOffset)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Ładowanie...' : 'Odśwież dane'}
        </button>

        {/* Przyciski zerowania testowych statystyk (tylko widoczne dla dev) */}
        <button
          onClick={() => setStats(null)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Wyzeruj statystyki (lokalnie)
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <div className="flex justify-between items-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => loadStats(selectedTimeRange, timeOffset)}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Odświeżanie...' : 'Odśwież'}
            </button>
          </div>
        </div>
      )}

      {/* Profil i poziom */}
      {stats && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8" data-animate>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="glassmorphism rounded-full p-1">
                <Image
                  src={user?.photoURL || '/default-avatar.png'}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#4067EC] text-white rounded-full w-8 h-8 flex items-center justify-center animate-fadeIn">
                <AnimatedNumber value={stats?.level || 1} duration={1500} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{user?.email}</h2>
              <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-[#4067EC] transition-all duration-1000 ease-out"
                  style={{ width: `${((stats?.experience || 0) / (stats?.experienceToNextLevel || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>
                  <AnimatedNumber 
                    value={stats?.experience || 0} 
                    duration={1500} 
                    formatter={(val) => `${val} XP`}
                  />
                </span>
                <span>
                  <AnimatedNumber 
                    value={stats?.experienceToNextLevel || 1000} 
                    duration={1500} 
                    formatter={(val) => `${val} XP do następnego poziomu`}
                  />
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#4067EC]">
                <AnimatedNumber 
                  value={stats?.points || 0} 
                  duration={1500}
                  className="animate-fadeIn"
                />
              </div>
              <div className="text-gray-600">punktów</div>
              {stats?.dailyBonus?.available && (
                <div className="mt-2 text-sm">
                  <button 
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full animate-pulse"
                    onClick={() => {/* TODO: Implement daily bonus claim */}}
                  >
                    Odbierz bonus dzienny!
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Seria logowań: {stats?.loginStreak || 0} dni</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Ukończone kursy: {stats?.completedCourses || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Całkowity postęp: {stats?.overallProgress || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Czas spędzony */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8" data-animate>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Czas spędzony na nauce</h3>
            <p className="text-sm text-gray-600 mt-1">Śledź swój postęp w czasie</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Dzień', value: 'day', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'Tydzień', value: 'week', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { label: 'Miesiąc', value: 'month', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { label: 'Rok', value: 'year', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { label: 'Całość', value: 'all', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value as typeof selectedTimeRange)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  selectedTimeRange === range.value
                    ? 'bg-[#4067EC] text-white scale-105 shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={range.icon} />
                </svg>
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent"></div>
          </div>
        ) : (
          <div className="relative h-80 mt-8" data-animate>
            {/* Podziałka Y i siatka */}
            <div className="absolute inset-0 flex flex-col justify-between pr-2" style={{ paddingBottom: '20px' }}>
              {yAxisTicks.reverse().map((minutes) => (
                <div key={minutes} className="flex items-center w-full">
                  <div className="w-12 text-xs text-gray-500 text-right pr-2">
                    {formatTime(minutes, selectedTimeRange)}
                  </div>
                  <div className="flex-1 border-b border-gray-100" />
                </div>
              ))}
            </div>

            <TimeSeriesChart data={seriesData} className="absolute inset-0 pl-6 pr-4" height={320} range={selectedTimeRange} labels={xLabels} yMax={Math.max(...yAxisTicks)} />
          </div>
        )}

        {/* Podsumowanie */}
        {stats && (
          <div className="mt-6 grid grid-cols-3 gap-4">
             <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Całkowity czas</div>
              <div className="text-xl font-semibold mt-1">
                <AnimatedNumber 
                  value={totalInSelectedRange}
                  duration={1500}
                  formatter={(val) => formatTime(val, selectedTimeRange)}
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Średnio dziennie</div>
              <div className="text-xl font-semibold mt-1">
                <AnimatedNumber 
                  value={Math.round((stats?.totalTimeSpent || 0) / (stats?.timeSpentData?.length || 1))} 
                  duration={1500}
                  formatter={(val) => formatTime(val, selectedTimeRange)}
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Dzisiejsza sesja</div>
              <div className="text-xl font-semibold mt-1 flex items-center gap-2">
                <AnimatedNumber 
                  value={currentSessionTime} 
                  duration={1000}
                  formatter={(val) => formatTime(val, 'day')}
                />
                {currentSessionTime > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aktywne kursy */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8" data-animate>
          <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Ostatnio aktywne kursy</h3>
            <p className="text-sm text-gray-600 mt-1">Kontynuuj naukę od ostatniego miejsca</p>
          </div>
          {(stats?.recentCourses?.length || 0) > 3 && (
            <button
              onClick={() => setShowAllCourses(!showAllCourses)}
              className="text-[#4067EC] hover:text-[#3155d4] font-medium flex items-center gap-2"
            >
              {showAllCourses ? (
                <>
                  <span>Pokaż mniej</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Pokaż więcej</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent"></div>
          </div>
        ) : ((recentCoursesLocal?.length || 0) > 0 || (stats?.recentCourses?.length || 0) > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {((showAllCourses ? (recentCoursesLocal.length ? recentCoursesLocal : stats?.recentCourses) : (recentCoursesLocal.length ? recentCoursesLocal.slice(0,3) : stats?.recentCourses?.slice(0,3))) || [])?.map((course) => (
              <div 
                key={course.id} 
                className={`bg-gray-50 rounded-lg p-4 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  expandedCourseId === course.id ? 'ring-2 ring-[#4067EC]' : ''
                }`}
                onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
              >
                <div className="relative">
                  <Image
                    src={course.thumbnail || '/default-course-thumbnail.png'}
                    alt={course.title}
                    width={400}
                    height={160}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 bg-white rounded-full p-2">
                    <RadialProgress
                      progress={course.progress}
                      size={40}
                      strokeWidth={4}
                      showPercentage={false}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">{course.title}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Postęp</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-[#4067EC] transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Spędzony czas: <AnimatedNumber value={course.totalTime} formatter={(val) => formatTime(val, 'all')} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Ostatnia aktywność: {new Date(course.lastAccessed).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {expandedCourseId === course.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-fadeIn">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const target = (course as { slug?: string }).slug || course.title?.toLowerCase()?.replace(/\s+/g,'') || course.id;
                          router.push(`/courses/${target}`);
                        }}
                        className="w-full bg-[#4067EC] text-white py-2 px-4 rounded-lg hover:bg-[#3155d4] transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Kontynuuj naukę
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p>Nie masz jeszcze żadnych aktywnych kursów</p>
          </div>
        )}
      </div>

      {/* Oceny */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8" data-animate>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Oceny</h3>
            <p className="text-sm text-gray-600 mt-1">Twoje wyniki z kursów</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent"></div>
          </div>
        ) : (Object.keys(gradesLocal).length > 0 || stats?.grades) ? (
          <div className="flex flex-col items-center">
            <GradesChart 
              grades={[
                { grade: 2, count: (gradesLocal[2] ?? (stats?.grades?.[2] || 0)), color: '#ef4444' },
                { grade: 3, count: (gradesLocal[3] ?? (stats?.grades?.[3] || 0)), color: '#f97316' },
                { grade: 4, count: (gradesLocal[4] ?? (stats?.grades?.[4] || 0)), color: '#eab308' },
                { grade: 5, count: (gradesLocal[5] ?? (stats?.grades?.[5] || 0)), color: '#22c55e' },
                { grade: 6, count: (gradesLocal[6] ?? (stats?.grades?.[6] || 0)), color: '#3b82f6' }
              ]}
              className="w-64 h-64 mx-auto"
              subjects={gradeSubjects}
              selectedSubject={selectedSubject}
              onSubjectChange={setSelectedSubject}
            />
            <div className="mt-3 text-sm text-gray-600">Średnia ocen: <span className="font-semibold text-[#4067EC]">{gradesAvg || 0}</span></div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p>Nie masz jeszcze żadnych ocen</p>
            <p className="text-sm mt-2">Ukończ kursy, aby zobaczyć swoje wyniki!</p>
          </div>
        )}
      </div>

      {/* Ukończone kursy */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8" data-animate>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Ukończone kursy</h3>
            <p className="text-sm text-gray-600 mt-1">Twoje osiągnięcia w nauce</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Całkowity postęp</div>
              <div className="text-lg font-semibold text-[#4067EC]">
                <AnimatedNumber value={stats?.overallProgress || 0} formatter={(val) => `${val}%`} />
              </div>
            </div>
            <RadialProgress
              progress={stats?.overallProgress || 0}
              size={60}
              strokeWidth={6}
              className="animate-in"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent"></div>
          </div>
        ) : (stats?.completedCoursesList?.length || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats?.completedCoursesList?.map((course) => (
              <div 
                key={course.id} 
                className="bg-gray-50 rounded-lg p-4 transform transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Image
                      src={course.thumbnail || '/default-course-thumbnail.png'}
                      alt={course.title}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">{course.title}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Ukończono: {new Date(course.completedAt || '').toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Czas nauki: <AnimatedNumber value={course.totalTime} formatter={(val) => formatTime(val, 'all')} />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <RadialProgress
                      progress={course.progress}
                      size={48}
                      strokeWidth={4}
                      className="animate-in"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>Nie masz jeszcze ukończonych kursów</p>
            <p className="text-sm mt-2">Ukończ swój pierwszy kurs, aby zobaczyć tutaj swoje osiągnięcia!</p>
          </div>
        )}
      </div>

      {/* Odznaki */}
      <div className="bg-white rounded-xl shadow-md p-6" data-animate>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Odznaki</h3>
            <p className="text-sm text-gray-600 mt-1">Twoje zdobyte osiągnięcia</p>
          </div>
          {(stats?.badges?.length || 0) > 8 && (
            <button
              onClick={() => setShowAllBadges(!showAllBadges)}
              className="text-[#4067EC] hover:text-[#3155d4] font-medium flex items-center gap-2"
            >
              {showAllBadges ? (
                <>
                  <span>Pokaż mniej</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Pokaż więcej</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4067EC] border-t-transparent"></div>
          </div>
        ) : (stats?.badges?.length || 0) > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(showAllBadges ? stats?.badges : stats?.badges?.slice(0, 8))?.map((badge) => (
              <div 
                key={badge.id} 
                className={`text-center transform transition-all duration-300 hover:scale-105 ${
                  badge.isNew ? 'animate-fadeIn' : ''
                }`}
                onMouseEnter={() => setAnimatingBadge(badge.id)}
                onMouseLeave={() => setAnimatingBadge(null)}
              >
                <div className="relative inline-block group">
                  <div className={`relative ${animatingBadge === badge.id ? 'badge-glow' : ''}`}>
                    <Image
                      src={badge.iconUrl}
                      alt={badge.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 mx-auto mb-2 transform transition-transform duration-300"
                    />
                    {badge.isNew && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        Nowa!
                      </div>
                    )}
                  </div>
                  {/* Hover tooltip z poziomami */}
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95 transition-all duration-200 absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl p-3 w-56">
                    <div className="text-sm font-semibold text-gray-800">Szczegóły odznaki</div>
                    <div className="mt-1 text-xs text-gray-600">Aktualny poziom: <span className="font-semibold text-[#4067EC]">{badge.name.split(' ').pop()}</span></div>
                    <div className="mt-1 text-xs text-gray-600">Następny poziom: <span className="font-semibold">5</span> (wymagania w opisie)</div>
                    <div className="mt-1 text-xs text-gray-600">Maksymalny poziom: <span className="font-semibold">5</span></div>
                  </div>
                </div>
                <h4 className="font-medium mt-2">{badge.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(badge.earnedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <p>Nie masz jeszcze żadnych odznak</p>
            <p className="text-sm mt-2">Kontynuuj naukę, aby zdobyć swoje pierwsze odznaczenia!</p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
              <div className="p-4 bg-gray-50 rounded-lg opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium">Maratończyk</h5>
                    <p className="text-xs text-gray-500">10h w aplikacji</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium">Sprinter</h5>
                    <p className="text-xs text-gray-500">60 min w jeden dzień</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium">Kolekcjoner</h5>
                    <p className="text-xs text-gray-500">5 ukończonych kursów</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-medium">Codzienniak</h5>
                    <p className="text-xs text-gray-500">7 dni z rzędu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 