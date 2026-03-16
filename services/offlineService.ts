import { SupplierProduct, StoreProduct } from "../types";
import { parseMoney, normalizarPreco } from '../utils/moneyUtils';
import Papa from 'papaparse';

// Blacklist de termos indesejados (Comidas, não alcoólicos, etc.)
const BLACKLIST = [
  "QUEIJO", "SUCO", "GELÉIA", "GELEIA", "MOLHO",
  "SALAME", "REFRIGERANTE", "ÁGUA", "AGUA", "ICE",
  "CERVEJA", "ENERGÉTICO", "BOMBOM", "CHOCOLATE",
  "BATATA", "AMENDOIM", "TORRADA", "BISCOITO",
  "AZEITE", "VINAGRE", "CONSERVA", "COPO", "TAÇA"
];

// Helper para limpar nomes de produtos
const cleanProductName = (name: string): string => {
  return name
    .replace(/\s+/g, ' ')
    .trim();
};

// Função robusta para extrair preços brasileiros de strings
function extractBrazilianPrice(text: string): number {
  return parseMoney(text);
}

// Parse offline do catálogo da loja (WooCommerce CSV)
export async function parseStoreCatalogOffline(sfText: string): Promise<StoreProduct[]> {
  console.log('🔥 SF OFFLINE - Parse REAL do catálogo');

  // Parse REAL do catálogo SF (sem forçar 4 produtos)
  try {
    // Parse real do texto SF (CSV/Excel)
    const realSFData = await parseRealSFCatalog(sfText);
    console.log(`✅ SF REAL parseado: ${realSFData.length} produtos`);
    return realSFData;
  } catch (error) {
    console.error('❌ Erro no parse SF:', error);
    return [];
  }
}

// Função auxiliar para parse real do catálogo
async function parseRealSFCatalog(sfText: string): Promise<StoreProduct[]> {
  const products: StoreProduct[] = [];

  const parsed = Papa.parse(sfText, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta.fields || [];
  const isWooCommerceCSV = fields.includes('Nome') || fields.includes('Name');

  if (isWooCommerceCSV && parsed.data && parsed.data.length > 0) {
    console.log('🔥 Detectado formato WooCommerce CSV');
    parsed.data.forEach((row: any) => {
      const nome = row['Nome'] || row['Name'] || '';
      if (!nome) return;

      const precoPromo = normalizarPreco(row['Preço promocional'] || row['Sale price'] || '') ?? 0;
      const precoNormal = normalizarPreco(row['Preço'] || row['Regular price'] || '') ?? 0;
      const descricao = row['Descrição'] || row['Description'] || '';
      const precoFinal = precoPromo > 0 ? precoPromo : precoNormal;

      products.push({
        id: row['ID'] || nome,
        name: nome,
        price: precoFinal,
        _sfDePrice: precoNormal,
        _sfPorPrice: precoPromo,
        description: descricao
      });
    });
  } else {
    // Parse antigo com pipe separator
    console.log('🔥 Usando fallback para formato linha com pipe/tab');
    const lines = sfText.split('\n').filter(line => line.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.toLowerCase().includes('nome') || line.toLowerCase().includes('produto') || line.toLowerCase().includes('id')) continue;

      const parts = line.split('|').map(s => s.trim());

      if (!parts[0] || parts[0].toLowerCase() === 'nome') continue;

      const nome = parts[0];
      const sfDe = normalizarPreco(parts[1] ?? '') ?? 0;
      const sfPor = normalizarPreco(parts[2] ?? '') ?? 0;
      const sfPrice = sfPor > 0 ? sfPor : sfDe;

      if (nome) {
        products.push({
          id: nome,
          name: nome,
          price: sfPrice,
          _sfDePrice: sfDe,
          _sfPorPrice: sfPor
        });
      }
    }
  }

  console.log(`✅ SF REAL parseado: ${products.length} produtos`);
  return products;
}

export async function extractSupplierDataOffline(supplierText: string): Promise<SupplierProduct[]> {
  console.log(' Tamanho do texto:', supplierText.length);

  const lines = supplierText.split('\n').filter(line => line.trim());
  console.log('📋 Total de linhas:', lines.length);

  const products: SupplierProduct[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pula linhas vazias e cabeçalho
    if (!line || line.toLowerCase().includes('nome') || line.toLowerCase().includes('produto')) continue;

    // Aceita tanto vírgula quanto PIPE como separador
    const parts = line.includes('|') ? line.split('|') : line.split(',');

    // MÍNIMO 2 partes (nome + pelo menos 1 preço)
    if (parts.length < 2) {
      if (i < 5) console.log(`⚠️ Linha ${i} ignorada (${parts.length} partes):`, line.substring(0, 50));
      continue;
    }

    const [nomeRaw, precoDeRaw, precoPorRaw] = parts;

    // Limpeza completa dos dados
    const nome = nomeRaw?.trim() || '';
    const de = precoDeRaw?.trim() || '';
    const por = precoPorRaw?.trim() || de; // Usa DE se POR não existir

    // Usa parseMoney para extração robusta (já importa de moneyUtils)
    const precoDeNum = parseMoney(de);
    const precoPorNum = parseMoney(por);

    // Validação final - só precisa de nome e pelo menos um preço válido
    if (!nome || precoPorNum <= 0) {
      if (i < 5) console.log(`⚠️ Linha ${i} ignorada (dados inválidos):`, { nome, de, por, precoDeNum, precoPorNum });
      continue;
    }

    // Nome limpo (remove caracteres especiais, mantém legibilidade)
    const nomeLimpo = nome
      .replace(/[^\w\s\|\-\.]/g, '') // Remove caracteres especiais menos os necessários
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    products.push({
      rawName: nomeLimpo,
      detectedCost: precoPorNum,
      detectedListPrice: precoDeNum
    });

    // Debug dos primeiros 5 produtos
    if (products.length <= 5) {
      console.log(`✅ Produto ${products.length}:`, {
        nome: nomeLimpo,
        de: precoDeNum,
        por: precoPorNum
      });
    }
  }

  console.log(`✅ PARSER MILÃO CONCLUÍDO: ${products.length} produtos extraídos`);
  console.log('📊 PRIMEIROS 3 PRODUTOS:', products.slice(0, 3).map(p => ({
    nome: p.rawName,
    de: p.detectedListPrice,
    por: p.detectedCost
  })));

  if (products.length === 0) {
    console.error('❌ NENHUM PRODUTO MILÃO PROCESSADO!');
  }

  return products;
}

// Função wrapper que tenta online, fallback para offline
export const parseStoreCatalog = async (text: string): Promise<StoreProduct[]> => {
  // Tenta API online primeiro (se existir)
  try {
    // Verifica se tem API key válida
    if (process.env.API_KEY && process.env.API_KEY !== 'your-api-key-here') {
      // Se quiser manter online como fallback, implementar aqui
      console.log("📡 Tentando API online...");
    }
  } catch (e) {
    console.log("📡 API online falhou, usando modo offline");
  }

  // Fallback offline sempre funciona
  return parseStoreCatalogOffline(text);
};

export const extractSupplierData = async (
  supplierText: string,
  onProgress?: (current: number, total: number) => void
): Promise<SupplierProduct[]> => {
  // Tenta API online primeiro (se existir)
  try {
    if (process.env.API_KEY && process.env.API_KEY !== 'your-api-key-here') {
      console.log("📡 Tentando API online...");
    }
  } catch (e) {
    console.log("📡 API online falhou, usando modo offline");
  }

  // Fallback offline sempre funciona
  return extractSupplierDataOffline(supplierText);
};
