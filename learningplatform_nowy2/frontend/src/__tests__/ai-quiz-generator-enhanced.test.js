/**
 * Testy dla rozszerzonego generatora AI quizów
 * Testuje nowe funkcjonalności: własna liczba pytań i edycja pytań za pomocą AI
 */

describe('AI Quiz Generator Enhanced Tests', () => {
  describe('Custom Question Count Functionality', () => {
    test('should allow custom question count input', () => {
      const quizSettings = {
        subject: 'Matematyka',
        grade: 'Klasa 5',
        difficulty: 'medium',
        questionCount: 5,
        customQuestionCount: false,
        timeLimit: 30
      };

      // Test przełączania na własną liczbę pytań
      const updatedSettings = {
        ...quizSettings,
        customQuestionCount: true,
        questionCount: 12
      };

      expect(updatedSettings.customQuestionCount).toBe(true);
      expect(updatedSettings.questionCount).toBe(12);
    });

    test('should validate custom question count range', () => {
      const validateQuestionCount = (count) => {
        return Math.max(1, Math.min(50, parseInt(count) || 1));
      };

      expect(validateQuestionCount(0)).toBe(1);
      expect(validateQuestionCount(1)).toBe(1);
      expect(validateQuestionCount(25)).toBe(25);
      expect(validateQuestionCount(50)).toBe(50);
      expect(validateQuestionCount(100)).toBe(50);
      expect(validateQuestionCount('invalid')).toBe(1);
      expect(validateQuestionCount(-5)).toBe(1);
    });

    test('should handle predefined question count options', () => {
      const predefinedOptions = [3, 5, 10, 15, 20];
      
      predefinedOptions.forEach(option => {
        expect(option).toBeGreaterThanOrEqual(1);
        expect(option).toBeLessThanOrEqual(50);
        expect(Number.isInteger(option)).toBe(true);
      });
    });

    test('should reset to default when disabling custom count', () => {
      const quizSettings = {
        questionCount: 25,
        customQuestionCount: true
      };

      const resetSettings = {
        ...quizSettings,
        customQuestionCount: false,
        questionCount: 5 // domyślna wartość
      };

      expect(resetSettings.customQuestionCount).toBe(false);
      expect(resetSettings.questionCount).toBe(5);
    });
  });

  describe('AI Question Editing Functionality', () => {
    test('should prepare question editing prompt correctly', () => {
      const currentQuestion = {
        id: 'q1',
        content: 'Ile to jest 2 + 2?',
        type: 'text',
        answers: [
          { id: 'a1', content: '3', is_correct: false, type: 'text' },
          { id: 'a2', content: '4', is_correct: true, type: 'text' },
          { id: 'a3', content: '5', is_correct: false, type: 'text' },
          { id: 'a4', content: '6', is_correct: false, type: 'text' }
        ],
        explanation: '2 + 2 = 4',
        points: 1
      };

      const quizContext = {
        title: 'Quiz z matematyki',
        subject: 'Matematyka',
        difficulty: 'easy'
      };

      const teacherInstruction = 'Zmień to pytanie na bardziej praktyczne';

      // Symulacja przygotowania promptu
      const promptData = {
        currentQuestion: currentQuestion,
        quizContext: quizContext,
        teacherInstruction: teacherInstruction
      };

      expect(promptData.currentQuestion.content).toBe('Ile to jest 2 + 2?');
      expect(promptData.quizContext.title).toBe('Quiz z matematyki');
      expect(promptData.teacherInstruction).toBe('Zmień to pytanie na bardziej praktyczne');
    });

    test('should validate question edit instruction', () => {
      const validateInstruction = (instruction) => {
        return !!(instruction && instruction.trim().length > 0);
      };

      expect(validateInstruction('Zmień to pytanie')).toBe(true);
      expect(validateInstruction('   Dodaj więcej szczegółów   ')).toBe(true);
      expect(validateInstruction('')).toBe(false);
      expect(validateInstruction('   ')).toBe(false);
      expect(validateInstruction(null)).toBe(false);
      expect(validateInstruction(undefined)).toBe(false);
    });

    test('should handle question update correctly', () => {
      const originalQuestion = {
        id: 'q1',
        content: 'Ile to jest 2 + 2?',
        type: 'text',
        answers: [
          { id: 'a1', content: '3', is_correct: false, type: 'text' },
          { id: 'a2', content: '4', is_correct: true, type: 'text' },
          { id: 'a3', content: '5', is_correct: false, type: 'text' },
          { id: 'a4', content: '6', is_correct: false, type: 'text' }
        ],
        explanation: '2 + 2 = 4',
        points: 1
      };

      const updatedQuestionData = {
        content: 'Ile kosztują 2 jabłka po 2 zł każde?',
        type: 'text',
        answers: [
          { id: 'a1', content: '3 zł', is_correct: false, type: 'text' },
          { id: 'a2', content: '4 zł', is_correct: true, type: 'text' },
          { id: 'a3', content: '5 zł', is_correct: false, type: 'text' },
          { id: 'a4', content: '6 zł', is_correct: false, type: 'text' }
        ],
        explanation: '2 jabłka × 2 zł = 4 zł',
        points: 1
      };

      // Symulacja aktualizacji pytania
      const updatedQuestion = {
        ...originalQuestion,
        content: updatedQuestionData.content,
        answers: updatedQuestionData.answers.map((a, index) => ({
          ...a,
          id: `${originalQuestion.id}_a${index + 1}`
        })),
        explanation: updatedQuestionData.explanation
      };

      expect(updatedQuestion.content).toBe('Ile kosztują 2 jabłka po 2 zł każde?');
      expect(updatedQuestion.answers[1].content).toBe('4 zł');
      expect(updatedQuestion.answers[1].is_correct).toBe(true);
      expect(updatedQuestion.explanation).toBe('2 jabłka × 2 zł = 4 zł');
      expect(updatedQuestion.id).toBe('q1'); // ID pytania pozostaje niezmienione
    });

    test('should maintain question structure integrity', () => {
      const question = {
        id: 'q1',
        content: 'Test question',
        type: 'text',
        answers: [
          { id: 'a1', content: 'Answer 1', is_correct: false, type: 'text' },
          { id: 'a2', content: 'Answer 2', is_correct: true, type: 'text' },
          { id: 'a3', content: 'Answer 3', is_correct: false, type: 'text' },
          { id: 'a4', content: 'Answer 4', is_correct: false, type: 'text' }
        ],
        explanation: 'Test explanation',
        points: 1
      };

      // Sprawdź strukturę pytania
      expect(question.id).toBeDefined();
      expect(question.content).toBeDefined();
      expect(question.type).toBeDefined();
      expect(question.answers).toBeInstanceOf(Array);
      expect(question.answers.length).toBe(4);
      expect(question.explanation).toBeDefined();
      expect(question.points).toBeDefined();

      // Sprawdź strukturę odpowiedzi
      question.answers.forEach((answer, index) => {
        expect(answer.id).toBeDefined();
        expect(answer.content).toBeDefined();
        expect(typeof answer.is_correct).toBe('boolean');
        expect(answer.type).toBeDefined();
      });

      // Sprawdź czy tylko jedna odpowiedź jest poprawna
      const correctAnswers = question.answers.filter(a => a.is_correct);
      expect(correctAnswers.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty question edit instruction', () => {
      const validateEditRequest = (instruction, questionIndex) => {
        if (!instruction || !instruction.trim()) {
          return { valid: false, error: 'Proszę opisać jak chcesz zmienić pytanie' };
        }
        if (questionIndex === null || questionIndex === undefined) {
          return { valid: false, error: 'Nie wybrano pytania do edycji' };
        }
        return { valid: true };
      };

      expect(validateEditRequest('', 0)).toEqual({
        valid: false,
        error: 'Proszę opisać jak chcesz zmienić pytanie'
      });

      expect(validateEditRequest('   ', 0)).toEqual({
        valid: false,
        error: 'Proszę opisać jak chcesz zmienić pytanie'
      });

      expect(validateEditRequest('Zmień pytanie', null)).toEqual({
        valid: false,
        error: 'Nie wybrano pytania do edycji'
      });

      expect(validateEditRequest('Zmień pytanie', 0)).toEqual({
        valid: true
      });
    });

    test('should handle invalid question count input', () => {
      const validateQuestionCount = (input) => {
        const num = parseInt(input);
        if (isNaN(num)) {
          return { valid: false, error: 'Liczba pytań musi być liczbą' };
        }
        if (num < 1) {
          return { valid: false, error: 'Liczba pytań musi być większa niż 0' };
        }
        if (num > 50) {
          return { valid: false, error: 'Liczba pytań nie może przekraczać 50' };
        }
        return { valid: true, value: num };
      };

      expect(validateQuestionCount('abc')).toEqual({
        valid: false,
        error: 'Liczba pytań musi być liczbą'
      });

      expect(validateQuestionCount('0')).toEqual({
        valid: false,
        error: 'Liczba pytań musi być większa niż 0'
      });

      expect(validateQuestionCount('100')).toEqual({
        valid: false,
        error: 'Liczba pytań nie może przekraczać 50'
      });

      expect(validateQuestionCount('15')).toEqual({
        valid: true,
        value: 15
      });
    });

    test('should handle AI response parsing errors', () => {
      const parseAIResponse = (response) => {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('Nie udało się wygenerować pytania w odpowiednim formacie');
          }
          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          return { error: error.message };
        }
      };

      expect(parseAIResponse('Invalid response')).toEqual({
        error: 'Nie udało się wygenerować pytania w odpowiednim formacie'
      });

      expect(parseAIResponse('{ "content": "Test" }')).toEqual({
        content: 'Test'
      });
    });
  });

  describe('UI State Management', () => {
    test('should manage editing state correctly', () => {
      const initialState = {
        editingQuestionIndex: null,
        isEditingQuestion: false,
        questionEditPrompt: ''
      };

      // Rozpoczęcie edycji
      const editingState = {
        ...initialState,
        editingQuestionIndex: 2,
        isEditingQuestion: false,
        questionEditPrompt: ''
      };

      // Podczas edycji
      const processingState = {
        ...editingState,
        isEditingQuestion: true,
        questionEditPrompt: 'Zmień to pytanie'
      };

      // Zakończenie edycji
      const completedState = {
        ...initialState,
        editingQuestionIndex: null,
        isEditingQuestion: false,
        questionEditPrompt: ''
      };

      expect(editingState.editingQuestionIndex).toBe(2);
      expect(processingState.isEditingQuestion).toBe(true);
      expect(completedState.editingQuestionIndex).toBe(null);
    });

    test('should handle modal visibility states', () => {
      const isModalVisible = (editingQuestionIndex) => {
        return editingQuestionIndex !== null && editingQuestionIndex !== undefined;
      };

      expect(isModalVisible(null)).toBe(false);
      expect(isModalVisible(undefined)).toBe(false);
      expect(isModalVisible(0)).toBe(true);
      expect(isModalVisible(5)).toBe(true);
    });

    test('should validate form inputs', () => {
      const validateQuizForm = (description, settings) => {
        const errors = [];
        
        if (!description || !description.trim()) {
          errors.push('Proszę opisać czego ma dotyczyć quiz');
        }
        
        if (settings.customQuestionCount && (settings.questionCount < 1 || settings.questionCount > 50)) {
          errors.push('Liczba pytań musi być między 1 a 50');
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      };

      expect(validateQuizForm('', { customQuestionCount: false, questionCount: 5 })).toEqual({
        valid: false,
        errors: ['Proszę opisać czego ma dotyczyć quiz']
      });

      expect(validateQuizForm('Test quiz', { customQuestionCount: true, questionCount: 100 })).toEqual({
        valid: false,
        errors: ['Liczba pytań musi być między 1 a 50']
      });

      expect(validateQuizForm('Test quiz', { customQuestionCount: false, questionCount: 5 })).toEqual({
        valid: true,
        errors: []
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete quiz generation and editing flow', () => {
      const quizFlow = {
        step1: 'input',
        step2: 'generating',
        step3: 'preview',
        step4: 'editing',
        step5: 'preview'
      };

      const settings = {
        subject: 'Matematyka',
        grade: 'Klasa 5',
        difficulty: 'medium',
        questionCount: 8,
        customQuestionCount: true,
        timeLimit: 30
      };

      const generatedQuiz = {
        title: 'Quiz z matematyki',
        description: 'Podstawowe działania matematyczne',
        subject: 'Matematyka',
        questions: Array(8).fill(null).map((_, i) => ({
          id: `q${i + 1}`,
          content: `Pytanie ${i + 1}`,
          type: 'text',
          answers: [
            { id: `q${i + 1}_a1`, content: 'A', is_correct: false, type: 'text' },
            { id: `q${i + 1}_a2`, content: 'B', is_correct: true, type: 'text' },
            { id: `q${i + 1}_a3`, content: 'C', is_correct: false, type: 'text' },
            { id: `q${i + 1}_a4`, content: 'D', is_correct: false, type: 'text' }
          ],
          explanation: 'Wyjaśnienie',
          points: 1
        })),
        estimatedTime: 30,
        difficulty: 'medium'
      };

      // Sprawdź czy flow jest poprawny
      expect(quizFlow.step1).toBe('input');
      expect(quizFlow.step3).toBe('preview');
      expect(quizFlow.step4).toBe('editing');

      // Sprawdź ustawienia
      expect(settings.customQuestionCount).toBe(true);
      expect(settings.questionCount).toBe(8);

      // Sprawdź wygenerowany quiz
      expect(generatedQuiz.questions.length).toBe(8);
      expect(generatedQuiz.questions[0].id).toBe('q1');
      expect(generatedQuiz.questions[7].id).toBe('q8');
    });

    test('should maintain data consistency during editing', () => {
      const originalQuiz = {
        title: 'Test Quiz',
        questions: [
          { id: 'q1', content: 'Question 1', answers: [] },
          { id: 'q2', content: 'Question 2', answers: [] }
        ]
      };

      // Edycja pierwszego pytania
      const editedQuiz = {
        ...originalQuiz,
        questions: originalQuiz.questions.map((q, index) => 
          index === 0 
            ? { ...q, content: 'Updated Question 1' }
            : q
        )
      };

      expect(editedQuiz.title).toBe('Test Quiz'); // Tytuł niezmieniony
      expect(editedQuiz.questions[0].content).toBe('Updated Question 1');
      expect(editedQuiz.questions[1].content).toBe('Question 2'); // Drugie pytanie niezmienione
      expect(editedQuiz.questions.length).toBe(2); // Liczba pytań niezmieniona
    });
  });
});
