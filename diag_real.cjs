const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join('c:', 'app precificador', 'precificador-sfimports', 'public', 'SF-IMPORTS-DASHBOARD-CORRETO.xlsx');

const workbook = XLSX.readFile(filePath);
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
            if (normalizedK === normalizedRk || normalizedRk.includes(normalizedK)) return row[rk];
        }
    }
    return undefined;
};

let results = {
    all: { p: 0, l: 0 },
    realCostOnly: { p: 0, l: 0 }
};

data.forEach((row) => {
    const milaoPorOrig = pn(gv(row, ['Milão Por', 'MILAO POR']));
    const milaoDe = pn(gv(row, ['Milão De', 'MILAO DE']));
    const sfPor = pn(gv(row, ['SF por', 'SF POR']));
    const rawFinal = pn(gv(row, ['Venda', 'SF FINAL']));
    const venda = rawFinal > 0 ? rawFinal : sfPor;

    const custoComCopia = milaoPorOrig > 0 ? milaoPorOrig : milaoDe;
    const isCopiado = milaoPorOrig <= 0 && milaoDe > 0;

    if (custoComCopia > 0 && venda > 0) {
        // Logic 1: using copied cost
        const p1 = custoComCopia > (venda + 0.50);
        const l1 = !p1 && (venda - custoComCopia) < 10;
        results.all.p += p1 ? 1 : 0;
        results.all.l += l1 ? 1 : 0;

        // Logic 2: only real cost
        if (!isCopiado) {
            const p2 = milaoPorOrig > (venda + 0.50);
            const l2 = !p2 && (venda - milaoPorOrig) < 10;
            results.realCostOnly.p += p2 ? 1 : 0;
            results.realCostOnly.l += l2 ? 1 : 0;
        }
    }
});

console.log(JSON.stringify(results, null, 2));
