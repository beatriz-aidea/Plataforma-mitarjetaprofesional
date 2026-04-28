import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const REDSYS_SECRET_KEY = process.env.REDSYS_SECRET_KEY || '';

function getOrderKey(order: string, secret: string): Buffer {
  const key = Buffer.from(secret, 'base64');
  const iv = Buffer.alloc(8, 0);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
  cipher.setAutoPadding(false);
  
  let paddedOrder = order;
  while (paddedOrder.length % 8 !== 0) {
    paddedOrder += '\0';
  }
  
  return Buffer.concat([
    cipher.update(paddedOrder, 'utf8'),
    cipher.final()
  ]);
}

export const createRedsysPayment = functions.https.onCall(async (data, context) => {
  const { planId, uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado.');
  }

  const amountStr = planId === 'premium' ? "3630" : "2178";
  const order = Date.now().toString().slice(-8);

  const params = {
    Ds_Merchant_MerchantCode: "369433412",
    Ds_Merchant_Terminal: "1",
    Ds_Merchant_Currency: "978",
    Ds_Merchant_TransactionType: "0",
    Ds_Merchant_Amount: amountStr,
    Ds_Merchant_Order: order,
    Ds_Merchant_MerchantURL: "https://us-central1-gen-lang-client-0045627709.cloudfunctions.net/redsysNotification",
    Ds_Merchant_UrlOK: "https://mitarjetaprofesional.es/dashboard?payment=success",
    Ds_Merchant_UrlKO: "https://mitarjetaprofesional.es/pricing?payment=cancelled",
    Ds_Merchant_MerchantName: "Mi Tarjeta Profesional"
  };

  const Ds_MerchantParameters = Buffer.from(JSON.stringify(params)).toString('base64');
  const orderKey = getOrderKey(order, REDSYS_SECRET_KEY);
  const Ds_Signature = crypto.createHmac('sha256', orderKey).update(Ds_MerchantParameters).digest('base64');

  await db.collection('users').doc(uid).set({
    pendingOrder: order,
    pendingPlan: planId
  }, { merge: true });

  return {
    Ds_SignatureVersion: "HMAC_SHA256_V1",
    Ds_MerchantParameters,
    Ds_Signature,
    redsysUrl: "https://sis-t.redsys.es:25443/sis/realizarPago"
  };
});

export const redsysNotification = functions.https.onRequest(async (req, res) => {
  const { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } = req.body;

  if (!Ds_MerchantParameters || !Ds_Signature) {
    res.status(200).send('OK');
    return;
  }

  try {
    // 1. Decodificar Ds_MerchantParameters
    const base64Safe = Ds_MerchantParameters.replace(/-/g, '+').replace(/_/g, '/');
    const decodedParamsStr = Buffer.from(base64Safe, 'base64').toString('utf8');
    const decodedParams = JSON.parse(decodedParamsStr);

    const getParam = (key: string) => {
      const foundKey = Object.keys(decodedParams).find(k => k.toLowerCase() === key.toLowerCase());
      return foundKey ? decodedParams[foundKey] : undefined;
    };

    // 2. Obtener Ds_Order
    const dsOrder = getParam('ds_order');
    if (!dsOrder) {
      res.status(200).send('OK');
      return;
    }

    // 3. Cifrar Ds_Order
    const orderKey = getOrderKey(dsOrder, REDSYS_SECRET_KEY);

    // 4. Calcular HMAC-SHA256
    const calculatedSignature = crypto.createHmac('sha256', orderKey).update(Ds_MerchantParameters).digest('base64');

    const expectedSafe = calculatedSignature.replace(/-/g, '+').replace(/_/g, '/');
    const receivedSafe = Ds_Signature.replace(/-/g, '+').replace(/_/g, '/');

    // 5 & 6. Comparar y si no coincide responder 200 y terminar
    if (expectedSafe !== receivedSafe) {
      res.status(200).send('OK');
      return;
    }

    const dsResponse = getParam('ds_response');
    const responseCode = parseInt(dsResponse, 10);

    // Pago autorizado
    if (responseCode >= 0 && responseCode <= 99) {
      const usersSnapshot = await db.collection('users').where('pendingOrder', '==', dsOrder).get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const uid = userDoc.id;
        const pendingPlan = userDoc.data().pendingPlan;

        const now = admin.firestore.Timestamp.now();
        const oneYearLater = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        );

        // Actualizar datos del usuario
        await db.collection('users').doc(uid).update({
          subscriptionStatus: "active",
          subscriptionTier: pendingPlan,
          paymentProvider: "redsys",
          subscriptionStart: now,
          subscriptionEnd: oneYearLater,
          pendingOrder: null,
          pendingPlan: null
        });

        // Crear documento en invoices
        const dsAmount = getParam('ds_amount');
        const totalAmount = parseInt(dsAmount, 10) / 100;
        const amountSinIva = totalAmount / 1.21;
        const invoiceId = `${dsOrder}-${Date.now()}`;

        await db.collection('invoices').doc(invoiceId).set({
          uid: uid,
          amount: parseFloat(amountSinIva.toFixed(2)),
          iva: 21,
          total: totalAmount,
          provider: "redsys",
          status: "paid",
          createdAt: now
        });

        // Enviar notificación a correo
        await db.collection('mail').add({
          to: 'info@aidea.es',
          message: {
            subject: 'Nueva suscripción',
            text: `Nueva suscripción de UID: ${uid}\nPlan: ${pendingPlan}`,
          }
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    res.status(200).send('OK');
  }
});

export const getVCard = functions.runWith({ invoker: 'public' }).https.onRequest(async (req, res) => {
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
      res.status(404).send('Tarjeta no disponible');
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
    if (context?.notes)    lines.push(`NOTE:${(context.notes).replace(/\\r\\n|\\r|\\n/g, ' ').trim()}`);

    const hasAddress = address?.street || address?.city ||
                       address?.province || address?.zip || address?.country;
    if (hasAddress) {
      lines.push(`ADR;TYPE=WORK:;;${address.street || ''};${address.city || ''};${address.province || ''};${address.zip || ''};${address.country || ''}`);
    }

    lines.push('END:VCARD');
    const vcardContent = lines.join('\r\n');

    const firstName = (identity.firstName || 'contacto').replace(/\\s/g, '_');
    const lastName = (identity.lastName || '').replace(/\\s/g, '_');

    res.setHeader('Content-Type', 'text/vcard;charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="${firstName}_${lastName}.vcf"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(vcardContent);

  } catch (error) {
    console.error('Error generando vCard:', error);
    res.status(500).send('Error interno');
  }
});

const { onRequest } = require("firebase-functions/v2/https");
const { GoogleAuth } = require("google-auth-library");
const jwt = require("jsonwebtoken");

exports.generateWalletPass = onRequest(
  { region: "europe-west1", cors: true },
  async (req: any, res: any) => {
    try {
      const { cardId, name, role, company, phone, 
              email, website, primaryColor } = req.body;

      const issuerId = "3388000000023109651";
      const classId = `${issuerId}.tarjeta_profesional_digital`;
      const objectId = `${issuerId}.card_${cardId}`;

      const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/wallet_object.issuer"
      });
      const client = await auth.getClient();
      const credentials = await client.getAccessToken();

      const genericObject = {
        id: objectId,
        classId: classId,
        state: "ACTIVE",
        heroImage: {
          sourceUri: {
            uri: "https://mitarjetaprofesional.es/logoQr.svg"
          }
        },
        backgroundColor: primaryColor || "#d60b52",
        textModulesData: [
          { header: "Cargo", body: role || "", id: "role" },
          { header: "Empresa", body: company || "", id: "company" },
          { header: "Teléfono", body: phone || "", id: "phone" },
          { header: "Email", body: email || "", id: "email" }
        ],
        linksModuleData: {
          uris: [
            {
              uri: `https://mitarjetaprofesional.es/c/${cardId}`,
              description: "Ver tarjeta completa",
              id: "card_url"
            },
            {
              uri: `https://mitarjetaprofesional.es/c/${cardId}?download=vcard`,
              description: "Guardar contacto",
              id: "vcard_url"
            }
          ]
        },
        cardTitle: {
          defaultValue: {
            language: "es",
            value: "Mi Tarjeta Profesional"
          }
        },
        header: {
          defaultValue: {
            language: "es",
            value: name || "Tarjeta Profesional"
          }
        }
      };

      const claims = {
        iss: credentials.client_email,
        aud: "google",
        origins: ["https://mitarjetaprofesional.es"],
        typ: "savetowallet",
        payload: { genericObjects: [genericObject] }
      };

      const token = jwt.sign(claims, credentials.private_key, 
        { algorithm: "RS256" });

      const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
      res.json({ url: saveUrl });

    } catch (error: any) {
      console.error("Error generating wallet pass:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
