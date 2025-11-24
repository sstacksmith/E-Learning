# System Wiadomości Rodzic-Nauczyciel

## ⚠️ WAŻNE: Rodzice nie mają skrzynki pocztowej!

System został zaprojektowany z myślą, że **rodzice nie mają skrzynki pocztowej**. Wszystkie odpowiedzi są widoczne tylko na platformie.

## Jak to działa

### 1. **Rodzic wysyła wiadomość** (`/homelogin/parent/messages`)

1. Rodzic wybiera kontakt (nauczyciela, wychowawcę, sekretariat)
2. Pisze wiadomość i klika "Wyślij"
3. System:
   - Zapisuje wiadomość w Firestore (kolekcja `messages`)
   - Wysyła email na adres nauczyciela przez API `/api/send-parent-message`
   - W emailu znajduje się:
     - Treść wiadomości
     - Email rodzica (tylko informacyjnie)
     - **WAŻNA INFORMACJA**: Rodzic nie ma skrzynki pocztowej - nauczyciel musi odpowiedzieć przez platformę

### 2. **Nauczyciel otrzymuje wiadomość**

Nauczyciel otrzymuje email z informacją:
- Treść wiadomości od rodzica
- Email rodzica (tylko informacyjnie)
- **⚠️ WAŻNE: Rodzic nie ma skrzynki pocztowej**
- **✅ Instrukcja**: Odpowiedz przez platformę (panel nauczyciela)

### 3. **Nauczyciel odpowiada przez platformę** (`/homelogin/teacher/messages`)

1. Nauczyciel loguje się do panelu nauczyciela
2. Przechodzi do `/homelogin/teacher/messages`
3. Widzi listę wiadomości od rodziców
4. Wybiera wiadomość i odpowiada przez platformę
5. System:
   - Zapisuje odpowiedź w Firestore (pole `reply` w oryginalnej wiadomości)
   - Ustawia `hasReply: true` i `replyTimestamp`
   - **NIE wysyła emaila do rodzica** (bo rodzic nie ma skrzynki)

### 4. **Rodzic widzi odpowiedź na platformie**

1. Rodzic loguje się do panelu rodzica
2. Przechodzi do `/homelogin/parent/messages`
3. Widzi odpowiedź od nauczyciela:
   - Oryginalna wiadomość (niebieska)
   - Odpowiedź nauczyciela (zielona, z ikoną ✓)
   - Data odpowiedzi
4. **Wiadomości odświeżają się automatycznie co 5 sekund**
5. **Automatyczne przewijanie do najnowszej wiadomości**

## Struktura danych

### Kolekcja `messages` w Firestore:

```typescript
{
  id: string; // auto-generated
  from: string; // UID nadawcy (rodzica)
  to: string; // UID odbiorcy (nauczyciela)
  content: string; // Treść wiadomości
  subject?: string; // Temat wiadomości
  timestamp: Timestamp; // Data wysłania
  read: boolean; // Czy przeczytane przez nauczyciela
  emailSent: boolean; // Czy email został wysłany do nauczyciela
  parentEmail: string; // Email rodzica (tylko informacyjnie)
  parentName?: string; // Imię i nazwisko rodzica
  
  // Pola odpowiedzi (jeśli nauczyciel odpowiedział przez platformę):
  reply?: string; // Treść odpowiedzi
  replyTimestamp?: Timestamp; // Data odpowiedzi
  replyFrom?: string; // Email nauczyciela
  hasReply?: boolean; // Czy jest odpowiedź
}
```

## Endpointy API

### `/api/send-parent-message`
- **Metoda:** POST
- **Body:**
  ```json
  {
    "to": "nauczyciel@example.com",
    "subject": "Temat wiadomości",
    "body": "Treść wiadomości",
    "parentEmail": "rodzic@example.com",
    "parentName": "Jan Kowalski",
    "messageId": "message-id-from-firestore"
  }
  ```
- **Działanie:**
  - Wysyła email na adres nauczyciela
  - **Reply-To ustawione na skrzynkę platformy** (nie na email rodzica)
  - W emailu jest **ostrzeżenie**, że rodzic nie ma skrzynki
  - Instrukcja, aby odpowiedzieć przez platformę

## Strony

### `/homelogin/parent/messages` - Panel rodzica
- Lista kontaktów (wychowawca, sekretariat, specjaliści)
- Czat z wybranym kontaktem
- Wysyłanie wiadomości
- Status wysłania emaila do nauczyciela
- **Wyświetlanie odpowiedzi od nauczyciela** (zielone wiadomości)
- **Auto-odświeżanie co 5 sekund**
- **Auto-przewijanie do najnowszej wiadomości**
- Informacja, że odpowiedzi są tylko na platformie

### `/homelogin/teacher/messages` - Panel nauczyciela
- Lista wiadomości od rodziców
- Licznik nieprzeczytanych wiadomości
- Wyświetlanie szczegółów wiadomości
- Formularz odpowiedzi
- Wysyłanie odpowiedzi przez platformę (zapisuje w Firestore)
- **NIE wysyła emaila do rodzica** (bo rodzic nie ma skrzynki)

## Zalety tego rozwiązania

1. **Działa bez skrzynki pocztowej rodzica:**
   - Wszystkie odpowiedzi są na platformie
   - Rodzic nie potrzebuje emaila

2. **Proste dla nauczyciela:**
   - Otrzymuje email z informacją o wiadomości
   - Odpowiada przez platformę (prosty formularz)

3. **Automatyczne odświeżanie:**
   - Rodzic widzi odpowiedzi bez odświeżania strony
   - Auto-przewijanie do najnowszych wiadomości

4. **Historia wiadomości:**
   - Wszystkie wiadomości są zapisane w Firestore
   - Można zobaczyć historię rozmowy

## Przepływ wiadomości

```
Rodzic (platforma) 
  → Email do nauczyciela (informacja o wiadomości)
  → Nauczyciel widzi wiadomość (email + platforma)
  → Nauczyciel odpowiada przez platformę
  → Odpowiedź zapisuje się w Firestore
  → Rodzic widzi odpowiedź na platformie (auto-odświeżanie)
```

## Testowanie

1. **Test wysyłania:**
   - Zaloguj się jako rodzic
   - Przejdź do `/homelogin/parent/messages`
   - Wybierz kontakt
   - Wyślij wiadomość
   - Sprawdź czy email dotarł do nauczyciela
   - Sprawdź czy w emailu jest ostrzeżenie o braku skrzynki rodzica

2. **Test odpowiedzi przez platformę:**
   - Zaloguj się jako nauczyciel
   - Przejdź do `/homelogin/teacher/messages`
   - Wybierz wiadomość
   - Napisz odpowiedź i wyślij
   - Sprawdź czy odpowiedź jest zapisana w Firestore (pole `reply`)
   - Sprawdź czy odpowiedź jest widoczna dla rodzica na platformie

3. **Test auto-odświeżania:**
   - Jako rodzic, otwórz panel wiadomości
   - Jako nauczyciel, wyślij odpowiedź
   - Sprawdź czy odpowiedź pojawiła się u rodzica (bez odświeżania strony)

## Uwagi

- **Rodzice nie mają skrzynki pocztowej** - wszystkie odpowiedzi są na platformie
- **Nauczyciel odpowiada tylko przez platformę** - nie przez email
- **Auto-odświeżanie co 5 sekund** - rodzic widzi nowe odpowiedzi automatycznie
- **Auto-przewijanie** - zawsze widoczne najnowsze wiadomości
- **W przyszłości można dodać** powiadomienia push o nowych odpowiedziach
- **W przyszłości można dodać** dźwiękowe powiadomienia o nowych odpowiedziach
