const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'data', 'tabela_completa.json');
const RESULT_FILE = path.join(__dirname, 'search_result.json');

try {
  const data = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));
  const found = data.filter(p => {
    const sName = (p.supplierName || '').toLowerCase();
    const pName = (p.productName || '').toLowerCase();
    const price = p.sfFinal || p.sfPor || p.price || 0;
    
    return sName.includes('natu') || sName.includes('nobilis') || 
           pName.includes('natu') || pName.includes('nobilis') ||
           Math.abs(price - 598.8) < 0.01;
  });

  fs.writeFileSync(RESULT_FILE, JSON.stringify(found, null, 2));
  console.log(`Encontrados ${found.length} itens. Salvo em ${RESULT_FILE}`);

} catch (err) {
  console.error('Erro:', err.message);
}
