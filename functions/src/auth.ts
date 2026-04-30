import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore({
  databaseId: 'ai-studio-e8573a2d-567c-4bb1-9792-86cac6762b15'
});

export const onUserCreated = functions.auth.user().onCreate(async (user: any) => {
  try {
    await db.collection('mail').add({
      to: 'info@mitarjetaprofesional.es',
      message: {
        subject: 'Nuevo registro',
        text: `Se ha registrado un nuevo usuario con el correo: ${user.email}`
      }
    });
  } catch (error) {
    console.error('Error al enviar correo de nuevo registro:', error);
  }
});
