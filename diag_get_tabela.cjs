const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TABELA_FILE = path.join(DATA_DIR, 'tabela_completa.json');

async function readTabela(retryCount = 3) {
  for (let i = 0; i < retryCount; i++) {
    try {
      if (!fs.existsSync(TABELA_FILE)) {
        console.log('File does not exist');
        return [];
      }
      const data = fs.readFileSync(TABELA_FILE, 'utf8');
      if (!data || data.trim() === '') {
        console.log('File is empty');
        return [];
      }
      return JSON.parse(data);
    } catch (err) {
      console.error(`⚠️ [readTabela] Tentativa ${i + 1} falhou:`, err.message);
      if (i === retryCount - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

readTabela().then(data => {
  console.log('Successfully read:', data.length, 'items');
}).catch(err => {
  console.error('CRITICAL ERROR:', err);
});
