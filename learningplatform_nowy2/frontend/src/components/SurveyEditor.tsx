'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Edit, Eye } from 'lucide-react';

interface SurveyQuestion {
  id: string;
  question: string;
  category: string;
  type: 'rating' | 'text' | 'multiple_choice';
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  isActive: boolean;
  created_at: string;
  updated_at?: string;
}

interface SurveyEditorProps {
  survey?: Survey;
  onSave: (survey: Omit<Survey, 'id' | 'created_at'>) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const defaultQuestion: SurveyQuestion = {
  id: '',
  question: '',
  category: '',
  type: 'rating',
  required: true
};

const questionCategories = [
  'Materiały',
  'Komunikacja', 
  'Przekazywanie wiedzy',
  'Zaangażowanie',
  'Dostosowanie',
  'Dostępność',
  'Metody',
  'Motywacja',
  'Przydatność',
  'Ogólne wrażenie'
];

export const SurveyEditor: React.FC<SurveyEditorProps> = ({
  survey,
  onSave,
  onCancel,
  mode
}) => {
  const [title, setTitle] = useState(survey?.title || '');
  const [description, setDescription] = useState(survey?.description || '');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    survey?.questions || [defaultQuestion]
  );
  const [isActive, setIsActive] = useState(survey?.isActive ?? true);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      ...defaultQuestion,
      id: `q_${Date.now()}`
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionIndex(questions.length);
  };

  const updateQuestion = (index: number, updatedQuestion: SurveyQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
    setEditingQuestionIndex(null);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Proszę wprowadzić tytuł ankiety');
      return;
    }

    if (questions.length === 0) {
      alert('Proszę dodać przynajmniej jedno pytanie');
      return;
    }

    const validQuestions = questions.filter(q => q.question.trim() && q.category.trim());
    if (validQuestions.length === 0) {
      alert('Proszę wypełnić wszystkie wymagane pola pytań');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      questions: validQuestions,
      isActive,
      updated_at: new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Utwórz nową ankietę' : 'Edytuj ankietę'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Podstawowe informacje */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tytuł ankiety *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Wprowadź tytuł ankiety..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opis ankiety
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Wprowadź opis ankiety (opcjonalnie)..."
            rows={3}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
            Ankieta aktywna (widoczna dla uczniów)
          </label>
        </div>
      </div>

      {/* Pytania */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Pytania ({questions.length})
          </h3>
          <button
            onClick={addQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj pytanie
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id || index} className="border border-gray-200 rounded-lg p-4">
              {editingQuestionIndex === index ? (
                <QuestionEditor
                  question={question}
                  onSave={(updatedQuestion) => updateQuestion(index, updatedQuestion)}
                  onCancel={() => setEditingQuestionIndex(null)}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Pytanie {index + 1}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {question.category}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {question.type === 'rating' ? 'Ocena' : 
                         question.type === 'text' ? 'Tekst' : 'Wielokrotny wybór'}
                      </span>
                    </div>
                    <p className="text-gray-800 mb-2">{question.question}</p>
                    {question.options && question.options.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Opcje:</span> {question.options.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingQuestionIndex(index)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edytuj"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(index)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Usuń"
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Akcje */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          {mode === 'create' ? 'Utwórz ankietę' : 'Zapisz zmiany'}
        </button>
      </div>
    </div>
  );
};

interface QuestionEditorProps {
  question: SurveyQuestion;
  onSave: (question: SurveyQuestion) => void;
  onCancel: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onSave,
  onCancel
}) => {
  const [editedQuestion, setEditedQuestion] = useState<SurveyQuestion>(question);
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    if (newOption.trim() && editedQuestion.options) {
      setEditedQuestion({
        ...editedQuestion,
        options: [...editedQuestion.options, newOption.trim()]
      });
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    if (editedQuestion.options) {
      setEditedQuestion({
        ...editedQuestion,
        options: editedQuestion.options.filter((_, i) => i !== index)
      });
    }
  };

  const handleSave = () => {
    if (!editedQuestion.question.trim()) {
      alert('Proszę wprowadzić treść pytania');
      return;
    }
    if (!editedQuestion.category.trim()) {
      alert('Proszę wybrać kategorię pytania');
      return;
    }
    onSave(editedQuestion);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Treść pytania *
        </label>
        <textarea
          value={editedQuestion.question}
          onChange={(e) => setEditedQuestion({...editedQuestion, question: e.target.value})}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Wprowadź treść pytania..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategoria *
          </label>
          <select
            value={editedQuestion.category}
            onChange={(e) => setEditedQuestion({...editedQuestion, category: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Wybierz kategorię</option>
            {questionCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Typ pytania
          </label>
          <select
            value={editedQuestion.type}
            onChange={(e) => setEditedQuestion({...editedQuestion, type: e.target.value as any})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="rating">Ocena (1-10)</option>
            <option value="text">Pytanie otwarte</option>
            <option value="multiple_choice">Wielokrotny wybór</option>
          </select>
        </div>
      </div>

      {editedQuestion.type === 'multiple_choice' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opcje odpowiedzi
          </label>
          <div className="space-y-2">
            {editedQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{index + 1}.</span>
                <span className="flex-1 text-sm">{option}</span>
                <button
                  onClick={() => removeOption(index)}
                  className="p-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Dodaj nową opcję..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addOption()}
              />
              <button
                onClick={addOption}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="required"
          checked={editedQuestion.required}
          onChange={(e) => setEditedQuestion({...editedQuestion, required: e.target.checked})}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="required" className="ml-2 block text-sm text-gray-700">
          Pytanie wymagane
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Zapisz
        </button>
      </div>
    </div>
  );
};






