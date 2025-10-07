# Implementacja Drag and Drop w Edytorze Treści Lekcji

## Podsumowanie

Zaimplementowano funkcjonalność drag and drop dla bloków treści w edytorze lekcji, umożliwiając intuicyjne przemieszczanie elementów treści.

## Nowe komponenty

### 1. DraggableContentBlock.tsx
**Lokalizacja:** `src/components/DraggableContentBlock.tsx`

**Funkcjonalność:**
- Opakowuje pojedynczy blok treści lekcji
- Zawiera drag handle (ikona GripVertical)
- Obsługuje wizualne efekty podczas przeciągania
- Zawiera przyciski akcji (Dodaj po, Usuń)

**Kluczowe cechy:**
- Używa `useSortable` z @dnd-kit
- Animacje CSS podczas przeciągania
- Responsywny design
- Tooltip z instrukcją użycia

### 2. DroppableContentArea.tsx
**Lokalizacja:** `src/components/DroppableContentArea.tsx`

**Funkcjonalność:**
- Opakowuje całą listę bloków treści
- Obsługuje logikę drag and drop
- Zawiera DragOverlay dla wizualnego feedbacku
- Automatycznie aktualizuje kolejność bloków

**Kluczowe cechy:**
- Używa `DndContext` i `SortableContext`
- Ograniczenie do osi pionowej
- Obsługa klawiatury dla dostępności
- Minimalna odległość aktywacji (8px)

### 3. DropZoneIndicator.tsx
**Lokalizacja:** `src/components/DropZoneIndicator.tsx`

**Funkcjonalność:**
- Pokazuje wskaźnik gdzie można upuścić element
- Animowane kropki i tekst
- Pojawia się tylko gdy jest aktywny drag

## Modyfikacje istniejących plików

### page.tsx (Edytor kursów)
**Lokalizacja:** `src/app/homelogin/teacher/courses/[id]/page.tsx`

**Zmiany:**
- Dodano importy nowych komponentów
- Dodano funkcję `reorderContentBlocks`
- Zastąpiono statyczną listę bloków komponentem z drag and drop
- Przeniesiono wskaźnik pustej lekcji do środka DroppableContentArea

## Funkcje techniczne

### reorderContentBlocks
```typescript
const reorderContentBlocks = (newOrder: ContentBlock[]) => {
  setLessonContent(newOrder);
};
```

### Aktualizacja kolejności
Po każdym przeciągnięciu, kolejność bloków jest automatycznie aktualizowana:
```typescript
const updatedOrder = newOrder.map((block, index) => ({
  ...block,
  order: index
}));
```

## Biblioteki używane

- **@dnd-kit/core** (^6.3.1) - Główna biblioteka do drag and drop
- **@dnd-kit/sortable** (^10.0.0) - Sortowanie elementów
- **@dnd-kit/utilities** (^3.2.2) - Narzędzia pomocnicze

## Wizualne efekty

### Podczas przeciągania:
- Blok staje się półprzezroczysty (opacity: 0.5)
- Pojawia się niebieska ramka i tło
- Blok lekko się obraca (transform: rotate-1)
- Pojawia się cień (shadow-xl)

### Drag overlay:
- Podczas przeciągania widoczny jest "duch" bloku
- Pokazuje typ bloku i jego ikonę
- Ma niebieską ramkę i cień

### Hover efekty:
- Drag handle powiększa się przy hover
- Bloki mają subtelny cień przy hover
- Płynne przejścia CSS

## Dostępność

- Wszystkie elementy mają odpowiednie atrybuty ARIA
- Drag handle ma tooltip z instrukcją
- Obsługa nawigacji klawiaturą
- Wizualne wskaźniki dla użytkowników z problemami wzroku

## Responsywność

- Drag and drop działa na urządzeniach dotykowych
- Minimalna odległość aktywacji: 8px (zapobiega przypadkowemu przeciąganiu)
- Responsywny design dla różnych rozmiarów ekranów

## Testowanie

- Wszystkie komponenty przechodzą linting bez błędów
- Komponenty są w pełni typowane w TypeScript
- Brak ostrzeżeń ESLint dla nowych komponentów

## Instrukcje użycia

1. **Przeciąganie bloków:**
   - Kliknij i przytrzymaj ikonę `⋮⋮` obok nazwy typu bloku
   - Przeciągnij blok w górę lub w dół do żądanej pozycji
   - Puść aby umieścić blok w nowym miejscu

2. **Wizualne wskaźniki:**
   - Podczas przeciągania blok staje się półprzezroczysty
   - Pojawia się "duch" bloku pokazujący co jest przeciągane
   - Niebieskie wskaźniki pokazują gdzie można upuścić element

3. **Obszary drop:**
   - Między blokami: Możesz upuścić blok między istniejącymi blokami
   - Na początku listy: Jeśli lista jest pusta, pojawi się wskaźnik

## Pliki dokumentacji

- `DRAG_AND_DROP_GUIDE.md` - Przewodnik użytkownika
- `DRAG_AND_DROP_IMPLEMENTATION.md` - Ten plik z technicznymi szczegółami
