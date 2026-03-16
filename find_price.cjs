const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function searchInFile(filePath, query) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(query)) {
      console.log(`Encontrado em ${filePath}`);
      // Tentamos extrair o contexto
      const idx = content.indexOf(query);
      console.log('Contexto:', content.substring(idx - 100, idx + 200));
    }
  } catch (err) {}
}

const files = fs.readdirSync(DATA_DIR);
files.forEach(f => {
  if (f.endsWith('.json')) {
    searchInFile(path.join(DATA_DIR, f), '598.8');
    searchInFile(path.join(DATA_DIR, f), '598,8');
  }
});
