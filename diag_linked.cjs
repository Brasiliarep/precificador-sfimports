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
            if (normalizedRk === normalizedK || normalizedRk.includes(normalizedK)) {
                if (row[rk] !== undefined && row[rk] !== null && row[rk] !== '') return row[rk];
            }
        }
    }
    return undefined;
};

const lucro_minimo = 10;
let results = {
    all: { prejuizo: 0, lucroBaixo: 0 },
    linkedOnly: { prejuizo: 0, lucroBaixo: 0 },
    mistralOnly: { prejuizo: 0, lucroBaixo: 0 }
};

data.forEach((row) => {
    const milaoPorInput = pn(gv(row, ['Milão Por', 'MILAO POR']));
    const milaoDeInput = pn(gv(row, ['Milão De', 'MILAO DE']));
    const sfPor = pn(gv(row, ['SF por', 'SF POR']));
    const match = String(gv(row, ['Match', 'Status']) || '').toLowerCase();

    const isLinked = match.includes('both');
    const isMistral = match.includes('sf') || match.includes('mistral');

    const custo = milaoPorInput > 0 ? milaoPorInput : (milaoDeInput > 0 ? milaoDeInput : 0);
    const venda = sfPor > 0 ? sfPor : 0;

    if (custo > 0 && venda > 0) {
        const prejuizo = custo > (venda + 0.50);
        const lucroVal = venda - custo;
        const baixoLucro = !prejuizo && lucroVal < lucro_minimo;

        results.all.prejuizo += prejuizo ? 1 : 0;
        results.all.lucroBaixo += baixoLucro ? 1 : 0;

        if (isLinked) {
            results.linkedOnly.prejuizo += prejuizo ? 1 : 0;
            results.linkedOnly.lucroBaixo += baixoLucro ? 1 : 0;
        }

        if (isMistral && !isLinked) {
            results.mistralOnly.prejuizo += prejuizo ? 1 : 0;
            results.mistralOnly.lucroBaixo += baixoLucro ? 1 : 0;
        }
    }
});

console.log(JSON.stringify(results, null, 2));
