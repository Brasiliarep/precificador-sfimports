const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'data', 'tabela_completa.json');

try {
  if (!fs.existsSync(TABELA_FILE)) {
    console.log('Arquivo não encontrado:', TABELA_FILE);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));
  console.log('Total de produtos na tabela:', data.length);

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

  console.log('Origens:', origins);
  console.log('Produtos com Milão ID:', milaoIds.size);
  console.log('Nomes duplicados (aproximado):', duplicates);

  // Verificando os primeiros sugeridos pelo usuário no log anterior
  const sampleNew = data.filter(p => p.rowId === 'produto-969');
  if (sampleNew.length > 0) {
    console.log('Amostra produto-969:', JSON.stringify(sampleNew[0], null, 2));
  }

} catch (err) {
  console.error('Erro:', err.message);
}
