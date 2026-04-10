import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const configData = fs.readFileSync(configPath, 'utf8');
const firebaseConfig = JSON.parse(configData);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log('Iniciando la inserción de la empresa de ejemplo...');
  try {
    const companyData = {
      name: "Empresa Ejemplo S.L.",
      type: "company",
      status: "active",
      adminUid: "",
      parentCompanyId: null,
      logo: "",
      domain: "",
      customFields: [],
      fieldTemplateId: "",
      createdAt: serverTimestamp(),
      createdBy: ""
    };

    const docRef = await addDoc(collection(db, 'companies'), companyData);
    console.log(`✅ Documento insertado con ID: ${docRef.id}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al insertar el documento:', error);
    process.exit(1);
  }
}

seed();
