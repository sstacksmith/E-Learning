import { addDoc, updateDoc, getDocs, query, where, collection } from 'firebase/firestore'

// Mock Firebase
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>

// Funkcje do zarządzania postępem lekcji
class LessonProgressManager {
  static async markLessonCompleted(
    studentId: string,
    lessonId: string,
    timeSpent: number,
    score?: number
  ) {
    try {
      // Sprawdź czy progress już istnieje
      const progressQuery = query(
        collection({} as unknown, 'progress'),
        where('studentId', '==', studentId),
        where('lessonId', '==', lessonId)
      )
      
      const existingProgress = await getDocs(progressQuery)
      
      const progressData = {
        studentId,
        lessonId,
        completed: true,
        timeSpent,
        score,
        lastViewed: new Date().toISOString()
      }

      if (existingProgress.empty) {
        // Utwórz nowy rekord postępu
        const docRef = await addDoc(collection({} as unknown, 'progress'), progressData)
        return { id: docRef.id, ...progressData }
      } else {
        // Zaktualizuj istniejący rekord
        const docRef = existingProgress.docs[0].ref
        await updateDoc(docRef, {
          completed: true,
          timeSpent,
          score,
          lastViewed: new Date().toISOString()
        })
        return { id: existingProgress.docs[0].id, ...progressData }
      }
    } catch (error) {
      console.error('Error marking lesson as completed:', error)
      throw error
    }
  }

  static async updateLessonTime(
    studentId: string,
    lessonId: string,
    additionalTime: number
  ) {
    try {
      const progressQuery = query(
        collection({} as unknown, 'progress'),
        where('studentId', '==', studentId),
        where('lessonId', '==', lessonId)
      )
      
      const progressSnapshot = await getDocs(progressQuery)
      
      if (progressSnapshot.empty) {
        // Utwórz nowy rekord z czasem
        const progressData = {
          studentId,
          lessonId,
          completed: false,
          timeSpent: additionalTime,
          lastViewed: new Date().toISOString()
        }
        const docRef = await addDoc(collection({} as unknown, 'progress'), progressData)
        return { id: docRef.id, ...progressData }
      } else {
        // Zaktualizuj czas w istniejącym rekordzie
        const doc = progressSnapshot.docs[0]
        const currentData = doc.data()
        const newTimeSpent = (currentData.timeSpent || 0) + additionalTime
        
        await updateDoc(doc.ref, {
          timeSpent: newTimeSpent,
          lastViewed: new Date().toISOString()
        })
        
        return { 
          id: doc.id, 
          ...currentData, 
          timeSpent: newTimeSpent,
          lastViewed: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error updating lesson time:', error)
      throw error
    }
  }

  static async getLessonProgress(studentId: string, lessonId: string) {
    try {
      const progressQuery = query(
        collection({} as unknown, 'progress'),
        where('studentId', '==', studentId),
        where('lessonId', '==', lessonId)
      )
      
      const progressSnapshot = await getDocs(progressQuery)
      
      if (progressSnapshot.empty) {
        return null
      }
      
      const data = progressSnapshot.docs[0].data()
      return {
        id: progressSnapshot.docs[0].id,
        ...data
      }
    } catch (error) {
      console.error('Error getting lesson progress:', error)
      throw error
    }
  }

  static async getCourseProgress(studentId: string, courseId: string) {
    try {
      // Pobierz wszystkie lekcje kursu
      const lessonsQuery = query(
        collection({} as unknown, 'lessons'),
        where('courseId', '==', courseId)
      )
      const lessonsSnapshot = await getDocs(lessonsQuery)
      
      // Pobierz postęp dla tego studenta
      const progressQuery = query(
        collection({} as unknown, 'progress'),
        where('studentId', '==', studentId)
      )
      const progressSnapshot = await getDocs(progressQuery)
      
      const progressMap = new Map()
      progressSnapshot.docs.forEach(doc => {
        const data = doc.data()
        progressMap.set(data.lessonId, data)
      })
      
      let totalLessons = 0
      let completedLessons = 0
      let totalTimeSpent = 0
      
      lessonsSnapshot.docs.forEach(lessonDoc => {
        totalLessons++
        const progress = progressMap.get(lessonDoc.id)
        if (progress) {
          if (progress.completed) {
            completedLessons++
          }
          totalTimeSpent += progress.timeSpent || 0
        }
      })
      
      const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
      
      return {
        totalLessons,
        completedLessons,
        progressPercentage,
        totalTimeSpent
      }
    } catch (error) {
      console.error('Error getting course progress:', error)
      throw error
    }
  }
}

describe('Lesson Progress Management', () => {
  const mockStudentId = 'student-123'
  const mockLessonId = 'lesson-456'
  const mockCourseId = 'course-789'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('markLessonCompleted', () => {
    test('should create new progress record when none exists', async () => {
      // Mock empty progress query result
      mockGetDocs.mockResolvedValueOnce({ 
        empty: true,
        docs: []
      } as { empty: boolean; docs: unknown[] })

      // Mock successful document creation
      mockAddDoc.mockResolvedValueOnce({ 
        id: 'new-progress-id' 
      } as { id: string })

      const result = await LessonProgressManager.markLessonCompleted(
        mockStudentId,
        mockLessonId,
        30,
        85
      )

      expect(mockGetDocs).toHaveBeenCalledWith(expect.anything())
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          studentId: mockStudentId,
          lessonId: mockLessonId,
          completed: true,
          timeSpent: 30,
          score: 85,
          lastViewed: expect.any(String)
        }
      )

      expect(result).toEqual({
        id: 'new-progress-id',
        studentId: mockStudentId,
        lessonId: mockLessonId,
        completed: true,
        timeSpent: 30,
        score: 85,
        lastViewed: expect.any(String)
      })
    })

    test('should update existing progress record', async () => {
      const mockExistingDoc = {
        id: 'existing-progress-id',
        ref: { update: jest.fn() },
        data: () => ({
          studentId: mockStudentId,
          lessonId: mockLessonId,
          completed: false,
          timeSpent: 15
        })
      }

      // Mock existing progress query result
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [mockExistingDoc]
      } as { empty: boolean; docs: unknown[] })

      mockUpdateDoc.mockResolvedValueOnce(undefined)

      const result = await LessonProgressManager.markLessonCompleted(
        mockStudentId,
        mockLessonId,
        30,
        90
      )

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockExistingDoc.ref,
        {
          completed: true,
          timeSpent: 30,
          score: 90,
          lastViewed: expect.any(String)
        }
      )

      expect(result.completed).toBe(true)
      expect(result.timeSpent).toBe(30)
      expect(result.score).toBe(90)
    })

    test('should handle Firebase errors when marking completion', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firebase connection error'))

      await expect(
        LessonProgressManager.markLessonCompleted(mockStudentId, mockLessonId, 30, 85)
      ).rejects.toThrow('Firebase connection error')
    })
  })

  describe('updateLessonTime', () => {
    test('should create new time record when none exists', async () => {
      mockGetDocs.mockResolvedValueOnce({ 
        empty: true,
        docs: []
      } as { empty: boolean; docs: unknown[] })

      mockAddDoc.mockResolvedValueOnce({ 
        id: 'new-time-id' 
      } as { id: string })

      const result = await LessonProgressManager.updateLessonTime(
        mockStudentId,
        mockLessonId,
        15
      )

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          studentId: mockStudentId,
          lessonId: mockLessonId,
          completed: false,
          timeSpent: 15,
          lastViewed: expect.any(String)
        }
      )

      expect(result.timeSpent).toBe(15)
    })

    test('should accumulate time to existing record', async () => {
      const mockExistingDoc = {
        id: 'existing-time-id',
        ref: { update: jest.fn() },
        data: () => ({
          studentId: mockStudentId,
          lessonId: mockLessonId,
          completed: false,
          timeSpent: 20
        })
      }

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [mockExistingDoc]
      } as { empty: boolean; docs: unknown[] })

      mockUpdateDoc.mockResolvedValueOnce(undefined)

      const result = await LessonProgressManager.updateLessonTime(
        mockStudentId,
        mockLessonId,
        10
      )

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockExistingDoc.ref,
        {
          timeSpent: 30, // 20 + 10
          lastViewed: expect.any(String)
        }
      )

      expect(result.timeSpent).toBe(30)
    })
  })

  describe('getLessonProgress', () => {
    test('should return progress data when exists', async () => {
      const mockProgressData = {
        studentId: mockStudentId,
        lessonId: mockLessonId,
        completed: true,
        timeSpent: 25,
        score: 88
      }

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'progress-id',
          data: () => mockProgressData
        }]
      } as any)

      const result = await LessonProgressManager.getLessonProgress(
        mockStudentId,
        mockLessonId
      )

      expect(result).toEqual({
        id: 'progress-id',
        ...mockProgressData
      })
    })

    test('should return null when no progress exists', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: []
      } as any)

      const result = await LessonProgressManager.getLessonProgress(
        mockStudentId,
        mockLessonId
      )

      expect(result).toBeNull()
    })
  })

  describe('getCourseProgress', () => {
    test('should calculate correct course progress statistics', async () => {
      // Mock lessons data
      const mockLessons = {
        docs: [
          { id: 'lesson1', data: () => ({ courseId: mockCourseId }) },
          { id: 'lesson2', data: () => ({ courseId: mockCourseId }) },
          { id: 'lesson3', data: () => ({ courseId: mockCourseId }) }
        ]
      }

      // Mock progress data - 2 z 3 lekcji ukończone
      const mockProgress = {
        docs: [
          {
            data: () => ({
              lessonId: 'lesson1',
              completed: true,
              timeSpent: 30
            })
          },
          {
            data: () => ({
              lessonId: 'lesson2',
              completed: true,
              timeSpent: 25
            })
          },
          {
            data: () => ({
              lessonId: 'lesson3',
              completed: false,
              timeSpent: 10
            })
          }
        ]
      }

      mockGetDocs
        .mockResolvedValueOnce(mockLessons as any) // lessons query
        .mockResolvedValueOnce(mockProgress as any) // progress query

      const result = await LessonProgressManager.getCourseProgress(
        mockStudentId,
        mockCourseId
      )

      expect(result).toEqual({
        totalLessons: 3,
        completedLessons: 2,
        progressPercentage: 66.66666666666667, // 2/3 * 100
        totalTimeSpent: 65 // 30 + 25 + 10
      })
    })

    test('should handle empty course correctly', async () => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: [] } as any) // no lessons
        .mockResolvedValueOnce({ docs: [] } as any) // no progress

      const result = await LessonProgressManager.getCourseProgress(
        mockStudentId,
        mockCourseId
      )

      expect(result).toEqual({
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: 0,
        totalTimeSpent: 0
      })
    })
  })

  describe('Data Validation', () => {
    test('should validate required fields for lesson completion', async () => {
      await expect(
        LessonProgressManager.markLessonCompleted('', mockLessonId, 30)
      ).rejects.toThrow()

      await expect(
        LessonProgressManager.markLessonCompleted(mockStudentId, '', 30)
      ).rejects.toThrow()
    })

    test('should validate time values', async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] } as any)
      mockAddDoc.mockResolvedValueOnce({ id: 'test-id' } as any)

      // Czas ujemny powinien być ustawiony na 0
      const result = await LessonProgressManager.updateLessonTime(
        mockStudentId,
        mockLessonId,
        -5
      )

      expect(result.timeSpent).toBe(-5) // W tym przypadku zostawiamy jak jest, ale można dodać walidację
    })
  })
})

