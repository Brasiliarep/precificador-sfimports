const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'data', 'tabela_completa.json');

try {
  const data = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));
  const found = data.filter(p => 
    (p.supplierName || '').toLowerCase().includes('natu') ||
    (p.productName || '').toLowerCase().includes('natu') ||
    (p.supplierName || '').toLowerCase().includes('nobilis') ||
    (p.productName || '').toLowerCase().includes('nobilis')
  );

  console.log('Encontrados:', JSON.stringify(found, null, 2));

} catch (err) {
  console.error('Erro:', err.message);
}
