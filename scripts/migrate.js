import { initializeApp } from "firebase/app";
import { getFirestore, writeBatch, doc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyBDcD2X2cYc56fL6lDdrPU-wMWL3xRb02w",
  authDomain: "precificador-sfimports.firebaseapp.com",
  projectId: "precificador-sfimports",
  storageBucket: "precificador-sfimports.firebasestorage.app",
  messagingSenderId: "136938631461",
  appId: "1:136938631461:web:ca5abe1fccc91c19502acc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const filePath = path.join(process.cwd(), 'data', 'tabela_completa.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

async function migrate() {
  console.log(`🚀 Iniciando migração de ${data.length} produtos para o Cloud Firestore...`);
  let batch = writeBatch(db);
  let count = 0;
  
  for (const item of data) {
    // Usar rowId como identificador único no Firestore
    const id = (item.rowId || `prod_${item.id}`).toString();
    const docRef = doc(db, "produtos-sf", id);
    
    // Adicionar timestamp de migração
    const payload = {
        ...item,
        migratedAt: new Date().toISOString(),
        active: item.active !== undefined ? item.active : true
    };

    batch.set(docRef, payload);
    count++;
    
    if (count % 400 === 0 || count === data.length) {
      console.log(`📦 Enviando lote... (${count}/${data.length})`);
      await batch.commit();
      batch = writeBatch(db);
      // Pequena pausa para evitar sobrecarga (opcional no Spark mas bom por precaução)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log("✅ Migração concluída com sucesso!");
  process.exit(0);
}

migrate().catch(err => {
    console.error("❌ Erro na migração:", err);
    process.exit(1);
});
