const fs = require('fs');
const path = require('path');

// Ler o JSON original
const jsonPath = path.join(__dirname, 'data/products-array.json');
const originalContent = fs.readFileSync(jsonPath, 'utf8');

// Converter URLs para caminhos locais
let modifiedContent = originalContent;

// Substituir URLs do SF Imports por caminhos locais
modifiedContent = modifiedContent.replace(
    /https:\/\/sfimportsdf\.com\.br\/wp-content\/uploads\/[^"]+/g,
    (match) => {
        // Extrair ID do produto do contexto
        const idMatch = match.match(/\/(\d+)-/);
        if (idMatch) {
            const id = idMatch[1];
            return `/images/produtos/${id}.jpg`;
        }
        return match;
    }
);

// Salvar versão offline
const offlinePath = path.join(__dirname, 'public/data/products-offline.json');
fs.writeFileSync(offlinePath, modifiedContent);

console.log('✅ JSON offline criado!');
console.log('📁 Arquivo: public/data/products-offline.json');
console.log('🎯 Agora baixe as imagens para: public/images/produtos/');
