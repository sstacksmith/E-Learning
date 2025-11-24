import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Endpoint do odbierania odpowiedzi emailowych
 * 
 * Ten endpoint można podpiąć do:
 * 1. Webhook email service (np. SendGrid Inbound Parse, Mailgun Routes)
 * 2. Gmail API webhook
 * 3. Innego systemu odbierania emaili
 * 
 * Przykład konfiguracji dla SendGrid:
 * - Ustaw webhook URL na: https://twoja-domena.pl/api/receive-email-reply
 * - SendGrid będzie wysyłał POST z danymi emaila
 * 
 * Przykład konfiguracji dla Mailgun:
 * - Ustaw route na: https://twoja-domena.pl/api/receive-email-reply
 * - Mailgun będzie wysyłał POST z danymi emaila
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Różne serwisy emailowe mogą wysyłać dane w różnych formatach
    // Przykład dla SendGrid:
    const messageId = req.body['X-Message-ID'] || req.body.messageId || req.body['message-id'];
    const parentEmail = req.body['X-Parent-Email'] || req.body.parentEmail;
    const replyContent = req.body.text || req.body.body || req.body['stripped-text'];
    const replyFrom = req.body.from || req.body.sender || req.body['from-email'];
    const replySubject = req.body.subject;

    // Przykład dla Mailgun:
    // const messageId = req.body['X-Message-ID'];
    // const replyContent = req.body['body-plain'];
    // const replyFrom = req.body.sender;

    if (!messageId || !parentEmail || !replyContent) {
      console.log('Missing fields:', { messageId, parentEmail, replyContent: !!replyContent });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Wywołaj funkcję klienta do zapisania odpowiedzi
    // W produkcji możesz użyć Firebase Admin SDK tutaj
    // Na razie zwracamy sukces - faktyczne zapisanie będzie przez frontend
    console.log('Email reply received:', {
      messageId,
      parentEmail,
      replyFrom,
      replySubject,
      contentLength: replyContent.length
    });

    // TODO: W produkcji użyj Firebase Admin SDK do zapisania odpowiedzi
    // const admin = require('firebase-admin');
    // if (!admin.apps.length) {
    //   admin.initializeApp();
    // }
    // const db = admin.firestore();
    // ... zapisz odpowiedź

    return res.status(200).json({ 
      success: true,
      message: 'Odpowiedź otrzymana - zostanie przetworzona'
    });
  } catch (error) {
    console.error('Error processing email reply:', error);
    return res.status(500).json({ 
      error: 'Błąd przetwarzania odpowiedzi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

