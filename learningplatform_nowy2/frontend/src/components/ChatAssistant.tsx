import React, { useState, useRef } from 'react';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import firebaseApp from '@/config/firebase';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ChatAssistantProps {
  open: boolean;
  onClose: () => void;
}

// Inicjalizacja AI Logic SDK
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

export default function ChatAssistant({ open, onClose }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function getRecaptchaToken() {
    // @ts-ignore
    if (window.grecaptcha) {
      // @ts-ignore
      return await window.grecaptcha.execute('khbjasd76892kbasbd89621-21', { action: 'chat' });
    }
    return '';
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    const userMsg: Message = { role: 'user', content: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    try {
      const recaptchaToken = await getRecaptchaToken();
      // Jeśli Twój backend wymaga tokena, możesz go przekazać w prompt lub w metadanych
      // Przykład: const prompt = `${input}\n[recaptcha:${recaptchaToken}]`;
      const result = await model.generateContent(input);
      const response = result.response;
      const text = response.text();
      setMessages(msgs => [...msgs, { role: 'ai', content: text || 'Brak odpowiedzi AI.' }]);
    } catch (err: any) {
      setMessages(msgs => [...msgs, { role: 'ai', content: 'Wystąpił błąd AI.' }]);
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className={`fixed top-0 right-0 h-full w-full max-w-md z-50 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'} bg-white shadow-2xl flex flex-col border-l border-gray-200`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-bold text-lg text-[#4067EC]">Pomocnik Mikołaja (AI)</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <div className="text-gray-400 text-center">Zadaj pytanie AI dotyczące pracy nauczyciela...</div>}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.role === 'user' ? 'bg-[#4067EC] text-white' : 'bg-gray-100 text-gray-800'}`}>
              {msg.role === 'ai' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-center">AI myśli...</div>}
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4067EC]"
          placeholder="Napisz wiadomość..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="bg-[#4067EC] text-white px-4 py-2 rounded font-semibold disabled:opacity-50" disabled={loading || !input.trim()}>Wyślij</button>
      </form>
      {error && <div className="text-red-500 text-center p-2">{error}</div>}
    </div>
  );
} 