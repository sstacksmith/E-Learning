# Konfiguracja Systemu Wiadomości Email dla Rodziców

## Przegląd Systemu

System umożliwia rodzicom wysyłanie wiadomości do nauczycieli przez platformę. Wiadomości są wysyłane na email nauczyciela, a odpowiedzi są automatycznie przekazywane z powrotem na platformę.

## Jak to działa

1. **Rodzic wysyła wiadomość:**
   - Wiadomość jest zapisywana w Firestore (kolekcja `messages`)
   - Email jest wysyłany na adres nauczyciela przez API `/api/send-parent-message`
   - W emailu znajduje się email rodzica i specjalny adres Reply-To

2. **Nauczyciel odpowiada:**
   - Nauczyciel odpowiada na email (Reply)
   - Odpowiedź trafia na specjalny adres email (np. `reply-{messageId}@learningplatformcogito.com`)
   - Email service (SendGrid/Mailgun) przekierowuje odpowiedź do webhook `/api/receive-email-reply`
   - Odpowiedź jest zapisywana w Firestore i wyświetlana rodzicom

## Konfiguracja

### 1. Endpoint wysyłania emaili

Endpoint `/api/send-parent-message` jest już skonfigurowany i używa Gmail SMTP.

### 2. Konfiguracja odbierania odpowiedzi

#### Opcja A: SendGrid Inbound Parse

1. Zaloguj się do [SendGrid](https://sendgrid.com/)
2. Przejdź do **Settings** → **Inbound Parse**
3. Dodaj nowy webhook:
   - **Hostname:** `reply.learningplatformcogito.com` (lub inny subdomena)
   - **Destination URL:** `https://twoja-domena.pl/api/receive-email-reply`
   - **POST the raw, full MIME message:** ✅ (włączone)

4. Skonfiguruj DNS:
   - Dodaj MX record: `reply.learningplatformcogito.com` → `mx.sendgrid.net`

#### Opcja B: Mailgun Routes

1. Zaloguj się do [Mailgun](https://www.mailgun.com/)
2. Przejdź do **Receiving** → **Routes**
3. Utwórz nową route:
   - **Expression:** `match_recipient("reply-.*@learningplatformcogito.com")`
   - **Action:** `forward("https://twoja-domena.pl/api/receive-email-reply")`

4. Skonfiguruj DNS:
   - Dodaj MX record dla domeny

#### Opcja C: Gmail API (zaawansowane)

Można użyć Gmail API do monitorowania skrzynki pocztowej i automatycznego przetwarzania odpowiedzi.

### 3. Aktualizacja endpointu receive-email-reply

Endpoint `/api/receive-email-reply` obecnie tylko loguje odpowiedzi. Aby zapisywać odpowiedzi w Firestore, musisz:

**Opcja 1: Użyć Firebase Functions (zalecane)**

1. Utwórz Firebase Function w `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const receiveEmailReply = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const messageId = req.body['X-Message-ID'] || req.body.messageId;
  const parentEmail = req.body['X-Parent-Email'] || req.body.parentEmail;
  const replyContent = req.body.text || req.body.body;
  const replyFrom = req.body.from || req.body.sender;

  if (!messageId || !parentEmail || !replyContent) {
    return res.status(400).send('Missing required fields');
  }

  const db = admin.firestore();
  
  // Znajdź rodzica po emailu
  const parentSnapshot = await db.collection('users')
    .where('email', '==', parentEmail)
    .limit(1)
    .get();

  if (parentSnapshot.empty) {
    return res.status(404).send('Parent not found');
  }

  const parentDoc = parentSnapshot.docs[0];
  
  // Znajdź kontakt po emailu
  const contactSnapshot = await db.collection('users')
    .where('email', '==', replyFrom)
    .limit(1)
    .get();

  if (contactSnapshot.empty) {
    return res.status(404).send('Contact not found');
  }

  const contactDoc = contactSnapshot.docs[0];

  // Znajdź oryginalną wiadomość
  const messageDoc = await db.collection('messages').doc(messageId).get();
  
  if (messageDoc.exists) {
    // Zaktualizuj istniejącą wiadomość
    await messageDoc.ref.update({
      reply: replyContent,
      replyTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      replyFrom: replyFrom,
      hasReply: true,
    });
  } else {
    // Utwórz nową wiadomość jako odpowiedź
    await db.collection('messages').add({
      from: contactDoc.id,
      to: parentDoc.id,
      content: replyContent,
      subject: req.body.subject || 'Odpowiedź',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      isEmailReply: true,
      originalMessageId: messageId,
      parentEmail: parentEmail,
      replyFrom: replyFrom,
    });
  }

  return res.status(200).send({ success: true });
});
```

2. Wdróż funkcję:
```bash
cd functions
npm run deploy
```

3. Zaktualizuj webhook URL na: `https://us-central1-cogito-8443e.cloudfunctions.net/receiveEmailReply`

**Opcja 2: Użyć Firebase Admin SDK w Next.js API**

Wymaga skonfigurowania Firebase Admin SDK w Next.js (trudniejsze, ale możliwe).

## Struktura danych w Firestore

### Kolekcja `messages`

```typescript
{
  id: string; // auto-generated
  from: string; // UID nadawcy
  to: string; // UID odbiorcy
  content: string; // Treść wiadomości
  subject?: string; // Temat wiadomości
  timestamp: Timestamp; // Data wysłania
  read: boolean; // Czy przeczytane
  emailSent: boolean; // Czy email został wysłany
  parentEmail: string; // Email rodzica (do odpowiedzi)
  parentName?: string; // Imię i nazwisko rodzica
  // Pola odpowiedzi:
  reply?: string; // Treść odpowiedzi
  replyTimestamp?: Timestamp; // Data odpowiedzi
  replyFrom?: string; // Email od którego przyszła odpowiedź
  hasReply?: boolean; // Czy jest odpowiedź
  isEmailReply?: boolean; // Czy to odpowiedź przez email
  originalMessageId?: string; // ID oryginalnej wiadomości
}
```

## Testowanie

### 1. Test wysyłania wiadomości

1. Zaloguj się jako rodzic
2. Przejdź do `/homelogin/parent/messages`
3. Wybierz kontakt (nauczyciela)
4. Napisz wiadomość i wyślij
5. Sprawdź:
   - Czy wiadomość pojawiła się w czacie
   - Czy status "Wysłano email" jest widoczny
   - Czy email dotarł do nauczyciela
   - Czy w emailu jest email rodzica

### 2. Test odbierania odpowiedzi

1. Jako nauczyciel, odpowiedz na email
2. Sprawdź czy odpowiedź trafiła do webhook
3. Sprawdź czy odpowiedź pojawiła się w czacie rodzica

## Rozwiązywanie problemów

### Email nie jest wysyłany

- Sprawdź logi w konsoli przeglądarki (F12)
- Sprawdź logi serwera Next.js
- Sprawdź czy endpoint `/api/send-parent-message` zwraca sukces
- Sprawdź czy Gmail SMTP credentials są poprawne

### Odpowiedzi nie trafiają na platformę

- Sprawdź czy webhook jest skonfigurowany poprawnie
- Sprawdź logi webhook (SendGrid/Mailgun dashboard)
- Sprawdź czy endpoint `/api/receive-email-reply` otrzymuje requesty
- Sprawdź logi Firebase Functions (jeśli używasz)

### Wiadomości nie są wyświetlane

- Sprawdź czy wiadomości są zapisywane w Firestore
- Sprawdź czy query w `fetchMessages` jest poprawne
- Sprawdź czy użytkownik ma odpowiednie uprawnienia do Firestore

## Bezpieczeństwo

1. **Walidacja danych:** Endpoint `/api/receive-email-reply` powinien weryfikować:
   - Signature webhook (jeśli dostępne)
   - IP address (whitelist SendGrid/Mailgun IPs)
   - Rate limiting

2. **Autentykacja:** Rozważ dodanie API key do webhook

3. **Sanityzacja:** Wszystkie dane z emaila powinny być sanityzowane przed zapisaniem

## Następne kroki

1. ✅ Wysyłanie emaili przez platformę - GOTOWE
2. ⏳ Konfiguracja webhook do odbierania odpowiedzi
3. ⏳ Implementacja Firebase Function do zapisywania odpowiedzi
4. ⏳ Dodanie powiadomień o nowych odpowiedziach
5. ⏳ Dodanie możliwości załączników w wiadomościach

