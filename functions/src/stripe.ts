import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore({
  databaseId: 'ai-studio-e8573a2d-567c-4bb1-9792-86cac6762b15'
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

const PRICE_IDS: Record<string, string> = {
  standard: 'price_1TRptR8g3MWRPChULS3tCLNn',
  premium: 'price_1TRpu98g3MWRPChUVqeVcpoe',
  'pvc-qr': 'price_1TRq418g3MWRPChUQif0Usyr',
  'pvc-qr-nfc': 'price_1TRq4y8g3MWRPChU8izwVQY9',
  'classic-100': 'price_1TRq4y8g3MWRPChU8izwVQY9',
  'classic-250': 'price_1TRqEF8g3MWRPChUQbdprXNv',
  'classic-500': 'price_1TRpz78g3MWRPChUwAletMqf',
  'classic-1000': 'price_1TRqEE8g3MWRPChUEJuL7lSF'
};

export const createStripeCheckout = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  try {
    const { priceKey, uid, orderId, amount } = req.body;

    if (!uid) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    let lineItems;

    if (priceKey === 'store_custom' && amount) {
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Pedido Tienda' },
          unit_amount: Math.round(Number(amount) * 100)
        },
        quantity: 1
      }];
    } else {
      const priceId = PRICE_IDS[priceKey];
      if (!priceId) {
        res.status(400).json({ error: `Producto no válido: ${priceKey}` });
        return;
      }
      lineItems = [{ price: priceId, quantity: 1 }];
    }

    const isSubscription = priceKey === 'standard' || priceKey === 'premium';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `https://mitarjetaprofesional.es/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://mitarjetaprofesional.es/pricing?payment=cancelled`,
      metadata: { uid, orderId: orderId || '', priceKey }
    });

    await db.collection('transactions').doc(session.id).set({
      sessionId: session.id,
      uid,
      priceKey,
      orderId: orderId || '',
      status: 'PENDING',
      provider: 'stripe',
      createdAt: admin.firestore.Timestamp.now()
    });

    res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error('Error createStripeCheckout:', error);
    res.status(500).json({ error: error.message });
  }
});

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { uid, priceKey, orderId } = session.metadata || {};

      if (!uid) { res.status(200).send('OK'); return; }

      const now = admin.firestore.Timestamp.now();
      const oneYearLater = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      );

      await db.collection('transactions').doc(session.id).update({
        status: 'SUCCESS',
        updatedAt: now
      });

      if (priceKey === 'standard' || priceKey === 'premium') {
        await db.collection('users').doc(uid).update({
          role: 'subscription',
          subscriptionTier: priceKey,
          subscriptionStatus: 'active',
          paymentProvider: 'stripe',
          subscriptionStart: now,
          subscriptionEnd: oneYearLater
        });
      }

      if (orderId) {
        await db.collection('orders').doc(orderId).update({
          status: 'paid',
          paymentProvider: 'stripe',
          stripeSessionId: session.id,
          updatedAt: now
        });
      }

      await db.collection('invoices').add({
        uid,
        stripeSessionId: session.id,
        amount: (session.amount_total || 0) / 100,
        priceKey,
        provider: 'stripe',
        status: 'paid',
        createdAt: now
      });

      await db.collection('mail').add({
        to: 'info@aidea.es',
        message: {
          subject: `Nuevo pago: ${priceKey}`,
          text: `Pago confirmado.\nUID: ${uid}\nProducto: ${priceKey}\nTotal: ${(session.amount_total || 0) / 100}€`
        }
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(200).send('OK');
  }
});
