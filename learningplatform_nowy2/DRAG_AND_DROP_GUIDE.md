# Przewodnik Drag and Drop w Edytorze Treści Lekcji

## Nowa funkcjonalność

Edytor treści lekcji został wzbogacony o funkcjonalność **drag and drop**, która pozwala na intuicyjne przemieszczanie bloków treści w lekcji.

## Jak używać

### 1. Przeciąganie bloków
- **Kliknij i przytrzymaj** ikonę `⋮⋮` (GripVertical) obok nazwy typu bloku
- **Przeciągnij** blok w górę lub w dół do żądanej pozycji
- **Puść** aby umieścić blok w nowym miejscu

### 2. Wizualne wskaźniki
- **Podczas przeciągania:**
  - Blok staje się półprzezroczysty (opacity: 0.5)
  - Pojawia się niebieska ramka i tło
  - Blok lekko się obraca (transform: rotate-1)
  - Pojawia się cień (shadow-xl)

- **Drag overlay:**
  - Podczas przeciągania widoczny jest "duch" bloku
  - Pokazuje typ bloku i jego ikonę
  - Ma niebieską ramkę i cień

### 3. Obszary drop
- **Między blokami:** Możesz upuścić blok między istniejącymi blokami
- **Na początku listy:** Jeśli lista jest pusta, pojawi się wskaźnik "Upuść tutaj aby dodać pierwszy element"

## Komponenty

### DraggableContentBlock
- Opakowuje pojedynczy blok treści
- Zawiera drag handle (ikona ⋮⋮)
- Obsługuje wizualne efekty podczas przeciągania
- Zawiera przyciski akcji (Dodaj po, Usuń)

### DroppableContentArea
- Opakowuje całą listę bloków treści
- Obsługuje logikę drag and drop
- Zawiera DragOverlay dla wizualnego feedbacku
- Automatycznie aktualizuje kolejność bloków

### DropZoneIndicator
- Pokazuje wskaźnik gdzie można upuścić element
- Animowane kropki i tekst
- Pojawia się tylko gdy jest aktywny drag

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

- **@dnd-kit/core** - Główna biblioteka do drag and drop
- **@dnd-kit/sortable** - Sortowanie elementów
- **@dnd-kit/utilities** - Narzędzia pomocnicze
- **@dnd-kit/modifiers** - Modyfikatory (ograniczenie do osi pionowej)

## Responsywność

- Drag and drop działa na urządzeniach dotykowych
- Minimalna odległość aktywacji: 8px (zapobiega przypadkowemu przeciąganiu)
- Obsługa klawiatury dla dostępności

## Dostępność

- Wszystkie elementy mają odpowiednie atrybuty ARIA
- Drag handle ma tooltip z instrukcją
- Obsługa nawigacji klawiaturą
- Wizualne wskaźniki dla użytkowników z problemami wzroku
