import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore({
  databaseId: 'ai-studio-e8573a2d-567c-4bb1-9792-86cac6762b15'
});

function getRedsysSecret(): string {
  const secret = process.env.REDSYS_SECRET_KEY || '';
  if (!secret) {
    throw new Error('REDSYS_SECRET_KEY no está configurada. Detener ejecución.');
  }
  return secret;
}

function getOrderKey(order: string, secret: string): Buffer {
  const key = Buffer.from(secret, 'base64');
  const iv = Buffer.alloc(8, 0);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
  cipher.setAutoPadding(false);
  let paddedOrder = order;
  while (paddedOrder.length % 8 !== 0) paddedOrder += '\0';
  return Buffer.concat([cipher.update(paddedOrder, 'utf8'), cipher.final()]);
}

function generateSafeOrder(): string {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return (ts + rand).substring(0, 12);
}

export const createRedsysPayment = functions.https.onCall(async (data, context) => {
  const { planId, uid, amount } = data;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado.');
  }

  const REDSYS_SECRET_KEY = getRedsysSecret();

  const planPrices: Record<string, string> = {
    standard: '2178',
    premium: '3630',
    enterprise: '0'
  };

  let amountStr: string;

  if (planId === 'store') {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Importe no válido para pedido de tienda.');
    }
    amountStr = Math.round(Number(amount) * 100).toString();
  } else {
    amountStr = planPrices[planId];
    if (!amountStr) {
      throw new functions.https.HttpsError('invalid-argument', 'Plan no válido.');
    }
  }

  const order = generateSafeOrder();

  const params = {
    Ds_Merchant_MerchantCode: "369433412",
    Ds_Merchant_Terminal: "1",
    Ds_Merchant_Currency: "978",
    Ds_Merchant_TransactionType: "0",
    Ds_Merchant_Amount: amountStr,
    Ds_Merchant_Order: order,
    Ds_Merchant_MerchantURL: "https://redsysnotification-xdvnwns5xq-uc.a.run.app",
    Ds_Merchant_UrlOK: "https://mitarjetaprofesional.es/dashboard?payment=success",
    Ds_Merchant_UrlKO: "https://mitarjetaprofesional.es/pricing?payment=cancelled",
    Ds_Merchant_MerchantName: "Mi Tarjeta Profesional"
  };

  const Ds_MerchantParameters = Buffer.from(JSON.stringify(params)).toString('base64');
  const orderKey = getOrderKey(order, REDSYS_SECRET_KEY);
  const Ds_Signature = crypto.createHmac('sha256', orderKey).update(Ds_MerchantParameters).digest('base64');

  await db.collection('transactions').doc(order).set({
    transactionId: order,
    uid: uid,
    plan: planId,
    amount: parseInt(amountStr, 10),
    status: 'PENDING',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  });

  return {
    Ds_SignatureVersion: "HMAC_SHA256_V1",
    Ds_MerchantParameters,
    Ds_Signature,
    redsysUrl: "https://sis-t.redsys.es:25443/sis/realizarPago"
  };
});

export const redsysNotification = functions.https.onRequest(async (req, res) => {
  const { Ds_MerchantParameters, Ds_Signature } = req.body;

  if (!Ds_MerchantParameters || !Ds_Signature) {
    res.status(200).send('OK');
    return;
  }

  try {
    const REDSYS_SECRET_KEY = getRedsysSecret();

    const base64Safe = Ds_MerchantParameters.replace(/-/g, '+').replace(/_/g, '/');
    const decodedParamsStr = Buffer.from(base64Safe, 'base64').toString('utf8');
    const decodedParams = JSON.parse(decodedParamsStr);

    const getParam = (key: string) => {
      const foundKey = Object.keys(decodedParams).find(k => k.toLowerCase() === key.toLowerCase());
      return foundKey ? decodedParams[foundKey] : undefined;
    };

    const dsOrder = getParam('ds_order');
    if (!dsOrder) { res.status(200).send('OK'); return; }

    const orderKey = getOrderKey(dsOrder, REDSYS_SECRET_KEY);
    const calculatedSignature = crypto.createHmac('sha256', orderKey).update(Ds_MerchantParameters).digest('base64');
    const expectedSafe = calculatedSignature.replace(/-/g, '+').replace(/_/g, '/');
    const receivedSafe = Ds_Signature.replace(/-/g, '+').replace(/_/g, '/');

    if (expectedSafe !== receivedSafe) {
      console.error('Firma Redsys inválida para orden:', dsOrder);
      res.status(200).send('OK');
      return;
    }

    // Responder 200 inmediatamente antes de procesar
    res.status(200).send('OK');

    const transactionRef = db.collection('transactions').doc(dsOrder);
    const transactionSnap = await transactionRef.get();

    // IDEMPOTENCIA: si ya está procesado, no hacer nada
    if (transactionSnap.exists && transactionSnap.data()?.status === 'SUCCESS') {
      console.log('Orden ya procesada, ignorando:', dsOrder);
      return;
    }

    const dsResponse = getParam('ds_response');
    const responseCode = parseInt(dsResponse, 10);

    if (responseCode >= 0 && responseCode <= 99) {
      // Pago autorizado
      if (!transactionSnap.exists) {
        console.error('No se encontró la transacción en Firestore:', dsOrder);
        return;
      }

      const { uid, plan } = transactionSnap.data()!;
      const dsAmount = getParam('ds_amount');
      const totalAmount = parseInt(dsAmount, 10) / 100;
      const now = admin.firestore.Timestamp.now();
      const oneYearLater = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      );

      // Mapear plan a role
      const planToRole: Record<string, string> = {
        standard: 'subscription',
        premium: 'subscription',
        enterprise: 'enterprise'
      };
      const newRole = planToRole[plan] || 'subscription';

      // Actualizar transacción
      await transactionRef.update({
        status: 'SUCCESS',
        updatedAt: now
      });

      // Actualizar usuario: role + datos de suscripción
      await db.collection('users').doc(uid).update({
        role: newRole,
        subscriptionTier: plan,
        subscriptionStatus: 'active',
        paymentProvider: 'redsys',
        subscriptionStart: now,
        subscriptionEnd: oneYearLater
      });

      // Crear factura
      await db.collection('invoices').add({
        uid,
        transactionId: dsOrder,
        amount: parseFloat((totalAmount / 1.21).toFixed(2)),
        iva: 21,
        total: totalAmount,
        plan,
        provider: 'redsys',
        status: 'paid',
        createdAt: now
      });

      // Notificación interna
      await db.collection('mail').add({
        to: 'info@aidea.es',
        message: {
          subject: `Nueva suscripción ${plan}`,
          text: `Pago confirmado.\nUID: ${uid}\nPlan: ${plan}\nTotal: ${totalAmount}€\nOrden: ${dsOrder}`
        }
      });

    } else {
      // Pago denegado
      await transactionRef.update({
        status: 'FAILED',
        responseCode,
        updatedAt: admin.firestore.Timestamp.now()
      });
    }

  } catch (error) {
    console.error('Error en redsysNotification:', error);
  }
});
