export interface GlobalSettings {
  // Configurações Globais SF (Novas)
  sellout_pct: number;
  margem_pct: number;
  frete_valor: number;
  taxa_cartao_pct: number;
  lucro_minimo: number;
  instagram_markup_pct: number;

  // Configurações Varejo (B2C) - Legacy
  freightCost: number; // R$ por garrafa (Compartilhado, mas pode ser ajustado)
  taxRate: number; // % (Marketplace + Cartão)
  minNetProfit: number; // R$ Lucro Líquido Mínimo
  marginMarkup: number; // % Margem para preço 'De' (Âncora)

  // Configurações Atacado (B2B)
  b2bTaxRate: number; // % (Geralmente menor, só antecipação)
  b2bMarkup: number; // % (Markup sobre o custo)
  b2bMinMargin: number; // R$ (Alerta de margem baixa)
}

export interface StoreProduct {
  id: string;
  name: string;
  price: number; // Preço de venda atual (geralmente preço promocional)
  _sfDePrice?: number; // Preço normal/tabela (para SF 'De')
  _sfPorPrice?: number; // Preço promocional (para SF 'Por')
  description?: string; // Descrição longa do WooCommerce
}

export interface SupplierProduct {
  rawName: string;
  detectedCost: number; // Menor valor encontrado
  detectedListPrice: number; // Maior valor encontrado (Preço De)
}

// O vínculo salvo na memória
export interface MemoryMap {
  [supplierName: string]: string[]; // Nome do Fornecedor -> Array de IDs da Loja
}

// A linha da tabela final (Combinada)
export interface DashboardRow {
  rowId: string; // Unique ID for React Keys
  id: number | string;

  // Dados do Fornecedor
  supplierId?: string;
  supplierName: string;
  supplierCostRaw: number;
  supplierCostManual?: number | null; // Override manual

  // Dados da Loja
  storeProduct?: {
    id: string;
    name: string;
    price: number;
    ean?: string;
  };

  // PREÇOS MILÃO
  milaoDe: number;
  milaoPor: number;
  finalCost: number;

  // PREÇOS SF
  sfDe: number;
  sfPor: number;
  sfFinal: number;
  sfFinalInsta: number;
  sfSug: number;
  sfSugestao?: number; // Legacy, kept for compatibility

  // LUCRO
  lucroReal: number;
  percentualLucro: number;

  // STATUS
  status: 'both' | 'sf-only' | 'milao-only' | 'mistral';

  // EXTRAS
  instagram: string;
  ilusao: number;

  // Cálculos VAREJO (B2C)
  suggestedListPrice?: number; // Calculado
  realNetProfit?: number; // Lucro Líquido Real (Baseado no preço da loja)

  // Cálculos ATACADO (B2B)
  b2bSalePrice?: number; // Unitário
  b2bMargin?: number; // Margem R$ unitária após taxas B2B

  // EXTRAS SF (Novos)
  origin: 'milao' | 'mistral' | 'ambos' | 'superadega';
  isMistral: boolean;
  badgeColor: 'amarelo' | 'azul' | 'roxo';
  mlBestPrice?: number;
  mlTopResults?: any[];
  mistralPrice?: number;
  imageLocal?: string;
  active: boolean;

  // Status e Match
  isLinked: boolean;
  _merge?: 'left_only' | 'right_only' | 'both';
  sfMatch?: 'SF ONLY' | 'MILÃO ONLY' | 'BOTH';

  // Campos Adicionais
  category?: string;
  image?: string;
  description?: string;
  superAdegaPrice?: number;
  superAdegaName?: string;
  superAdegaUrl?: string;
  ean?: string;
  saMatchScore?: number;
  precisaAjustar?: boolean;
  alertaLucro?: boolean;
  sfDeCorrected?: boolean;
  alertaDefasagem?: boolean; // Proteção contra custos muito maiores em importadoras

  // Fontes Individuais (Bolinhas)
  hasSF?: boolean;
  hasMilao?: boolean;
  hasMistral?: boolean;

  // Lógica Precificador V2
  isCopiado?: boolean; // milaoPor = milaoDe (fallback)
  isForcado?: boolean; // sfPor travado no piso (milaoPor * sellout)
  alertaMargem?: boolean; // margem real < sellout_pct

  // Lógica de Produto Novo V2.0
  isNewProduct?: boolean;
  isRevised?: boolean;

  // Pontuações Especialistas (Master Sheet v4)
  parkerScore?: string | number;
  sucklingScore?: string | number;
  wspectatorScore?: string | number;
  decanterScore?: string | number;
  timAtkinScore?: string | number;
  vivinoRating?: string | number;
}

export interface MistralProduct {
  id: string;
  produto_id?: string;
  nome_mistral: string;
  ean: string;
  preco_mistral: number;
  url_mistral: string;
  imagem_url: string;
  disponivel: boolean;
  ultima_raspagem: string;
}

export interface MLPrice {
  id: string;
  produto_id: string;
  ml_item_id: string;
  titulo: string;
  preco: number;
  vendedor_nome: string;
  vendedor_reputacao: 'verde' | 'amarelo' | 'laranja' | 'vermelho';
  qtd_vendida: number;
  link: string;
  posicao_ranking: number;
  atualizado_em: string;
}

export interface MLPurchase {
  id: string;
  produto_id: string;
  ml_order_id: string;
  vendedor_nome: string;
  preco_pago: number;
  data_compra: string;
  codigo_rastreio: string;
  status_envio: 'aguardando' | 'em_transporte' | 'entregue' | 'cancelado';
  previsao_entrega?: string;
  link_pedido: string;
  observacao: string;
}

export interface AnalysisResult {
  rows: DashboardRow[];
  summary: {
    totalItems: number;
    totalCritical: number;
    totalPotentialLoss: number;
  };
}

// --- TIPOS DO MÓDULO REPRESENTAÇÃO (B2B SALES) ---

export interface CondicoesColumn {
  distribuidor: string;
  atacado: string;
  varejo: string;
  retiraFob?: string; // Algumas linhas tem a msm regra p/ FOB
}

export interface CondicoesComerciais {
  desconto: CondicoesColumn;
  bonificacaoAbertura: CondicoesColumn;
  bonificacaoPontual: CondicoesColumn;
  prazos: CondicoesColumn;
  pedidoMinimoDemais: CondicoesColumn;
  pedidoMinimoPet: CondicoesColumn;
  pagamentoVista: string; // Geral (ex: 3%)
}

export type SupplierType = 'RAVIN' | 'DON_CAVES' | 'TOTAL_QUIMICA' | 'SANTE' | 'OUTROS';

export interface PriceTier {
  name: string; // Ex: "ICMS 25%", "Promoção", "ICMS 4%"
  price: number;
}

export interface RepClient {
  id: string;
  razaoSocial: string;
  fantasia: string;
  cnpj: string;
  ie?: string; // Inscrição Estadual
  regimeTributario?: string; // Lucro Real, Simples, etc.
  whatsapp: string;
  email: string;
  endereco: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  contato?: string; // Nome do responsável
  foneContato?: string;
  // Campos Ficha Cadastral
  ncmPadrao?: string;
  beneficioFiscal?: string;
  isProdutorRural?: boolean;
}

export interface RepProduct {
  id: string; // Composite: supplier-code
  code: string;
  name: string;
  price: number; // Preço Base (Geralmente o maior/padrão)
  priceTiers: PriceTier[]; // Lista de Variações de Preço (Matriz)
  supplier: SupplierType;
  tableName?: string; // (Legacy) Mantido para compatibilidade
  ipi?: number;
  st?: number;
  packSize?: string; // Embalagem
  imageUrl?: string; // URL da imagem para o Catálogo Visual
  stock?: number; // Estoque Disponível
  commercialAction?: string; // Ex: "Leve 12 Pague 11"
  suggestedRetail?: number; // Sugestão Varejo (Don Caves)
  sitePrice?: number; // Preço Site (Ravin Coluna C)
  boxPrice?: number; // Preço Caixa Fechada (Ravin Col G, Don Caves Col D)

  // Dados Técnicos e Logísticos (Total Química + Outros)
  weight?: string; // Peso Bruto (Total Química)
  netWeight?: string; // Peso Líquido
  size?: string; // Tamanho/Dimensão Unidade (CxLxA)
  boxSize?: string; // Dimensão da Caixa
  masterCase?: string; // Qtd na Caixa Master (Caixa Master)
  unitType?: string; // Tipo de Embalagem (Emb alag em)
  ean?: string; // Código de Barras (Ean13)
  dun?: string; // Dun14
  validity?: string; // Validade
  palletizing?: string; // Lastro x Altura
  palletization?: string; // Paletização (Total de Caixas)
  ncm?: string; // Classificação Fiscal
  cest?: string; // CEST
}

export interface CartItem extends RepProduct {
  quantity: number;
  discountPercent: number; // % Desconto aplicado
  finalPrice: number; // Preço unitário após desconto
  selectedTierName: string; // Qual tabela foi escolhida (Ex: "Promoção")
}

export interface RepOrder {
  id: string;
  clientId: string;
  clientName: string;
  supplier: SupplierType;
  date: string; // ISO
  items: CartItem[];
  status: 'OPEN' | 'CLOSED';
  totalList: number; // Total tabela cheia
  totalNet: number; // Total líquido com descontos
  paymentMethod?: string;
  observation?: string;
}

export interface SupplierConfig {
  [supplier: string]: {
    paymentMethods: string[];
  }
}