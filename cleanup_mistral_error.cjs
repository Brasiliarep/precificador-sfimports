const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'data', 'tabela_completa.json');
const BACKUP_FILE = path.join(__dirname, 'data', `tabela_completa_pre_cleanup_${Date.now()}.json`);

try {
    const data = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));
    console.log(`📊 Total de produtos antes: ${data.length}`);
    
    // Backup de segurança
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Backup criado em: ${BACKUP_FILE}`);

    // Identificar itens problemáticos: sa- prefixo E isMistral: true
    const problematicos = data.filter(p => p.rowId && p.rowId.startsWith('sa-') && p.isMistral === true);
    console.log(`⚠️  Encontrados ${problematicos.length} itens com erro de Mistral/SuperAdega (ex: Natu Nobilis).`);
    
    if (problematicos.length > 0) {
        console.log('Exemplos de correção:');
        problematicos.slice(0, 3).forEach(p => console.log(` - ${p.supplierName} (${p.rowId}): Preço Mistral fixo detectado.`));
    }

    // Limpeza 1: Remover itens recém-criados que são erros (sa- prefixo e isMistral true)
    // Nota: usuários não querem remover os 711 do Milão, mas estes 'sa-' são erros de lógica pura.
    const novaData = data.filter(p => !(p.rowId && p.rowId.startsWith('sa-') && p.isMistral === true));

    // Limpeza 2: Corrigir itens que deram match mas herdaram 'isMistral' errado
    const corrigidos = novaData.map(p => {
        if (p.isMistral && p.superAdegaPrice > 0 && p.superAdegaPrice === p.mistralPrice) {
             // Provavelmente herdou errado da Super Adega
             // Só removemos se o nome não indicar Mistral realmente
             const nome = (p.supplierName || '').toLowerCase();
             if (!nome.includes('mistral')) {
                return { 
                    ...p, 
                    hasMistral: false, 
                    isMistral: false, 
                    mistralPrice: 0 
                };
             }
        }
        return p;
    });

    console.log(`✅ ${data.length - corrigidos.length} itens removidos (erros de criação).`);
    
    // Grava arquivo limpo
    fs.writeFileSync(TABELA_FILE, JSON.stringify(corrigidos, null, 2));
    console.log(`🚀 Banco de dados limpo e salvo! Total final: ${corrigidos.length}`);

} catch (err) {
    console.error('❌ Erro na limpeza:', err.message);
}
