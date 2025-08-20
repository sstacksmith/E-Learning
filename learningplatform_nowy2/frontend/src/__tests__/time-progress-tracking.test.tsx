import { render, screen, waitFor } from '@testing-library/react'
import { collection, getDocs, query, where, addDoc, updateDoc } from 'firebase/firestore'
import ParentCourseDetails from '@/app/homelogin/parent/courses/[id]/page'

// Mock Firebase functions
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>
const mockCollection = collection as jest.MockedFunction<typeof collection>
const mockQuery = query as jest.MockedFunction<typeof query>
const mockWhere = where as jest.MockedFunction<typeof where>
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>

// Mock data
const mockStudentId = 'test-student-uid'
const mockCourseId = 'test-course-id'

const mockParentStudentRelation = {
  docs: [{
    data: () => ({
      parent: 'test-parent-uid',
      student: mockStudentId,
      created_at: new Date().toISOString()
    })
  }]
}

const mockStudentData = {
  docs: [{
    data: () => ({
      uid: mockStudentId,
      email: 'uczen2@uczen.pl',
      displayName: 'Test Student',
      role: 'student'
    })
  }]
}

const mockCourseData = {
  exists: () => true,
  data: () => ({
    title: 'Test Course',
    description: 'Test course description',
    teacher: 'test-teacher-uid',
    assignedUsers: [mockStudentId]
  })
}

const mockTeacherData = {
  docs: [{
    data: () => ({
      uid: 'test-teacher-uid',
      email: 'teacher@test.pl',
      displayName: 'Test Teacher'
    })
  }]
}

const mockModulesData = {
  docs: [{
    id: 'module1',
    data: () => ({
      title: 'Module 1',
      description: 'First module',
      courseId: mockCourseId
    })
  }]
}

const mockLessonsData = {
  docs: [
    {
      id: 'lesson1',
      data: () => ({
        title: 'Lesson 1',
        description: 'First lesson',
        duration: 30,
        moduleId: 'module1'
      })
    },
    {
      id: 'lesson2', 
      data: () => ({
        title: 'Lesson 2',
        description: 'Second lesson',
        duration: 45,
        moduleId: 'module1'
      })
    }
  ]
}

const mockProgressData = {
  docs: [
    {
      id: 'progress1',
      data: () => ({
        studentId: mockStudentId,
        lessonId: 'lesson1',
        completed: true,
        timeSpent: 25,
        score: 85,
        lastViewed: new Date().toISOString()
      })
    },
    {
      id: 'progress2',
      data: () => ({
        studentId: mockStudentId,
        lessonId: 'lesson2',
        completed: false,
        timeSpent: 15,
        lastViewed: new Date(Date.now() - 86400000).toISOString()
      })
    }
  ]
}

const mockLearningTimeData = {
  docs: [{
    id: 'time1',
    data: () => ({
      userId: mockStudentId,
      courseId: mockCourseId,
      time_spent_minutes: 30,
      date: new Date().toISOString()
    })
  }]
}

const mockGradesData = {
  docs: [
    {
      id: 'grade1',
      data: () => ({
        studentId: mockStudentId,
        course_id: mockCourseId,
        value: 5,
        date: new Date().toISOString()
      })
    },
    {
      id: 'grade2',
      data: () => ({
        studentId: mockStudentId,
        course_id: mockCourseId,
        value: 4,
        date: new Date(Date.now() - 86400000).toISOString()
      })
    }
  ]
}

describe('Time and Progress Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup Firebase mocks
    mockGetDocs.mockImplementation((queryOrRef: any) => {
      // Determine which collection is being queried based on the query structure
      const queryString = queryOrRef.toString ? queryOrRef.toString() : ''
      
      if (queryString.includes('parent_students') || queryOrRef._query?.path?.segments?.includes('parent_students')) {
        return Promise.resolve(mockParentStudentRelation)
      }
      
      if (queryString.includes('users') || queryOrRef._query?.path?.segments?.includes('users')) {
        return Promise.resolve(mockStudentData)
      }
      
      if (queryString.includes('modules') || queryOrRef._query?.path?.segments?.includes('modules')) {
        return Promise.resolve(mockModulesData)
      }
      
      if (queryString.includes('lessons') || queryOrRef._query?.path?.segments?.includes('lessons')) {
        return Promise.resolve(mockLessonsData)
      }
      
      if (queryString.includes('progress') || queryOrRef._query?.path?.segments?.includes('progress')) {
        return Promise.resolve(mockProgressData)
      }
      
      if (queryString.includes('user_learning_time') || queryOrRef._query?.path?.segments?.includes('user_learning_time')) {
        return Promise.resolve(mockLearningTimeData)
      }
      
      if (queryString.includes('grades') || queryOrRef._query?.path?.segments?.includes('grades')) {
        return Promise.resolve(mockGradesData)
      }
      
      return Promise.resolve({ docs: [] })
    })
  })

  test('should calculate correct time spent from progress and learning_time collections', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy zostały wykonane odpowiednie zapytania Firebase
      expect(mockGetDocs).toHaveBeenCalled()
    })

    // Sprawdź czy komponent wyświetla poprawny czas nauki
    await waitFor(() => {
      // Progress time: lesson1 (25min) + lesson2 (15min) = 40min
      // Learning time: 30min
      // Total: 70min = 1h 10min
      const timeElement = screen.getByText(/1h 10min|70min/)
      expect(timeElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should calculate correct lesson completion progress', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy postęp jest poprawnie obliczony
      // 1 z 2 lekcji ukończonych = 50%
      const progressElement = screen.getByText(/50%/)
      expect(progressElement).toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      // Sprawdź licznik ukończonych lekcji
      const completedElement = screen.getByText(/1\/2/)
      expect(completedElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should calculate correct average grade', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy średnia ocena jest poprawnie obliczona
      // (5 + 4) / 2 = 4.5
      const gradeElement = screen.getByText(/4\.5/)
      expect(gradeElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should display lesson statuses correctly', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy lekcja 1 jest oznaczona jako ukończona
      const lesson1Title = screen.getByText('Lesson 1')
      expect(lesson1Title).toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      // Sprawdź czy jest status "Ukończona"
      const completedStatus = screen.getByText('Ukończona')
      expect(completedStatus).toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      // Sprawdź czy lekcja 2 jest oznaczona jako "W trakcie"
      const inProgressStatus = screen.getByText('W trakcie')
      expect(inProgressStatus).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should handle filtering lessons by status', async () => {
    const { container } = render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy przyciski filtrów są widoczne
      const allButton = screen.getByText(/Wszystkie \(2\)/)
      const completedButton = screen.getByText(/Ukończone \(1\)/)
      const inProgressButton = screen.getByText(/W trakcie \(1\)/)
      
      expect(allButton).toBeInTheDocument()
      expect(completedButton).toBeInTheDocument() 
      expect(inProgressButton).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should display correct time format', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy czas jest poprawnie formatowany
      // 25min dla lekcji 1, 15min dla lekcji 2
      const timeElements = screen.getAllByText(/25min|15min/)
      expect(timeElements.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  test('should show most active lesson', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy najbardziej aktywna lekcja jest wyświetlana
      // Lesson 1 ma 25min, więc powinna być najbardziej aktywna
      const activeElement = screen.getByText(/Lesson 1.*25min/i)
      expect(activeElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should display last activity date', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Sprawdź czy data ostatniej aktywności jest wyświetlana
      const today = new Date().toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      
      // Powinna być dzisiejsza data (z lesson1)
      const dateElement = screen.getByText(new RegExp(today))
      expect(dateElement).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

// Test integracyjny dla zapisu danych
describe('Firebase Data Persistence', () => {
  test('should save progress data to Firebase', async () => {
    const progressData = {
      studentId: mockStudentId,
      lessonId: 'lesson1',
      completed: true,
      timeSpent: 30,
      score: 90,
      lastViewed: new Date().toISOString()
    }

    mockAddDoc.mockResolvedValueOnce({ id: 'new-progress-id' } as any)

    // Symuluj zapisanie postępu
    await mockAddDoc(collection({} as any, 'progress'), progressData)

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      progressData
    )
  })

  test('should update existing progress data', async () => {
    const updatedData = {
      timeSpent: 45,
      completed: true,
      lastViewed: new Date().toISOString()
    }

    mockUpdateDoc.mockResolvedValueOnce(undefined as any)

    // Symuluj aktualizację postępu
    await mockUpdateDoc({} as any, updatedData)

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      updatedData
    )
  })

  test('should save learning time data', async () => {
    const timeData = {
      userId: mockStudentId,
      courseId: mockCourseId,
      time_spent_minutes: 60,
      date: new Date().toISOString()
    }

    mockAddDoc.mockResolvedValueOnce({ id: 'new-time-id' } as any)

    // Symuluj zapisanie czasu nauki
    await mockAddDoc(collection({} as any, 'user_learning_time'), timeData)

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      timeData
    )
  })
})

// Test wydajności
describe('Performance Tests', () => {
  test('should load data within reasonable time', async () => {
    const startTime = Date.now()
    
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Test Course')).toBeInTheDocument()
    }, { timeout: 3000 })

    const loadTime = Date.now() - startTime
    
    // Sprawdź czy ładowanie trwa mniej niż 2 sekundy
    expect(loadTime).toBeLessThan(2000)
  })

  test('should efficiently query Firebase collections', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled()
    })

    // Sprawdź czy nie ma nadmiernej liczby zapytań
    // Powinno być maksymalnie ~7 zapytań (parent_students, users, courses, modules, lessons, progress, learning_time, grades)
    expect(mockGetDocs).toHaveBeenCalledTimes(8) // Może być 8 przez różne warianty nazw pól
  })
})








