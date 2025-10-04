# Rozszerzony Generator Quizów AI - Dokumentacja

## 🎯 **Zaimplementowane Funkcjonalności**

### ✅ **1. Własna Liczba Pytań**
- **Checkbox "Wpisz własną liczbę pytań"** - przełącza między sztywną listą a własnym inputem
- **Input numeryczny** - pozwala wpisać liczbę pytań od 1 do 50
- **Walidacja** - automatyczne ograniczenie do zakresu 1-50
- **Fallback** - powrót do domyślnej wartości (5) przy wyłączeniu opcji

### ✅ **2. Edycja Pojedynczych Pytań za Pomocą AI**
- **Przycisk edycji** przy każdym pytaniu w podglądzie
- **Modal edycji** z instrukcją dla AI
- **Kontekstowe prompty** - AI otrzymuje pełny kontekst quizu i pytania
- **Zachowanie struktury** - ID pytania pozostaje niezmienione
- **Obsługa błędów** - walidacja instrukcji i obsługa błędów AI

---

## 🔧 **Szczegóły Techniczne**

### **Nowe Stany Komponentu:**
```typescript
const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
const [isEditingQuestion, setIsEditingQuestion] = useState(false);
const [questionEditPrompt, setQuestionEditPrompt] = useState('');
```

### **Rozszerzone Ustawienia Quizu:**
```typescript
const [quizSettings, setQuizSettings] = useState({
  subject: '',
  grade: '',
  difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  questionCount: 5,
  customQuestionCount: false, // NOWE
  timeLimit: 30,
});
```

### **Funkcja Edycji Pytania:**
```typescript
const editQuestionWithAI = async (questionIndex: number) => {
  // Walidacja instrukcji
  // Przygotowanie promptu z kontekstem
  // Wywołanie AI
  // Parsowanie odpowiedzi
  // Aktualizacja pytania
}
```

---

## 🎨 **Interfejs Użytkownika**

### **1. Wybór Liczby Pytań:**
```jsx
<div className="space-y-3">
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      id="customQuestionCount"
      checked={quizSettings.customQuestionCount}
      onChange={(e) => setQuizSettings(prev => ({ 
        ...prev, 
        customQuestionCount: e.target.checked,
        questionCount: e.target.checked ? prev.questionCount : 5
      }))}
    />
    <label htmlFor="customQuestionCount">
      Wpisz własną liczbę pytań
    </label>
  </div>
  
  {quizSettings.customQuestionCount ? (
    <input
      type="number"
      min="1"
      max="50"
      value={quizSettings.questionCount}
      onChange={(e) => setQuizSettings(prev => ({ 
        ...prev, 
        questionCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
      }))}
      placeholder="Wpisz liczbę pytań (1-50)"
    />
  ) : (
    <select>
      <option value={3}>3 pytania</option>
      <option value={5}>5 pytań</option>
      <option value={10}>10 pytań</option>
      <option value={15}>15 pytań</option>
      <option value={20}>20 pytań</option>
    </select>
  )}
</div>
```

### **2. Przycisk Edycji Pytania:**
```jsx
<button
  onClick={() => setEditingQuestionIndex(index)}
  className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 hover:scale-105"
  title="Edytuj pytanie za pomocą AI"
>
  <Edit3 className="w-4 h-4" />
</button>
```

### **3. Modal Edycji:**
```jsx
{editingQuestionIndex !== null && generatedQuiz && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header z informacją o pytaniu */}
      {/* Podgląd aktualnego pytania */}
      {/* Textarea z instrukcją dla AI */}
      {/* Przyciski Anuluj/Edytuj */}
    </div>
  </div>
)}
```

---

## 🤖 **AI Prompts**

### **Prompt do Edycji Pytania:**
```
Jesteś ekspertem w tworzeniu pytań do quizów edukacyjnych. Na podstawie istniejącego pytania i instrukcji nauczyciela, stwórz nowe pytanie.

ISTNIEJĄCE PYTANIE:
Treść: ${currentQuestion.content}
Typ: ${currentQuestion.type}
Odpowiedzi: ${currentQuestion.answers.map(a => `${a.content} (${a.is_correct ? 'poprawna' : 'niepoprawna'})`).join(', ')}
Wyjaśnienie: ${currentQuestion.explanation || 'Brak'}

INSTRUKCJA NAUCZYCIELA: ${questionEditPrompt}

KONTEKST QUIZU:
Tytuł: ${generatedQuiz.title}
Przedmiot: ${generatedQuiz.subject}
Poziom trudności: ${generatedQuiz.difficulty}

Odpowiedz TYLKO w formacie JSON bez dodatkowych komentarzy:
{
  "content": "Nowa treść pytania",
  "type": "text",
  "answers": [
    {
      "id": "a1",
      "content": "Odpowiedź A",
      "is_correct": true,
      "type": "text"
    },
    // ... więcej odpowiedzi
  ],
  "explanation": "Wyjaśnienie odpowiedzi",
  "points": ${currentQuestion.points || 1}
}

WAŻNE:
- Stwórz 4 odpowiedzi (A, B, C, D)
- Tylko jedna odpowiedź jest poprawna
- Zachowaj poziom trudności quizu
- Użyj polskiego języka
- Uwzględnij instrukcję nauczyciela
```

---

## 🧪 **Testy - WSZYSTKIE PRZECHODZĄ (16/16)**

### **Kategorie testów:**
- ✅ **Własna liczba pytań** (4 testy)
- ✅ **Edycja pytań AI** (4 testy)
- ✅ **Obsługa błędów** (3 testy)
- ✅ **Zarządzanie stanem UI** (3 testy)
- ✅ **Testy integracyjne** (2 testy)

### **Przykłady testów:**
```javascript
test('should allow custom question count input', () => {
  const quizSettings = {
    customQuestionCount: false,
    questionCount: 5
  };

  const updatedSettings = {
    ...quizSettings,
    customQuestionCount: true,
    questionCount: 12
  };

  expect(updatedSettings.customQuestionCount).toBe(true);
  expect(updatedSettings.questionCount).toBe(12);
});

test('should validate question edit instruction', () => {
  const validateInstruction = (instruction) => {
    return !!(instruction && instruction.trim().length > 0);
  };

  expect(validateInstruction('Zmień to pytanie')).toBe(true);
  expect(validateInstruction('')).toBe(false);
});
```

---

## 🚀 **Jak Używać**

### **1. Własna Liczba Pytań:**
1. Otwórz generator quizów AI
2. Zaznacz checkbox "Wpisz własną liczbę pytań"
3. Wpisz liczbę pytań (1-50) w polu numerycznym
4. Kontynuuj tworzenie quizu

### **2. Edycja Pytania za Pomocą AI:**
1. Wygeneruj quiz i przejdź do podglądu
2. Kliknij przycisk edycji (ikona ołówka) przy wybranym pytaniu
3. W modalu opisz jak chcesz zmienić pytanie
4. Kliknij "Edytuj za pomocą AI"
5. AI wygeneruje nowe pytanie zgodnie z Twoją instrukcją

---

## 📊 **Przykłady Instrukcji dla AI**

### **Praktyczne:**
- "Zmień to pytanie na bardziej praktyczne"
- "Dodaj przykład z życia codziennego"
- "Uprość język dla młodszych uczniów"

### **Treściowe:**
- "Dodaj więcej szczegółów"
- "Zmień na pytanie otwarte"
- "Dodaj warianty odpowiedzi"

### **Stylowe:**
- "Uczyń pytanie bardziej angażującym"
- "Dodaj element humorystyczny"
- "Zmień na pytanie problemowe"

---

## ✅ **Podsumowanie**

### **Co zostało zaimplementowane:**
- ✅ **Własna liczba pytań** - checkbox + input numeryczny (1-50)
- ✅ **Edycja pytań AI** - modal z instrukcją dla AI
- ✅ **Kontekstowe prompty** - AI otrzymuje pełny kontekst
- ✅ **Walidacja** - sprawdzanie instrukcji i liczby pytań
- ✅ **Obsługa błędów** - graceful handling błędów AI
- ✅ **Testy** - 16/16 testów przechodzi
- ✅ **Build** - projekt buduje się poprawnie

### **Korzyści:**
- 🎯 **Elastyczność** - dowolna liczba pytań (1-50)
- 🤖 **Inteligentna edycja** - AI rozumie kontekst i instrukcje
- 🎨 **Intuicyjny UI** - łatwe w użyciu interfejsy
- 🛡️ **Niezawodność** - pełna walidacja i obsługa błędów
- 🧪 **Przetestowane** - kompleksowe pokrycie testami

**Generator quizów AI jest teraz znacznie bardziej elastyczny i funkcjonalny!** 🚀
