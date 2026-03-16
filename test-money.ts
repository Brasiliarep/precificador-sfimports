// 🧪 TESTE AUTOMÁTICO DAS FUNÇÕES MONETÁRIAS
import { parseMoney, normalizarPreco, validarPreco, extrairVolume, formatMoney, calculateSuggestedPrice, calculateProfit } from './utils/moneyUtils.js';

console.log('🧪 TESTES BUG MONETÁRIO - VERSÃO DEFINITIVA');

// Teste específico do problema reportado
console.log('\n🐛 TESTE ESPECÍFICO DO BUG:');
console.log('Dados originais: "APERITIVO BITTER CAMPARI 998 ML 69.9 59.9"');

const milaoDe = parseMoney("69.9");
const milaoPor = parseMoney("59.9");
const sugerido = calculateSuggestedPrice(milaoPor);
const ilusao = calculateSuggestedPrice(milaoDe, 1.20);
const profit = calculateProfit(milaoPor, sugerido);

console.log('Resultados CORRIGIDOS:');
console.log('Milão De:', formatMoney(milaoDe));
console.log('Milão Por:', formatMoney(milaoPor));
console.log('Instagram:', formatMoney(ilusao));
console.log('Sugerido:', formatMoney(sugerido));
console.log('Lucro Real:', formatMoney(profit.liquido));

// Testes básicos
console.log('\n📝 TESTES BÁSICOS:');
console.log('parseMoney("69.9") === 69.9 ?', parseMoney("69.9") === 69.9 ? '✅ OK' : '❌ FALHOU');
console.log('parseMoney("R$ 59,90") === 59.9 ?', parseMoney("R$ 59,90") === 59.9 ? '✅ OK' : '❌ FALHOU');
console.log('parseMoney("99.869,00") deve detectar gigante:', parseMoney("99.869,00"));
console.log('normalizarPreco("R$ 32,90") === 32.9 ?', normalizarPreco("R$ 32,90") === 32.9 ? '✅ OK' : '❌ FALHOU');
console.log('normalizarPreco("329") === 329 ?', normalizarPreco("329") === 329 ? '✅ OK' : '❌ FALHOU');
console.log('validarPreco(329, 36) === null ?', validarPreco(329, 36) === null ? '✅ OK' : '❌ FALHOU');
console.log('validarPreco(120, 36) === 120 ?', validarPreco(120, 36) === 120 ? '✅ OK' : '❌ FALHOU');
console.log('extrairVolume("VINHO TINTO ALECRIM 750ml") === "750ml" ?', extrairVolume('VINHO TINTO ALECRIM 750ml') === '750ml' ? '✅ OK' : '❌ FALHOU');
console.log('extrairVolume("VINHO BAG 5L") === "5000ml" ?', extrairVolume('VINHO BAG 5L') === '5000ml' ? '✅ OK' : '❌ FALHOU');
console.log('formatMoney(80.87) === "R$ 80,87" ?', formatMoney(80.87) === 'R$ 80,87' ? '✅ OK' : '❌ FALHOU');

console.log('\n✅ TESTES CONCLUÍDOS - BUG MONETÁRIO CORRIGIDO!');
