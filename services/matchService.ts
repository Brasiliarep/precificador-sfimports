import { DashboardRow, GlobalSettings, SupplierProduct, StoreProduct } from '../types';
import { parseMoney, normalizarPreco, validarPreco, formatMoney, calculateSuggestedPrice, calculateProfit } from '../utils/moneyUtils';

function extractId(nome: string): string | null {
  const match = nome.match(/\|\s*(\d+)/);
  return match ? match[1].trim() : null;
}

export function createDashboardRow(
  milaoProd: SupplierProduct,
  sfProducts: StoreProduct[],
  settings: GlobalSettings
): DashboardRow {

  const nomeCompleto = milaoProd.rawName || milaoProd.name;
  console.log(`🔍 PROCESSANDO: ${nomeCompleto}`);

  // 1️⃣ EXTRAI ID e NOME LIMPO
  const milaoId = extractId(nomeCompleto);
  const nomeLimpo = nomeCompleto.split('|')[0].trim().toLowerCase();

  console.log(`ID: ${milaoId || 'NENHUM'}, Nome: "${nomeLimpo}"`);

  // 2️⃣ CUSTOS MILÃO
  const milaoDe = normalizarPreco(milaoProd.detectedListPrice) ?? 0;
  const milaoPor = normalizarPreco(milaoProd.detectedCost) ?? 0;

  // 3️⃣ MATCH SF - PRIORIDADE ID
  let sfMatch: StoreProduct | null = null;
  if (milaoId) {
    sfMatch = sfProducts.find(p => String(p.id) === milaoId);
    if (sfMatch) console.log(`✅ MATCH ID ${milaoId}: ${sfMatch.name}`);
  }

  // PRIORIDADE NOME (fallback)
  if (!sfMatch) {
    sfMatch = sfProducts.find(p =>
      p.name.toLowerCase().includes(nomeLimpo) ||
      nomeLimpo.includes(p.name.toLowerCase())
    );
    if (sfMatch) console.log(`✅ MATCH NOME: ${sfMatch.name}`);
  }

  if (!sfMatch) console.log(`❌ NO MATCH para "${nomeLimpo}"`);

  // 4️⃣ NORMALIZA E VALIDA PREÇOS SF
  const sfRawPrice = normalizarPreco(sfMatch?.price ?? sfMatch?._sfPorPrice ?? sfMatch?._sfDePrice ?? null);
  const sfSafePrice = validarPreco(sfRawPrice, milaoPor);
  const sfPriceEffective = sfSafePrice ?? calculateSuggestedPrice(milaoPor);

  const sfDeBase = sfMatch ? (normalizarPreco(sfMatch._sfDePrice || sfMatch.price || 0) ?? milaoDe) : milaoDe;
  const ilusaoPct = (settings as any).ilusaoPct || 20;
  const instagram = calculateSuggestedPrice(sfDeBase, 1 + ilusaoPct / 100);

  // 5️⃣ LINHA FINAL (compatível com interface existente)
  const row: DashboardRow = {
    rowId: `${nomeCompleto}-${sfMatch?.id || 'orphan'}`,
    supplierName: nomeCompleto,
    supplierCostRaw: milaoPor,
    supplierCostManual: null,
    storeProduct: sfMatch,
    finalCost: milaoPor,
    suggestedSalePrice: sfMatch ? sfPriceEffective : calculateSuggestedPrice(milaoPor),
    suggestedListPrice: milaoDe,
    realNetProfit: sfSafePrice ? calculateProfit(milaoPor, sfSafePrice, settings.freightCost || 5, 4).liquido : 0,
    b2bSalePrice: milaoPor * (1 + ((settings as any).b2bMarkup || 20) / 100),
    b2bMargin: 0,
    isLinked: !!sfMatch,
    status: sfMatch ? 'PROFIT' : 'ORPHAN',
    lucroBruto: sfSafePrice ? calculateProfit(milaoPor, sfSafePrice, settings.freightCost || 5, 4).bruto : 0,
    percentualLucro: sfSafePrice ? calculateProfit(milaoPor, sfSafePrice, settings.freightCost || 5, 4).percentual : 0,
    precoIlusao: instagram,
    fretePercentual: settings.freightCost || 5,
    taxaCartaoPercentual: 4,
    description: sfMatch?.description || ''
  };

  console.log(`📊 RESULTADO: Instagram=${formatMoney(instagram)}, SF=${sfMatch ? sfMatch.id : 'NONE'}`);
  return row;
}

// FUNÇÃO PRINCIPAL (ÚNICA - SEM DUPLICAÇÃO)
export const matchMilaoToSF = (
  milaoProducts: SupplierProduct[],
  sfProducts: StoreProduct[],
  settings: GlobalSettings
): DashboardRow[] => {
  console.log(`🔗 MATCH INICIADO: ${milaoProducts.length} Milão × ${sfProducts.length} SF`);

  const matches: DashboardRow[] = milaoProducts.map(milao =>
    createDashboardRow(milao, sfProducts, settings)
  );

  const vinculados = matches.filter(r => r.isLinked).length;
  console.log(`🎯 MATCH CONCLUÍDO: ${vinculados}/${matches.length} vinculados ✓`);

  return matches;
};

// Função para limpar nome do produto (normalização mais suave)
const cleanProductName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sà-ú]/g, '')
    .replace(/\b(750ml|garrafa|taça|copo)\b/g, '')
    .trim();
};

// Criar linha para Match (ambos existem)
const createMatchRow = (milao: SupplierProduct, sf: StoreProduct, settings: GlobalSettings): DashboardRow => {
  const row = createDashboardRow(milao, [sf], settings);
  row.status = 'PROFIT'; // Match normal
  return row;
};

// Criar linha para SF Only (exclusivo SF)
const createSfOnlyRow = (sf: StoreProduct, settings: GlobalSettings): DashboardRow => {
  return {
    rowId: `sf-only-${sf.id}`,
    supplierName: sf.name, // 🔥 CORREÇÃO: Usar nome SF em vez de '---'
    supplierCostRaw: 0,
    supplierCostManual: null,
    storeProduct: sf,
    finalCost: parseFloat(String(sf.price || '0')),
    suggestedSalePrice: parseFloat(String(sf.price || '0')),
    suggestedListPrice: parseFloat(String(sf.price || '0')),
    realNetProfit: 0,
    b2bSalePrice: parseFloat(String(sf.price || '0')),
    b2bMargin: 0,
    isLinked: false,
    status: 'ORPHAN',
    precoIlusao: 0,
    description: sf.description || ''
  };
};

// Criar linha para Milão Only (exclusivo Milão)
const createMilaoOnlyRow = (milao: SupplierProduct, settings: GlobalSettings): DashboardRow => {
  return {
    rowId: `milao-only-${milao.rawName}`,
    supplierName: milao.rawName,
    supplierCostRaw: milao.detectedCost,
    supplierCostManual: null,
    storeProduct: null,
    finalCost: milao.detectedCost,
    suggestedSalePrice: 0,
    suggestedListPrice: 0,
    realNetProfit: 0,
    b2bSalePrice: 0,
    b2bMargin: 0,
    isLinked: false,
    status: 'WARNING', // Sem SF para competir
    precoIlusao: 0
  };
};

// Função principal de processamento (FULL OUTER JOIN BLINDADO)
export const processB2CData = async (
  milaoText: string,
  sfText: string,
  settings: GlobalSettings,
  onProgress?: (current: number, total: number) => void
): Promise<DashboardRow[]> => {
  console.log('🚀 Processamento B2C iniciado...');

  const { parseStoreCatalogOffline, extractSupplierDataOffline } = await import('./offlineService');

  // Parse Milão
  const milaoProducts = await extractSupplierDataOffline(milaoText);
  console.log(`📊 Milão parseado: ${milaoProducts.length}`);

  // Parse SF
  const sfProducts = await parseStoreCatalogOffline(sfText);
  console.log(`� SF parseado: ${sfProducts.length}`);

  // 🔥 FULL OUTER JOIN BASEADO EM NOMES NORMALIZADOS
  console.log('🔥 Iniciando FULL OUTER JOIN...');

  // 1. Criar Map com todos os produtos SF para busca rápida
  const sfMap = new Map<string, StoreProduct[]>();
  sfProducts.forEach(sf => {
    const normalizedName = cleanProductName(sf.name).toLowerCase();
    if (!sfMap.has(normalizedName)) {
      sfMap.set(normalizedName, []);
    }
    sfMap.get(normalizedName)!.push(sf);
  });

  // 2. Criar Map com todos os produtos Milão para busca rápida
  const milaoMap = new Map<string, SupplierProduct[]>();
  milaoProducts.forEach(m => {
    const normalizedName = cleanProductName(m.rawName).toLowerCase();
    if (!milaoMap.has(normalizedName)) {
      milaoMap.set(normalizedName, []);
    }
    milaoMap.get(normalizedName)!.push(m);
  });

  // 3. Coletar todas as chaves únicas
  const allNormalizedNames = new Set<string>();
  sfMap.forEach((_, key) => allNormalizedNames.add(key));
  milaoMap.forEach((_, key) => allNormalizedNames.add(key));

  console.log(`🔥 Chaves únicas encontradas: ${allNormalizedNames.size}`);
  console.log(`📊 SF Map: ${sfMap.size} chaves, Milão Map: ${milaoMap.size} chaves`);

  // 4. FULL OUTER JOIN COMPLETO - TODOS OS PRODUTOS
  const rows: DashboardRow[] = [];

  // 4.1. Adicionar TODOS os produtos SF (inclusive sem match)
  sfMap.forEach((sfMatches, normalizedName) => {
    const milaoMatches = milaoMap.get(normalizedName) || [];

    if (milaoMatches.length > 0) {
      // MATCH - SF + Milão
      const sfProduct = sfMatches[0];
      const milaoProduct = milaoMatches[0];
      const row = createMatchRow(milaoProduct, sfProduct, settings);
      row._merge = 'both';
      rows.push(row);
    } else {
      // SF ONLY - Sem Milão correspondente
      // 🔥 SF ONLY - Produtos só SF
      sfMatches.forEach(sfProduct => {
        const row = createSfOnlyRow(sfProduct, settings);
        row._merge = 'left_only';
        row.sfMatch = 'SF ONLY'; // 🔥 ADICIONAR sfMatch
        rows.push(row);
      });
    }
  });

  // 4.2. Adicionar SOMENTE produtos Milão sem correspondência SF
  milaoMap.forEach((milaoMatches, normalizedName) => {
    const hasSFMatch = sfMap.has(normalizedName);

    if (!hasSFMatch) {
      // MILÃO ONLY - Sem SF correspondente
      milaoMatches.forEach(milaoProduct => {
        const row = createMilaoOnlyRow(milaoProduct, settings);
        row._merge = 'right_only';
        rows.push(row);
      });
    }
  });

  console.log(`✅ FULL OUTER JOIN concluído: ${rows.length} linhas totais`);
  console.log(`📊 Distribuição: ${rows.filter(r => r.status === 'PROFIT').length} matches, ${rows.filter(r => r.status === 'ORPHAN').length} só SF, ${rows.filter(r => r.status === 'WARNING').length} só Milão`);

  // 🔥 MODO PADRÃO = 983 PRODUTOS REAIS
  const df_merged = rows; // Full Outer Join completo
  console.log('✅ SF REAL:', sfProducts.length); // 969
  console.log('✅ TOTAL FULL:', df_merged.length); // 983

  // 🔥 DEBUG linha ~150
  console.log('SF ONLY criado:', rows.find(r => r.sfMatch === 'SF ONLY'));

  return df_merged;
};
