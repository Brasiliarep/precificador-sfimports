const fs = require('fs');
const path = require('path');

const CATALOGO_FILE = 'c:/app precificador/precificador-sfimports/data/catalogo-produtos.json';
const TABELA_FILE = 'c:/app precificador/precificador-sfimports/data/tabela_completa.json';

function unifyPath(originalPath) {
    if (!originalPath || typeof originalPath !== 'string') return originalPath;

    let pathWork = originalPath;
    // Se for localhost, remove o domínio para unificar
    if (originalPath.includes('localhost:')) {
        pathWork = originalPath.replace(/^https?:\/\/localhost:\d+/i, '');
    } else if (originalPath.startsWith('http')) {
        // Se for URL externa real (não localhost), não mexe
        return originalPath;
    }

    // Pega apenas o nome do arquivo
    const fileName = pathWork.split('/').pop().split('?')[0];

    // Retorna o novo formato unificado
    return `/imagens sem fundo/${fileName}`;
}

async function run() {
    // 1. Unificar catalogo-produtos.json
    console.log('--- Unificando catalogo-produtos.json ---');
    if (fs.existsSync(CATALOGO_FILE)) {
        const catalogo = JSON.parse(fs.readFileSync(CATALOGO_FILE, 'utf8'));
        let changedCat = 0;
        catalogo.forEach(p => {
            const oldImg = p.image;
            p.image = unifyPath(p.image);
            if (oldImg !== p.image) changedCat++;
        });
        fs.writeFileSync(CATALOGO_FILE, JSON.stringify(catalogo, null, 2));
        console.log(`Atualizados ${changedCat} caminhos no catálogo.`);
    }

    // 2. Unificar tabela_completa.json
    console.log('\n--- Unificando tabela_completa.json ---');
    if (fs.existsSync(TABELA_FILE)) {
        const tabela = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));
        let changedTab = 0;
        tabela.forEach(p => {
            const oldImg = p.image;
            const oldProdImg = p.productImage;

            p.image = unifyPath(p.image);
            p.productImage = unifyPath(p.productImage);

            if (oldImg !== p.image || oldProdImg !== p.productImage) changedTab++;
        });
        fs.writeFileSync(TABELA_FILE, JSON.stringify(tabela, null, 2));
        console.log(`Atualizados ${changedTab} registros na tabela completa.`);
    }
}

run().catch(console.error);
