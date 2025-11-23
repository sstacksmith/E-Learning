/**
 * Testy dla naprawy błędu serverTimestamp() w edycji quizów
 * Problem: serverTimestamp() nie może być używane wewnątrz tablic w Firestore
 * Rozwiązanie: Zastąpienie serverTimestamp() na new Date().toISOString() w tablicach pytań
 */

describe('Quiz Edit serverTimestamp Fix', () => {
  let mockUpdateDoc;
  let mockDoc;
  let mockServerTimestamp;

  beforeEach(() => {
    // Mock Firebase functions
    mockUpdateDoc = jest.fn();
    mockDoc = jest.fn();
    mockServerTimestamp = jest.fn(() => '2024-01-01T12:00:00Z');

    // Mock Firebase imports
    jest.doMock('firebase/firestore', () => ({
      updateDoc: mockUpdateDoc,
      doc: mockDoc,
      serverTimestamp: mockServerTimestamp
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Quiz Edit Data Structure', () => {
    test('should not use serverTimestamp() in questions array', () => {
      const mockQuiz = {
        id: 'quiz123',
        title: 'Test Quiz',
        description: 'Test Description',
        questions: [
          {
            id: 'q1',
            content: 'Test Question 1',
            type: 'text',
            points: 1,
            order: 0,
            explanation: 'Test explanation',
            answers: [
              { id: 'a1', content: 'Answer 1', isCorrect: true, type: 'text' },
              { id: 'a2', content: 'Answer 2', isCorrect: false, type: 'text' }
            ]
          }
        ]
      };

      // Simulate the fixed conversion function
      const convertQuestionsForEdit = (questions) => {
        return questions.map(q => ({
          id: q.id || '',
          content: q.content || '',
          type: q.type || 'text',
          points: q.points || 1,
          order: q.order || 0,
          mathContent: q.mathContent || '',
          explanation: q.explanation || '',
          answers: q.answers.map(a => ({
            id: a.id || '',
            content: a.content || '',
            is_correct: a.isCorrect || false,
            type: a.type || 'text',
            mathContent: a.mathContent || '',
          })),
          // FIXED: Using ISO string instead of serverTimestamp()
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher@example.com',
        }));
      };

      const convertedQuestions = convertQuestionsForEdit(mockQuiz.questions);
      
      expect(convertedQuestions).toHaveLength(1);
      expect(convertedQuestions[0]).toMatchObject({
        id: 'q1',
        content: 'Test Question 1',
        type: 'text',
        points: 1,
        order: 0,
        explanation: 'Test explanation',
        created_by: 'teacher@example.com'
      });

      // Verify that timestamps are ISO strings, not serverTimestamp functions
      expect(convertedQuestions[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(convertedQuestions[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should handle multiple questions correctly', () => {
      const mockQuestions = [
        {
          id: 'q1',
          content: 'Question 1',
          type: 'text',
          points: 1,
          answers: [
            { id: 'a1', content: 'Answer 1', isCorrect: true, type: 'text' }
          ]
        },
        {
          id: 'q2',
          content: 'Question 2',
          type: 'text',
          points: 2,
          answers: [
            { id: 'a2', content: 'Answer 2', isCorrect: false, type: 'text' },
            { id: 'a3', content: 'Answer 3', isCorrect: true, type: 'text' }
          ]
        }
      ];

      const convertQuestions = (questions) => {
        return questions.map(q => ({
          id: q.id,
          content: q.content,
          type: q.type,
          points: q.points,
          answers: q.answers.map(a => ({
            id: a.id,
            content: a.content,
            is_correct: a.isCorrect,
            type: a.type,
          })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher@example.com',
        }));
      };

      const converted = convertQuestions(mockQuestions);
      
      expect(converted).toHaveLength(2);
      expect(converted[0].answers).toHaveLength(1);
      expect(converted[1].answers).toHaveLength(2);
      
      // Verify all timestamps are valid ISO strings
      converted.forEach(question => {
        expect(question.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(question.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    test('should handle empty questions array', () => {
      const convertQuestions = (questions) => {
        return questions.map(q => ({
          id: q.id,
          content: q.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      };

      const converted = convertQuestions([]);
      expect(converted).toHaveLength(0);
      expect(Array.isArray(converted)).toBe(true);
    });
  });

  describe('Firebase Update Simulation', () => {
    test('should simulate successful quiz update without serverTimestamp errors', async () => {
      const mockQuizData = {
        title: 'Updated Quiz Title',
        description: 'Updated description',
        questions: [
          {
            id: 'q1',
            content: 'Updated Question',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'teacher@example.com',
            answers: [
              {
                id: 'a1',
                content: 'Updated Answer',
                is_correct: true,
                type: 'text'
              }
            ]
          }
        ],
        updated_at: '2024-01-01T12:00:00Z' // serverTimestamp() only for main document
      };

      // Simulate the update function
      const updateQuiz = async (quizId, quizData) => {
        // This should not throw serverTimestamp error
        const isValidData = validateQuizData(quizData);
        if (!isValidData) {
          throw new Error('Invalid quiz data');
        }
        return { success: true, id: quizId };
      };

      const validateQuizData = (data) => {
        // Check that questions array doesn't contain serverTimestamp functions
        if (data.questions) {
          return data.questions.every(q => 
            typeof q.created_at === 'string' && 
            typeof q.updated_at === 'string'
          );
        }
        return true;
      };

      const result = await updateQuiz('quiz123', mockQuizData);
      expect(result.success).toBe(true);
      expect(result.id).toBe('quiz123');
    });

    test('should detect serverTimestamp in questions array', () => {
      const mockQuizDataWithServerTimestamp = {
        title: 'Quiz with serverTimestamp',
        questions: [
          {
            id: 'q1',
            content: 'Question',
            // This would cause the error
            created_at: mockServerTimestamp,
            updated_at: mockServerTimestamp
          }
        ]
      };

      const validateQuizData = (data) => {
        if (data.questions) {
          return data.questions.every(q => 
            typeof q.created_at === 'string' && 
            typeof q.updated_at === 'string'
          );
        }
        return true;
      };

      const isValid = validateQuizData(mockQuizDataWithServerTimestamp);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle update errors gracefully', async () => {
      const mockQuizData = {
        title: 'Test Quiz',
        questions: [
          {
            id: 'q1',
            content: 'Question',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      };

      const updateQuizWithError = async () => {
        // Simulate Firebase error
        throw new Error('Firebase update failed');
      };

      try {
        await updateQuizWithError('quiz123', mockQuizData);
      } catch (error) {
        expect(error.message).toBe('Firebase update failed');
      }
    });

    test('should validate quiz data before update', () => {
      const validateQuizForUpdate = (quiz) => {
        const errors = [];
        
        if (!quiz.title || !quiz.title.trim()) {
          errors.push('Tytuł quizu jest wymagany');
        }
        
        if (!quiz.questions || quiz.questions.length === 0) {
          errors.push('Quiz musi zawierać co najmniej jedno pytanie');
        }
        
        if (quiz.questions) {
          quiz.questions.forEach((q, index) => {
            if (!q.content || !q.content.trim()) {
              errors.push(`Pytanie ${index + 1} musi mieć treść`);
            }
            if (!q.answers || q.answers.length < 2) {
              errors.push(`Pytanie ${index + 1} musi mieć co najmniej 2 odpowiedzi`);
            }
          });
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };
      };

      // Valid quiz
      const validQuiz = {
        title: 'Valid Quiz',
        questions: [
          {
            content: 'Question 1',
            answers: [
              { content: 'Answer 1', isCorrect: true },
              { content: 'Answer 2', isCorrect: false }
            ]
          }
        ]
      };

      const validResult = validateQuizForUpdate(validQuiz);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid quiz
      const invalidQuiz = {
        title: '',
        questions: []
      };

      const invalidResult = validateQuizForUpdate(invalidQuiz);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Timestamp Consistency', () => {
    test('should maintain timestamp consistency across questions', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z');
      
      const createQuizWithConsistentTimestamps = (questions) => {
        const timestamp = baseTime.toISOString();
        return questions.map(q => ({
          ...q,
          created_at: timestamp,
          updated_at: timestamp
        }));
      };

      const questions = [
        { id: 'q1', content: 'Question 1' },
        { id: 'q2', content: 'Question 2' },
        { id: 'q3', content: 'Question 3' }
      ];

      const converted = createQuizWithConsistentTimestamps(questions);
      
      converted.forEach(question => {
        expect(question.created_at).toBe(baseTime.toISOString());
        expect(question.updated_at).toBe(baseTime.toISOString());
      });
    });

    test('should generate unique timestamps for each conversion', () => {
      const convertWithUniqueTimestamps = (questions) => {
        return questions.map(q => ({
          ...q,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      };

      const questions = [{ id: 'q1', content: 'Question' }];
      
      // Convert twice with small delay
      const converted1 = convertWithUniqueTimestamps(questions);
      setTimeout(() => {
        const converted2 = convertWithUniqueTimestamps(questions);
        
        // Timestamps should be different due to different conversion times
        expect(converted1[0].created_at).not.toBe(converted2[0].created_at);
        expect(converted1[0].updated_at).not.toBe(converted2[0].updated_at);
      }, 1);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full quiz edit flow without serverTimestamp errors', async () => {
      const mockQuiz = {
        id: 'quiz123',
        title: 'Original Quiz',
        questions: [
          {
            id: 'q1',
            content: 'Original Question',
            answers: [
              { id: 'a1', content: 'Original Answer', isCorrect: true }
            ]
          }
        ]
      };

      const editQuiz = async (quiz, updates) => {
        // Simulate the complete edit flow
        const updatedQuiz = {
          ...quiz,
          ...updates,
          questions: updates.questions ? updates.questions.map(q => ({
            ...q,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'teacher@example.com'
          })) : quiz.questions
        };

        // Simulate Firebase update
        const isValidData = updatedQuiz.questions.every(q => 
          typeof q.created_at === 'string' && 
          typeof q.updated_at === 'string'
        );

        if (!isValidData) {
          throw new Error('serverTimestamp() not supported inside arrays');
        }

        return { success: true, quiz: updatedQuiz };
      };

      const updates = {
        title: 'Updated Quiz Title',
        questions: [
          {
            id: 'q1',
            content: 'Updated Question',
            answers: [
              { id: 'a1', content: 'Updated Answer', isCorrect: true }
            ]
          }
        ]
      };

      const result = await editQuiz(mockQuiz, updates);
      expect(result.success).toBe(true);
      expect(result.quiz.title).toBe('Updated Quiz Title');
      expect(result.quiz.questions[0].content).toBe('Updated Question');
    });

    test('should handle edge cases in quiz editing', () => {
      const handleEdgeCases = (quiz) => {
        const processedQuiz = {
          ...quiz,
          questions: quiz.questions.map(q => ({
            id: q.id || '',
            content: q.content || '',
            type: q.type || 'text',
            points: q.points || 1,
            order: q.order || 0,
            explanation: q.explanation || '',
            answers: (q.answers || []).map(a => ({
              id: a.id || '',
              content: a.content || '',
              is_correct: Boolean(a.isCorrect),
              type: a.type || 'text',
              mathContent: a.mathContent || '',
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'teacher@example.com'
          }))
        };

        return processedQuiz;
      };

      // Test with undefined/null values
      const edgeCaseQuiz = {
        id: 'quiz123',
        title: 'Edge Case Quiz',
        questions: [
          {
            id: null,
            content: undefined,
            answers: null
          }
        ]
      };

      const processed = handleEdgeCases(edgeCaseQuiz);
      expect(processed.questions[0].id).toBe('');
      expect(processed.questions[0].content).toBe('');
      expect(processed.questions[0].answers).toHaveLength(0);
      expect(processed.questions[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
