const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'data', 'tabela_completa.json');

try {
    if (fs.existsSync(TABELA_FILE)) {
        console.log('🧹 Limpando arquivo de dados corrompido...');
        fs.writeFileSync(TABELA_FILE, JSON.stringify([], null, 2));
        console.log('✅ Arquivo resetado com sucesso.');
    } else {
        console.log('ℹ️ Arquivo não encontrado, nada para limpar.');
    }
} catch (err) {
    console.error('❌ Erro ao limpar arquivo:', err);
}
