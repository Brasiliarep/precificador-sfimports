const fs = require('fs');
const XLSX = require('xlsx');
const Papa = require('papaparse');

const excelFile = 'Planilha Mae SF Precificacao.xlsx';
const csvFile = 'wc-product-export-19-2-2026-1771549530495.csv';
const outputFile = 'Planilha Mae SF Precificacao Atualizada.xlsx';

function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(vinho|tinto|branco|rose|750ml|750|ml|gran cru)\b/gi, '').trim();
}

console.log('📖 Lendo Excel Base...');
const workbook = XLSX.readFile(excelFile);
const sheetName = workbook.SheetNames[0];
const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

console.log('📖 Lendo CSV do WooCommerce...');
const csvContent = fs.readFileSync(csvFile, 'utf8');
const parsedCsv = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
const wcProducts = parsedCsv.data.filter(p => p && p.Nome && p.Nome.trim() !== '' && p.ID);

let updatedCount = 0;
let newCount = 0;

// Construir Mapa do WooCommerce
const wcMap = new Map();
wcProducts.forEach(p => {
    const norm = normalizeName(p.Nome);
    let precoFull = p['Preço'] ? parseFloat(p['Preço'].replace(',', '.')) : 0;
    let precoPromo = p['Preço promocional'] ? parseFloat(p['Preço promocional'].replace(',', '.')) : precoFull;

    // Se promo veio zero mas full tem, usa full
    if (!precoPromo && precoFull) precoPromo = precoFull;
    if (!precoFull && precoPromo) precoFull = precoPromo;

    // Usa apenas se tem preço
    if (precoFull > 0 || precoPromo > 0) {
        // Para resolver colisões, grava apenas o primeiro (ou usa array. Simplificado para o 1º aq)
        if (!wcMap.has(norm)) {
            wcMap.set(norm, { ...p, PrecoCheio: precoFull, PrecoPromo: precoPromo });
        }
    }
});

const matchedWcKeys = new Set();

excelData.forEach(row => {
    const nomePlanilha = row['Produto'] || row['Nome SF'] || '';
    const normPlanilha = normalizeName(nomePlanilha);

    if (normPlanilha && wcMap.has(normPlanilha)) {
        const wcData = wcMap.get(normPlanilha);
        matchedWcKeys.add(normPlanilha);

        // Atualizar Preços
        row['Milão De'] = wcData.PrecoCheio;
        row['Milão Por'] = wcData.PrecoPromo;

        // Converter "SF ONLY" para "AMBOS" se estava SF ONLY
        if (row['Match'] === 'SF ONLY') {
            row['Match'] = 'AMBOS';
        } else if (!row['Match'] || row['Match'] === '') {
            row['Match'] = 'AMBOS';
        }

        // Atualizar o nome do Milão caso estivesse vazio
        if (row['Nome Milão'] === "" || !row['Nome Milão']) {
            row['Nome Milão'] = wcData.Nome;
        }

        updatedCount++;
    }
});

// Adicionar produtos originais do CSV que estão Fora do Excel
const excelHeaders = excelData.length > 0 ? Object.keys(excelData[0]) : ['ID', 'Produto', 'Nome Milão', 'Match', 'Milão De', 'Milão Por', 'SF De', 'SF Por', 'SF Sug.', 'Lucro'];

for (const [normWc, wcData] of wcMap.entries()) {
    if (!matchedWcKeys.has(normWc)) {
        let newRow = {};

        // Preparar chaves em branco do layout do Excel
        excelHeaders.forEach(k => newRow[k] = "");

        // Maior ID conhecido
        const lastId = excelData.length > 0 ? parseInt(excelData[excelData.length - 1]['ID'] || 0) : 0;
        const newId = (isNaN(lastId) ? 1000 : lastId) + 1 + newCount;

        newRow['ID'] = newId;
        newRow['Produto'] = wcData.Nome;
        newRow['Nome Milão'] = wcData.Nome;
        newRow['Match'] = 'MILÃO ONLY'; // Ou 'AMBOS' se for pro robô ler depois
        newRow['Milão De'] = wcData.PrecoCheio;
        newRow['Milão Por'] = wcData.PrecoPromo;

        excelData.push(newRow);
        newCount++;
    }
}

console.log('💾 Gravando dados na nova Planilha XLSX...');
const newWs = XLSX.utils.json_to_sheet(excelData);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newWs, sheetName);
XLSX.writeFile(newWb, outputFile);

console.log('=============================================');
console.log('✅ INTEGRAÇÃO WOOCOMMERCE -> EXCEL CONCLUÍDA!');
console.log(`- Produtos Atualizados (Match/AMBOS): ${updatedCount}`);
console.log(`- Novos Produtos Inseridos (MILÃO ONLY): ${newCount}`);
console.log(`- Arquivo Final Gerado: ${outputFile}`);
console.log('=============================================');
