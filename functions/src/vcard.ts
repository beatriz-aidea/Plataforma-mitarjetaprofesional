import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore({
  databaseId: 'ai-studio-e8573a2d-567c-4bb1-9792-86cac6762b15'
});

export const getVCard = functions.https.onRequest(async (req, res) => {
  const cardId = req.path.replace('/', '').trim();

  if (!cardId) {
    res.status(400).send('ID de tarjeta no proporcionado');
    return;
  }

  try {
    const cardDoc = await db.collection('cards').doc(cardId).get();

    if (!cardDoc.exists) {
      res.status(404).send('Tarjeta no encontrada');
      return;
    }

    const card = cardDoc.data()!;

    if (card.status !== 'active') {
      res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Perfil no disponible</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f5;}
.box{text-align:center;padding:2rem;background:white;border-radius:1rem;border:1px solid #e4e4e7;max-width:360px;}
h2{color:#18181b;margin-bottom:.5rem;}p{color:#71717a;}</style>
</head>
<body><div class="box">
<h2>Perfil temporalmente no disponible</h2>
<p>El propietario de esta tarjeta ha desactivado su perfil momentáneamente.</p>
</div></body></html>`);
      return;
    }

    const { identity, contact, address, context } = card;

    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${identity.lastName || ''};${identity.firstName || ''};;;`,
      `FN:${identity.firstName || ''} ${identity.lastName || ''}`,
    ];

    if (identity.company)  lines.push(`ORG:${identity.company}`);
    if (identity.role)     lines.push(`TITLE:${identity.role}`);
    if (contact.mobile)    lines.push(`TEL;TYPE=CELL:${contact.mobile}`);
    if (contact.landline)  lines.push(`TEL;TYPE=WORK,VOICE:${contact.landline}`);
    if (contact.email)     lines.push(`EMAIL;TYPE=WORK,INTERNET:${contact.email}`);
    if (contact.website)   lines.push(`URL:${contact.website}`);
    if (context?.notes)    lines.push(`NOTE:${context.notes.replace(/\\r\\n|\\r|\\n/g, ' ').trim()}`);

    const hasAddress = address?.street || address?.city ||
                       address?.province || address?.zip || address?.country;
    if (hasAddress) {
      lines.push(`ADR;TYPE=WORK:;;${address.street || ''};${address.city || ''};${address.province || ''};${address.zip || ''};${address.country || ''}`);
    }

    lines.push('END:VCARD');

    const vcardString = lines.join('\n');

    res.set('Content-Type', 'text/vcard; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${identity.firstName || 'contacto'}.vcf"`);
    res.status(200).send(vcardString);
  } catch (error) {
    console.error('Error generando VCard:', error);
    res.status(500).send('Error interno del servidor');
  }
});