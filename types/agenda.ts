// Tipos para a Agenda de Representante
export interface Cliente {
  id: string;
  nome: string;
  nomeFantasia: string; // NOVO
  cnpj: string;
  inscricaoEstadual: string; // NOVO
  inscricaoMunicipal: string; // NOVO
  dataFundacao: string; // NOVO
  telefone: string;
  telefone2: string; // NOVO
  email: string;
  email2: string; // NOVO
  whatsapp: string;
  contato: string; // NOVO
  cargoContato: string; // NOVO
  endereco: {
    rua: string;
    numero: string;
    complemento: string; // NOVO
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    latitude: number;
    longitude: number;
  };
  enderecoCobranca: { // NOVO
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  tipo: 'prospect' | 'ativo' | 'inativo';
  segmento: string;
  categoria: string; // NOVO: Varejo, Atacado, Food Service
  potencial: 'A' | 'B' | 'C';
  representacoes: string[];
  vendedorResponsavel: string; // NOVO
  limiteCredito: number; // NOVO
  statusCredito: 'liberado' | 'bloqueado' | 'analise' | 'sem_limite'; // NOVO
  condicoesPagamento: string; // NOVO
  diaCompraPreferido: string; // NOVO: segunda, terça, etc.
  frequenciaCompra: string; // NOVO: semanal, quinzenal, mensal
  regiaoVendas: string; // NOVO: norte, sul, etc.
  observacoes: string;
  origem: string;
  criadoEm: string;
  atualizadoEm: string;
  dataUltimaVisita?: string;
  valorUltimaCompra?: number;
  dataUltimaCompra?: string;
  mediaCompraMensal?: number; // NOVO
  statusCliente: 'regular' | 'atrasado' | 'inadimplente' | 'cancelado'; // NOVO
}

export interface Visita {
  id: string;
  clienteId: string;
  clienteNome: string;
  representacao: string;
  dataHora: string;
  tipo: 'visita' | 'reuniao' | 'ligacao' | 'whatsapp' | 'proposta' | 'fechamento';
  status: 'agendada' | 'realizada' | 'cancelada' | 'remarcada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  localizacao?: {
    latitude: number;
    longitude: number;
    endereco: string;
  };
  observacoes: string;
  proximoPasso: string;
  resultado?: string;
  anexos: string[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface Campanha {
  id: string;
  nome: string;
  representacoes: string[];
  publicoAlvo: {
    potencial?: ('A' | 'B' | 'C')[];
    diasSemVisita?: number;
    diasSemCompra?: number;
    categorias?: string[];
  };
  mensagem: string;
  canal: 'whatsapp' | 'email' | 'sms';
  agendamento: string;
  status: 'rascunho' | 'agendada' | 'enviando' | 'concluida' | 'pausada';
  optIn: boolean;
  dataCriacao: string;
  dataEnvio?: string;
  logs: EnvioLog[];
}

export interface EnvioLog {
  id: string;
  clienteId: string;
  clienteNome: string;
  dataEnvio: string;
  status: 'enviado' | 'visualizado' | 'convertido' | 'erro';
  mensagem: string;
  erro?: string;
}

export interface Rota {
  id: string;
  nome: string;
  representacao: string;
  clientes: string[]; // IDs dos clientes
  dataCriacao: string;
  otimizada: boolean;
  distanciaTotal: number; // km
  tempoEstimado: number; // minutos
}

export interface DashboardStats {
  visitasHoje: number;
  proximosCompromissos: number;
  clientesSemRetorno30: number;
  clientesSemRetorno60: number;
  clientesSemRetorno90: number;
  taxaConversao: number;
  campanhasAtivas: number;
  top10Clientes: Array<{
    id: string;
    nome: string;
    volume: number;
  }>;
}

export const REPRESENTACOES = [
  'Ravin Vinhos',
  'Don Caves', 
  'Total Química',
  'Santê Cristais'
] as const;

export const TIPOS_VISITA = [
  { value: 'visita', label: 'Visita Presencial' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'proposta', label: 'Apresentar Proposta' },
  { value: 'fechamento', label: 'Fechamento' }
] as const;

export const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'gray' },
  { value: 'media', label: 'Média', color: 'yellow' },
  { value: 'alta', label: 'Alta', color: 'orange' },
  { value: 'urgente', label: 'Urgente', color: 'red' }
] as const;

export const STATUS_VISITA = [
  { value: 'agendada', label: 'Agendada', color: 'blue' },
  { value: 'realizada', label: 'Realizada', color: 'green' },
  { value: 'cancelada', label: 'Cancelada', color: 'red' },
  { value: 'remarcada', label: 'Remarcada', color: 'orange' }
] as const;
