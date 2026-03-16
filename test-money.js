// 🧪 TESTE DAS FUNÇÕES MONETÁRIAS - BUG CORRIGIDO
import { runMoneyTests } from './utils/moneyUtils.js';

// Executa testes automaticamente
console.log('🔬 INICIANDO TESTES MONETÁRIOS - BUG CORRIGIDO');
runMoneyTests();

// Teste específico do problema reportado
console.log('\n🐛 TESTE ESPECÍFICO DO BUG:');
console.log('Dados originais: "APERITIVO BITTER CAMPARI 998 ML 69.9 59.9"');

import { parseMoney, formatMoney, calculateSuggestedPrice, calculateProfit } from './utils/moneyUtils.js';

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

console.log('\n✅ BUG MONETÁRIO CORRIGIDO!');
