const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join('c:', 'app precificador', 'precificador-sfimports', 'public', 'SF-IMPORTS-DASHBOARD-CORRETO.xlsx');

let workbook;
try {
    workbook = XLSX.readFile(filePath);
} catch (e) {
    fs.writeFileSync('diag_error.txt', 'Failed to read file: ' + e.message);
    process.exit(1);
}

const sheetName = workbook.SheetNames.find(n => n.includes('TODOS')) || workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
let headerRowIndex = 0;
for (let j = 0; j < Math.min(20, aoa.length); j++) {
    if (aoa[j] && aoa[j].some(c => String(c).toUpperCase() === 'PRODUTO' || String(c).toUpperCase() === 'ID' || String(c).toUpperCase() === 'MILAO POR')) {
        headerRowIndex = j;
        break;
    }
}

const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

const pn = (v) => {
    if (typeof v === 'number') return v;
    if (!v || v === '-') return 0;
    return parseFloat(String(v).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
};

const gv = (row, keys) => {
    const rowKeys = Object.keys(row);
    for (let k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
        const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '');
        for (let rk of rowKeys) {
            const normalizedRk = rk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '');
            if (normalizedRk === normalizedK || normalizedRk.includes(normalizedK)) {
                if (row[rk] !== undefined && row[rk] !== null && row[rk] !== '') return row[rk];
            }
        }
    }
    return undefined;
};

const lucro_minimo = 10;
let countPrejuizo = 0;
let countLucroBaixo = 0;
let examples = [];

data.forEach((row, i) => {
    const milaoDeInput = pn(gv(row, ['Milão De', 'MILAO DE', 'MILÃO DE (TABELA)']));
    let milaoPorInput = pn(gv(row, ['Milão Por', 'MILAO POR', 'MILÃO POR (SÓCIO)']));

    // CURRENT FALLBACK that might be causing issues
    if (!milaoPorInput || milaoPorInput === 0) {
        milaoPorInput = milaoDeInput;
    }

    const sfDe = pn(gv(row, ['SF de', 'SF DE', 'Preço normal', 'SF DE (RISCADO)']) || 0);
    const sfPor = pn(gv(row, ['SF por', 'SF POR', 'SF POR (+20%)', 'Preço promocional']) || 0);
    const rawFinal = pn(gv(row, ['Venda', 'Preço normal', 'Preço', 'SF FINAL']));
    const sfFinal = rawFinal > 0 ? rawFinal : sfPor > 0 ? sfPor : (sfDe > 0 ? sfDe : 0);

    const custoCompra = milaoPorInput > 0 ? milaoPorInput : 0;
    const precoVendaFinal = sfFinal > 0 ? sfFinal : (sfPor > 0 ? sfPor : 0);

    const alertaDefasagem = custoCompra > 0 && precoVendaFinal > 0 && custoCompra > (precoVendaFinal + 0.50);

    const lucroReal = precoVendaFinal > 0 && custoCompra > 0
        ? precoVendaFinal - custoCompra
        : (sfPor > 0 && milaoPorInput > 0 ? sfPor - milaoPorInput : 0);

    const precisaAjustar = custoCompra > 0
        && precoVendaFinal > 0
        && lucroReal < lucro_minimo
        && !alertaDefasagem;

    if (alertaDefasagem) countPrejuizo++;
    if (precisaAjustar) countLucroBaixo++;

    if ((alertaDefasagem || precisaAjustar) && examples.length < 20) {
        examples.push({
            nome: gv(row, ['Produto', 'PRODUTO']),
            milaoDe: milaoDeInput,
            milaoPorOriginal: pn(gv(row, ['Milão Por', 'MILAO POR', 'MILÃO POR (SÓCIO)'])),
            milaoPorUsado: milaoPorInput,
            sfDe,
            sfPor,
            rawFinal,
            sfFinalCalculado: sfFinal,
            custoCompra,
            precoVendaFinal,
            lucroReal,
            alertaDefasagem,
            precisaAjustar
        });
    }
});

const results = {
    total: data.length,
    countPrejuizo,
    countLucroBaixo,
    totalAlerta: countPrejuizo + countLucroBaixo,
    examples
};

fs.writeFileSync('diag_results.json', JSON.stringify(results, null, 2));
console.log('Results saved to diag_results.json');
