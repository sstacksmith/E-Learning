import type { NextApiRequest, NextApiResponse } from 'next';
const formidable = require('formidable');
import nodemailer from 'nodemailer';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '30mb',
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm({ multiples: true, maxFileSize: 30 * 1024 * 1024 });

  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) {
      console.error('FORM ERROR:', err);
      return res.status(500).json({ error: 'Błąd parsowania formularza', details: err?.message || err });
    }
    const to = Array.isArray(fields.to) ? fields.to[0] : fields.to;
    const subject = Array.isArray(fields.subject) ? fields.subject[0] : fields.subject;
    const body = Array.isArray(fields.body) ? fields.body[0] : fields.body;
    // Konfiguracja Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'learningplatformcogito@gmail.com',
        pass: 'uzky synx oxaz nenb',
      },
    });
    // Załączniki
    let attachments: any[] = [];
    if (files.attachments) {
      const filesArr = Array.isArray(files.attachments) ? files.attachments : [files.attachments];
      attachments = filesArr.map((file: any) => ({
        filename: file.originalFilename || file.newFilename,
        path: file.filepath,
      }));
    }
    try {
      await transporter.sendMail({
        from: 'learningplatformcogito@gmail.com',
        to,
        subject,
        text: body,
        attachments,
      });
      return res.status(200).json({ success: true });
    } catch (e: any) {
      console.error('MAIL ERROR:', e);
      return res.status(500).json({ error: 'Błąd wysyłki maila', details: e?.message || e });
    }
  });
} 