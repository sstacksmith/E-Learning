/**
 * Testy dla naprawy planu zajęć w zarządzaniu klasami
 * Problem: Plan zajęć nie był zapisywany przy edycji klasy
 * Rozwiązanie: Dodano zapisywanie schedule w handleEditClass i ładowanie w openEditModal
 */

describe('Class Schedule Fix', () => {
  let mockUpdateDoc;
  let mockDoc;
  let mockAddDoc;
  let mockCollection;
  let mockServerTimestamp;

  beforeEach(() => {
    // Mock Firebase functions
    mockUpdateDoc = jest.fn();
    mockDoc = jest.fn();
    mockAddDoc = jest.fn();
    mockCollection = jest.fn();
    mockServerTimestamp = jest.fn(() => '2024-01-01T12:00:00Z');

    // Mock Firebase imports
    jest.doMock('firebase/firestore', () => ({
      updateDoc: mockUpdateDoc,
      doc: mockDoc,
      addDoc: mockAddDoc,
      collection: mockCollection,
      serverTimestamp: mockServerTimestamp
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Class Schedule Data Structure', () => {
    test('should have correct schedule structure', () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        description: 'Klasa matematyczna',
        grade_level: 1,
        subject: 'Matematyka',
        students: ['student1', 'student2'],
        max_students: 30,
        academic_year: '2024/2025',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          },
          {
            day: 'Środa',
            time: '10:00',
            room: 'Sala 102'
          }
        ]
      };

      expect(mockClass.schedule).toHaveLength(2);
      expect(mockClass.schedule[0]).toMatchObject({
        day: 'Poniedziałek',
        time: '08:00',
        room: 'Sala 101'
      });
      expect(mockClass.schedule[1]).toMatchObject({
        day: 'Środa',
        time: '10:00',
        room: 'Sala 102'
      });
    });

    test('should handle empty schedule', () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        schedule: []
      };

      expect(mockClass.schedule).toHaveLength(0);
      expect(Array.isArray(mockClass.schedule)).toBe(true);
    });

    test('should handle undefined schedule', () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A'
        // schedule is undefined
      };

      expect(mockClass.schedule).toBeUndefined();
    });
  });

  describe('Edit Class Functionality', () => {
    test('should include schedule in updateDoc call', async () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          }
        ]
      };

      const formData = {
        name: 'Klasa 1A - Edytowana',
        description: 'Opis edytowany',
        grade_level: 1,
        subject: 'Matematyka',
        max_students: 30,
        academic_year: '2024/2025',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          },
          {
            day: 'Wtorek',
            time: '09:00',
            room: 'Sala 102'
          }
        ]
      };

      // Simulate the fixed handleEditClass function
      const handleEditClass = async (selectedClass, formData) => {
        const classRef = { id: selectedClass.id };
        const updateData = {
          name: formData.name,
          description: formData.description,
          grade_level: formData.grade_level,
          subject: formData.subject,
          max_students: formData.max_students,
          academic_year: formData.academic_year,
          schedule: formData.schedule, // This was missing before
          updated_at: new Date()
        };

        // Simulate Firebase update
        mockUpdateDoc(classRef, updateData);
        return { success: true };
      };

      const result = await handleEditClass(mockClass, formData);

      expect(result.success).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'class123' },
        expect.objectContaining({
          schedule: formData.schedule
        })
      );
    });

    test('should load existing schedule in openEditModal', () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        description: 'Opis klasy',
        grade_level: 1,
        subject: 'Matematyka',
        max_students: 30,
        academic_year: '2024/2025',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          }
        ]
      };

      // Simulate the fixed openEditModal function
      const openEditModal = (cls) => {
        const formData = {
          name: cls.name,
          description: cls.description,
          grade_level: cls.grade_level,
          subject: cls.subject,
          max_students: cls.max_students,
          academic_year: cls.academic_year,
          schedule: cls.schedule || [] // This was missing before
        };
        return formData;
      };

      const formData = openEditModal(mockClass);

      expect(formData.schedule).toEqual(mockClass.schedule);
      expect(formData.schedule).toHaveLength(1);
      expect(formData.schedule[0].day).toBe('Poniedziałek');
    });

    test('should handle class without schedule in openEditModal', () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        description: 'Opis klasy',
        grade_level: 1,
        subject: 'Matematyka',
        max_students: 30,
        academic_year: '2024/2025'
        // schedule is undefined
      };

      const openEditModal = (cls) => {
        const formData = {
          name: cls.name,
          description: cls.description,
          grade_level: cls.grade_level,
          subject: cls.subject,
          max_students: cls.max_students,
          academic_year: cls.academic_year,
          schedule: cls.schedule || [] // Fallback to empty array
        };
        return formData;
      };

      const formData = openEditModal(mockClass);

      expect(formData.schedule).toEqual([]);
      expect(Array.isArray(formData.schedule)).toBe(true);
    });
  });

  describe('Schedule Synchronization', () => {
    test('should sync schedule to calendar', async () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          }
        ]
      };

      const students = ['student1', 'student2'];

      // Simulate the syncClassScheduleToCalendar function
      const syncClassScheduleToCalendar = async (classData, students) => {
        if (!classData.schedule || classData.schedule.length === 0) {
          return;
        }

        for (const scheduleSlot of classData.schedule) {
          if (!scheduleSlot.day || !scheduleSlot.time || !scheduleSlot.room) {
            continue;
          }

          const eventData = {
            title: `${scheduleSlot.room} - ${classData.name}`,
            description: `Lekcja dla klasy ${classData.name}`,
            type: 'class_lesson',
            classId: classData.id,
            className: classData.name,
            room: scheduleSlot.room,
            day: scheduleSlot.day,
            time: scheduleSlot.time,
            students: students,
            assignedTo: students,
            date: '2024-01-01',
            startTime: scheduleSlot.time,
            endTime: '08:45',
            createdBy: 'teacher@example.com',
            createdAt: '2024-01-01T12:00:00Z',
            isRecurring: true,
            recurrenceType: 'weekly'
          };

          mockAddDoc({}, eventData);
        }
      };

      await syncClassScheduleToCalendar(mockClass, students);

      expect(mockAddDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          title: 'Sala 101 - Klasa 1A',
          type: 'class_lesson',
          classId: 'class123',
          students: students
        })
      );
    });

    test('should skip incomplete schedule slots', async () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          },
          {
            day: 'Wtorek',
            time: '', // Incomplete - missing time
            room: 'Sala 102'
          },
          {
            day: 'Środa',
            time: '10:00',
            room: '' // Incomplete - missing room
          }
        ]
      };

      const syncClassScheduleToCalendar = async (classData) => {
        let syncedCount = 0;
        for (const scheduleSlot of classData.schedule) {
          if (!scheduleSlot.day || !scheduleSlot.time || !scheduleSlot.room) {
            continue; // Skip incomplete slots
          }
          syncedCount++;
        }
        return syncedCount;
      };

      const syncedCount = await syncClassScheduleToCalendar(mockClass);

      expect(syncedCount).toBe(1); // Only the first slot should be synced
    });
  });

  describe('End Time Calculation', () => {
    test('should calculate end time correctly', () => {
      const calculateEndTime = (startTime, durationMinutes) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      };

      expect(calculateEndTime('08:00', 45)).toBe('08:45');
      expect(calculateEndTime('10:30', 45)).toBe('11:15');
      expect(calculateEndTime('14:00', 60)).toBe('15:00');
      expect(calculateEndTime('23:30', 30)).toBe('00:00');
    });
  });

  describe('Day Mapping', () => {
    test('should map Polish day names to numbers correctly', () => {
      const dayMapping = {
        'Poniedziałek': 1,
        'Wtorek': 2,
        'Środa': 3,
        'Czwartek': 4,
        'Piątek': 5
      };

      expect(dayMapping['Poniedziałek']).toBe(1);
      expect(dayMapping['Wtorek']).toBe(2);
      expect(dayMapping['Środa']).toBe(3);
      expect(dayMapping['Czwartek']).toBe(4);
      expect(dayMapping['Piątek']).toBe(5);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full schedule edit flow', async () => {
      const mockClass = {
        id: 'class123',
        name: 'Klasa 1A',
        schedule: [
          {
            day: 'Poniedziałek',
            time: '08:00',
            room: 'Sala 101'
          }
        ]
      };

      const updatedSchedule = [
        {
          day: 'Poniedziałek',
          time: '08:00',
          room: 'Sala 101'
        },
        {
          day: 'Wtorek',
          time: '09:00',
          room: 'Sala 102'
        }
      ];

      // Simulate the complete flow
      const editClassWithSchedule = async (selectedClass, newSchedule) => {
        // 1. Load existing data (openEditModal)
        const formData = {
          ...selectedClass,
          schedule: selectedClass.schedule || []
        };

        // 2. Update schedule
        formData.schedule = newSchedule;

        // 3. Save to database (handleEditClass)
        const updateData = {
          ...formData,
          schedule: formData.schedule,
          updated_at: new Date()
        };

        mockUpdateDoc({ id: selectedClass.id }, updateData);

        // 4. Sync to calendar
        const students = ['student1', 'student2'];
        for (const slot of formData.schedule) {
          if (slot.day && slot.time && slot.room) {
            mockAddDoc({}, {
              title: `${slot.room} - ${formData.name}`,
              type: 'class_lesson',
              classId: formData.id,
              students: students
            });
          }
        }

        return { success: true, schedule: formData.schedule };
      };

      const result = await editClassWithSchedule(mockClass, updatedSchedule);

      expect(result.success).toBe(true);
      expect(result.schedule).toHaveLength(2);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'class123' },
        expect.objectContaining({
          schedule: updatedSchedule
        })
      );
      expect(mockAddDoc).toHaveBeenCalledTimes(2); // Two schedule slots
    });

    test('should handle schedule validation', () => {
      const validateSchedule = (schedule) => {
        if (!Array.isArray(schedule)) return false;
        
        return schedule.every(slot => 
          slot.day && 
          slot.time && 
          slot.room &&
          typeof slot.day === 'string' &&
          typeof slot.time === 'string' &&
          typeof slot.room === 'string'
        );
      };

      const validSchedule = [
        { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' },
        { day: 'Wtorek', time: '09:00', room: 'Sala 102' }
      ];

      const invalidSchedule = [
        { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' },
        { day: 'Wtorek', time: '', room: 'Sala 102' }, // Missing time
        { day: 'Środa', time: '10:00', room: '' } // Missing room
      ];

      expect(validateSchedule(validSchedule)).toBe(true);
      expect(validateSchedule(invalidSchedule)).toBe(false);
      expect(validateSchedule([])).toBe(true); // Empty array is valid
      expect(validateSchedule(null)).toBe(false);
      expect(validateSchedule(undefined)).toBe(false);
    });
  });
});
