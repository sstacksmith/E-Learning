# 🌙 Dark Mode - Dokumentacja

## Jak to działa?

Zamiast dodawać `dark:` do każdej klasy Tailwind na każdej stronie, używamy **CSS Variables**, które automatycznie zmieniają kolory na **CAŁEJ** aplikacji.

## Architektura

### 1. CSS Variables (globals.css)
```css
:root {
  --card-bg: #ffffff;
  --text-primary: #111827;
  /* ... więcej zmiennych */
}

.dark {
  --card-bg: #1f2937;
  --text-primary: #f9fafb;
  /* ... te same zmienne, inne kolory */
}
```

### 2. Automatyczne nadpisywanie (globals.css)
Globalne selektory automatycznie aplikują zmienne do wszystkich elementów:
```css
[class*="bg-white"] {
  background-color: var(--card-bg) !important;
}

[class*="text-gray-800"] {
  color: var(--text-primary) !important;
}

input, textarea, select {
  background-color: var(--input-bg) !important;
  color: var(--input-text) !important;
}
```

### 3. ThemeContext + ThemeToggle
- `ThemeContext.tsx` - zarządza stanem dark mode
- `ThemeToggle.tsx` - przycisk przełączania
- Stan zapisywany w `localStorage`

## Zalety tego podejścia

✅ **Jedna zmiana = cała aplikacja** - zmienne CSS działają globalnie
✅ **Brak ręcznego dodawania `dark:`** - automatyczne dla 90% elementów
✅ **Łatwa konserwacja** - wszystkie kolory w jednym miejscu
✅ **Natychmiastowe działanie** - działa na WSZYSTKICH stronach bez zmian w kodzie
✅ **Wydajność** - CSS Variables są natywne i szybkie

## Dostępne zmienne CSS

### Tła
- `--bg-primary` - główne tło
- `--bg-secondary` - drugie tło
- `--bg-tertiary` - trzecie tło

### Karty
- `--card-bg` - tło karty
- `--card-border` - obramowanie karty
- `--card-hover` - hover na karcie

### Teksty
- `--text-primary` - główny tekst
- `--text-secondary` - drugorzędny tekst
- `--text-tertiary` - trzeci poziom tekstu

### Inputy
- `--input-bg` - tło inputa
- `--input-border` - obramowanie
- `--input-focus` - kolor focusa
- `--input-text` - kolor tekstu
- `--input-placeholder` - placeholder

### Akcenty
- `--accent-blue` - niebieski akcent
- `--accent-green` - zielony akcent
- `--accent-orange` - pomarańczowy akcent
- `--accent-red` - czerwony akcent

## Jak używać w nowych komponentach?

### Opcja 1: Standardowe klasy Tailwind (automatyczne)
```jsx
<div className="bg-white text-gray-800 border-gray-200">
  {/* Automatycznie zmieni się w dark mode! */}
</div>
```

### Opcja 2: CSS Variables bezpośrednio
```jsx
<div style={{ 
  background: 'var(--card-bg)',
  color: 'var(--text-primary)'
}}>
  {/* Używaj zmiennych bezpośrednio */}
</div>
```

### Opcja 3: Tailwind z custom colors
```jsx
<div className="bg-primary text-primary">
  {/* Używaj custom kolorów z tailwind.config.js */}
</div>
```

## Przełączanie dark mode

```jsx
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  return (
    <button onClick={toggleDarkMode}>
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
}
```

## Specjalne przypadki

Jeśli potrzebujesz specjalnego koloru tylko w dark mode:
```css
.my-special-class {
  color: var(--text-primary);
}

.dark .my-special-class {
  color: #custom-color;
}
```

## Pliki do edycji

- **`src/app/globals.css`** - wszystkie zmienne i globalne style
- **`tailwind.config.js`** - konfiguracja custom kolorów
- **`src/context/ThemeContext.tsx`** - logika przełączania
- **`src/components/ThemeToggle.tsx`** - przycisk przełączania

## Co NIE trzeba robić?

❌ Dodawać `dark:` do każdej klasy
❌ Tworzyć osobne komponenty dla dark mode
❌ Sprawdzać `isDarkMode` w każdym komponencie
❌ Edytować style na każdej stronie osobno

## Testowanie

1. Otwórz dowolną stronę aplikacji
2. Kliknij przełącznik słońce/księżyc
3. **WSZYSTKIE** elementy powinny zmienić kolor automatycznie
4. Odśwież stronę - tryb powinien być zachowany (localStorage)

## Troubleshooting

**Problem:** Element nie zmienia koloru w dark mode
**Rozwiązanie:** Sprawdź czy nie ma `!important` nadpisującego zmienne

**Problem:** Kolory są dziwne
**Rozwiązanie:** Sprawdź czy nie mieszasz `dark:` z automatycznymi selektorami

**Problem:** Przełącznik nie działa
**Rozwiązanie:** Sprawdź czy `ThemeProvider` owija całą aplikację w `layout.tsx`

