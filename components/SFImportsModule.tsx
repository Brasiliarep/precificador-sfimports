import React, { useState, useEffect } from 'react';
import { Settings, Upload, Database, Truck, ArrowLeft, Store, FileText, X, Plus, Package, TrendingUp, AlertCircle, Search, LayoutList, Cpu, Wine } from 'lucide-react';
import { InputSection } from './InputSection';
import { ResultsTable } from './ResultsTable';
import { B2CPricingTable } from './B2CPricingTable';
import { processB2CData } from '../services/matchService';
import { DashboardRow, GlobalSettings, MemoryMap, StoreProduct, SupplierProduct } from '../types';
import { parseMoney, formatPreco } from '../utils/moneyUtils';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getImagemLocalPrecificador } from '../utils/imageUtils';
import StoreMaster from './StoreMaster';
import TurboImagens from './TurboImagens';
import { iniciarFilaSilenciosa, calcularOportunidades, buscarIntelProduto, limparCache } from '../src/inteligenciaService';
import type { Oportunidade } from '../src/inteligenciaService';
// ─── CUSTOM HOOK: useDebounce ──────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


const DEFAULT_SETTINGS: GlobalSettings = {
  sellout_pct: 20,
  margem_pct: 5,
  frete_valor: 0,
  taxa_cartao_pct: 0,
  lucro_minimo: 10,
  instagram_markup_pct: 20,

  // Legacy fields
  freightCost: 0, taxRate: 0, minNetProfit: 0, marginMarkup: 0,
  b2bTaxRate: 4.5, b2bMarkup: 20, b2bMinMargin: 15,
};

type ViewMode = 'RETAIL' | 'WHOLESALE' | 'ML_COMPRAS';

// --- TYPES DE RESUMO DE RASPAGEM ---
type ScrapingSourceStatus = 'ok' | 'parcial' | 'erro' | 'sem_dados';

export type ScrapingDetailItem = {
  id: string;
  produto: string;
  precoAnterior: number | null;
  precoNovo: number | null;
  variacao: number | null;
  status: 'alterado' | 'sem_alteracao' | 'erro' | 'sem_match';
  observacao?: string;
  dataHora?: string;
};

export type ScrapingSummarySource = {
  fonte: string;
  status: ScrapingSourceStatus;
  ultimaAtualizacao: string | null;
  totalProcessados: number;
  alteracoesPreco: number;
  erros: number;
  semMatch: number;
  resumo: string;
  itens: ScrapingDetailItem[];
};

export type ScrapingSummary = {
  updatedAt: string;
  fontes: ScrapingSummarySource[];
};

interface SFImportsModuleProps { onBack?: () => void; navigateTo: (module: any) => void; }

// =========================
// HELPERS DE ORIGEM
// =========================

const isRowMistral = (row: Partial<DashboardRow>) => {
  return Boolean(
    row?.hasMistral ||
    Number(row?.mistralPrice || 0) > 0 ||
    row?.isMistral === true
  );
};

const getRowOriginLabel = (row: Partial<DashboardRow>) => {
  const hasSF = Boolean(row?.hasSF);
  const hasMilao = Boolean(row?.hasMilao);
  const hasMistral = isRowMistral(row);

  return {
    hasSF,
    hasMilao,
    hasMistral,
    showFrontMistral: hasMistral && ((!hasSF && !hasMilao) || (hasSF && hasMilao)),
    showMilaoRed: hasMilao,
    showSfBlue: hasSF && hasMilao,
  };
};

const sanitizeLegacySuperAdegaMistral = (row: DashboardRow): DashboardRow => {
  const saPrice = Number((row as any).superAdegaPrice || 0);
  const mistralPrice = Number(row.mistralPrice || 0);

  const pollutedBySuperAdega =
    saPrice > 0 &&
    mistralPrice > 0 &&
    saPrice === mistralPrice &&
    (row.origin === 'mistral' || row.isMistral || row.hasMistral);

  if (!pollutedBySuperAdega) return row;

  return {
    ...row,
    hasMistral: false,
    isMistral: false,
    mistralPrice: 0,
  };
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// --- MOTOR DE DEFASAGEM E PROTEÇÃO B2C ---
export function calcularDefasagem(produto: DashboardRow, configGlobal: GlobalSettings) {
  const sellout_pct = configGlobal.sellout_pct || 20;
  const lucro_minimo = configGlobal.lucro_minimo || 10;
  const margem_pct = configGlobal.margem_pct || 5;

  const custos: { valor: number, fonte: string }[] = [];

  const milaoPor = Number(produto.milaoPor) || 0;
  if (milaoPor > 0 && !isRowMistral(produto)) {
    custos.push({ valor: milaoPor, fonte: 'milao' });
  }

  const mistralPrice = Number(produto.mistralPrice) || 0;
  if (mistralPrice > 0) {
    custos.push({ valor: mistralPrice, fonte: 'mistral' });
  }

  const mlPrice = Number(produto.mlBestPrice) || 0;
  if (mlPrice > 0) {
    custos.push({ valor: mlPrice, fonte: 'mercado_livre' });
  }

  if (custos.length === 0) return { alertaDefasagem: false };

  custos.sort((a, b) => a.valor - b.valor);
  const custoReal = custos[0];

  const sfPorAtual = Number(produto.sfPor) || 0;
  const sfFinal = Number(produto.sfFinal || sfPorAtual || 0);
  const temDefasagem = custoReal.valor > 0 && sfFinal > 0 && sfFinal < custoReal.valor;

  const sfPorCorreto = custoReal.valor * (1 + sellout_pct / 100);
  const prejuizoPorUnidade = temDefasagem ? (custoReal.valor - sfFinal) : 0;
  const milaoDe = Number(produto.milaoDe) || custoReal.valor;

  return {
    alertaDefasagem: temDefasagem,
    custoReal: custoReal.valor,
    fonteCusto: custoReal.fonte,
    sfPorCorreto: sfPorCorreto,
    prejuizoPorUnidade: prejuizoPorUnidade,
    sfDeCorreto: Math.max(
      milaoDe * (1 + (margem_pct / 100)),
      sfPorCorreto + 0.01
    )
  };
}

// ─── COMPONENTE ────────────────────────────────────────────────────────────
export const SFImportsModule: React.FC<SFImportsModuleProps> = ({ onBack, navigateTo }) => {

  // ── HELPER: Arredondar para 2 casas decimais ──

  const generateProductSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // --- UNIFICAÇÃO DE RISCO FINANCEIRO ---
  const syncRiskFlags = (row: DashboardRow, config: GlobalSettings) => {
    const isMistral = isRowMistral(row);
    const lMin = config.lucro_minimo || 10;
    const custoRealVal = Number(row.milaoPor || row.supplierCostRaw || 0);
    const vendaVal = Number(row.sfFinal || row.sfPor || 0);
    const hasLoss = !isMistral && custoRealVal > 0 && vendaVal > 0 && custoRealVal > (vendaVal + 0.50);
    const lucro = vendaVal - custoRealVal;
    const isForcado = (row as any).isForcado || false;

    return {
      ...row,
      lucroReal: round2(lucro),
      percentualLucro: vendaVal > 0 ? round2((lucro / vendaVal) * 100) : 0,
      alertaDefasagem: hasLoss,
      precisaAjustar: !isMistral && !isForcado && custoRealVal > 0 && vendaVal > 0 && lucro < lMin && !hasLoss
    };
  };

  // ── ESTADOS MERCADO LIVRE ──
  const [mlPrecos, setMlPrecos] = useState<any[]>([]);
  const [isSyncingML, setIsSyncingML] = useState(false);

  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [showOpsPopup, setShowOpsPopup] = useState(false);
  const [opsSelecionadas, setOpsSelecionadas] = useState<Set<string>>(new Set());
  const [filaProgresso, setFilaProgresso] = useState({ done: 0, total: 0 });
  const [showDigest, setShowDigest] = useState(false);
  const [digestOportunidades, setDigestOportunidades] = useState<any[]>([]);

  // Scraping Summary
  const [scrapingSummary, setScrapingSummary] = useState<ScrapingSummary | undefined>(undefined);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // ── VINCULAÇÃO INTELIGENTE ──
  const vincularProdutosAutomaticamente = (produtos: DashboardRow[]): DashboardRow[] => {
    const limparNome = (nome: string): string => {
      return nome.toUpperCase()
        .replace(/^(VINHO\s+)?(TINTO|BRANCO|ROSE|ROSÊ|ESPUMANTE|VINO|WINE)\s+/gi, '')
        .replace(/\s+(750ML|ML|L|LITRO|GARRAFA|GRAN CRU)$/gi, '')
        .trim();
    };

    const similaridade = (a: string, b: string): number => {
      const aLimpo = limparNome(a);
      const bLimpo = limparNome(b);
      let matches = 0;
      const len = Math.max(aLimpo.length, bLimpo.length);
      for (let i = 0; i < Math.min(aLimpo.length, bLimpo.length); i++) {
        if (aLimpo[i] === bLimpo[i]) matches++;
      }
      return matches / len;
    };

    const sfOnly = produtos.filter(p => (p.sfDe || p.sfPor) && !p.milaoDe && !p.milaoPor);
    const milaoOnly = produtos.filter(p => (p.milaoDe || p.milaoPor) && !p.sfDe && !p.sfPor);

    let vinculados = 0;
    const novosRows = produtos.map(p => {
      if (milaoOnly.includes(p)) {
        let melhorMatch: any = null;
        let melhorScore = 0;

        for (const sf of sfOnly) {
          const score = similaridade(p.supplierName, sf.supplierName);
          if (score > melhorScore && score >= 0.70) {
            melhorScore = score;
            melhorMatch = sf;
          }
        }

        if (melhorMatch) {
          vinculados++;
          console.log(`🔗 Vinculado (${(melhorScore * 100).toFixed(0)}%): ${p.supplierName} ↔ ${melhorMatch.supplierName}`);
          return {
            ...p,
            sfDe: melhorMatch.sfDe,
            sfPor: melhorMatch.sfPor,
            sfFinal: melhorMatch.sfFinal || melhorMatch.sfSugestao,
            storeProduct: melhorMatch.storeProduct,
            status: 'both' as const,
            isLinked: true,
          };
        }
      }
      return p;
    });

    if (vinculados > 0) {
      console.log(`✅ ${vinculados} produtos vinculados automaticamente!`);
      alert(`🔗 VINCULAÇÃO AUTOMÁTICA\n\n✅ ${vinculados} produtos Milão foram vinculados ao catálogo SF!\n\nVeja o console (F12) para detalhes.`);
    }

    return novosRows;
  };

  // --- UTILITÁRIOS DE NORMALIZAÇÃO ---
  const normalizar = (n: string) => (n || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(vinho|tinto|branco|750ml|ml|750)\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();

  const getPalavrasChave = (n: string) => normalizar(n).split(/\s+/).filter(w => w.length > 2);

  // --- NOVA VINCULAÇÃO SUPER ADEGA (VTEX) ---
  const vincularSuperAdegaVtex = (produtos: DashboardRow[], saData: any[]): DashboardRow[] => {
    let matches = 0;

    const novosRows = produtos.map((p) => {
      let match = saData.find((sa: any) => sa.ean && p.storeProduct?.ean && sa.ean === p.storeProduct.ean);

      if (!match) {
        const pPalavras = getPalavrasChave(p.supplierName);
        if (pPalavras.length === 0) return p;

        match = saData.find((sa: any) => {
          const saPalavras = getPalavrasChave(sa.nome);
          const intersection = pPalavras.filter((w) => saPalavras.includes(w));
          const score = intersection.length / pPalavras.length;
          return score >= 0.7;
        });
      }

      if (!match) return p;

      matches++;

      return {
        ...p,
        superAdegaPrice: match.preco_por,
        superAdegaName: match.nome,
        superAdegaUrl: match.url,
        ean: match.ean,
        saMatchScore: 100,
      };
    });

    console.log('Super Adega matches', matches, 'encontrados.');
    return novosRows;
  };

  const handleSyncSuperAdega = async () => {
    setIsLoading(true);
    showNotification('Sincronizando com Super Adega via VTEX API...', 'info');

    try {
      await fetch('/api/superadega/sync');

      const response = await fetch('/api/superadega-prices');
      if (!response.ok) throw new Error('Falha ao carregar preços da Super Adega');

      const saData = await response.json();

      setRows((prevRows) => {
        let updatedCount = 0;

        const updatedRows = prevRows.map((row) => {
          const match = saData.find((sa: any) => {
            if (sa.ean && row.storeProduct?.ean && sa.ean === row.storeProduct.ean) return true;

            const rowWords = getPalavrasChave(row.supplierName);
            const saWords = getPalavrasChave(sa.nome);

            if (rowWords.length === 0 || saWords.length === 0) return false;

            const intersection = rowWords.filter((w) => saWords.includes(w));
            const score = intersection.length / Math.max(rowWords.length, saWords.length);

            return score >= 0.7;
          });

          if (!match) return row;

          updatedCount++;

          return {
            ...row,
            superAdegaPrice: match.preco_por,
            superAdegaName: match.nome,
            superAdegaUrl: match.url,
            ean: match.ean ?? row.storeProduct?.ean,
            saMatchScore: 100,
          };
        });

        console.log('Super Adega Sync:', updatedCount, 'atualizados, 0 novos.');
        return updatedRows.map(sanitizeLegacySuperAdegaMistral);
      });

      showNotification('Comparativo Super Adega atualizado sem cadastrar novos produtos.', 'success');
    } catch (error) {
      console.error('Erro na sincronização Super Adega', error);
      showNotification('Erro ao sincronizar Super Adega.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Mistral products are treated as normal products — milaoPor/milaoDe come directly from the master sheet.
  // No sync needed: just use the 🍷 badge in ResultsTable to identify them visually.





  // NAVEGAÇÃO
  const [step, setStep] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('RETAIL');
  const [isLoading, setIsLoading] = useState(false);

  // ── PAINEL — estados controlados ──────
  const [sellout_pct, setSelloutPct] = useState<number>(20);
  const [margem_pct, setMargemPct] = useState<number>(5);
  const [frete_valor, setFreteValor] = useState<number>(0);
  const [taxa_cartao_pct, setTaxaCartaoPct] = useState(DEFAULT_SETTINGS.taxa_cartao_pct);
  const [lucro_minimo, setLucroMinimo] = useState(DEFAULT_SETTINGS.lucro_minimo);
  const [instagram_markup_pct, setInstagramMarkupPct] = useState(DEFAULT_SETTINGS.instagram_markup_pct);

  // UI
  const [filtroStatus, setFiltroStatus] = useState<'all' | 'both' | 'sf-only' | 'milao-only' | 'risk-prejuizo' | 'risk-lucro-baixo' | 'risk-bloqueado' | 'ocr-decision' | 'mistral'>('all');
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [modalVinculo, setModalVinculo] = useState({ aberto: false, milaoId: '' });

  // ======================================================================
  // 🏪 ESTADOS DO NOVO STORE MASTER INTEGRADO
  // ======================================================================
  const [showStoreMaster, setShowStoreMaster] = useState(false);
  const [showTurboImagens, setShowTurboImagens] = useState(false);
  const [storeMasterProduct, setStoreMasterProduct] = useState<DashboardRow | null>(null);
  const [storeMasterProd, setStoreMasterProd] = useState({
    nome: '', idWooCommerce: '', precoDe: '', precoPor: '',
    tipoUva: '', safra: '', descricao: '', pais: '', regiao: '',
    ml: '750ml', categoria: 'Vinho', teorAlcoolico: '', tipoVinho: 'Tinto', imagem: null as string | null
  });
  const [isAnalyzingSM, setIsAnalyzingSM] = useState(false);
  const [isDraggingOverSM, setIsDraggingOverSM] = useState(false);

  const handleStoreMasterSaved = (newProduct: DashboardRow) => {
    setRows(prev => {
      const existingIndex = prev.findIndex(r => r.rowId === newProduct.rowId);
      if (existingIndex > -1) {
        return prev.map((r, i) => i === existingIndex ? newProduct : r);
      }
      return [...prev, newProduct];
    });
    setShowStoreMaster(false);
    showNotification('✅ Produto salvo e adicionado à tabela!', 'success');
  };

  const handleSMInputChange = (field: string, value: string) => {
    setStoreMasterProd(prev => ({ ...prev, [field]: value }));
  };

  const handleSMInternetSearch = () => {
    const productName = prompt('Digite o nome do produto para buscar na internet:', storeMasterProd.nome);
    if (productName) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' vinho garrafa fundo branco')}&tbm=isch`;
      window.open(searchUrl, '_blank');
      alert('Pesquisa aberta em nova aba!\n\n1. Encontre a imagem desejada\n2. Clique com o botão direito na imagem\n3. Escolha "Copiar endereço da imagem" (ou Copy Image Link)\n4. Volte aqui e clique no botão verde "🌐 Colar URL da Imagem"');
    }
  };

  const handleSMImageUrl = () => {
    const url = prompt('Cole aqui a URL (endereço) da imagem:');
    if (url) {
      try {
        new URL(url);
        setStoreMasterProd(prev => ({ ...prev, imagem: url }));
      } catch (error) {
        alert('URL inválida! Por favor, cole um link válido (começando com http).');
      }
    }
  };

  const handleSMImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const res = await fetch('/api/upload-image-base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: storeMasterProd.nome.replace(/\s+/g, '-') || 'novo-produto', imageBase64: base64 })
          });
          const data = await res.json();
          if (data.success) {
            setStoreMasterProd(prev => ({ ...prev, imagem: data.path }));
          } else {
            setStoreMasterProd(prev => ({ ...prev, imagem: base64 }));
          }
        } catch (err) {
          setStoreMasterProd(prev => ({ ...prev, imagem: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSMPasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          setStoreMasterProd(prev => ({ ...prev, imagem: base64 }));
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleSMAIAssistant = async () => {
    if (!storeMasterProd.nome) {
      showNotification('Por favor, digite o nome do produto primeiro!', 'error');
      return;
    }
    setIsAnalyzingSM(true);
    try {
      // Passo 1: metadados via Groq
      const res = await fetch(`http://localhost:3002/api/identify-product?q=${encodeURIComponent(storeMasterProd.nome)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setStoreMasterProd(prev => ({
          ...prev,
          nome: p.nome || prev.nome,
          precoDe: p.preco_de ? p.preco_de.toString() : prev.precoDe,
          precoPor: p.preco_por ? p.preco_por.toString() : prev.precoPor,
          pais: p.pais || prev.pais,
          safra: p.safra || prev.safra,
          tipoUva: p.uva || prev.tipoUva,
          regiao: p.regiao || prev.regiao,
          tipoVinho: p.tipo || prev.tipoVinho,
          descricao: p.descricao || prev.descricao
        }));
      }

      // Passo 2: Busca Tripla de imagem (Local → IA → Google)
      const nomeBusca = (data.success && data.data?.nome) ? data.data.nome : storeMasterProd.nome;
      showNotification('🔍 Buscando imagem...', 'info');
      const imgRes = await fetch(`http://localhost:3002/api/buscar-imagem-tripla?q=${encodeURIComponent(nomeBusca)}`);
      const imgData = await imgRes.json();

      if (imgData.success && imgData.url) {
        const fonteLabel = imgData.camada === 1 ? '📁 Local' : imgData.camada === 2 ? '🤖 IA' : '🌐 Google';
        setStoreMasterProd(prev => ({ ...prev, imagem: imgData.url }));
        showNotification(`✅ Produto identificado! Imagem via ${fonteLabel}`, 'success');
      } else {
        showNotification('✅ Produto identificado! (sem imagem encontrada)', 'success');
      }
    } catch (err) {
      showNotification('Erro na comunicação com a IA.', 'error');
    } finally {
      setIsAnalyzingSM(false);
    }
  };

  const adicionarATabelaStoreMaster = () => {
    if (!storeMasterProd.nome || (!storeMasterProd.precoDe && !storeMasterProd.precoPor)) {
      showNotification('❌ Preencha nome e pelo menos um preço!', 'error');
      return;
    }

    const pDe = parseFloat(storeMasterProd.precoDe.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    const pPor = round2(parseFloat(storeMasterProd.precoPor.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0);
    const pDeFinal = pDe || pPor; // Used for persistence

    const baseRow: DashboardRow = {
      rowId: `novo-sm-${Date.now()}`,
      id: storeMasterProd.idWooCommerce || Math.floor(Math.random() * 1000000),
      supplierName: storeMasterProd.nome,
      milaoDe: 0,
      milaoPor: pPor, // Este é o VALOR BASE (C)
      finalCost: pPor,
      supplierCostRaw: pPor,
      sfDe: 0,
      sfPor: 0,
      sfSug: 0,
      sfFinal: 0,
      sfFinalInsta: 0,
      lucroReal: 0,
      percentualLucro: 0,
      status: 'both',
      sfMatch: 'BOTH',
      isLinked: true,
      origin: 'ambos',
      isMistral: false,
      badgeColor: 'amarelo',
      active: true,
      category: storeMasterProd.categoria,
      image: storeMasterProd.imagem || '',
      description: storeMasterProd.descricao,
      hasSF: true,
      hasMilao: true,
      hasMistral: false,
      storeProduct: { id: storeMasterProd.idWooCommerce || `wc-${Date.now()}`, name: storeMasterProd.nome, price: pPor },
      instagram: '',
      ilusao: 0,
      isNewProduct: true,
      isRevised: false
    };

    // Aplica as fórmulas automaticamente
    const calculado = applyAutoCalculations([baseRow])[0];
    const novo = { ...calculado, isNewProduct: true, isRevised: false };

    setRows(prev => [...prev, novo]);

    fetch('/api/persist-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: storeMasterProd.nome,
        preco_de: pDeFinal,
        preco_por: pPor,
        imagem: storeMasterProd.imagem,
        descricao: storeMasterProd.descricao,
        tipo: storeMasterProd.categoria,
        metadata: {
          uva: storeMasterProd.tipoUva,
          safra: storeMasterProd.safra,
          pais: storeMasterProd.pais,
          regiao: storeMasterProd.regiao,
          teor: storeMasterProd.teorAlcoolico,
          tipoVinho: storeMasterProd.tipoVinho
        }
      })
    }).then(async res => {
      const data = await res.json();
      if (data.success && data.rowId) {
        // Atualiza o item local com o ID real do servidor para evitar duplicatas no próximo save
        setRows(prev => prev.map(r => r.rowId === novo.rowId ? { ...r, rowId: data.rowId } : r));
      }
    }).catch(console.error);

    showNotification('✅ Produto integrado ao sistema com sucesso!', 'success');
    setShowStoreMaster(false);
    setStoreMasterProd({
      nome: '', idWooCommerce: '', precoDe: '', precoPor: '',
      tipoUva: '', safra: '', descricao: '', pais: '', regiao: '',
      ml: '750ml', categoria: 'Vinho', teorAlcoolico: '', tipoVinho: 'Tinto', imagem: null
    });
  };
  // ======================================================================


  // Estado do modal SF Only para vinculação em massa
  const [modalSFOnly, setModalSFOnly] = useState({
    aberto: false,
    produtosSFOnly: [],
    indiceAtual: 0
  });
  const [buscaMilao, setBuscaMilao] = useState('');

  // Estados para novo modal de 2 etapas
  const [modalListaSFOnly, setModalListaSFOnly] = useState({
    aberto: false,
    produtosSFOnly: []
  });
  const [modalVincularEspecifico, setModalVincularEspecifico] = useState({
    aberto: false,
    produtoSF: null,
    produtosMilao: []
  });

  // Estado do modal de configuração
  const [modalConfiguracao, setModalConfiguracao] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    console.log(`📢 Notificação [${type}]: ${message}`);
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };
  const [autoRun, setAutoRun] = useState<boolean>(() => {
    const saved = localStorage.getItem('sf_safe_to_autorun');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sf_safe_to_autorun', String(autoRun));
  }, [autoRun]);

  const [modalDashboard, setModalDashboard] = useState({
    aberto: false,
    stats: { total: 0, both: 0, sfOnly: 0, milaoOnly: 0, lucroTotal: 0, margemMedia: 0, precoMedio: 0 },
    maisLucrativos: [],
    maiorMargem: [],
    comAlerta: []
  });
  const [buscaSFOnly, setBuscaSFOnly] = useState('');

  // DADOS
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [consolidadaFile, setConsolidadaFile] = useState<File | null>(null);
  const [milaoFile, setMilaoFile] = useState<File | null>(null);
  const [storeFile, setStoreFile] = useState<File | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [todosOsProdutos, setTodosOsProdutos] = useState<DashboardRow[]>([]);
  const [todosOsProdutosOriginal, setTodosOsProdutosOriginal] = useState<DashboardRow[]>([]);
  const [memoryMap, setMemoryMap] = useState<MemoryMap>({});
  const [storeCatalog, setStoreCatalog] = useState<StoreProduct[]>([]);
  const [consolidadaLoaded, setConsolidadaLoaded] = useState(false);
  const [consolidadaData, setConsolidadaData] = useState<any[]>([]);

  // ESTADOS DE ORDENAÇÃO
  const [ordenacao, setOrdenacao] = useState<'nome' | 'milaoDe' | 'milaoPor' | 'sfDe' | 'sfPor' | 'sfFinal'>('nome');
  const [ordemDirecao, setOrdemDirecao] = useState<'asc' | 'desc'>('asc');

  // --- LAUNCH BATCH REMOVE BG (GRADIO) ---
  const handleLaunchBulkRemoveBg = async () => {
    try {
      showNotification('✂️ Iniciando Processador em Lote...', 'info');
      const response = await fetch('/api/launch-catalogo');
      const result = await response.json();

      if (result.success) {
        setTimeout(() => {
          window.open(result.url, '_blank');
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao lançar processador:', error);
      showNotification('❌ Erro ao iniciar o processador.', 'error');
    }
  };

  // MÓDULO 7 — COMPRAS ML
  const [mlPurchases, setMlPurchases] = useState<any[]>([]);
  const [modalRegistroCompra, setModalRegistroCompra] = useState({
    aberto: false,
    dados: null as any
  });

  // CONTROLE DE PERSISTÊNCIA
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const prevRowsCount = React.useRef(0);

  const handleRegistrarCompra = async (compra: any) => {
    try {
      const response = await fetch('/api/ml/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compra)
      });
      if (response.ok) {
        showNotification('✅ Compra registrada com sucesso!', 'success');
        fetchMlPurchases();
      }
    } catch (err) {
      console.error('Erro ao registrar compra:', err);
    }
  };

  const fetchMlPurchases = async () => {
    try {
      const response = await fetch('/api/ml/compras');
      if (response.ok) {
        const data = await response.json();
        setMlPurchases(data);
      }
    } catch (err) {
      console.error('Erro ao buscar compras ML:', err);
    }
  };

  // AUTO-SYNC HOOK CONSOLIDADO
  const debouncedRows = useDebounce(rows, 2000);

  useEffect(() => {
    // 🛡️ PROTEÇÃO: Só inicia persistência se os dados realmente foram carregados do DB/Servidor
    // e se o número de linhas faz sentido (evita sobrescrever com array vazio por erro de load)
    if (!isDataLoaded || rows.length === 0) return;

    // Bloqueio de segurança para quedas drásticas
    if (prevRowsCount.current > 20 && debouncedRows.length < prevRowsCount.current * 0.5 && debouncedRows.length < 50) {
      console.warn("⚠️ AVISO: Queda drástica detectada no volume de produtos, mas persistência mantida para filtros.", {
        de: prevRowsCount.current,
        para: debouncedRows.length
      });
      // Allow it to pass instead of silently killing the app behavior on filters
    }

    // Só salva se houver mudança real ou se for o primeiro load com dados
    if (debouncedRows.length > 0) {
      console.log(`☁️ Persistência automática: ${debouncedRows.length} itens.`);
      saveToDB(debouncedRows);
      saveToServer(debouncedRows);
      handleSincronizarCatalogo(debouncedRows);
      localStorage.setItem('sfRows_full', JSON.stringify(debouncedRows));

      if (todosOsProdutosOriginal.length === 0) {
        setTodosOsProdutosOriginal(debouncedRows);
      }
      prevRowsCount.current = debouncedRows.length;
    }

  }, [debouncedRows, isDataLoaded]);

  useEffect(() => {
    if (rows.length === 0) return;
    // Calcula oportunidades do cache atual
    setOportunidades(calcularOportunidades(rows));

    // Inicia fila silenciosa
    iniciarFilaSilenciosa(rows, (done, total) => {
      setFilaProgresso({ done, total });
      // Recalcula oportunidades a cada lote processado
      setOportunidades(calcularOportunidades(rows));
    });
  }, [rows.length]);

  // DIGEST DIÁRIO — aparece uma vez por dia às primeiras horas
  useEffect(() => {
    if (rows.length === 0) return;
    const CHAVE_DIGEST = 'sf_digest_ultimo';
    const ultimoDigest = localStorage.getItem(CHAVE_DIGEST);
    const hoje = new Date().toDateString();

    if (ultimoDigest === hoje) return; // já mostrou hoje

    // Espera 30s para a fila carregar alguns dados
    const timer = setTimeout(() => {
      const cache = JSON.parse(localStorage.getItem('sf_inteligencia_cache') || '{}');
      const oportunidadesList = rows
        .map(row => {
          const intel = cache[row.rowId || ''];
          if (!intel) return null;
          const sfFinal = Number(row.sfFinal || row.sfPor || 0);
          const vantagem = (intel.saPreco || 0) - sfFinal;
          if (intel.vivino >= 4.0 && vantagem >= 10) {
            return {
              nome: row.supplierName,
              sfFinal,
              saPreco: intel.saPreco,
              vivino: intel.vivino,
              vantagem,
              rowId: row.rowId
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.vantagem - a.vantagem)
        .slice(0, 10);

      if (oportunidadesList.length > 0) {
        localStorage.setItem(CHAVE_DIGEST, hoje);
        setDigestOportunidades(oportunidadesList);
        setShowDigest(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [rows]);

  useEffect(() => {
    fetchMlPurchases();
  }, []);

  const API_BASE = ''; // Assuming API_BASE is defined elsewhere or can be empty for relative paths

  const fetchScrapingSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const res = await fetch(`${API_BASE}/api/scraping-summary`);
      if (res.ok) {
        setScrapingSummary(await res.json());
      }
    } catch (e) {
      console.error('Erro ao buscar resumo de raspagem:', e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    // Assuming fetchCatalogo and fetchTabela are defined elsewhere or not needed for this snippet
    // fetchCatalogo();
    // fetchTabela();
    fetchScrapingSummary(); // Busca inicial
    const timer = setInterval(fetchScrapingSummary, 60000); // Atualiza a cada 1 min
    return () => clearInterval(timer);
  }, []);

  // FUNÇÃO DE ORDENAÇÃO
  const ordenarProdutos = (produtos: DashboardRow[]) => {
    return [...produtos].sort((a, b) => {
      let valorA: number | string;
      let valorB: number | string;

      switch (ordenacao) {
        case 'nome':
          valorA = a.supplierName.toLowerCase();
          valorB = b.supplierName.toLowerCase();
          break;
        case 'milaoDe':
          valorA = a.milaoDe || 0;
          valorB = b.milaoDe || 0;
          break;
        case 'milaoPor':
          valorA = a.milaoPor || 0;
          valorB = b.milaoPor || 0;
          break;
        case 'sfDe':
          valorA = a.sfDe || 0;
          valorB = b.sfDe || 0;
          break;
        case 'sfPor':
          valorA = a.sfPor || 0;
          valorB = b.sfPor || 0;
          break;
        case 'sfFinal':
          valorA = a.sfFinal || 0;
          valorB = b.sfFinal || 0;
          break;
        default:
          valorA = a.supplierName.toLowerCase();
          valorB = b.supplierName.toLowerCase();
      }

      if (typeof valorA === 'string' && typeof valorB === 'string') {
        return ordemDirecao === 'asc'
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      } else {
        return ordemDirecao === 'asc'
          ? (valorA as number) - (valorB as number)
          : (valorB as number) - (valorA as number);
      }
    });
  };

  // ─── PERSISTÊNCIA INDEXEDDB ────────────────────────────────────────────
  const DB_NAME = 'SFImportsDB';
  const DB_VER = 2;

  const saveToDB = (rows: DashboardRow[]) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('produtos'))
          db.createObjectStore('produtos', { keyPath: 'rowId' });
      };
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('produtos', 'readwrite');
        const st = tx.objectStore('produtos');
        st.clear();
        rows.forEach(r => st.put(r));
        console.log(`💾 ${rows.length} produtos salvos localmente`);
      };
    } catch (err) { console.error('IndexedDB save:', err); }
  };

  // ─── PERSISTÊNCIA NO SERVIDOR ──────────────────────────────────────────
  const saveToServer = async (dados: DashboardRow[]) => {
    try {
      await fetch('/api/tabela-completa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      console.log('☁️ Tabela completa salva no servidor');
    } catch (err) {
      console.error('Erro ao salvar no servidor:', err);
    }
  };

  const handleExportarXLSX = () => {
    if (rows.length === 0) return;

    const dadosExcel = rows.map(r => ({
      'Produto': r.supplierName,
      'Status': r.sfMatch || r.status.toUpperCase(),
      'Milão De': r.milaoDe || 0,
      'Milão Por': r.milaoPor || 0,
      'SF De': r.sfDe || 0,
      'SF Por': r.sfPor || 0,
      'SF Final': r.sfFinal || 0,
      'Lucro R$': r.lucroReal || 0,
      'Margem %': (r.percentualLucro || 0).toFixed(2) + '%'
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Precificacao');

    const dataHora = new Date().toLocaleString('pt-BR').replace(/\//g, '-').replace(/:/g, '.').replace(', ', '_');
    const fileName = `precificacao-sfports-${dataHora}.xlsx`;

    // Converte para buffer e faz download via Blob para garantir nome do arquivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSalvarTudo = async () => {
    if (rows.length === 0) return;
    handleExportarXLSX();
    try {
      await saveToServer(rows);
      await handleSincronizarCatalogo(rows);
      showNotification('✅ Dados salvos e catálogo sincronizado!', 'success');
    } catch (err) {
      showNotification('✅ Planilha gerada! (Aviso: Erro ao sincronizar com o servidor)', 'error');
    }
  };

  const handleBackupTotal = async () => {
    setIsLoading(true);
    showNotification('🗄️ Gerando Backup Total (Dados + Imagens)...', 'info');
    try {
      const response = await fetch('/api/backup/create');
      if (response.ok) {
        const result = await response.json();
        showNotification(`✅ Backup concluído: ${result.fileName}`, 'success');
      } else {
        throw new Error('Falha no servidor ao gerar backup');
      }
    } catch (err) {
      showNotification('❌ Erro ao gerar backup total.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcarPuxarServidor = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso apagará todos os dados locais e baixará os dados mais recentes do servidor. Continuar?')) return;
    
    setIsLoading(true);
    showNotification('📥 Baixando dados do servidor...', 'info');
    
    try {
      const response = await fetch(`/api/tabela-completa?t=${Date.now()}`);
      if (response.ok) {
        const dados = await response.json();
        if (dados && Array.isArray(dados)) {
          // Limpa Local
          localStorage.removeItem('sfRows_full');
          
          // Limpa IndexedDB
          const db = await new Promise<any>((resolve) => {
            const req = indexedDB.open(DB_NAME, DB_VER);
            req.onsuccess = (e: any) => resolve(e.target.result);
          });
          const tx = db.transaction('produtos', 'readwrite');
          tx.objectStore('produtos').clear();
          
          // Atualiza Estado
          setRows(dados);
          setTodosOsProdutosOriginal(dados);
          showNotification(`✅ Sucesso! ${dados.length} produtos sincronizados do servidor.`, 'success');
          
          // Força um reload leve para limpar qualquer estado residual
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        showNotification('❌ Erro ao buscar dados do servidor.', 'error');
      }
    } catch (err) {
      showNotification('❌ Falha na conexão com o servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // CARREGAR ao montar
  useEffect(() => {
    // fetchScrapingSummary(); // Carrega o resumo de raspagem no startup // Removed as per new useEffect
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      let dadosEncontrados = false;
      let initialRows = [];

      try {
        console.log('📡 Tentando carregar dados do SERVIDOR...');
        const response = await fetch(`/api/tabela-completa?t=${Date.now()}`);
        if (response.ok) {
          const dados = await response.json();
          if (dados && Array.isArray(dados) && dados.length > 0) {
            console.log(`✅ ${dados.length} produtos carregados do SERVIDOR.`);
            
            // SE O SERVIDOR TEM DADOS LIMPOS (menos que o novo limite de 5000),
            // limpamos o lixo local para evitar que o auto-sync sobscreva o servidor.
            if (dados.length < 5000) {
              localStorage.removeItem('sfRows_full');
              const db = await new Promise<any>((resolve) => {
                const req = indexedDB.open(DB_NAME, DB_VER);
                req.onsuccess = (e: any) => resolve(e.target.result);
              });
              const tx = db.transaction('produtos', 'readwrite');
              tx.objectStore('produtos').clear();
              console.log(`🧹 Cache local removido para priorizar os ${dados.length} produtos do servidor.`);
            }
            
            initialRows = dados;
            dadosEncontrados = true;
          }
        }
      } catch (e) {
        console.error('❌ Erro lendo db servidor:', e);
      }

      if (!dadosEncontrados) {
        console.log('📂 Servidor sem dados ou offline. Tentando IndexedDB LOCAL...');
        try {
          const db = await new Promise<any>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VER);
            req.onupgradeneeded = (e: any) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('produtos')) db.createObjectStore('produtos', { keyPath: 'rowId' });
            };
            req.onsuccess = (e: any) => resolve(e.target.result);
            req.onerror = () => reject(req.error);
          });

          const tx = db.transaction('produtos', 'readonly');
          const dadosIdb = await new Promise<any[]>((resolve) => {
            const req = tx.objectStore('produtos').getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
          });

          if (dadosIdb && dadosIdb.length > 0) {
            initialRows = dadosIdb;
            dadosEncontrados = true;
          }
        } catch (err) {
          console.error('Erro Local IndexedDB:', err);
        }
      }

      if (dadosEncontrados) {
        const sanitizedRows = initialRows.map(sanitizeLegacySuperAdegaMistral);

        const rowsHidratadas = sanitizedRows.map((row) => {
          const sfPor = Number(row.sfPor || 0);
          const milaoPor = Number(row.milaoPor || 0);
          const mistralPor = Number(row.mistralPrice || 0);

          const milaoDecorrigido =
            row.milaoDe && Number(row.milaoDe) > 0
              ? Number(row.milaoDe)
              : milaoPor > 0
              ? Math.round(milaoPor * 1.2 * 100) / 100
              : 0;

          const hasSF = row.hasSF ?? sfPor > 0;
          const hasMilao = row.hasMilao ?? milaoPor > 0;
          const hasMistral = row.hasMistral ?? mistralPor > 0;

          const isMistral = isRowMistral({
            ...row,
            hasMistral,
            mistralPrice: mistralPor,
          });

          const sfDeParaMistral = Number(row.sfDe || 0);

          const milaoPorFinal =
            isMistral && sfDeParaMistral > 0
              ? sfDeParaMistral
              : milaoPor;

          const milaoDeFinal =
            isMistral && sfDeParaMistral > 0
              ? sfDeParaMistral
              : milaoDecorrigido;

          let newRow: DashboardRow = {
            ...row,
            milaoPor: milaoPorFinal,
            milaoDe: milaoDeFinal,
            hasSF,
            hasMilao,
            hasMistral,
            isMistral,
            instagram: String(row.instagram || ''),
            status: hasSF && hasMilao ? 'both' : hasSF ? 'sf-only' : 'milao-only',
          };

          if (row.supplierName?.toLowerCase().includes('vinho tinto alecrim')) {
            newRow.sfPor = 36.65;
            newRow.sfDe = 36.65;
            newRow.sfFinal = 36.65;
            newRow.sfFinalInsta = 36.65;
          }

          if (isMistral) {
            newRow.badgeColor = 'mistral' as any;
          }

          return newRow;
        });

        const produtosCalculados = applyAutoCalculations(rowsHidratadas);
        setRows(produtosCalculados);
        try { localStorage.setItem('sfRows_full', JSON.stringify(produtosCalculados)); } catch { }
        setTodosOsProdutos(produtosCalculados); // Ensure todosOsProdutos is also updated
        setStep(2);
        setIsDataLoaded(true);
        setConsolidadaLoaded(true);
        prevRowsCount.current = rowsHidratadas.length;

        fetchSuperAdegaPrices(rowsHidratadas);
        carregarMlPrecos();
      }
      setIsLoading(false);
    };

    carregarDados();
  }, []);

  const fetchSuperAdegaPrices = async (currentRows: DashboardRow[]) => {
    try {
      const response = await fetch('/api/superadega-prices');
      if (response.ok) {
        const saData = await response.json();
        if (Array.isArray(saData) && saData.length > 0) {
          setRows(prevRows => prevRows.map(row => {
            const match = saData.find(sa => String(sa.id) === String(row.id));
            if (match && match.superAdegaPrice) {
              return {
                ...row,
                superAdegaPrice: match.superAdegaPrice,
                superAdegaName: match.superAdegaName
              };
            }
            return row;
          }));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar preços Super Adega:', err);
    }
  };

  const carregarMlPrecos = async () => {
    try {
      const res = await fetch('/api/ml/precos');
      const data = await res.json();
      setMlPrecos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar ML preços:', e);
    }
  };

  const sincronizarML = async () => {
    setIsSyncingML(true);
    showNotification('🛒 Sincronizando Mercado Livre para produtos Mistral...', 'info');
    try {
      const res = await fetch('/api/ml/sync-mistral');
      const data = await res.json();
      setMlPrecos(data.data || []);
      showNotification(`✅ ML sincronizado! ${data.total_encontrados} produtos encontrados.`, 'success');
    } catch (e) {
      showNotification('❌ Erro ao sincronizar Mercado Livre.', 'error');
    } finally {
      setIsSyncingML(false);
    }
  };

  const parsePct = (v: any): number => {
    if (!v || v === '-') return 0;
    return parseFloat(String(v).replace('%', '').replace(',', '.').trim()) || 0;
  };

  const saveMemory = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(memoryMap, null, 2)], { type: 'application/json' }));
    a.download = 'sf-memory.json';
    a.click();
  };
  const loadMemory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try { setMemoryMap(JSON.parse(e.target?.result as string)); alert('Memória carregada!'); }
      catch { alert('Erro ao carregar memória.'); }
    };
    reader.readAsText(file);
  };

  const calculateSafeFinalPrice = (milaoPor: number, lMin?: number, fVal?: number, tCartao?: number) => {
    const l = lMin !== undefined ? lMin : lucro_minimo;
    const f = fVal !== undefined ? fVal : frete_valor;
    const t = tCartao !== undefined ? tCartao : taxa_cartao_pct;
    const base = milaoPor + l + f;
    const taxaFac = t / 100;
    const safePrice = round2(base / (1 - taxaFac));
    return safePrice;
  };

  // --- FUNÇÕES DE PROCESSAMENTO REUTILIZÁVEIS ---
  const processBasePricing = (rowsToProcess: DashboardRow[], sPct: number, mPct: number): DashboardRow[] => {
    return rowsToProcess.map((row) => {
      // V2 PRECIFICADOR RULES:
      // O Milão Por (custo real) é a base.
      // MISTRAL: usa sfDe como base de custo para que as fórmulas de margem e sellout rodem normalmente
      const isMistral = !!(row.isMistral || row.origin === 'mistral');
      const sfDeVal = isMistral ? (Number(row.sfDe) || 0) : 0;

      const custoBase = (isMistral && sfDeVal > 0)
        ? sfDeVal
        : Number(row.supplierCostRaw || row.milaoPor || row.mistralPrice || 0);
      if (custoBase <= 0) return row;

      // REGRA UNIVERSAL: milaoPor = custoBase. milaoDe = sfDe para Mistral, ou regra 1.20 para outros.
      const milaoPor = custoBase;
      const milaoDe = (isMistral && sfDeVal > 0)
        ? sfDeVal
        : ((row.milaoDe && Number(row.milaoDe) > 0) ? Number(row.milaoDe) : round2(milaoPor * 1.20));


      // 2. Cálculo do Piso (Base sfPor)
      const pisoMinimo = round2(milaoPor * (1 + (sPct / 100)));

      // sfDe = milaoDe + margem% para todos os produtos
      const sfDe = round2(milaoDe * (1 + (mPct / 100)));

      // 3. Regra do PISO - Forçar se o atual for menor
      let sfPorFinal = Number(row.sfPor) || 0;
      let isForcado = false;

      // Se o preço do produto for menor que o piso que a SF quer, subir para o piso!
      if (sfPorFinal < pisoMinimo) {
        sfPorFinal = pisoMinimo;
        isForcado = true;
      }

      // 4. Calcular margens com o novo preço finalizado
      const lucroReal = round2(sfPorFinal - milaoPor);
      const percentualLucro = sfPorFinal > 0 ? round2((lucroReal / sfPorFinal) * 100) : 0;
      const alertaMargem = percentualLucro < sPct;

      return syncRiskFlags({
        ...row,
        milaoDe,
        milaoPor,
        finalCost: milaoPor,
        sfDe,
        sfPor: sfPorFinal,
        isForcado, // 🔒
        alertaMargem // 🟠
      }, settings);
    });
  };
  const processSafetyBlindage = (rowsToProcess: DashboardRow[], lMin: number, fVal: number, tCartao: number): DashboardRow[] => {
    return rowsToProcess.map((row) => {
      const milaoPor = Number(row.milaoPor || row.mistralPrice || 0);
      const sfPor = Number(row.sfPor || 0);

      if (milaoPor <= 0 && sfPor <= 0) return { ...row, sfSug: 0, sfFinal: row.sfFinal || 0 };

      // SF Sug = SF Por + Frete + (SF Por × Taxa%)
      // Branco se Frete=0 e Taxa=0
      const temCustosAdicionais = fVal > 0 || tCartao > 0;
      const sfSug = (sfPor > 0 && temCustosAdicionais)
        ? round2(sfPor + fVal + (sfPor * tCartao / 100))
        : 0;

      // SF Final = MAX(MAX(SF Por, Milão Por + Lucro Mín), SF Sug)
      const sfFinal = Math.max(
        Math.max(sfPor, milaoPor + lMin),
        sfSug || 0
      );

      return syncRiskFlags({
        ...row,
        sfSug,
        sfFinal: sfFinal
      }, settings);
    });
  };

  const processInstagramMarkup = (rowsToProcess: DashboardRow[], mPct: number): DashboardRow[] => {
    return rowsToProcess.map((row) => {
      const instaPreco = parseMoney(row.instagram);
      // SF Final Insta = Instagram × (1 + Markup%) 
      // Branco se Instagram vazio
      const sfFinalInsta = instaPreco > 0 ? round2(instaPreco * (1 + (mPct / 100))) : 0;
      return { ...row, sfFinalInsta };
    });
  };

  const handleAplicarInstagramMarkup = () => {
    if (rows.length === 0) { alert('❌ Carregue a planilha primeiro!'); return; }
    const novosRows = processInstagramMarkup(rows, instagram_markup_pct);
    setRows(novosRows);
    showNotification(`✅ Etapa 4 Aplicada!\nSF Final Insta (+${instagram_markup_pct}%) sobre Instagram.`);
  };

  const handleConsolidadaUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setConsolidadaFile(file);
  };

  const applyAutoCalculations = (pRows: DashboardRow[]) => {
    // Etapa 1: Preços Base
    let updated = processBasePricing(pRows, sellout_pct, margem_pct);
    // Etapa 3: Blindagem (Lucro Mínimo)
    updated = processSafetyBlindage(updated, lucro_minimo, frete_valor, taxa_cartao_pct);
    // Etapa 4: Instagram Markup (se houver dados)
    updated = processInstagramMarkup(updated, instagram_markup_pct);
    return updated;
  };

  const handleAplicarSellout = () => {
    if (rows.length === 0) { alert('❌ Carregue a planilha primeiro!'); return; }
    const novosRows = processBasePricing(rows, sellout_pct, margem_pct);
    setRows(novosRows);
    const alertas = novosRows.filter((r: any) => r.precisaAjustar).length;
    showNotification(`✅ Módulo 1 Aplicado!\nSF Por (+${sellout_pct}%) | SF De (+${margem_pct}%)\n⚠️ ${alertas} alertas detectados`);
  };

  const handleAplicarFreteETaxa = () => {
    if (rows.length === 0) { alert('❌ Carregue a planilha primeiro!'); return; }
    const novosRows = rows.map((row: DashboardRow) => {
      const sfPor = Number(row.sfPor || row.sfDe || row.sfFinal || 0);
      const sfSug = sfPor > 0 ? round2(sfPor + frete_valor + (sfPor * taxa_cartao_pct / 100)) : (Number(row.sfSugestao || row.sfSug) || 0);

      return {
        ...row,
        sfSugestao: sfSug,
        sfSug: sfSug,
        sfFinal: (sfSug > 0) ? sfSug : (row.sfFinal || sfPor)
      };
    });
    setRows(novosRows);
    handleSincronizarCatalogo(novosRows);
    showNotification(`✅ Módulo 1 Completo!\nSF Sug e SF Final atualizados.`);
  };

  const handleCorrigirAdvertencias = (somenteLinhaId?: string) => {
    const total = rows.filter((r: any) => r.precisaAjustar).length;
    if (!somenteLinhaId && total === 0) { alert('✅ Nenhum alerta para corrigir!'); return; }

    const novosRows = somenteLinhaId
      ? rows.map(r => r.rowId === somenteLinhaId ? { ...r, sfFinal: calculateSafeFinalPrice(r.milaoPor || r.milaoDe || 0), precisaAjustar: true } : r)
      : processSafetyBlindage(rows, lucro_minimo, frete_valor, taxa_cartao_pct);

    setRows(novosRows);
    showNotification(`✅ ${somenteLinhaId ? 1 : total} preço(s) final(is) blindado(s) para lucro mín R$ ${lucro_minimo.toFixed(2)}`);
  };

  const handleSincronizarCatalogo = async (rowsToSync?: any[]) => {
    try {
      const sourceRows = rowsToSync || rows;
      const produtosValidos = sourceRows.filter((r: any) =>
        r.supplierName &&
        (Number(r.sfFinal) > 0 || Number(r.sfDe) > 0)
      );

      if (produtosValidos.length === 0) return;

      const dataToSync = produtosValidos.map((produto: any) => {
        const precoNum = Number(produto.sfFinalInsta || produto.sfFinal || produto.sfDe || 0);
        const precoDeNum = Number(produto.sfDe || 0);
        const name = produto.supplierName || 'Produto sem nome';
        const category = produto.category || 'geral';

        const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const tags = [
          normalizeStr(name),
          normalizeStr(category),
          'todos'
        ];
        if (precoNum < precoDeNum || Math.random() > 0.9) {
          tags.push('promo', 'super');
          if ((precoDeNum - precoNum) > (precoDeNum * 0.05) || Math.random() > 0.7) tags.push('semana');
        }
        if (Math.random() > 0.8) tags.push('vendido', 'destaque');
        if (Math.random() > 0.9) tags.push('semana');
        if (produto.description) tags.push(normalizeStr(produto.description));

        return {
          id: produto.id || Math.random().toString(36).substr(2, 9),
          name: name,
          price: precoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          old_price: precoDeNum > precoNum ? precoDeNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "",
          image: getImagemLocalPrecificador(produto.image, name),
          category: category,
          all_categories: `Todos Produtos, ${category}`,
          description: produto.description || `${name} - SF Imports`,
          is_sale: precoDeNum > precoNum,
          tags_search: tags.join(' '),
          val_sort: precoNum,
          status_tag: precoDeNum > precoNum ? "SUPER_PROMO" : "NORMAL"
        };
      });

      const response = await fetch('/api/catalogo-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSync)
      });
    } catch (error) {
      console.error('❌ Erro de rede ao sincronizar catálogo:', error);
    }
  };

  const handleImportSuperAdega = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const saData = JSON.parse(text);

      if (!Array.isArray(saData) || saData.length === 0) {
        showNotification('❌ Dados inválidos na Super Adega.', 'error');
        return;
      }

      setRows(prevRows => {
        const newRows = [...prevRows];
        saData.forEach(sa => {
          const existingIndex = newRows.findIndex(r => String(r.id) === String(sa.id) || r.supplierName === sa.superAdegaName);
          if (existingIndex > -1) {
            newRows[existingIndex] = {
              ...newRows[existingIndex],
              superAdegaPrice: sa.superAdegaPrice,
              superAdegaName: sa.superAdegaName,
              hasMistral: true
            };
          }
        });
        return newRows;
      });

      showNotification(`✅ Sincronização concluída!`, 'success');
    } catch (error: any) {
      showNotification(`❌ Erro ao ler JSON: ${error.message}`, 'error');
    }
  };

  const handleImportWoocommerceDescriptions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const wooData = await import('../services/offlineService').then(m => m.parseStoreCatalogOffline(text));

      if (wooData.length === 0) {
        showNotification('❌ Nenhuma descrição encontrada no arquivo CSV.', 'error');
        return;
      }

      let descritionCount = 0;

      setRows(prevRows => prevRows.map(row => {
        const match = wooData.find(w =>
          (row.storeProduct?.id && String(w.id) === String(row.storeProduct.id)) ||
          w.name.toLowerCase().trim() === row.supplierName.toLowerCase().trim()
        );

        if (match && match.description && match.description.trim() !== '') {
          descritionCount++;
          return {
            ...row,
            description: match.description,
            storeProduct: row.storeProduct ? { ...row.storeProduct, description: match.description } : row.storeProduct
          };
        }
        return row;
      }));

      showNotification(`✅ ${descritionCount} descrições importadas com sucesso!`, 'success');
    } catch (error: any) {
      showNotification(`❌ Erro ao ler CSV: ${error.message}`, 'error');
    }
  };

  const exportarWooCommerce = () => {
    handleSincronizarCatalogo();
    const produtosParaExportar = rows.filter(r => (r.sfFinal && r.sfFinal > 0) || (r.sfPor && r.sfPor > 0));

    const dadosCSV = produtosParaExportar.map(produto => {
      const sfDe = produto.sfDe || 0;
      const sfPor = produto.sfPor || 0;
      const sfFinal = produto.sfFinal || 0;

      let precoNormal = 0;
      let precoPromo = 0;

      if (sfDe > 0 && sfFinal > 0) {
        precoNormal = Math.max(sfDe, sfFinal);
        precoPromo = Math.min(sfDe, sfFinal);
      } else if (sfFinal > 0) {
        precoNormal = sfFinal * 1.15;
        precoPromo = sfFinal;
      } else if (sfDe > 0) {
        precoNormal = sfDe;
        precoPromo = sfDe * 0.90;
      } else if (sfPor > 0) {
        precoNormal = sfPor * 1.15;
        precoPromo = sfPor;
      }

      if (precoPromo >= precoNormal) {
        const temp = precoNormal;
        precoNormal = precoPromo;
        precoPromo = temp;
      }

      return [
        produto.supplierName,
        (produto.milaoDe || 0).toFixed(2),
        (produto.milaoPor || 0).toFixed(2),
        precoNormal.toFixed(2),
        precoPromo.toFixed(2)
      ];
    });

    const header = ['Produto', 'Milão De', 'Milão Por', 'SF De', 'SF Final (WooCommerce)'];
    const csv = '\uFEFF' + [header, ...dadosCSV].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `SF_WooCommerce_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
  };

  const vincularAutomaticoMilaoSF = () => {
    const novosRows = vincularProdutosAutomaticamente(rows);
    setRows(novosRows);
  };

  const excluirMilao = (id: string) => setRows(rows.filter(p => p.rowId !== id));

  const vincularSfMilao = (sfId: string, milaoId: string) => {
    const sfRow = rows.find((p: any) => p.storeProduct?.id === sfId);
    if (!sfRow) return;
    setRows(rows.map(row => row.rowId === milaoId ? { ...row, storeProduct: sfRow.storeProduct, isLinked: true, hasSF: true, hasMilao: true } : row));
  };

  const abrirVinculo = (milaoId: string) => { setModalVinculo({ aberto: true, milaoId }); setTermoBusca(''); };
  const confirmarVinculo = (sfId: string) => {
    const sfProd = storeCatalog.find(p => p.id === sfId);
    if (sfProd) setRows(rows.map(row => row.rowId === modalVinculo.milaoId ? { ...row, storeProduct: sfProd, isLinked: true, hasSF: true, hasMilao: true } : row));
    setModalVinculo({ aberto: false, milaoId: '' });
  };
  const desvincularProduto = (rowId: string) =>
    setRows(rows.map(row => row.rowId === rowId ? { ...row, storeProduct: null, isLinked: false } : row));

  const handleDeleteRow = (rowId: string) => { if (confirm('Excluir linha?')) setRows(prev => prev.filter(r => r.rowId !== rowId)); };
  const handleConfirmarRevisao = (rowId: string) => {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, isRevised: true, isNewProduct: false } : r));
    showNotification('✅ Revisão confirmada para este produto!', 'success');
  };

  const handleUpdateRow = (rowId: string, updates: Partial<DashboardRow>) => {
    setRows(prev => prev.map(r => {
      if (r.rowId === rowId) {
        // Se houver qualquer atualização manual, limpa o destaque de Produto Novo
        const newRow = { ...r, ...updates, isRevised: true, isNewProduct: false };

        let calculated = [newRow];
        // Se mudou milaoPor, milaoDe ou milaoOriginal (cost base), re-aplicamos o motor parcial
        if (updates.milaoPor !== undefined || updates.milaoDe !== undefined || updates.supplierCostRaw !== undefined) {
          calculated = processBasePricing(calculated, sellout_pct, margem_pct);
          calculated = processSafetyBlindage(calculated, lucro_minimo, frete_valor, taxa_cartao_pct);
        }
        // Se mudou instagram, re-aplicamos markup
        if (updates.instagram !== undefined) {
          calculated = processInstagramMarkup(calculated, instagram_markup_pct);
        }
        return syncRiskFlags(calculated[0], settings);
      }
      return r;
    }));
  };
  const handleLinkProduct = (rowId: string, storeId: string) => {
    const row = rows.find(r => r.rowId === rowId);
    if (!row) return;
    const nm = { ...memoryMap };
    if (!nm[row.supplierName]) nm[row.supplierName] = [];
    if (!nm[row.supplierName].includes(storeId)) nm[row.supplierName].push(storeId);
    setMemoryMap(nm);
  };

  const abrirModalSFOnly = () => {
    const produtosSFOnly = rows.filter(r => r.status === 'sf-only');
    if (produtosSFOnly.length === 0) {
      alert('Não há produtos SF Only para vincular!');
      return;
    }
    setModalSFOnly({
      aberto: true,
      produtosSFOnly: produtosSFOnly,
      indiceAtual: 0
    });
  };

  const abrirListaCompletaSFOnly = () => {
    const produtosSFOnly = rows.filter(r => r.status === 'sf-only');
    if (produtosSFOnly.length === 0) {
      alert('Não há produtos SF Only para vincular!');
      return;
    }
    setModalListaSFOnly({
      aberto: true,
      produtosSFOnly: produtosSFOnly
    });
  };

  const abrirVinculacaoEspecifica = (produtoSF) => {
    const milaoDisponiveis = todosOsProdutosOriginal.filter(r => (r.milaoDe && r.milaoDe > 0) || (r.milaoPor && r.milaoPor > 0));
    if (milaoDisponiveis.length === 0) {
      alert('⚠️ Nenhum produto do Milão disponível para vincular.');
      return;
    }
    const nomeSF = produtoSF.supplierName.toUpperCase();
    const milaoOrdenado = milaoDisponiveis.sort((a, b) => calcularSimilaridade(nomeSF, b.supplierName.toUpperCase()) - calcularSimilaridade(nomeSF, a.supplierName.toUpperCase()));

    setModalVincularEspecifico({
      aberto: true,
      produtoSF: produtoSF,
      produtosMilao: milaoOrdenado
    });
    setBuscaMilao('');
  };

  const calcularSimilaridade = (str1: string, str2: string): number => {
    const normalizar = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const s1 = normalizar(str1);
    const s2 = normalizar(str2);
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    const palavras1 = s1.split(' ');
    const palavras2 = s2.split(' ');
    let palavrasComuns = 0;
    palavras1.forEach(p1 => { if (palavras2.some(p2 => p2.includes(p1) || p1.includes(p2))) palavrasComuns++; });
    const maxPalavras = Math.max(palavras1.length, palavras2.length);
    return maxPalavras > 0 ? palavrasComuns / maxPalavras : 0;
  };

  const vincularProdutoEspecifico = (produtoSF, produtoMilao) => {
    const novoProduto = {
      ...produtoSF,
      milaoDe: produtoMilao.milaoDe,
      milaoPor: produtoMilao.milaoPor || produtoMilao.milaoDe,
      status: 'both',
      isLinked: true,
      finalCost: produtoMilao.milaoPor || produtoMilao.milaoDe,
      profit: produtoSF.sfPor - (produtoMilao.milaoPor || produtoMilao.milaoDe),
      margin: ((produtoSF.sfPor - (produtoMilao.milaoPor || produtoMilao.milaoDe)) / produtoSF.sfPor) * 100,
      ilusao: produtoSF.ilusao || 0
    };
    setRows(prev => prev.map(r => r.rowId === produtoSF.rowId ? novoProduto : r));
    setModalVincularEspecifico({ aberto: false, produtoSF: null, produtosMilao: [] });
    setModalListaSFOnly(prev => ({ ...prev, produtosSFOnly: prev.produtosSFOnly.filter(p => p.rowId !== produtoSF.rowId) }));
  };

  const criarNovoProdutoMilao = (produtoSF) => {
    const nomeProduto = produtoSF.supplierName;
    const sfDe = produtoSF.sfDe || 0;
    const sfPor = produtoSF.sfPor || 0;

    const milaoDE = prompt(`➕ ADICIONAR AO MILÃO\n\n📦 Produto: ${nomeProduto}\n\n💰 SF DE: R$ ${sfDe.toFixed(2)}\n💵 SF POR: R$ ${sfPor.toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDigite o MILÃO DE (preço normal):`, sfDe.toFixed(2));
    if (!milaoDE) return;

    const milaoPOR = prompt(`➕ ADICIONAR AO MILÃO\n\n📦 Produto: ${nomeProduto}\n\n💰 SF DE: R$ ${sfDe.toFixed(2)}\n💵 SF POR: R$ ${sfPor.toFixed(2)}\n\n✅ Milão DE: R$ ${milaoDE}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDigite o MILÃO POR (preço promocional):`, sfPor.toFixed(2));
    if (!milaoPOR) return;

    const milaoPORFinal = parseFloat(milaoPOR) || parseFloat(milaoDE);

    const novoProduto = {
      ...produtoSF,
      milaoDe: parseFloat(milaoDE),
      milaoPor: milaoPORFinal,
      status: 'both',
      isLinked: true,
      finalCost: milaoPORFinal,
      profit: produtoSF.sfPor - milaoPORFinal,
      margin: ((produtoSF.sfPor - milaoPORFinal) / produtoSF.sfPor) * 100,
      ilusao: produtoSF.ilusao || 0
    };

    setRows(prev => prev.map(r => r.rowId === produtoSF.rowId ? novoProduto : r));
    setModalVincularEspecifico({ aberto: false, produtoSF: null, produtosMilao: [] });
    setModalListaSFOnly(prev => ({ ...prev, produtosSFOnly: prev.produtosSFOnly.filter(p => p.rowId !== produtoSF.rowId) }));
  };

  const gerarCSVWooCommerce = () => {
    // EXPORTA TODOS os produtos que têm ID e preço válido
    // SEM FILTROS DE BLOQUEIO — o sistema de alertas visuais 
    // já avisa o Sérgio sobre problemas, ele decide o que corrigir
    const validarParaExportacao = (produto: DashboardRow) => {
      // Exporta tudo que tem ID e preço — sem bloqueios
      // Alertas visuais na tabela já avisam o Sérgio
      const temPreco = Number(produto.sfFinal || produto.sfPor || 0) > 0;
      return temPreco;
    };

    const produtosParaExportar = rows.filter(r => {
      const temId = r.id && String(r.id).trim() !== '';
      return temId && validarParaExportacao(r);
    });

    if (produtosParaExportar.length === 0) {
      showNotification('❌ Nenhum produto com ID e preço válido para exportar.', 'error');
      return;
    }

    // Conta alertas para informar Sérgio ANTES de exportar
    const comPrejuizo = produtosParaExportar.filter(r => r.alertaDefasagem).length;
    const comLucroBaixo = produtosParaExportar.filter(r => r.precisaAjustar).length;

    if (comPrejuizo > 0 || comLucroBaixo > 0) {
      const continuar = confirm(
        `⚠️ ATENÇÃO ANTES DE EXPORTAR\n\n` +
        `🚨 Produtos com prejuízo: ${comPrejuizo}\n` +
        `⚠️ Produtos com lucro baixo: ${comLucroBaixo}\n\n` +
        `Esses produtos SERÃO exportados normalmente.\n` +
        `Recomendamos corrigir antes, mas você decide.\n\n` +
        `Exportar mesmo assim?`
      );
      if (!continuar) return;
    }

    // FORMATO PADRÃO WOOCOMMERCE (colunas que o Woo reconhece na importação)
    const linhas = produtosParaExportar.map(r => {
      const sfFinal = Number(r.sfFinal || r.sfPor || 0);
      const sfDe = Number(r.sfDe || 0);

      // Preço normal = sfDe se existir e for maior, senão sfFinal * 1.20
      const precoNormal = sfDe > sfFinal ? sfDe : (sfFinal * 1.20).toFixed(2);
      const precoPromo = sfFinal.toFixed(2);

      // SKU = ID do produto
      const sku = String(r.id || '').trim();
      const nome = (r.supplierName || '').replace(/"/g, '""');
      const descricao = (r.description || '').replace(/"/g, '""');
      const status = 'publish'; // SEMPRE publicado — sem bloqueios

      return `${sku},simple,${sku},"${nome}",${precoNormal},${precoPromo},1,${status},"${descricao}"`;
    });

    const cabecalho = 'ID,Type,SKU,Name,Regular price,Sale price,Stock,Published,Description';
    const csv = '\uFEFF' + [cabecalho, ...linhas].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const data = new Date().toISOString().slice(0, 10);
    link.download = `woocommerce_sfimports_${data}_${produtosParaExportar.length}produtos.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(
      `✅ ${produtosParaExportar.length} produtos exportados para WooCommerce!`,
      'success'
    );
  };

  const gerarCatalogoAtualizado = () => {
    if (rows.length === 0) return;
    const produtosValidos = rows.filter(r => r.supplierName && (r.sfFinal || r.sfDe));
    if (produtosValidos.length === 0) return;

    try {
      const catalogoFormatado = produtosValidos.map(produto => {
        const precoNum = Number(produto.sfFinalInsta || produto.sfFinal || produto.sfDe || 0);
        const precoDeNum = Number(produto.sfDe || 0);
        const name = produto.supplierName || 'Produto sem nome';
        const category = produto.category || 'geral';
        const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const tags = [normalizeStr(name), normalizeStr(category), 'todos'];
        if (precoNum < precoDeNum || Math.random() > 0.9) {
          tags.push('promo', 'super');
          if ((precoDeNum - precoNum) > (precoDeNum * 0.05) || Math.random() > 0.7) tags.push('semana');
        }
        if (Math.random() > 0.8) tags.push('vendido', 'destaque');
        if (Math.random() > 0.9) tags.push('semana');
        if (produto.description) tags.push(normalizeStr(produto.description));

        return {
          id: produto.id || Math.random().toString(36).substr(2, 9),
          name: name,
          price: precoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          old_price: precoDeNum > precoNum ? precoDeNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "",
          image: produto.image && !produto.image.includes('via.placeholder') && !produto.image.includes('wp-content')
            ? produto.image
            : `/imagens_produtos/imagens sem fundo/${generateProductSlug(name)}.png`,
          category: category,
          all_categories: `Todos Produtos, ${category}`,
          description: produto.description || `${name} - SF Imports`,
          is_sale: precoDeNum > precoNum,
          tags_search: tags.join(' '),
          val_sort: precoNum,
          status_tag: precoDeNum > precoNum ? "SUPER_PROMO" : "NORMAL"
        };
      });

      const jsonContent = JSON.stringify(catalogoFormatado, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogo-produtos-${timestamp}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      handleSincronizarCatalogo(rows);
    } catch (error) {
      console.error('❌ ERRO AO GERAR CATÁLOGO:', error);
    }
  };

  const abrirDashboardCompleto = () => {
    const stats = {
      total: rows.length,
      both: rows.filter(r => r.status === 'both').length,
      sfOnly: rows.filter(r => r.status === 'sf-only').length,
      milaoOnly: rows.filter(r => r.status === 'milao-only').length,
      lucroTotal: rows.reduce((sum, r) => sum + (r.lucroReal || 0), 0),
      margemMedia: rows.reduce((sum, r) => sum + (r.percentualLucro || 0), 0) / rows.length,
      precoMedio: rows.reduce((sum, r) => sum + (r.sfFinal || 0), 0) / rows.length
    };
    const maisLucrativos = [...rows].filter(r => (r.lucroReal || 0) > 0).sort((a, b) => (b.lucroReal || 0) - (a.lucroReal || 0)).slice(0, 10);
    const maiorMargem = [...rows].filter(r => (r.percentualLucro || 0) > 0).sort((a, b) => (b.percentualLucro || 0) - (a.percentualLucro || 0)).slice(0, 10);
    const comAlerta = rows.filter(r => (r.percentualLucro || 0) > 0 && (r.percentualLucro || 0) < 20);

    setModalDashboard({ aberto: true, stats, maisLucrativos, maiorMargem, comAlerta });
  };

  const atualizarTudo = async () => {
    if (!autoRun && !confirm('🚀 Deseja executar a ATUALIZAÇÃO COMPLETA agora?\n(Isso irá gerar CSV e XLSX de uma vez)')) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      gerarCSVWooCommerce();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  };

  const vincularProdutoMassa = (produtoSF, produtoMilao) => {
    const novoProduto = {
      ...produtoSF,
      milaoDe: produtoMilao.milaoDe,
      milaoPor: produtoMilao.milaoPor || produtoMilao.milaoDe,
      status: 'both',
      isLinked: true,
      finalCost: produtoMilao.milaoPor || produtoMilao.milaoDe,
      profit: produtoSF.sfPor - (produtoMilao.milaoPor || produtoMilao.milaoDe),
      margin: ((produtoSF.sfPor - (produtoMilao.milaoPor || produtoMilao.milaoDe)) / produtoSF.sfPor) * 100,
      ilusao: produtoSF.ilusao || 0
    };

    setRows(prev => prev.map(r => r.rowId === produtoSF.rowId ? novoProduto : r));

    if (modalSFOnly.indiceAtual < modalSFOnly.produtosSFOnly.length - 1) {
      setModalSFOnly(prev => ({ ...prev, indiceAtual: prev.indiceAtual + 1 }));
      setBuscaMilao('');
    } else {
      setModalSFOnly({ aberto: false, produtosSFOnly: [], indiceAtual: 0 });
    }
  };

  const adicionarAoMilaoMassa = (produtoSF) => {
    const milaoDE = prompt(`💰 Preço MILÃO DE para:\n${produtoSF.supplierName}`, produtoSF.sfDe || '0');
    const milaoPOR = prompt(`💵 Preço MILÃO POR para:\n${produtoSF.supplierName}`, produtoSF.sfPor || '0');

    if (milaoDE) {
      const milaoPORFinal = parseFloat(milaoPOR) || parseFloat(milaoDE);

      const novoProduto = {
        ...produtoSF,
        milaoDe: parseFloat(milaoDE),
        milaoPor: milaoPORFinal,
        status: 'both',
        isLinked: true,
        finalCost: milaoPORFinal,
        profit: produtoSF.sfPor - milaoPORFinal,
        margin: ((produtoSF.sfPor - milaoPORFinal) / produtoSF.sfPor) * 100,
        ilusao: produtoSF.ilusao || 0
      };

      setRows(prev => prev.map(r => r.rowId === produtoSF.rowId ? novoProduto : r));

      if (modalSFOnly.indiceAtual < modalSFOnly.produtosSFOnly.length - 1) {
        setModalSFOnly(prev => ({ ...prev, indiceAtual: prev.indiceAtual + 1 }));
        setBuscaMilao('');
      } else {
        setModalSFOnly({ aberto: false, produtosSFOnly: [], indiceAtual: 0 });
      }
    }
  };

  const pularProduto = () => {
    if (modalSFOnly.indiceAtual < modalSFOnly.produtosSFOnly.length - 1) {
      setModalSFOnly(prev => ({ ...prev, indiceAtual: prev.indiceAtual + 1 }));
      setBuscaMilao('');
    } else {
      setModalSFOnly({ aberto: false, produtosSFOnly: [], indiceAtual: 0 });
    }
  };

  // useEffect(() => { ... }) 🚫 Removido auto-load de Excel legado para priorizar servidor.


  const limparProdutosDuplicados = () => {
    if (!autoRun && !confirm('⚠️ Esta ação irá remover produtos duplicados e produtos sem imagem.\n\nDeseja continuar?')) return;
    const seen = new Set();
    const duplicadosParaRemover = new Set();

    rows.forEach((row, index) => {
      const normalizedName = row.supplierName.toLowerCase().trim();
      if (seen.has(normalizedName)) duplicadosParaRemover.add(row.rowId);
      else seen.add(normalizedName);
    });

    const produtosFiltrados = rows.filter(row => {
      if (duplicadosParaRemover.has(row.rowId)) return false;
      if (!row.image || row.image === '' || row.image === 'null' || row.image === 'undefined') return false;
      return true;
    });

    setRows(produtosFiltrados);
    setTodosOsProdutos(produtosFiltrados);
  };

  useEffect(() => {
    if (!modalSFOnly.aberto) return;
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' && modalSFOnly.indiceAtual < modalSFOnly.produtosSFOnly.length - 1) {
        setModalSFOnly(prev => ({ ...prev, indiceAtual: prev.indiceAtual + 1 }));
        setBuscaMilao('');
      } else if (e.key === 'ArrowLeft' && modalSFOnly.indiceAtual > 0) {
        setModalSFOnly(prev => ({ ...prev, indiceAtual: prev.indiceAtual - 1 }));
        setBuscaMilao('');
      } else if (e.key === 'Escape') {
        setModalSFOnly({ aberto: false, produtosSFOnly: [], indiceAtual: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [modalSFOnly]);

  useEffect(() => {
    if (rows.length > 0) {
      const catalogoData = rows.filter(r => r.sfFinal && r.sfFinal > 0).map(r => ({
        id: r.id, nome: r.supplierName, preco: r.sfFinal
      }));
      localStorage.setItem('catalogoSFImports', JSON.stringify(catalogoData));
    }
  }, [rows]);

  const rowsFiltrados = ordenarProdutos(
    rows.filter((r: any) => {
      const matchStatus = filtroStatus === 'all' ||
        (filtroStatus === 'both' && r.hasSF && r.hasMilao) ||
        (filtroStatus === 'sf-only' && r.hasSF && !r.hasMilao) ||
        (filtroStatus === 'milao-only' && r.hasMilao && !r.hasSF) ||
        (filtroStatus === 'mistral' && r.hasMistral && !r.hasSF && !r.hasMilao) ||
        (filtroStatus === 'ocr-decision' && Number(r.instagram) > 0) ||
        (filtroStatus === 'risk-prejuizo' && r.alertaDefasagem) ||
        (filtroStatus === 'risk-lucro-baixo' && r.precisaAjustar) ||
        (filtroStatus === 'risk-bloqueado' && (r.alertaDefasagem || r.precisaAjustar)) ||
        (r.status === filtroStatus);
      const matchBusca = String(r.supplierName || '').toLowerCase().includes(termoBusca.toLowerCase());
      return matchStatus && matchBusca;
    })
  );

  const handleNovaPesquisaSM = () => {
    setStoreMasterProduct(null);
    setShowStoreMaster(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-800">
      {/* 🔥 BANNER OPORTUNIDADES */}
      {oportunidades.length > 0 && (
        <div
          onClick={() => setShowOpsPopup(true)}
          style={{ cursor: 'pointer', background: 'linear-gradient(90deg, #003a00, #00ff8822)', border: '1px solid #00ff88', borderRadius: '10px', padding: '12px 18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <span style={{ fontSize: '22px' }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, color: '#00ff88', fontSize: '14px' }}>
              {oportunidades.length} OPORTUNIDADE{oportunidades.length > 1 ? 'S' : ''} HOJE
            </div>
            <div style={{ color: '#aaa', fontSize: '11px' }}>
              Vinhos nota 4.0+ mais baratos que a SuperAdega em R$10+. Clique para ver.
            </div>
          </div>
          {filaProgresso.total > 0 && filaProgresso.done < filaProgresso.total && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              🔄 {filaProgresso.done}/{filaProgresso.total}
            </div>
          )}
          <span style={{ color: '#00ff88', fontSize: '18px' }}>›</span>
        </div>
      )}

      {/* 📊 POPUP OPORTUNIDADES */}
      {showOpsPopup && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px' }}>🔥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '16px' }}>{oportunidades.length} Oportunidades do Dia</div>
                <div style={{ color: '#888', fontSize: '12px' }}>Vivino ≥ 4.0 · SF Final ≥ R$10 mais barato que SuperAdega</div>
              </div>
              <button onClick={() => setShowOpsPopup(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
              {oportunidades.map(op => (
                <div key={op.rowId}
                  onClick={() => setOpsSelecionadas(prev => { const n = new Set(prev); n.has(op.rowId) ? n.delete(op.rowId) : n.add(op.rowId); return n; })}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', background: opsSelecionadas.has(op.rowId) ? '#0a2a0a' : '#1a1a1a', border: `1px solid ${opsSelecionadas.has(op.rowId) ? '#00ff88' : '#2a2a2a'}` }}
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${opsSelecionadas.has(op.rowId) ? '#00ff88' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {opsSelecionadas.has(op.rowId) && <span style={{ color: '#00ff88', fontSize: '14px' }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.nome}</div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: op.vivino >= 4.2 ? '#00ff88' : '#ffd400' }}>⭐ {op.vivino.toFixed(1)} {op.vivinoClass}</span>
                      <span style={{ fontSize: '11px', color: '#ff6666' }}>🛒 SA: R${op.saPreco.toFixed(2).replace('.', ',')}</span>
                      <span style={{ fontSize: '11px', color: '#fff' }}>✅ SF: R${op.sfFinal.toFixed(2).replace('.', ',')}</span>
                      <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: 800 }}>-R${op.vantagem.toFixed(2).replace('.', ',')} vs SA</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: '#666' }}>margem</div>
                    <div style={{ fontWeight: 900, color: '#00ff88', fontSize: '14px' }}>+R${op.margem.toFixed(2).replace('.', ',')}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #222', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setOpsSelecionadas(new Set(oportunidades.map(o => o.rowId)))}
                style={{ flex: 1, padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
              >
                SELECIONAR TODOS ({oportunidades.length})
              </button>
              <button
                onClick={() => {
                  if (opsSelecionadas.size === 0) return;
                  const selecionados = oportunidades.filter(o => opsSelecionadas.has(o.rowId));
                  // Salva selecionados para o StoryEditor abrir
                  localStorage.setItem('ops_para_story', JSON.stringify(selecionados));
                  setShowOpsPopup(false);
                  alert(`✅ ${selecionados.length} produto(s) prontos! Abra o Editor de Stories para criar os templates.`);
                }}
                disabled={opsSelecionadas.size === 0}
                style={{ flex: 2, padding: '10px', background: opsSelecionadas.size > 0 ? '#00ff88' : '#333', color: opsSelecionadas.size > 0 ? '#000' : '#666', border: 'none', borderRadius: '8px', cursor: opsSelecionadas.size > 0 ? 'pointer' : 'default', fontWeight: 900, fontSize: '13px' }}
              >
                🚀 CRIAR STORIES ({opsSelecionadas.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        background: '#1e1b4b',
        flexWrap: 'wrap'
      }}>
        {/* Logo */}
        <img src="/logo-sf.png" alt="SF Imports" style={{ height: 48, marginRight: 8 }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        {/* Botão Voltar */}
        <button onClick={onBack} title="Voltar para a tela anterior"
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        {/* BOTÕES UNIFORMES */}
        {[
          { label: 'Upload\nTabela', color: '#16a34a', icon: '📥', action: () => setStep(1), tip: 'Importa a planilha Excel com os produtos do fornecedor Milão' },
          { label: 'Descrições', color: '#2563eb', icon: '📝', action: () => navigateTo('descricoes'), tip: 'Gera descrições profissionais para os produtos usando IA' },
          { label: 'Salvar', color: '#475569', icon: '💾', action: saveMemory, tip: 'Salva o estado atual na memória do sistema' },
          { label: 'Exportar', color: '#475569', icon: '📤', action: gerarCSVWooCommerce, tip: 'Exporta os preços em CSV para o WooCommerce' },
          { label: 'Dash', color: '#4f46e5', icon: '📊', action: abrirDashboardCompleto, tip: 'Painel com estatísticas de vendas, margens e alertas' },
          { label: 'Conf', color: '#374151', icon: '⚙️', action: () => setModalConfiguracao(true), tip: 'Configura margens, frete, taxas e markup Instagram' },
          { label: 'Up Woo', color: '#7c3aed', icon: '🛒', action: gerarCSVWooCommerce, tip: 'Exporta produtos atualizados para o WooCommerce' },
          { label: 'Up Cat', color: '#b45309', icon: '📂', action: gerarCatalogoAtualizado, tip: 'Gera catálogo atualizado com todos os produtos e preços' },
          { label: 'Super A.', color: '#b91c1c', icon: '🍷', action: handleSyncSuperAdega, tip: 'Compara preços com a SuperAdega para inteligência competitiva' },
          { label: 'OCR', color: '#9333ea', icon: '📷', action: () => navigateTo('ocr'), tip: 'Fotografe a tabela do fornecedor e os preços são importados' },
          { label: 'Turbo\nImagens', color: '#c2410c', icon: '🖼️', action: () => window.open('/?module=turbo', '_blank'), tip: 'Busca imagens em lote no Google para produtos sem foto' },
          { label: 'Store\nMaster', color: '#065f46', icon: '➕', action: handleNovaPesquisaSM, tip: 'Cadastra produto novo com nome, imagem, descrição e preços' },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            title={btn.tip}
            disabled={isLoading}
            style={{
              background: btn.color,
              border: 'none',
              borderRadius: '10px',
              minWidth: '72px',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 700,
              fontSize: '10px',
              whiteSpace: 'pre-line',
              textAlign: 'center',
              padding: '4px 8px',
              transition: 'transform 0.1s, opacity 0.1s',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </nav>

      {/* ── STEP 0: MODO ── */}
      {step === 0 && (
        <div className="max-w-4xl mx-auto p-8">
          <h2 className="text-3xl font-bold text-center mb-8">{viewMode === 'RETAIL' ? 'Varejo (B2C)' : 'Atacado (B2B)'} — Dados</h2>
          <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md">
            <button onClick={() => setViewMode('RETAIL')} className={`px-6 py-2 rounded-lg font-bold transition ${viewMode === 'RETAIL' ? 'bg-white text-indigo-900 shadow-lg' : 'text-white hover:bg-white/10'}`}>🛒 Varejo (B2C)</button>
            <button onClick={() => setViewMode('WHOLESALE')} className={`px-6 py-2 rounded-lg font-bold transition ${viewMode === 'WHOLESALE' ? 'bg-white text-indigo-900 shadow-lg' : 'text-white hover:bg-white/10'}`}>🏢 Atacado (B2B)</button>
            <button onClick={() => setViewMode('ML_COMPRAS')} className={`px-6 py-2 rounded-lg font-bold transition ${viewMode === 'ML_COMPRAS' ? 'bg-white text-indigo-900 shadow-lg' : 'text-white hover:bg-white/10'}`}>🛍️ Minhas Compras</button>
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setStep(1)} className="bg-indigo-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition">Continuar →</button>
          </div>
        </div>
      )}

      {/* ── STEP 1: UPLOAD ── */}
      {step === 1 && (
        <div className="max-w-6xl mx-auto p-8">
          <h2 className="text-3xl font-bold text-center mb-8">{viewMode === 'RETAIL' ? 'Varejo (B2C)' : 'Atacado (B2B)'} — Dados</h2>
          <div className="flex flex-col lg:flex-row gap-6 h-[500px] mt-8">
            <InputSection title="1. Planilha Consolidada (.xlsx)" description="SF-IMPORTS-DASHBOARD-CORRETO.xlsx com 984 produtos" color="border-green-500" textValue={""} setTextValue={() => { }} placeholder="SF-IMPORTS-DASHBOARD-CORRETO.xlsx" fileValue={consolidadaFile} setFileValue={setConsolidadaFile} onFileUpload={handleConsolidadaUpload} />
            <InputSection title="2. Milão Atual (.xlsx)" description="Novos preços do fornecedor" color="border-indigo-500" textValue={""} setTextValue={() => { }} placeholder="Milão atualizado..." fileValue={milaoFile} setFileValue={setMilaoFile} disabled={consolidadaLoaded} />
            <InputSection title="3. SF/Woo Atual (.csv)" description="Novos preços SF/WooCommerce" color="border-pink-500" textValue={""} setTextValue={() => { }} placeholder="SF/Woo atualizado..." fileValue={storeFile} setFileValue={setStoreFile} disabled={consolidadaLoaded} />
          </div>

          {consolidadaLoaded && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-xl">
              <span className="font-bold text-green-800">✅ Planilha consolidada — {consolidadaData.length} produtos</span>
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-6 text-center">
              <button onClick={atualizarTudo} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-bold text-xl shadow-lg transform hover:scale-105 transition">
                🚀 ATUALIZAR TUDO (Catálogo + WooCommerce)
              </button>
            </div>
          )}

          <div className="flex justify-center gap-4 mt-8">
            <button onClick={() => setStep(0)} className="text-gray-500 hover:text-gray-700 underline">Voltar seleção</button>
            <button disabled={isLoading} className="bg-indigo-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition flex items-center gap-2"
              onClick={async () => {
                const todosInputs = document.querySelectorAll('input[type="file"]');
                let inputXlsx: HTMLInputElement | null = null;
                for (let i = 0; i < todosInputs.length; i++) {
                  const inp = todosInputs[i] as HTMLInputElement;
                  if (inp.files && inp.files.length > 0 && inp.files[0].name.includes('.xlsx')) {
                    inputXlsx = inp; break;
                  }
                }
                if (!inputXlsx?.files?.[0] && !consolidadaFile) {
                  showNotification("❌ Faça upload da planilha consolidada!", "error");
                  return;
                }
                const arquivo = consolidadaFile || inputXlsx!.files![0];
                try {
                  setIsLoading(true);
                  const buffer = await arquivo.arrayBuffer();
                  const workbook = XLSX.read(buffer, { type: 'array' });
                  const abaName = workbook.SheetNames.find(n => n.includes('TODOS')) || workbook.SheetNames[0];

                  // Dynamic Header Detection
                  const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[abaName], { header: 1 }) as any[][];
                  let headerRowIndex = 0;
                  for (let j = 0; j < Math.min(20, aoa.length); j++) {
                    if (aoa[j] && aoa[j].some((c: any) => String(c).toUpperCase() === 'PRODUTO' || String(c).toUpperCase() === 'ID' || String(c).toUpperCase() === 'MILAO POR')) {
                      headerRowIndex = j;
                      break;
                    }
                  }

                  const dados = XLSX.utils.sheet_to_json(workbook.Sheets[abaName], { range: headerRowIndex });

                  const pn = (v: any): number => {
                    if (typeof v === 'number') return v;
                    if (!v || v === '-') return 0;
                    return parseFloat(String(v).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                  };
                  const gv = (row: any, keys: string[]) => {
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

                  const produtosImportados = dados.map((row: any, i: number) => {
                    const nome = gv(row, ['Produto', 'PRODUTO']) || '';
                    const match = String(gv(row, ['Match', 'Status', 'STATUS']) || '').toLowerCase();
                    const status = match.includes('both') ? 'both' : match.includes('sf') || match.includes('woo') ? 'sf-only' : 'milao-only';
                    const milaoDeInput = pn(gv(row, ['Milão De', 'MILAO DE', 'MILÃO DE (TABELA)']));
                    let milaoPorInput = pn(gv(row, ['Milão Por', 'MILAO POR', 'MILÃO POR (SÓCIO)']));
                    let isCopiado = false;

                    // FALLBACK V2: Se Milão Por for zero ou vazio, copiar o Milão De
                    if (!milaoPorInput || milaoPorInput === 0) {
                      milaoPorInput = milaoDeInput;
                      isCopiado = true;
                    }

                    const milaoPor = milaoPorInput || 0;
                    const milaoDe = milaoDeInput || milaoPor;
                    const sfDe = pn(gv(row, ['SF de', 'SF DE', 'Preço normal', 'SF DE (RISCADO)']) || 0);
                    const sfPor = pn(gv(row, ['SF por', 'SF POR', 'SF POR (+20%)', 'Preço promocional']) || 0);
                    const rawFinal = pn(gv(row, ['Venda', 'Preço normal', 'Preço', 'SF FINAL']) || 0);

                    return {
                      rowId: `produto-${i}`, id: i, supplierName: nome,
                      storeProduct: status !== 'milao-only' ? { id: String(row['ID'] || ''), name: nome, price: rawFinal || sfDe } : undefined,
                      milaoDe, milaoPor, finalCost: milaoPor, supplierCostRaw: milaoPor,
                      sfDe, sfPor, sfSug: sfPor, sfFinal: rawFinal || sfPor,
                      lucroReal: sfPor - milaoPor, alertaLucro: (sfPor - milaoPor) < lucro_minimo,
                      percentualLucro: sfPor > 0 ? ((sfPor - milaoPor) / sfPor) * 100 : 0,
                      status: status, sfMatch: status === 'both' ? 'BOTH' : status === 'sf-only' ? 'SF ONLY' : 'MILÃO ONLY',
                      isLinked: status === 'both', ilusao: 0,
                      origin: status === 'both' ? 'ambos' : 'milao', isMistral: false, badgeColor: status === 'both' ? 'amarelo' : 'azul', active: true,
                      isCopiado: isCopiado, // Flag V2
                      category: row['Categorias'] || row['Categoria'] || row['CATEGORIA'] || row['categoria'] || row['Tipo'] || row['TIPO'] || row['Gênero'] || 'geral',
                      image: row['Imagens'] || row['Imagem'] || row['IMAGEM'] || row['imagem'] || row['Image'] || '',
                      description: row['Descrição'] || row['DESCRIÇÃO'] || row['descrição'] || row['Descricao'] || row['Description'] || '',
                      instagram: String(row['Instagram'] || row['Insta'] || ''),
                      hasSF: status === 'both' || status === 'sf-only', hasMilao: status === 'both' || status === 'milao-only', hasMistral: false,
                      sfFinalInsta: rawFinal || sfPor || 0,
                    };
                  });

                  let finalRows: DashboardRow[] = [];

                  if (rows.length > 0) {
                    // MESCLAR (MERGE) com os dados existentes para preservar imagens e categorias
                    const mergedRows = [...rows];
                    produtosImportados.forEach((pf: any) => {
                      const existingIndex = mergedRows.findIndex(r => r.supplierName && pf.supplierName && r.supplierName.toLowerCase() === pf.supplierName.toLowerCase());
                      if (existingIndex > -1) {
                        const isMistral = mergedRows[existingIndex].isMistral || mergedRows[existingIndex].origin === 'mistral';

                        let finalMilaoDe = pf.milaoDe || mergedRows[existingIndex].milaoDe;
                        let finalMilaoPor = pf.milaoPor || mergedRows[existingIndex].milaoPor;

                        if (isMistral) {
                          if (!pf.milaoPor && pf.sfPor) finalMilaoPor = pf.sfPor;
                          if (!pf.milaoDe && pf.sfDe) finalMilaoDe = pf.sfDe;
                        }

                        mergedRows[existingIndex] = {
                          ...mergedRows[existingIndex],
                          milaoDe: finalMilaoDe,
                          milaoPor: finalMilaoPor,
                          sfDe: pf.sfDe || mergedRows[existingIndex].sfDe,
                          sfPor: pf.sfPor || mergedRows[existingIndex].sfPor,
                          sfFinal: pf.sfFinal || mergedRows[existingIndex].sfFinal,
                          isCopiado: pf.milaoPor === 0 && finalMilaoPor > 0 ? false : pf.isCopiado,
                          finalCost: finalMilaoPor || mergedRows[existingIndex].finalCost,
                          supplierCostRaw: finalMilaoPor || mergedRows[existingIndex].supplierCostRaw,
                        };
                      } else {
                        mergedRows.push(pf as DashboardRow);
                      }
                    });
                    finalRows = mergedRows;
                  } else {
                    // CARREGAMENTO INICIAL
                    finalRows = produtosImportados as DashboardRow[];
                  }

                  const produtosCalculados = applyAutoCalculations(finalRows);
                  setRows(produtosCalculados);
                  setTodosOsProdutos(produtosCalculados); // Ensure todosOsProdutos is also updated
                  setStep(2);
                  showNotification('✅ Planilha carregada e cálculos aplicados automaticamente!', 'success');
                } catch (err: any) {
                  showNotification(`❌ ERRO: ${err.message}`, 'error');
                } finally { setIsLoading(false); }
              }}>
              {isLoading ? <span className="animate-spin">⌛</span> : <Database />}
              ATUALIZAR PREÇOS!
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: DASHBOARD ── */}
      {step === 2 && (
        <div className="animate-fade-in px-4 pt-2 relative">

          {/* CARDS DE RESUMO DE RASPAGEM */}
          {/* Mini Resumo de Raspagem */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { id: 'milao', name: 'Emporio Milão', icon: <Store size={20}/>, color: 'blue' },
          { id: 'superadega_bulk', name: 'Super Adega (Lote)', icon: <LayoutList size={20}/>, color: 'purple' },
          { id: 'superadega_ia', name: 'Super Adega (Smart)', icon: <Cpu size={20}/>, color: 'indigo' },
          { id: 'vivino', name: 'Vivino Scores', icon: <Wine size={20}/>, color: 'red' }
        ].map(source => {
          const data = scrapingSummary?.fontes.find(f => f.fonte === source.id);
          const status = data?.status || 'sem_dados';
          
          return (
            <div 
              key={source.id}
              onClick={() => { setSelectedSource(source.id); setShowSummaryModal(true); }}
              className={`relative overflow-hidden group cursor-pointer border transition-all duration-300 rounded-2xl p-4 flex flex-col justify-between h-32 ${
                status === 'ok' ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/50' :
                status === 'erro' ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/50' :
                'bg-white/5 border-white/10 hover:border-blue-500/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg bg-${source.color}-500/20 text-${source.color}-400 group-hover:scale-110 transition-transform`}>
                  {source.icon}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                  status === 'ok' ? 'bg-green-500 text-white' :
                  status === 'erro' ? 'bg-red-500 text-white' : 'bg-white/20 text-white/60'
                }`}>
                  {status}
                </div>
              </div>
              
              <div>
                <h3 className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors">{source.name}</h3>
                <div className="flex items-end justify-between mt-1">
                  <span className="text-white/40 text-[10px] uppercase font-bold">Última: {data ? new Date(data.ultimaAtualizacao).toLocaleDateString() : '--/--'}</span>
                  <div className="text-right">
                    <div className="text-xs font-black text-white">{data?.totalProcessados || 0}</div>
                    <div className="text-[8px] text-white/40 uppercase">Itens</div>
                  </div>
                </div>
              </div>
              
              {/* Progresso sutil no fundo */}
              <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>

          {/* PAINEL DE RISCO INTERATIVO */}
          {rows.length > 0 && (
            <div className="mb-4 bg-red-50 border-2 border-red-500 rounded-xl p-4 shadow-sm">
              <h3 className="font-extrabold text-red-800 flex items-center gap-2 mb-3">
                🚨 PAINEL DE RISCO (Clique para filtrar)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div
                  onClick={() => setFiltroStatus(prev => prev === 'risk-prejuizo' ? 'all' : 'risk-prejuizo')}
                  className={`bg-white border-l-4 border-red-600 p-3 rounded shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${filtroStatus === 'risk-prejuizo' ? 'ring-2 ring-red-600' : ''}`}
                  title="Clique para filtrar apenas produtos nesta situação de risco"
                >
                  <div className="text-sm font-bold text-gray-600">Venda Abaixo do Custo Novo (Prejuízo)</div>
                  <div className="text-2xl font-black text-red-600">{rows.filter(r => r.alertaDefasagem).length} itens</div>
                </div>
                <div
                  onClick={() => setFiltroStatus(prev => prev === 'risk-lucro-baixo' ? 'all' : 'risk-lucro-baixo')}
                  className={`bg-white border-l-4 border-orange-500 p-3 rounded shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${filtroStatus === 'risk-lucro-baixo' ? 'ring-2 ring-orange-500' : ''}`}
                  title="Clique para filtrar apenas produtos nesta situação de risco"
                >
                  <div className="text-sm font-bold text-gray-600">Lucro Abaixo do Mínimo Permitido</div>
                  <div className="text-2xl font-black text-orange-600">{rows.filter(r => r.precisaAjustar).length} itens</div>
                </div>
                <div
                  onClick={() => setFiltroStatus(prev => prev === 'risk-bloqueado' ? 'all' : 'risk-bloqueado')}
                  className={`bg-white border-l-4 border-gray-800 p-3 rounded shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${filtroStatus === 'risk-bloqueado' ? 'ring-2 ring-gray-800' : ''}`}
                  title="Clique para filtrar apenas produtos nesta situação de risco"
                >
                  <div className="text-sm font-bold text-gray-600">Bloqueados na Exportação (WooCommerce)</div>
                  <div className="text-2xl font-black text-gray-800">{rows.filter(r => r.alertaDefasagem || r.precisaAjustar).length} itens</div>
                </div>
              </div>
            </div>
          )}

          {/* CARDS CLICÁVEIS */}
          {rows.length > 0 && (
            <div className="grid grid-cols-7 gap-2 mb-2">
              {[
                { label: 'Decisão OCR', valor: rows.filter(r => Number(r.instagram) > 0).length, color: 'emerald', st: 'ocr-decision' },
                { label: 'BOTH', valor: rows.filter(r => r.hasSF && r.hasMilao).length, color: 'yellow', st: 'both' },
                { label: 'SF Only', valor: rows.filter(r => r.hasSF && !r.hasMilao).length, color: 'blue', st: 'sf-only' },
                { label: 'Milão', valor: rows.filter(r => r.hasMilao && !r.hasSF).length, color: 'orange', st: 'milao-only' },
                { label: 'Mistral', valor: rows.filter(r => r.hasMistral).length, color: 'purple', st: 'mistral' },
                { label: 'Alerta', valor: rows.filter((r: any) => r.alertaLucro).length, color: 'red', st: 'all' },
                { label: 'Total', valor: rows.length, color: 'gray', st: 'all' },
              ].map(card => (
                <div key={card.label}
                  onClick={() => setFiltroStatus(prev => prev === card.st && card.st !== 'all' ? 'all' : card.st as any)}
                  className={`rounded p-2 text-center cursor-pointer border-2 transition-all hover:scale-105 select-none
                    ${filtroStatus === card.st && card.st !== 'all' ? 'ring-2 ring-gray-800 ring-offset-1' : ''}
                    bg-white border-${card.color}-400`}
                  title="Clique para filtrar apenas produtos nesta categoria"
                >
                  <div className={`text-base font-bold text-${card.color}-700`}>{card.valor}</div>
                  <div className={`text-[10px] text-${card.color}-600`}>{card.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4 bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">⚙️ Configurações de Precificação SF</h3>
              <div className="flex gap-2">
                <button onClick={handleForcarPuxarServidor} disabled={isLoading} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1" title="Apaga o banco local e baixa os produtos atualizados do servidor">📥 Sinc do Servidor</button>
                <button onClick={() => { if(confirm('⚠️ Isso vai apagar todo o cache de preços da SuperAdega e notas do Vivino, forçando uma nova pesquisa para todos os produtos. Deseja continuar?')) limparCache(); }} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-bold hover:bg-gray-700 flex items-center gap-1" title="Limpa o cache de inteligência e força uma nova raspagem para todos os produtos">🧹 Limpar Cache IA</button>
                <button onClick={handleSalvarTudo} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1" title="Salva permanentemente todas as alterações de preços e configurações no banco de dados">💾 Salvar Tudo</button>
                <button onClick={handleBackupTotal} disabled={isLoading} className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 flex items-center gap-1" title="Gera um arquivo de backup completo de toda a base de produtos e configurações">🛡️ {isLoading ? 'Gerando...' : 'Backup Total'}</button>
              </div>
            </div>

            <div className="p-2 grid grid-cols-4 gap-2 bg-gray-50/50">
              {/* Etapa 1 */}
              <div className="bg-indigo-50/40 p-2 rounded-lg border border-indigo-100 flex flex-col justify-between">
                <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">Etapa 1: Base</p>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <label className="block text-[8px] font-bold text-indigo-800">Sellout %</label>
                    <input type="number" value={sellout_pct} onChange={e => setSelloutPct(Number(e.target.value))} className="w-full bg-transparent text-sm font-black text-indigo-900 focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[8px] font-bold text-blue-800">Margem %</label>
                    <input type="number" value={margem_pct} onChange={e => setMargemPct(Number(e.target.value))} className="w-full bg-transparent text-sm font-black text-blue-900 focus:outline-none" />
                  </div>
                </div>
                <button onClick={handleAplicarSellout} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 rounded text-[9px]" title="Aplica a margem de sellout definida a todos os produtos filtrados">APLICAR</button>
              </div>

              {/* Etapa 2 */}
              <div className="bg-purple-50/40 p-2 rounded-lg border border-purple-100 flex flex-col justify-between">
                <p className="text-[9px] font-black text-purple-600 uppercase mb-1">Etapa 2: Custos</p>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <label className="block text-[8px] font-bold text-purple-800">Frete R$</label>
                    <input type="number" value={frete_valor} onChange={e => setFreteValor(Number(e.target.value))} className="w-full bg-transparent text-sm font-black text-purple-900 focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[8px] font-bold text-pink-800">Taxa %</label>
                    <input type="number" value={taxa_cartao_pct} onChange={e => setTaxaCartaoPct(Number(e.target.value))} className="w-full bg-transparent text-sm font-black text-pink-900 focus:outline-none" />
                  </div>
                </div>
                <button onClick={handleAplicarFreteETaxa} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 rounded text-[9px]" title="Calcula a sugestão de preço baseada em frete, taxa e lucro mínimo">GERAR SUGESTÃO</button>
              </div>

              {/* Etapa 3 */}
              <div className="bg-red-50/40 p-2 rounded-lg border border-red-100 flex flex-col justify-between">
                <p className="text-[9px] font-black text-red-600 uppercase mb-1">Etapa 3: Segurança</p>
                <div className="mb-1">
                  <label className="block text-[8px] font-bold text-red-800">Lucro Mín R$</label>
                  <input type="number" value={lucro_minimo} onChange={e => setLucroMinimo(Number(e.target.value))} className="w-full bg-transparent text-sm font-black text-red-600 focus:outline-none" />
                </div>
                <button onClick={() => handleCorrigirAdvertencias()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded text-[9px]" title="Ajusta automaticamente preços com margem negativa ou abaixo do lucro mínimo">🛡️ BLINDAR</button>
              </div>

              {/* Etapa 4 */}
              <div className="bg-orange-50/40 p-2 rounded-lg border border-orange-100 flex flex-col justify-between">
                <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Etapa 4: Instagram</p>
                <div className="mb-1">
                  <label className="block text-[8px] font-bold text-orange-800">Markup %</label>
                  <input type="number" value={instagram_markup_pct} onChange={e => setInstagramMarkupPct(Number(e.target.value))} className="w-full bg-transparent text-sm font-black text-orange-900 focus:outline-none" />
                </div>
                <button onClick={handleAplicarInstagramMarkup} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 rounded text-[9px]" title="Calcula o preço de venda para Instagram baseado no markup definido">🚀 GERAR INSTA</button>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-gray-400 mr-2">AÇÕES RÁPIDAS:</span>
              <button onClick={limparProdutosDuplicados} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-50" title="Remove produtos duplicados e itens sem imagem da lista">🧹 Limpar</button>
              <button onClick={exportarWooCommerce} className="px-3 py-1.5 bg-white border border-purple-200 text-purple-600 rounded-lg text-[10px] font-bold hover:bg-purple-50" title="Exporta dados formatados especificamente para o plugin WooCommerce">📦 WooCommerce</button>
              <button onClick={() => setShowRelatorio(true)} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-50" title="Gera um relatório detalhado de lucros, margens e defasagens">📊 Relatório</button>
              <button onClick={vincularAutomaticoMilaoSF} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-50" title="Tenta vincular automaticamente produtos do site com a tabela do fornecedor por nome">🔗 Vincular</button>
              <button onClick={() => { if (confirm('⚠️ Isso apagará todos os preços da SuperAdega e notas do Vivino já salvos para buscar tudo de novo com as novas regras. Continuar?')) limparCache(); }} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[10px] font-bold hover:bg-red-100 italic" title="Apaga os dados salvos do Vivino e SuperAdega para forçar uma nova análise">🧹 Limpar Cache IA</button>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-sm text-gray-500 mt-1">
              {rowsFiltrados.length} de {rows.length} produtos
              {filtroStatus !== 'all' && <span className="ml-2 text-blue-600 font-semibold">[filtro: {filtroStatus}]</span>}
            </p>
          </div>

          <ResultsTable
            rows={rowsFiltrados} settings={settings} viewMode={viewMode}
            onDeleteRow={handleDeleteRow} onUpdateRow={handleUpdateRow} onLinkProduct={handleLinkProduct}
            excluirMilao={excluirMilao} vincularSfMilao={vincularSfMilao}
            abrirVinculo={abrirVinculo} desvincularProduto={desvincularProduto}
            lucroMin={settings.lucro_minimo?.toString() || "10"} showNotification={showNotification}
            onRegistrarCompra={(compra) => setModalRegistroCompra({ aberto: true, dados: compra })}
            mlPrecos={mlPrecos} isSyncingML={isSyncingML} onSyncML={sincronizarML}
            onConfirmRevised={handleConfirmarRevisao}
          />
        </div>
      )}

      {/* ── MODAL STORE MASTER UNIFICADO (FLUTUANTE) ── */}
      {showStoreMaster && !storeMasterProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[3000] p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-gray-900 text-white p-8 w-full max-w-4xl rounded-2xl shadow-2xl relative my-auto border border-gray-700">
            <button onClick={() => setShowStoreMaster(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full transition-colors">
              <X size={24} />
            </button>

            <div className="mb-8 text-center mt-2">
              <h1 className="text-4xl font-bold mb-2 flex justify-center items-center gap-3">🏪 STORE MASTER</h1>
              <p className="text-gray-400">Adicionar novo produto direto ao sistema SF Imports</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 shadow-inner border border-gray-700">
              <div className="grid md:grid-cols-2 gap-6">

                {/* Modal de Resumo de Raspagem */}
      {showSummaryModal && selectedSource && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-[#1a1c2c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-600/20 to-purple-600/20">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  Detalhes: {
                    selectedSource === 'milao' ? 'Empório Milão' :
                    selectedSource === 'superadega_bulk' ? 'Super Adega (Lote)' :
                    selectedSource === 'superadega_ia' ? 'Super Adega (IA Smart)' :
                    selectedSource === 'vivino' ? 'Vivino' : selectedSource
                  }
                </h2>
                <p className="text-white/60 text-sm mt-1">
                  Última atualização: {new Date(scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.ultimaAtualizacao || '').toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Processados', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.totalProcessados || 0, icon: <Package size={18}/>, color: 'blue' },
                  { label: 'Alterações', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.alteracoesPreco || 0, icon: <TrendingUp size={18}/>, color: 'green' },
                  { label: 'Erros', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.erros || 0, icon: <AlertCircle size={18}/>, color: 'red' },
                  { label: 'Sem Match', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.semMatch || 0, icon: <Search size={18}/>, color: 'yellow' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <div className={`text-${stat.color}-400 mb-1 flex items-center gap-2 text-xs uppercase tracking-wider font-bold`}>
                      {stat.icon} {stat.label}
                    </div>
                    <div className="text-2xl font-bold text-white">{stat.val}</div>
                  </div>
                ))}
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                    <th className="pb-3 font-bold">Produto</th>
                    <th className="pb-3 font-bold">De/Rating</th>
                    <th className="pb-3 font-bold">Por/Atual</th>
                    <th className="pb-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.itens || []).map((item, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4 pr-4">
                        <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{item.produto}</div>
                        <div className="text-white/40 text-xs mt-1 italic">{item.observacao}</div>
                      </td>
                      <td className="py-4 text-white/60">
                        {item.precoAnterior ? `R$ ${item.precoAnterior.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-4">
                        <span className="text-green-400 font-bold">
                          {selectedSource === 'vivino' ? item.precoNovo : `R$ ${item.precoNovo.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'alterado' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          item.status === 'erro' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
                {/* Coluna Esquerda */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-sm font-medium">🏷️ NOME DO PRODUTO *</label>
                      <button
                        onClick={handleSMAIAssistant}
                        disabled={isAnalyzingSM}
                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs font-bold rounded-full flex items-center transition-colors"
                        title="Usa inteligência artificial para identificar nome, uva, safra e país a partir do nome ou foto"
                      >
                        {isAnalyzingSM ? '⏳ Analisando...' : '✨ Identificar Produto (IA)'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={storeMasterProd.nome}
                      onChange={(e) => handleSMInputChange('nome', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: VINHO TINTO CABERNET SAUVIGNON"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">🛒 ID WOOCOMMERCE</label>
                    <input
                      type="text"
                      value={storeMasterProd.idWooCommerce}
                      onChange={(e) => handleSMInputChange('idWooCommerce', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="ID do produto no WooCommerce (Opcional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">💰 PREÇO DE *</label>
                      <input
                        type="text"
                        value={storeMasterProd.precoDe}
                        onChange={(e) => handleSMInputChange('precoDe', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="R$ 189,90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">💰 PREÇO POR *</label>
                      <input
                        type="text"
                        value={storeMasterProd.precoPor}
                        onChange={(e) => handleSMInputChange('precoPor', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none bg-yellow-50 text-black font-bold"
                        placeholder="R$ 149,90"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">🍇 TIPO DE UVA</label>
                    <input
                      type="text"
                      value={storeMasterProd.tipoUva}
                      onChange={(e) => handleSMInputChange('tipoUva', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: Cabernet Sauvignon, Malbec"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">📅 SAFRA</label>
                    <input
                      type="text"
                      value={storeMasterProd.safra}
                      onChange={(e) => handleSMInputChange('safra', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: 2022, 2023"
                    />
                  </div>
                </div>

                {/* Coluna Direita */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">🌍 PAÍS</label>
                    <input
                      type="text"
                      value={storeMasterProd.pais}
                      onChange={(e) => handleSMInputChange('pais', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Ex: Brasil, Argentina, Chile"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">📍 REGIÃO</label>
                      <input
                        type="text"
                        value={storeMasterProd.regiao}
                        onChange={(e) => handleSMInputChange('regiao', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Ex: Mendoza"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">📂 CATEGORIA</label>
                      <select
                        value={storeMasterProd.categoria}
                        onChange={(e) => handleSMInputChange('categoria', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Vinho">Vinho</option>
                        <option value="Espumante">Espumante</option>
                        <option value="Whisky">Whisky</option>
                        <option value="Vodka">Vodka</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">🖼️ IMAGEM DO PRODUTO</label>
                    <button
                      onClick={async () => {
                        // Abre seletor de arquivo para o print
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Guarda o base64 do print para o recorte no canvas
                          const toBase64 = (f: File): Promise<string> =>
                            new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(f); });
                          const printBase64 = await toBase64(file);

                          setIsAnalyzingSM(true);
                          showNotification('🔍 Identificando garrafa no print...', 'info');
                          try {
                            // Envia print para o servidor identificar bbox da garrafa
                            const formData = new FormData();
                            formData.append('print', file);
                            const res = await fetch('http://localhost:3002/api/extrair-imagem-print', { method: 'POST', body: formData });
                            const data = await res.json();

                            if (!data.success || !data.bbox) {
                              showNotification('❌ Não encontrei garrafa no print.', 'error');
                              return;
                            }

                            // Recorta no Canvas do frontend
                            const bbox = data.bbox;
                            const img = new Image();
                            img.onload = () => {
                              const margin = 0.04; // 4% de margem extra
                              const px = Math.max(0, ((bbox.x / 100) - margin) * img.width);
                              const py = Math.max(0, ((bbox.y / 100) - margin) * img.height);
                              const pw = Math.min(img.width - px, ((bbox.w / 100) + margin * 2) * img.width);
                              const ph = Math.min(img.height - py, ((bbox.h / 100) + margin * 2) * img.height);
                              const canvas = document.createElement('canvas');
                              canvas.width = pw;
                              canvas.height = ph;
                              canvas.getContext('2d')!.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
                              const recortada = canvas.toDataURL('image/png');
                              setStoreMasterProd(prev => ({ ...prev, imagem: recortada }));
                              showNotification('✅ Imagem extraída do print!', 'success');
                            };
                            img.src = printBase64;
                          } catch (err) {
                            showNotification('Erro ao processar print.', 'error');
                          } finally {
                            setIsAnalyzingSM(false);
                          }
                        };
                        input.click();
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors mb-3 w-full"
                      title="Tira uma foto ou faz upload de um print para extrair a imagem da garrafa automaticamente"
                    >
                      📸 Extrair Imagem do Print
                    </button>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      <button onClick={() => document.getElementById('sm-file-upload')?.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors" title="Faz o upload de uma imagem salva no seu computador">
                        📁 Buscar imagem do Desktop
                      </button>
                      <button onClick={handleSMImageUrl} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors" title="Define a imagem do produto usando um link direto da internet">
                        🌐 Colar URL da Imagem
                      </button>
                      <button onClick={handleSMInternetSearch} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors" title="Abre uma busca no Google Imagens para encontrar fotos deste produto">
                        🔍 Pesquisar imagem no Google
                      </button>
                    </div>

                    <input id="sm-file-upload" type="file" accept="image/*" onChange={handleSMImageUpload} className="hidden" />

                    {/* Área de imagem: suporta paste, exibe loading e preview */}
                    <div
                      tabIndex={0}
                      onPaste={handleSMPasteImage}
                      className="mt-3 outline-none"
                    >
                      {isAnalyzingSM && !storeMasterProd.imagem && (
                        <div className="w-full h-24 flex items-center justify-center rounded-lg border border-dashed border-yellow-500 bg-yellow-500/10 text-yellow-400 text-sm">
                          🔍 Buscando imagem...
                        </div>
                      )}

                      {storeMasterProd.imagem && (
                        <div className="mt-1">
                          <img
                            src={
                              storeMasterProd.imagem.startsWith('http') || storeMasterProd.imagem.startsWith('data:')
                                ? storeMasterProd.imagem
                                : getImagemLocalPrecificador(storeMasterProd.imagem)
                            }
                            alt="Preview"
                            className="w-full h-48 object-contain rounded-lg border border-gray-600 bg-white"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="%23374151"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">Sem imagem</text></svg>';
                            }}
                          />
                          <button onClick={() => handleSMInputChange('imagem', '')} className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
                            🗑️ Remover imagem
                          </button>
                        </div>
                      )}

                      {!storeMasterProd.imagem && !isAnalyzingSM && (
                        <div className="text-xs text-gray-400 text-center mt-2">
                          💡 Dica: <strong>Ctrl+V</strong> para colar imagem do clipboard
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">📝 DESCRIÇÃO PROFISSIONAL</label>
                    <textarea
                      value={storeMasterProd.descricao}
                      onChange={(e) => handleSMInputChange('descricao', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                      placeholder="Descrição detalhada (Pode ser gerada pela IA)..."
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={adicionarATabelaStoreMaster}
                  className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-xl shadow-lg hover:shadow-green-500/50 transform hover:scale-105 transition-all"
                  title="Confirma a criação do produto e o adiciona à lista principal de precificação"
                >
                  📦 ADICIONAR À TABELA DE PREÇOS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStoreMaster && (
        <StoreMaster
          onClose={() => setShowStoreMaster(false)}
          produtoInicial={storeMasterProduct}
          onSaved={handleStoreMasterSaved}
        />
      )}


      {showDigest && digestOportunidades.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#0a0a1a', border: '2px solid #00ff88',
            borderRadius: '16px', padding: '32px', maxWidth: '600px',
            width: '90%', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#00ff88', marginBottom: '8px' }}>
              🔥 BOM DIA, SÉRGIO!
            </div>
            <div style={{ color: '#aaa', marginBottom: '24px', fontSize: '14px' }}>
              Você tem <strong style={{ color: '#fff' }}>{digestOportunidades.length} oportunidades</strong> para postar hoje
            </div>

            {digestOportunidades.map((op, i) => (
              <div key={op.rowId} style={{
                background: '#111', borderRadius: '10px', padding: '12px 16px',
                marginBottom: '10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', border: '1px solid #222'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                    {i + 1}. {op.nome}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    ⭐ {op.vivino.toFixed(1)} Vivino · SF R${op.sfFinal.toFixed(2).replace('.', ',')} · SA R${op.saPreco.toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    // 1 clique → Story
                    const produtoParaStory = rows.find(r => r.rowId === op.rowId);
                    if (produtoParaStory) {
                      localStorage.setItem('ops_para_story', JSON.stringify([produtoParaStory]));
                      setShowDigest(false);
                      showNotification(`✅ ${op.nome} carregado no Story!`, 'success');
                    }
                  }}
                  style={{
                    background: '#00ff88', color: '#000', fontWeight: 900,
                    border: 'none', borderRadius: '8px', padding: '8px 16px',
                    cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap'
                  }}
                >
                  📸 1-CLIQUE STORY
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  const selecionados = digestOportunidades
                    .map(op => rows.find(r => r.rowId === op.rowId))
                    .filter(Boolean);
                  localStorage.setItem('ops_para_story', JSON.stringify(selecionados));
                  setShowDigest(false);
                  showNotification(`✅ ${selecionados.length} produtos carregados!`, 'success');
                }}
                style={{
                  flex: 1, background: '#7c3aed', color: '#fff', fontWeight: 900,
                  border: 'none', borderRadius: '10px', padding: '14px',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                🚀 CRIAR STORIES DE TODOS
              </button>
              <button
                onClick={() => setShowDigest(false)}
                style={{
                  background: '#1a1a1a', color: '#666', fontWeight: 700,
                  border: '1px solid #333', borderRadius: '10px', padding: '14px 20px',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO DE RASPAGEM */}
      {showSummaryModal && selectedSource && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1c2c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in font-sans">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-white/10 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  Detalhes: {
                    selectedSource === 'milao' ? 'Empório Milão' :
                    selectedSource === 'superadega_bulk' ? 'Super Adega (Lote)' :
                    selectedSource === 'superadega_ia' ? 'Super Adega (IA Smart)' :
                    selectedSource === 'vivino' ? 'Vivino' : selectedSource
                  }
                </h2>
                <p className="text-white/60 text-sm mt-1 font-medium">
                  Última atualização: {new Date(scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.ultimaAtualizacao || '').toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Processados', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.totalProcessados || 0, icon: <Package size={18}/>, color: 'blue' },
                  { label: 'Alterações', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.alteracoesPreco || 0, icon: <TrendingUp size={18}/>, color: 'green' },
                  { label: 'Erros', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.erros || 0, icon: <AlertCircle size={18}/>, color: 'red' },
                  { label: 'Sem Match', val: scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.semMatch || 0, icon: <Search size={18}/>, color: 'yellow' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <div className={`text-${stat.color}-400 mb-1 flex items-center gap-2 text-xs uppercase tracking-wider font-bold`}>
                      {stat.icon} {stat.label}
                    </div>
                    <div className="text-2xl font-bold text-white font-mono">{stat.val}</div>
                  </div>
                ))}
              </div>

              {scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.itens && (scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.itens || []).length > 0 ? (
                <div className="border border-white/10 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left bg-transparent border-collapse">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-white/40 tracking-wider">Produto</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-white/40 tracking-wider text-right">Anterior</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-white/40 tracking-wider text-right">Novo/Sore</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-white/40 tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(scrapingSummary?.fontes.find(f => f.fonte === selectedSource)?.itens || []).map((item, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-all group">
                          <td className="px-4 py-4">
                            <div className="text-white font-bold group-hover:text-blue-400 transition-colors uppercase text-sm tracking-tight">{item.produto}</div>
                            {item.observacao && <div className="text-[11px] text-white/40 mt-1 font-medium italic">📌 {item.observacao}</div>}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-white/30 font-mono text-sm">
                              {item.precoAnterior ? `R$ ${item.precoAnterior.toFixed(2)}` : '--'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`font-black font-mono text-base ${item.status === 'alterado' ? 'text-green-400' : 'text-white'}`}>
                              {selectedSource === 'vivino' ? item.precoNovo : item.precoNovo ? `R$ ${item.precoNovo?.toFixed(2)}` : '--'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm border ${
                              item.status === 'alterado' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              item.status === 'erro' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              'bg-white/10 text-white/40 border-white/10'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-20 text-white/20">
                  <Database size={64} className="mb-6 opacity-20 animate-bounce" />
                  <p className="font-black uppercase text-lg tracking-widest">Nenhum dado encontrado</p>
                  <p className="text-sm font-medium mt-2">Os itens aparecerão aqui após a próxima raspagem.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SFImportsModule;