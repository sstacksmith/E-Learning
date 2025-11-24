import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, body, parentEmail, parentName, messageId } = req.body;

    if (!to || !subject || !body || !parentEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Konfiguracja Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'learningplatformcogito@gmail.com',
        pass: 'uzky synx oxaz nenb',
      },
    });

    // Formatuj treść emaila z informacją o emailu rodzica
    // Nauczyciel powinien odpowiedzieć przez platformę
    const emailBody = `
${body}

---
Wiadomość wysłana z platformy e-learningowej przez rodzica:
Email rodzica: ${parentEmail}
${parentName ? `Imię i nazwisko: ${parentName}` : ''}

⚠️ WAŻNE: Rodzic nie ma skrzynki pocztowej.
Aby odpowiedzieć, proszę zalogować się do panelu nauczyciela i odpowiedzieć przez platformę:
https://twoja-domena.pl/homelogin/teacher/messages

ID wiadomości: ${messageId}
    `.trim();

    // Wysyłka emaila
    // Reply-To ustawiamy na skrzynkę platformy, bo rodzic nie ma skrzynki
    const mailOptions = {
      from: 'learningplatformcogito@gmail.com',
      to: to,
      replyTo: 'learningplatformcogito@gmail.com', // Odpowiedzi trafiają na skrzynkę platformy
      subject: `[Platforma E-Learning] ${subject}`,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3b82f6; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h2 style="margin: 0; color: white;">Wiadomość z platformy e-learningowej</h2>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0;">
            <div style="white-space: pre-wrap; line-height: 1.6; color: #1f2937; font-size: 15px;">${body.replace(/\n/g, '<br>')}</div>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 15px;">
              <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: bold;">📧 Informacje o nadawcy:</p>
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>Email rodzica:</strong> ${parentEmail}<br>
                ${parentName ? `<strong>Imię i nazwisko:</strong> ${parentName}<br>` : ''}
                <strong>ID wiadomości:</strong> ${messageId}
              </p>
            </div>
            <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 15px;">
              <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;">
                <strong>⚠️ WAŻNE:</strong> Rodzic nie ma skrzynki pocztowej.<br>
                <strong>Nie odpowiadaj na ten email!</strong> Odpowiedź nie dotrze do rodzica.
              </p>
            </div>
            <div style="background-color: #d1fae5; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 13px; line-height: 1.6;">
                <strong>✅ Jak odpowiedzieć:</strong><br>
                1. Zaloguj się do panelu nauczyciela<br>
                2. Przejdź do sekcji "Wiadomości od rodziców"<br>
                3. Znajdź wiadomość (ID: ${messageId})<br>
                4. Odpowiedz przez platformę - rodzic zobaczy odpowiedź na platformie
              </p>
              <div style="margin-top: 10px; padding: 10px; background-color: #ffffff; border-radius: 4px;">
                <a href="https://twoja-domena.pl/homelogin/teacher/messages" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Przejdź do wiadomości na platformie →
                </a>
              </div>
            </div>
          </div>
        </div>
      `,
      headers: {
        'X-Message-ID': messageId || '',
        'X-Parent-Email': parentEmail,
        'X-Parent-Name': parentName || '',
        'X-Platform': 'E-Learning',
      },
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      success: true,
      message: 'Email wysłany pomyślnie'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Błąd wysyłki emaila',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

