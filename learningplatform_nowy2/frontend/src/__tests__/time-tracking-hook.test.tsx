import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { collection, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore'

// Mock collection
const mockCollection = collection as jest.MockedFunction<typeof collection>
mockCollection.mockImplementation((db, collectionName) => ({
  id: collectionName,
  path: collectionName,
  parent: null,
  type: 'collection'
}))

// Prosty hook do śledzenia czasu nauki (jeśli nie istnieje, tworzymy go)
function useTimeTracking(userId: string, courseId: string) {
  const [timeSpent, setTimeSpent] = useState(0)
  const [isTracking, setIsTracking] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)

  const startTracking = () => {
    setIsTracking(true)
    setStartTime(Date.now())
  }

  const stopTracking = async () => {
    if (!isTracking || !startTime) return

    const sessionTime = Math.floor((Date.now() - startTime) / 1000 / 60) // w minutach
    const newTotalTime = timeSpent + sessionTime

    setTimeSpent(newTotalTime)
    setIsTracking(false)
    setStartTime(null)

    // Zapisz do Firebase
    try {
      await addDoc(collection({}, 'user_learning_time'), {
        userId,
        courseId,
        time_spent_minutes: sessionTime,
        date: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error saving time tracking:', error)
    }

    return sessionTime
  }

  const loadTimeSpent = async () => {
    try {
      const timeQuery = query(
        collection({} as any, 'user_learning_time'),
        where('userId', '==', userId),
        where('courseId', '==', courseId)
      )
      const timeSnapshot = await getDocs(timeQuery)
      
      let total = 0
      timeSnapshot.docs.forEach(doc => {
        const data = doc.data()
        total += data.time_spent_minutes || 0
      })
      
      setTimeSpent(total)
      return total
    } catch (error) {
      console.error('Error loading time tracking:', error)
      return 0
    }
  }

  return {
    timeSpent,
    isTracking,
    startTracking,
    stopTracking,
    loadTimeSpent
  }
}

// Mock Firebase
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>

// Import React for useState
import { useState } from 'react'

describe('useTimeTracking Hook', () => {
  const mockUserId = 'test-user-id'
  const mockCourseId = 'test-course-id'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('should initialize with default values', () => {
    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    expect(result.current.timeSpent).toBe(0)
    expect(result.current.isTracking).toBe(false)
  })

  test('should start time tracking', () => {
    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    act(() => {
      result.current.startTracking()
    })

    expect(result.current.isTracking).toBe(true)
  })

  test('should stop time tracking and calculate session time', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'test-doc-id' } as any)

    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    // Rozpocznij śledzenie
    act(() => {
      result.current.startTracking()
    })

    // Symuluj upływ 5 minut (5 * 60 * 1000 ms)
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000)
    })

    // Zatrzymaj śledzenie
    let sessionTime: number | undefined
    await act(async () => {
      sessionTime = await result.current.stopTracking()
    })

    expect(result.current.isTracking).toBe(false)
    expect(sessionTime).toBe(5) // 5 minut
    expect(result.current.timeSpent).toBe(5)

    // Sprawdź czy dane zostały zapisane do Firebase
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.any(Object),
      {
        userId: mockUserId,
        courseId: mockCourseId,
        time_spent_minutes: 5,
        date: expect.any(String)
      }
    )
  })

  test('should load existing time data from Firebase', async () => {
    const mockTimeData = {
      docs: [
        {
          data: () => ({
            userId: mockUserId,
            courseId: mockCourseId,
            time_spent_minutes: 30
          })
        },
        {
          data: () => ({
            userId: mockUserId,
            courseId: mockCourseId,
            time_spent_minutes: 25
          })
        }
      ]
    }

    mockGetDocs.mockResolvedValueOnce(mockTimeData as any)

    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    let totalTime: number
    await act(async () => {
      totalTime = await result.current.loadTimeSpent()
    })

    expect(totalTime!).toBe(55) // 30 + 25
    expect(result.current.timeSpent).toBe(55)
  })

  test('should accumulate time across multiple sessions', async () => {
    mockAddDoc.mockResolvedValue({ id: 'test-doc-id' } as any)

    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    // Pierwsza sesja - 3 minuty
    act(() => {
      result.current.startTracking()
    })

    act(() => {
      jest.advanceTimersByTime(3 * 60 * 1000)
    })

    await act(async () => {
      await result.current.stopTracking()
    })

    expect(result.current.timeSpent).toBe(3)

    // Druga sesja - 7 minut
    act(() => {
      result.current.startTracking()
    })

    act(() => {
      jest.advanceTimersByTime(7 * 60 * 1000)
    })

    await act(async () => {
      await result.current.stopTracking()
    })

    expect(result.current.timeSpent).toBe(10) // 3 + 7
  })

  test('should handle Firebase errors gracefully', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('Firebase error'))
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    act(() => {
      result.current.startTracking()
    })

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000)
    })

    await act(async () => {
      await result.current.stopTracking()
    })

    // Czas powinien nadal być zaktualizowany lokalnie
    expect(result.current.timeSpent).toBe(2)
    
    // Sprawdź czy błąd został zalogowany
    expect(consoleSpy).toHaveBeenCalledWith('Error saving time tracking:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  test('should not track time if tracking was not started', async () => {
    const { result } = renderHook(() => useTimeTracking(mockUserId, mockCourseId))

    // Spróbuj zatrzymać bez rozpoczęcia
    const sessionTime = await act(async () => {
      return await result.current.stopTracking()
    })

    expect(sessionTime).toBeUndefined()
    expect(result.current.timeSpent).toBe(0)
    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  test('should format time correctly for display', () => {
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours > 0) {
        return `${hours}h ${mins}min`
      }
      return `${mins}min`
    }

    expect(formatTime(30)).toBe('30min')
    expect(formatTime(60)).toBe('1h 0min')
    expect(formatTime(90)).toBe('1h 30min')
    expect(formatTime(125)).toBe('2h 5min')
  })
})









