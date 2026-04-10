import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

const templates = [
  {
    id: "empresa_generica",
    data: {
      sector: "empresa_generica",
      name: "Empresa genérica",
      icon: "🏢",
      fields: [
        { id: "departamento", label: "Departamento", type: "text", required: false },
        { id: "cargo", label: "Cargo", type: "text", required: false },
        { id: "sede", label: "Sede", type: "text", required: false },
        { id: "tipo_contrato", label: "Tipo de contrato", type: "select", required: false, options: [] },
        { id: "dni", label: "DNI", type: "text", required: false },
        { id: "fecha_ingreso", label: "Fecha de ingreso", type: "date", required: false },
        { id: "fecha_salida", label: "Fecha de salida", type: "date", required: false }
      ]
    }
  },
  {
    id: "inmobiliaria",
    data: {
      sector: "inmobiliaria",
      name: "Inmobiliaria / Asociación",
      icon: "🏠",
      fields: [
        { id: "zona", label: "Zona", type: "text", required: false },
        { id: "num_identificacion", label: "Nº identificación", type: "text", required: false },
        { id: "fecha_alta", label: "Fecha de alta", type: "date", required: false },
        { id: "fecha_baja", label: "Fecha de baja", type: "date", required: false },
        { id: "cuentas_asociadas", label: "Cuentas asociadas", type: "text", required: false }
      ]
    }
  },
  {
    id: "federacion_deportiva",
    data: {
      sector: "federacion_deportiva",
      name: "Federación deportiva",
      icon: "⚽",
      fields: [
        { id: "deporte", label: "Deporte", type: "text", required: false },
        { id: "categoria", label: "Categoría", type: "select", required: false, options: [] },
        { id: "num_federado", label: "Nº federado", type: "text", required: false },
        { id: "club", label: "Club", type: "text", required: false },
        { id: "licencia", label: "Licencia", type: "text", required: false },
        { id: "tipo_cuota", label: "Tipo de cuota", type: "select", required: false, options: [] },
        { id: "importe", label: "Importe", type: "number", required: false },
        { id: "fecha_alta", label: "Fecha de alta", type: "date", required: false },
        { id: "fecha_baja", label: "Fecha de baja", type: "date", required: false },
        { id: "observaciones", label: "Observaciones", type: "text", required: false }
      ]
    }
  },
  {
    id: "asociacion_generica",
    data: {
      sector: "asociacion_generica",
      name: "Asociación genérica",
      icon: "🤝",
      fields: [
        { id: "num_socio", label: "Nº socio", type: "text", required: false },
        { id: "fecha_alta", label: "Fecha de alta", type: "date", required: false },
        { id: "fecha_baja", label: "Fecha de baja", type: "date", required: false },
        { id: "cuota", label: "Cuota", type: "number", required: false },
        { id: "cargo_asociacion", label: "Cargo en asociación", type: "text", required: false }
      ]
    }
  }
];

async function seed() {
  console.log('Iniciando la inserción de plantillas de campos...');
  try {
    for (const template of templates) {
      const docRef = doc(db, 'fieldTemplates', template.id);
      await setDoc(docRef, template.data);
      console.log(`✅ Documento insertado: ${template.id}`);
    }
    console.log('🎉 Todas las plantillas se han insertado correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al insertar los documentos:', error);
    process.exit(1);
  }
}

seed();
