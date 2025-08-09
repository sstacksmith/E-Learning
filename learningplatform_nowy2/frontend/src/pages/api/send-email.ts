import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import nodemailer from 'nodemailer';
// import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '30mb',
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm({ multiples: true, maxFileSize: 30 * 1024 * 1024 });

  form.parse(req, async (err: Error | null, fields: Record<string, unknown>, files: Record<string, unknown>) => {
    if (err) {
      console.error('FORM ERROR:', err);
      return res.status(500).json({ error: 'Błąd parsowania formularza', details: err?.message || String(err) });
    }
    const toVal = fields.to as string | string[] | undefined;
    const subjectVal = fields.subject as string | string[] | undefined;
    const bodyVal = fields.body as string | string[] | undefined;

    const to = Array.isArray(toVal) ? toVal[0] : toVal;
    const subject = Array.isArray(subjectVal) ? subjectVal[0] : subjectVal;
    const body = Array.isArray(bodyVal) ? bodyVal[0] : bodyVal;
    // Konfiguracja Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'learningplatformcogito@gmail.com',
        pass: 'uzky synx oxaz nenb',
      },
    });
    // Załączniki
    let attachments: { filename: string; path: string }[] = [];
    const rawAttachments = (files as Record<string, unknown>)['attachments'];
    if (rawAttachments) {
      const filesArr = Array.isArray(rawAttachments) ? rawAttachments : [rawAttachments];
      attachments = filesArr.map((file: Record<string, string>) => ({
        filename: file.originalFilename || file.newFilename,
        path: file.filepath,
      }));
    }
    try {
      await transporter.sendMail({
        from: 'learningplatformcogito@gmail.com',
        to,
        subject,
        text: body as string,
        attachments,
      });
      return res.status(200).json({ success: true });
    } catch (e) {
      if (e instanceof Error) {
        console.error('MAIL ERROR:', e.message);
        return res.status(500).json({ error: 'Błąd wysyłki maila', details: e.message });
      } else {
        console.error('MAIL ERROR:', e);
        return res.status(500).json({ error: 'Błąd wysyłki maila', details: String(e) });
      }
    }
  });
} 