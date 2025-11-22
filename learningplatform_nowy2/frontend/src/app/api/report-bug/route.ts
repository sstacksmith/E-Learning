import { NextRequest, NextResponse } from 'next/server';
import { createTransport } from 'nodemailer';

interface BugReport {
  category: string;
  description: string;
  steps: string;
  expected: string;
  actual: string;
  browser: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const bugReport: BugReport = await request.json();

    // Validate required fields
    if (!bugReport.category || !bugReport.description) {
      return NextResponse.json(
        { error: 'Kategoria i opis są wymagane' },
        { status: 400 }
      );
    }

    // Zapisz do Firestore przez backend API
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const backendResponse = await fetch(`${backendUrl}/api/report-bug/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bugReport),
      });

      if (backendResponse.ok) {
        console.log('Bug report saved to Firestore via backend API');
      } else {
        console.error('Failed to save bug report to Firestore:', await backendResponse.text());
      }
    } catch (backendError) {
      console.error('Error saving to Firestore via backend:', backendError);
      // Kontynuuj wysyłanie emaila nawet jeśli zapis do Firestore się nie powiódł
    }

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email credentials not configured, saving to console instead');
      
      // Log the bug report to console for now
      console.log('=== BUG REPORT ===');
      console.log('Category:', bugReport.category);
      console.log('Description:', bugReport.description);
      console.log('Steps:', bugReport.steps);
      console.log('Expected:', bugReport.expected);
      console.log('Actual:', bugReport.actual);
      console.log('Browser:', bugReport.browser);
      console.log('URL:', bugReport.url);
      console.log('Date:', new Date().toLocaleString('pl-PL'));
      console.log('==================');
      
      return NextResponse.json({
        success: true,
        message: 'Zgłoszenie zostało zapisane (email nie skonfigurowany)',
        note: 'Skonfiguruj EMAIL_USER i EMAIL_PASS w .env.local aby wysyłać emaile'
      });
    }

    // Create transporter (using Gmail SMTP)
    const transporter = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format the email content
    const emailContent = `
🚨 ZGŁOSZENIE BŁĘDU PLATFORMY E-LEARNING

📋 KATEGORIA: ${bugReport.category}

📝 OPIS PROBLEMU:
${bugReport.description}

${bugReport.steps ? `
🔄 KROKI DO ODTWORZENIA:
${bugReport.steps}
` : ''}

${bugReport.expected ? `
✅ OCZEKIWANE ZACHOWANIE:
${bugReport.expected}
` : ''}

${bugReport.actual ? `
❌ RZECZYWISTE ZACHOWANIE:
${bugReport.actual}
` : ''}

${bugReport.browser ? `
🌐 PRZEGLĄDARKA: ${bugReport.browser}
` : ''}

${bugReport.url ? `
🔗 URL: ${bugReport.url}
` : ''}

---
📅 Data zgłoszenia: ${new Date().toLocaleString('pl-PL')}
🔒 Zgłoszenie anonimowe
📧 Wysłane z platformy E-Learning
    `;

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'SosSojowy@outlook.com',
      subject: `[BUG REPORT] ${bugReport.category} - ${new Date().toLocaleDateString('pl-PL')}`,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b, #ffa500); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚨 ZGŁOSZENIE BŁĘDU PLATFORMY E-LEARNING</h1>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #ddd; border-top: none;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 10px 0;">📋 KATEGORIA</h2>
              <p style="margin: 0; font-weight: bold; color: #e74c3c;">${bugReport.category}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 10px 0;">📝 OPIS PROBLEMU</h2>
              <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${bugReport.description}</p>
            </div>
            
            ${bugReport.steps ? `
            <div style="margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 10px 0;">🔄 KROKI DO ODTWORZENIA</h2>
              <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${bugReport.steps}</p>
            </div>
            ` : ''}
            
            ${bugReport.expected ? `
            <div style="margin-bottom: 20px;">
              <h2 style="color: #27ae60; margin: 0 0 10px 0;">✅ OCZEKIWANE ZACHOWANIE</h2>
              <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${bugReport.expected}</p>
            </div>
            ` : ''}
            
            ${bugReport.actual ? `
            <div style="margin-bottom: 20px;">
              <h2 style="color: #e74c3c; margin: 0 0 10px 0;">❌ RZECZYWISTE ZACHOWANIE</h2>
              <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${bugReport.actual}</p>
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
              ${bugReport.browser ? `
              <div style="flex: 1;">
                <h3 style="color: #333; margin: 0 0 5px 0;">🌐 PRZEGLĄDARKA</h3>
                <p style="margin: 0; color: #666;">${bugReport.browser}</p>
              </div>
              ` : ''}
              
              ${bugReport.url ? `
              <div style="flex: 1;">
                <h3 style="color: #333; margin: 0 0 5px 0;">🔗 URL</h3>
                <p style="margin: 0; color: #666; word-break: break-all;">${bugReport.url}</p>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">📅 Data zgłoszenia: ${new Date().toLocaleString('pl-PL')}</p>
            <p style="margin: 5px 0 0 0;">🔒 Zgłoszenie anonimowe | 📧 Wysłane z platformy E-Learning</p>
          </div>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Zgłoszenie zostało wysłane pomyślnie'
    });

  } catch (error) {
    console.error('Error sending bug report:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas wysyłania zgłoszenia' },
      { status: 500 }
    );
  }
}
