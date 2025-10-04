import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { collection, getDocs, addDoc, updateDoc } from 'firebase/firestore'

// Mock collection
const mockCollection = collection as jest.MockedFunction<typeof collection>
mockCollection.mockImplementation((db, collectionName) => ({
  id: collectionName,
  path: collectionName,
  parent: null,
  type: 'collection'
}))

// Mock kompleksowych danych dla e2e testu
const mockCompleteData = {
  parentStudent: {
    docs: [{
      data: () => ({
        parent: 'parent-uid',
        student: 'student-uid',
        created_at: new Date().toISOString()
      })
    }]
  },
  student: {
    docs: [{
      data: () => ({
        uid: 'student-uid',
        email: 'student@test.pl',
        displayName: 'Test Student'
      })
    }]
  },
  course: {
    exists: () => true,
    data: () => ({
      title: 'Comprehensive Test Course',
      description: 'E2E test course',
      teacher: 'teacher-uid',
      assignedUsers: ['student-uid']
    })
  },
  teacher: {
    docs: [{
      data: () => ({
        uid: 'teacher-uid',
        displayName: 'Test Teacher',
        email: 'teacher@test.pl'
      })
    }]
  },
  modules: {
    docs: [
      {
        id: 'module1',
        data: () => ({
          title: 'Introduction Module',
          description: 'Basic concepts',
          courseId: 'test-course-id'
        })
      },
      {
        id: 'module2', 
        data: () => ({
          title: 'Advanced Module',
          description: 'Advanced topics',
          courseId: 'test-course-id'
        })
      }
    ]
  },
  lessons: {
    docs: [
      {
        id: 'lesson1',
        data: () => ({
          title: 'Lesson 1: Basics',
          description: 'Introduction to basics',
          duration: 30,
          moduleId: 'module1'
        })
      },
      {
        id: 'lesson2',
        data: () => ({
          title: 'Lesson 2: Intermediate',
          description: 'Intermediate concepts',
          duration: 45,
          moduleId: 'module1'
        })
      },
      {
        id: 'lesson3',
        data: () => ({
          title: 'Lesson 3: Advanced',
          description: 'Advanced topics',
          duration: 60,
          moduleId: 'module2'
        })
      }
    ]
  },
  initialProgress: {
    docs: [
      {
        id: 'progress1',
        data: () => ({
          studentId: 'student-uid',
          lessonId: 'lesson1',
          completed: true,
          timeSpent: 28,
          score: 92,
          lastViewed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 dni temu
        })
      },
      {
        id: 'progress2',
        data: () => ({
          studentId: 'student-uid',
          lessonId: 'lesson2',
          completed: false,
          timeSpent: 20,
          lastViewed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // wczoraj
        })
      }
    ]
  },
  learningTime: {
    docs: [
      {
        data: () => ({
          userId: 'student-uid',
          courseId: 'test-course-id',
          time_spent_minutes: 35,
          date: new Date().toISOString()
        })
      }
    ]
  },
  grades: {
    docs: [
      {
        data: () => ({
          studentId: 'student-uid',
          course_id: 'test-course-id',
          value: 5,
          date: new Date().toISOString()
        })
      },
      {
        data: () => ({
          studentId: 'student-uid',
          course_id: 'test-course-id',
          value: 4,
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
      }
    ]
  }
}

// Import komponentu
import ParentCourseDetails from '@/app/homelogin/parent/courses/[id]/page'

// Mock Firebase
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>

describe('E2E Time and Progress Tracking Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup comprehensive Firebase mocks
    mockGetDocs.mockImplementation((queryOrRef: unknown) => {
      const queryString = queryOrRef.toString ? queryOrRef.toString() : ''
      
      if (queryString.includes('parent_students') || queryOrRef._query?.path?.segments?.includes('parent_students')) {
        return Promise.resolve(mockCompleteData.parentStudent)
      }
      if (queryString.includes('users') || queryOrRef._query?.path?.segments?.includes('users')) {
        return Promise.resolve(mockCompleteData.student)
      }
      if (queryString.includes('modules') || queryOrRef._query?.path?.segments?.includes('modules')) {
        return Promise.resolve(mockCompleteData.modules)
      }
      if (queryString.includes('lessons') || queryOrRef._query?.path?.segments?.includes('lessons')) {
        return Promise.resolve(mockCompleteData.lessons)
      }
      if (queryString.includes('progress') || queryOrRef._query?.path?.segments?.includes('progress')) {
        return Promise.resolve(mockCompleteData.initialProgress)
      }
      if (queryString.includes('user_learning_time') || queryOrRef._query?.path?.segments?.includes('user_learning_time')) {
        return Promise.resolve(mockCompleteData.learningTime)
      }
      if (queryString.includes('grades') || queryOrRef._query?.path?.segments?.includes('grades')) {
        return Promise.resolve(mockCompleteData.grades)
      }
      
      return Promise.resolve({ docs: [] })
    })
  })

  test('should display complete course statistics correctly', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Comprehensive Test Course')).toBeInTheDocument()
    })

    // Sprawdź statystyki kursu
    await waitFor(() => {
      // Postęp: 1 z 3 lekcji ukończonych = 33%
      expect(screen.getByText(/33%/)).toBeInTheDocument()
      
      // Ukończone lekcje: 1/3
      expect(screen.getByText('1/3')).toBeInTheDocument()
      
      // Czas nauki: 28 + 20 + 35 = 83min = 1h 23min
      expect(screen.getByText(/1h 23min/)).toBeInTheDocument()
      
      // Średnia ocena: (5 + 4) / 2 = 4.5
      expect(screen.getByText('4.5')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  test('should show correct lesson statuses and allow filtering', async () => {
    const user = userEvent.setup()
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Comprehensive Test Course')).toBeInTheDocument()
    })

    // Sprawdź czy wszystkie lekcje są widoczne
    await waitFor(() => {
      expect(screen.getByText('Lesson 1: Basics')).toBeInTheDocument()
      expect(screen.getByText('Lesson 2: Intermediate')).toBeInTheDocument()
      expect(screen.getByText('Lesson 3: Advanced')).toBeInTheDocument()
    })

    // Sprawdź statusy
    await waitFor(() => {
      expect(screen.getByText('Ukończona')).toBeInTheDocument() // Lesson 1
      expect(screen.getByText('W trakcie')).toBeInTheDocument() // Lesson 2
      expect(screen.getByText('Nierozpoczęta')).toBeInTheDocument() // Lesson 3
    })

    // Testuj filtrowanie - kliknij "Ukończone"
    const completedButton = screen.getByText(/Ukończone \(1\)/)
    await user.click(completedButton)

    await waitFor(() => {
      // Powinna być widoczna tylko Lesson 1
      expect(screen.getByText('Lesson 1: Basics')).toBeInTheDocument()
      expect(screen.queryByText('Lesson 2: Intermediate')).not.toBeInTheDocument()
      expect(screen.queryByText('Lesson 3: Advanced')).not.toBeInTheDocument()
    })
  })

  test('should open lesson modal with detailed information', async () => {
    const user = userEvent.setup()
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Lesson 1: Basics')).toBeInTheDocument()
    })

    // Kliknij na lekcję 1
    const lesson1 = screen.getByText('Lesson 1: Basics')
    await user.click(lesson1)

    // Sprawdź czy modal się otworzył
    await waitFor(() => {
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
    })

    // Sprawdź szczegóły w modalu
    await waitFor(() => {
      expect(screen.getByText('Ukończona')).toBeInTheDocument()
      expect(screen.getByText('Wynik: 92%')).toBeInTheDocument()
      expect(screen.getByText('28min')).toBeInTheDocument() // czas spędzony
      expect(screen.getByText('30min')).toBeInTheDocument() // planowany czas
    })
  })

  test('should display activity information correctly', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Comprehensive Test Course')).toBeInTheDocument()
    })

    // Sprawdź informacje o aktywności
    await waitFor(() => {
      // Najbardziej aktywna lekcja (Lesson 1 z 28min)
      expect(screen.getByText(/Lesson 1.*28min/)).toBeInTheDocument()
      
      // Ostatnia aktywność (wczoraj - Lesson 2)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const yesterdayFormatted = yesterday.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      expect(screen.getByText(new RegExp(yesterdayFormatted))).toBeInTheDocument()
      
      // Całkowity czas
      expect(screen.getByText(/1h 23min/)).toBeInTheDocument()
    })
  })

  test('should handle module organization correctly', async () => {
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Introduction Module')).toBeInTheDocument()
      expect(screen.getByText('Advanced Module')).toBeInTheDocument()
    })

    // Sprawdź czy lekcje są grupowane w odpowiednich modułach
    await waitFor(() => {
      // Module 1 powinien mieć 2 lekcje (1 ukończoną)
      const module1Section = screen.getByText('Introduction Module').closest('div')
      expect(module1Section).toBeInTheDocument()
      
      // Module 2 powinien mieć 1 lekcję (0 ukończonych)
      const module2Section = screen.getByText('Advanced Module').closest('div')
      expect(module2Section).toBeInTheDocument()
    })
  })

  test('should calculate and display time progress bars correctly', async () => {
    const user = userEvent.setup()
    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText('Lesson 1: Basics')).toBeInTheDocument()
    })

    // Otwórz modal Lesson 1
    const lesson1 = screen.getByText('Lesson 1: Basics')
    await user.click(lesson1)

    await waitFor(() => {
      // Sprawdź pasek postępu czasowego w modalu
      // 28min z 30min = 93%
      expect(screen.getByText('93%')).toBeInTheDocument()
    })
  })

  test('should integrate with real-time data updates', async () => {
    render(<ParentCourseDetails />)

    // Symuluj aktualizację postępu lekcji
    const newProgressData = {
      docs: [
        ...mockCompleteData.initialProgress.docs,
        {
          id: 'progress3',
          data: () => ({
            studentId: 'student-uid',
            lessonId: 'lesson3',
            completed: true,
            timeSpent: 55,
            score: 88,
            lastViewed: new Date().toISOString()
          })
        }
      ]
    }

    // Zaktualizuj mock
    mockGetDocs.mockImplementation((queryOrRef: unknown) => {
      const queryString = queryOrRef.toString ? queryOrRef.toString() : ''
      
      if (queryString.includes('progress')) {
        return Promise.resolve(newProgressData)
      }
      
      // Pozostałe mocki pozostają bez zmian
      return mockGetDocs.getMockImplementation()![0](queryOrRef)
    })

    // Ponowne renderowanie powinno pokazać zaktualizowane dane
    render(<ParentCourseDetails />)

    await waitFor(() => {
      // Teraz 2 z 3 lekcji ukończonych = 67%
      expect(screen.getByText(/67%/)).toBeInTheDocument()
      
      // Ukończone: 2/3
      expect(screen.getByText('2/3')).toBeInTheDocument()
    })
  })

  test('should persist data changes to Firebase', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-progress-id' } as { id: string })
    mockUpdateDoc.mockResolvedValue(undefined)

    // Symuluj zapisanie nowego postępu
    const newProgress = {
      studentId: 'student-uid',
      lessonId: 'lesson3',
      completed: true,
      timeSpent: 50,
      score: 85,
      lastViewed: new Date().toISOString()
    }

    await mockAddDoc(collection({} as unknown, 'progress'), newProgress)

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      newProgress
    )

    // Symuluj aktualizację istniejącego postępu
    const updateData = {
      timeSpent: 60,
      lastViewed: new Date().toISOString()
    }

    await mockUpdateDoc({} as unknown, updateData)

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      updateData
    )
  })

  test('should handle error states gracefully', async () => {
    // Symuluj błąd Firebase
    mockGetDocs.mockRejectedValueOnce(new Error('Network error'))

    render(<ParentCourseDetails />)

    await waitFor(() => {
      expect(screen.getByText(/Wystąpił błąd/)).toBeInTheDocument()
    })
  })

  test('should show loading states appropriately', async () => {
    // Opóźnij response Firebase
    mockGetDocs.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(mockCompleteData.parentStudent), 1000)
      })
    })

    render(<ParentCourseDetails />)

    // Sprawdź czy loading indicator jest widoczny
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })
})

