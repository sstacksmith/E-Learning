"use client";
import React, { useState } from 'react';
import { MathEditor } from './MathEditor';

interface QuizAnswerInputProps {
  onSubmit: (answer: { content: string; type: 'text' | 'math' }) => void;
  disabled?: boolean;
}

const QuizAnswerInput: React.FC<QuizAnswerInputProps> = ({ onSubmit, disabled = false }) => {
  const [answerType, setAnswerType] = useState<'text' | 'math'>('text');
  const [textAnswer, setTextAnswer] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      content: answerType === 'text' ? textAnswer : mathAnswer,
      type: answerType
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            checked={answerType === 'text'}
            onChange={() => setAnswerType('text')}
            className="form-radio text-[#4067EC]"
            disabled={disabled}
          />
          <span>Tekst</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            checked={answerType === 'math'}
            onChange={() => setAnswerType('math')}
            className="form-radio text-[#4067EC]"
            disabled={disabled}
          />
          <span>Matematyczny</span>
        </label>
      </div>

      {answerType === 'text' ? (
        <div>
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Wpisz swoją odpowiedź..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#4067EC] focus:border-transparent"
            rows={3}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-3">
          <MathEditor
            initialValue={mathAnswer}
            onChange={setMathAnswer}
            readOnly={disabled}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-[#4067EC] text-white px-6 py-2 rounded-lg hover:bg-[#3155d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || (!textAnswer && !mathAnswer)}
        >
          Zatwierdź odpowiedź
        </button>
      </div>
    </form>
  );
};

export default QuizAnswerInput; 