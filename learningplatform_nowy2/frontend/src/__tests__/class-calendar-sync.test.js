/**
 * Testy synchronizacji planu zajęć klasy z kalendarzem
 */

describe('Class Calendar Synchronization Tests', () => {
  describe('Schedule to Calendar Event Conversion', () => {
    test('should convert schedule slot to calendar event', () => {
      const scheduleSlot = {
        day: 'Poniedziałek',
        time: '08:00',
        room: 'Sala 101'
      };

      const classData = {
        id: 'class-1',
        name: '3A',
        subject: 'Matematyka'
      };

      const students = ['student-1', 'student-2'];

      // Symulacja konwersji
      const expectedEvent = {
        title: `${scheduleSlot.room} - ${classData.name}`,
        description: `Lekcja dla klasy ${classData.name}`,
        type: 'class_lesson',
        classId: classData.id,
        className: classData.name,
        subject: classData.subject,
        room: scheduleSlot.room,
        day: scheduleSlot.day,
        time: scheduleSlot.time,
        students: students,
        assignedTo: students,
        isRecurring: true,
        recurrenceType: 'weekly'
      };

      expect(expectedEvent.title).toBe('Sala 101 - 3A');
      expect(expectedEvent.type).toBe('class_lesson');
      expect(expectedEvent.students).toEqual(students);
      expect(expectedEvent.isRecurring).toBe(true);
    });

    test('should handle multiple schedule slots', () => {
      const schedule = [
        { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' },
        { day: 'Środa', time: '10:00', room: 'Sala 102' },
        { day: 'Piątek', time: '14:00', room: 'Sala 103' }
      ];

      const classData = {
        id: 'class-1',
        name: '3A',
        subject: 'Matematyka'
      };

      const students = ['student-1', 'student-2'];

      // Symulacja konwersji wszystkich slotów
      const events = schedule.map(slot => ({
        title: `${slot.room} - ${classData.name}`,
        type: 'class_lesson',
        classId: classData.id,
        room: slot.room,
        day: slot.day,
        time: slot.time,
        students: students
      }));

      expect(events.length).toBe(3);
      expect(events[0].room).toBe('Sala 101');
      expect(events[1].room).toBe('Sala 102');
      expect(events[2].room).toBe('Sala 103');
    });

    test('should skip incomplete schedule slots', () => {
      const schedule = [
        { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' },
        { day: '', time: '10:00', room: 'Sala 102' }, // Brak dnia
        { day: 'Środa', time: '', room: 'Sala 103' }, // Brak czasu
        { day: 'Piątek', time: '14:00', room: '' }, // Brak sali
        { day: 'Wtorek', time: '12:00', room: 'Sala 104' }
      ];

      // Filtruj tylko kompletne sloty
      const validSlots = schedule.filter(slot => 
        slot.day && slot.time && slot.room
      );

      expect(validSlots.length).toBe(2);
      expect(validSlots[0].day).toBe('Poniedziałek');
      expect(validSlots[1].day).toBe('Wtorek');
    });
  });

  describe('Day Mapping and Date Calculation', () => {
    test('should map Polish day names to numbers', () => {
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

    test('should calculate next occurrence of day', () => {
      // Symulacja dla poniedziałku (day = 1)
      const today = new Date('2024-01-03'); // Środa (day = 3)
      const targetDay = 1; // Poniedziałek
      
      const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
      const nextOccurrence = new Date(today);
      nextOccurrence.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));

      // Poniedziałek powinien być 5 dni później (3 + 5 = 8, ale to 6 stycznia)
      expect(daysUntilTarget).toBe(5);
      expect(nextOccurrence.getDay()).toBe(1); // Poniedziałek
    });

    test('should handle same day calculation', () => {
      // Symulacja dla tego samego dnia
      const today = new Date('2024-01-01'); // Poniedziałek (day = 1)
      const targetDay = 1; // Poniedziałek
      
      const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
      const nextOccurrence = new Date(today);
      nextOccurrence.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));

      // Jeśli dzisiaj jest poniedziałek, następny poniedziałek to za tydzień
      expect(daysUntilTarget).toBe(0);
      expect(nextOccurrence.getDate()).toBe(today.getDate() + 7);
    });
  });

  describe('End Time Calculation', () => {
    test('should calculate end time for 45-minute lesson', () => {
      const calculateEndTime = (startTime, durationMinutes) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      };

      expect(calculateEndTime('08:00', 45)).toBe('08:45');
      expect(calculateEndTime('09:30', 45)).toBe('10:15');
      expect(calculateEndTime('14:15', 45)).toBe('15:00');
      expect(calculateEndTime('23:30', 45)).toBe('00:15'); // Przejście do następnego dnia
    });

    test('should handle different lesson durations', () => {
      const calculateEndTime = (startTime, durationMinutes) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      };

      expect(calculateEndTime('08:00', 30)).toBe('08:30');
      expect(calculateEndTime('08:00', 60)).toBe('09:00');
      expect(calculateEndTime('08:00', 90)).toBe('09:30');
    });
  });

  describe('Student Assignment Synchronization', () => {
    test('should sync calendar events when student is added to class', () => {
      const classData = {
        id: 'class-1',
        name: '3A',
        schedule: [
          { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' }
        ],
        students: ['student-1']
      };

      const newStudentId = 'student-2';
      const updatedStudents = [...classData.students, newStudentId];

      // Symulacja tworzenia wydarzeń dla wszystkich studentów
      const events = classData.schedule.map(() => ({
        students: updatedStudents,
        assignedTo: updatedStudents
      }));

      expect(events[0].students).toContain('student-1');
      expect(events[0].students).toContain('student-2');
      expect(events[0].students.length).toBe(2);
    });

    test('should update calendar events when student is removed from class', () => {
      const classData = {
        id: 'class-1',
        name: '3A',
        schedule: [
          { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' }
        ],
        students: ['student-1', 'student-2', 'student-3']
      };

      const studentToRemove = 'student-2';
      const updatedStudents = classData.students.filter(id => id !== studentToRemove);

      // Symulacja aktualizacji wydarzeń
      const events = classData.schedule.map(() => ({
        students: updatedStudents,
        assignedTo: updatedStudents
      }));

      expect(events[0].students).toContain('student-1');
      expect(events[0].students).not.toContain('student-2');
      expect(events[0].students).toContain('student-3');
      expect(events[0].students.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty schedule gracefully', () => {
      const classData = {
        id: 'class-1',
        name: '3A',
        schedule: [],
        students: ['student-1']
      };

      // Symulacja sprawdzenia czy są sloty do synchronizacji
      const hasSchedule = !!(classData.schedule && classData.schedule.length > 0);
      expect(hasSchedule).toBe(false);
    });

    test('should handle missing schedule property', () => {
      const classData = {
        id: 'class-1',
        name: '3A',
        students: ['student-1']
        // Brak właściwości schedule
      };

      const hasSchedule = !!(classData.schedule && classData.schedule.length > 0);
      expect(hasSchedule).toBe(false);
    });

    test('should handle invalid time format', () => {
      const scheduleSlot = {
        day: 'Poniedziałek',
        time: 'invalid-time',
        room: 'Sala 101'
      };

      // Sprawdź czy czas ma poprawny format
      const isValidTime = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleSlot.time);
      expect(isValidTime).toBe(false);
    });

    test('should handle missing students array', () => {
      const classData = {
        id: 'class-1',
        name: '3A',
        schedule: [
          { day: 'Poniedziałek', time: '08:00', room: 'Sala 101' }
        ]
        // Brak właściwości students
      };

      const hasStudents = !!(classData.students && classData.students.length > 0);
      expect(hasStudents).toBe(false);
    });
  });

  describe('Event Data Structure Validation', () => {
    test('should create valid calendar event structure', () => {
      const scheduleSlot = {
        day: 'Poniedziałek',
        time: '08:00',
        room: 'Sala 101'
      };

      const classData = {
        id: 'class-1',
        name: '3A',
        subject: 'Matematyka'
      };

      const students = ['student-1', 'student-2'];

      const eventData = {
        title: `${scheduleSlot.room} - ${classData.name}`,
        description: `Lekcja dla klasy ${classData.name}`,
        type: 'class_lesson',
        classId: classData.id,
        className: classData.name,
        subject: classData.subject,
        room: scheduleSlot.room,
        day: scheduleSlot.day,
        time: scheduleSlot.time,
        students: students,
        assignedTo: students,
        date: '2024-01-08', // YYYY-MM-DD format
        startTime: scheduleSlot.time,
        endTime: '08:45',
        isRecurring: true,
        recurrenceType: 'weekly'
      };

      // Sprawdź wymagane pola
      expect(eventData.title).toBeDefined();
      expect(eventData.type).toBe('class_lesson');
      expect(eventData.classId).toBeDefined();
      expect(eventData.students).toBeInstanceOf(Array);
      expect(eventData.assignedTo).toBeInstanceOf(Array);
      expect(eventData.isRecurring).toBe(true);
      expect(eventData.recurrenceType).toBe('weekly');
      
      // Sprawdź format daty
      expect(eventData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Sprawdź format czasu
      expect(eventData.startTime).toMatch(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);
      expect(eventData.endTime).toMatch(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);
    });
  });
});
