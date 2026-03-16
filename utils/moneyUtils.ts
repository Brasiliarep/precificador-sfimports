// utils/moneyUtils.ts - VERSÃO DEFINITIVA BUG MONETÁRIO CORRIGIDO
// Detecta valores gigantes como 99.869,00 → LOGA ERRO + CORRIGE

export const formatPreco = (valor: number | string): string => {
  const num = parseFloat(String(valor));
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
};

export const normalizarPreco = (valor: string | number | undefined | null): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;

  const texto = String(valor).trim();
  if (!texto) return null;

  const numero = texto
    .replace(/[^\d,\.]/g, '')
    .replace(',', '.')
    .trim();

  const n = parseFloat(numero);
  if (isNaN(n)) return null;

  // trava de segurança (erro clássico: meta itemprop preço 329 em vez de 32,90)
  if (n > 5000) return null;

  return n;
};

export const validarPreco = (preco: number | null | undefined, precoReferencia?: number | null): number | null => {
  if (preco === null || preco === undefined || isNaN(preco)) return null;
  if (precoReferencia && precoReferencia > 0 && preco > precoReferencia * 5) return null;
  return preco;
};

export const extrairVolume = (nome: string): string => {
  if (!nome) return '750ml';
  const m = String(nome).toLowerCase().match(/(\d+(?:\.\d+)?)\s*(ml|l)/i);
  if (!m) return '750ml';

  let v = parseFloat(m[1]);
  if (m[2].toLowerCase() === 'l') v *= 1000;
  return `${Math.round(v)}ml`;
};

export const parseMoney = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const normalized = normalizarPreco(value);
  return normalized !== null ? normalized : 0;
};

export function formatMoney(value: number): string {
  const safeValue = Number(value.toFixed(2));
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(safeValue);
}

export function formatCurrency(value: number | string | undefined | null): string {
  if (value === null || value === undefined) return 'R$ 0';
  const numValue = Number(value);
  if (isNaN(numValue)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
}

export function calculateSuggestedPrice(custo: number, margem: number = 1.35): number {
  const custoValido = Number(custo);
  const resultado = custoValido * margem;
  console.log(`[SUGERIDO] custo ${custoValido} × ${margem} = ${resultado}`);
  return Number(resultado.toFixed(2));
}

export function calculateProfit(custo: number, venda: number, fretePct: number = 5, cartaoPct: number = 4): {
  bruto: number, 
  liquido: number, 
  percentual: number
} {
  const c = Number(custo), v = Number(venda);
  const bruto = v - c;
  const deducoes = v * ((fretePct + cartaoPct) / 100);
  const liquido = bruto - deducoes;
  const pct = c > 0 ? (liquido / c) * 100 : 0;
  
  console.log(`[LUCRO] ${formatMoney(v)} - ${formatMoney(c)} - deduções = ${formatMoney(liquido)} (${pct.toFixed(2)}%)`);
  return { bruto, liquido, percentual: Number(pct.toFixed(2)) };
}