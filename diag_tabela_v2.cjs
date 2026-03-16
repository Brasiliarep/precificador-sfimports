const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'data', 'tabela_completa.json');
const OUTPUT_FILE = path.join(__dirname, 'diag_tabela_result.txt');

try {
  if (!fs.existsSync(TABELA_FILE)) {
    fs.writeFileSync(OUTPUT_FILE, 'Arquivo não encontrado: ' + TABELA_FILE);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));
  let result = 'Total de produtos na tabela: ' + data.length + '\n';

  const origins = {};
  const milaoIds = new Set();
  const names = new Set();
  let duplicates = 0;

  data.forEach(p => {
    const origin = p.origin || 'unknown';
    origins[origin] = (origins[origin] || 0) + 1;

    const mId = p.metadata?.milaoId || p.milaoId;
    if (mId) milaoIds.add(mId);

    const name = (p.supplierName || p.productName || '').toLowerCase().trim();
    if (names.has(name)) {
      duplicates++;
    } else {
      names.add(name);
    }
  });

  result += 'Origens:\n' + JSON.stringify(origins, null, 2) + '\n';
  result += 'Produtos com Milão ID: ' + milaoIds.size + '\n';
  result += 'Nomes duplicados (aproximado): ' + duplicates + '\n';

  const sampleNew = data.filter(p => p.rowId === 'produto-969');
  if (sampleNew.length > 0) {
    result += '\nAmostra produto-969:\n' + JSON.stringify(sampleNew[0], null, 2) + '\n';
  }

  fs.writeFileSync(OUTPUT_FILE, result);
  console.log('Fim script');
} catch (err) {
  fs.writeFileSync(OUTPUT_FILE, 'Erro: ' + err.message);
}
