import { Cliente, Visita, Campanha } from '../types/agenda';

// Dados exemplo para inicializar o sistema
export const clientesExemplo: Cliente[] = [
  {
    id: '1',
    nome: 'Wine House Brasília',
    cnpj: '12.345.678/0001-90',
    telefone: '(61) 3234-5678',
    email: 'contato@winehouse.com.br',
    whatsapp: '(61) 98765-4321',
    endereco: {
      rua: 'SGAS 915',
      numero: 'Loja 123',
      bairro: 'Asa Sul',
      cidade: 'Brasília',
      estado: 'DF',
      cep: '70390-150',
      latitude: -15.8327,
      longitude: -47.9157
    },
    tipo: 'ativo',
    segmento: 'Varejo',
    potencial: 'A',
    representacoes: ['Ravin Vinhos', 'Don Caves'],
    dataUltimaVisita: '2026-02-15T10:00:00',
    dataUltimaCompra: '2026-02-10T00:00:00',
    valorUltimaCompra: 5000,
    observacoes: 'Cliente premium, sempre compra vinhos importados',
    criadoEm: '2026-01-01T00:00:00',
    atualizadoEm: '2026-02-15T00:00:00'
  },
  {
    id: '2',
    nome: 'Empório do Vinho',
    cnpj: '98.765.432/0001-10',
    telefone: '(61) 3456-7890',
    email: 'vendas@emporiodovinho.com.br',
    whatsapp: '(61) 91234-5678',
    endereco: {
      rua: 'CLS 104',
      numero: 'Bloco A',
      bairro: 'Asa Norte',
      cidade: 'Brasília',
      estado: 'DF',
      cep: '70720-150',
      latitude: -15.7448,
      longitude: -47.8944
    },
    tipo: 'prospect',
    segmento: 'Varejo',
    potencial: 'B',
    representacoes: ['Ravin Vinhos'],
    observacoes: 'Interessado em vinhos italianos',
    criadoEm: '2026-02-01T00:00:00',
    atualizadoEm: '2026-02-01T00:00:00'
  },
  {
    id: '3',
    nome: 'Restaurante Gastrô',
    cnpj: '45.678.123/0001-23',
    telefone: '(61) 3210-9876',
    email: 'encomendas@gastrono.com.br',
    whatsapp: '(61) 99876-5432',
    endereco: {
      rua: 'SHIN QI 03',
      numero: 'Conjunto 4',
      bairro: 'Lago Norte',
      cidade: 'Brasília',
      estado: 'DF',
      cep: '71515-030',
      latitude: -15.7331,
      longitude: -47.8923
    },
    tipo: 'ativo',
    segmento: 'Food Service',
    potencial: 'A',
    representacoes: ['Total Química', 'Santê Cristais'],
    dataUltimaVisita: '2026-02-01T14:00:00',
    dataUltimaCompra: '2026-01-25T00:00:00',
    valorUltimaCompra: 2500,
    observacoes: 'Cliente focado em cristais e produtos de limpeza',
    criadoEm: '2025-12-01T00:00:00',
    atualizadoEm: '2026-02-01T00:00:00'
  }
];

export const visitasExemplo: Visita[] = [
  {
    id: '1',
    clienteId: '1',
    clienteNome: 'Wine House Brasília',
    representacao: 'Ravin Vinhos',
    dataHora: '2026-02-22T10:00:00',
    tipo: 'visita',
    status: 'agendada',
    prioridade: 'alta',
    localizacao: {
      latitude: -15.8327,
      longitude: -47.9157,
      endereco: 'SGAS 915, Loja 123 - Asa Sul, Brasília/DF'
    },
    observacoes: 'Apresentar nova coleção de vinhos franceses',
    proximoPasso: 'Enviar proposta comercial',
    anexos: [],
    criadoEm: '2026-02-20T00:00:00',
    atualizadoEm: '2026-02-20T00:00:00'
  },
  {
    id: '2',
    clienteId: '2',
    clienteNome: 'Empório do Vinho',
    representacao: 'Ravin Vinhos',
    dataHora: '2026-02-23T14:00:00',
    tipo: 'reuniao',
    status: 'agendada',
    prioridade: 'media',
    observacoes: 'Reunião de apresentação de produtos',
    proximoPasso: 'Agendar degustação',
    anexos: [],
    criadoEm: '2026-02-20T00:00:00',
    atualizadoEm: '2026-02-20T00:00:00'
  },
  {
    id: '3',
    clienteId: '3',
    clienteNome: 'Restaurante Gastrô',
    representacao: 'Total Química',
    dataHora: '2026-02-21T09:00:00',
    tipo: 'visita',
    status: 'realizada',
    prioridade: 'alta',
    observacoes: 'Visita para apresentar linha de produtos de limpeza profissional',
    proximoPasso: 'Follow-up em 2 dias',
    resultado: 'Cliente interessado, aguardar aprovação orçamento',
    anexos: [],
    criadoEm: '2026-02-19T00:00:00',
    atualizadoEm: '2026-02-21T00:00:00'
  }
];

// Função para inicializar dados exemplo no localStorage
export const inicializarDadosExemplo = () => {
  // Verificar se já existem dados
  if (!localStorage.getItem('agenda-clientes')) {
    localStorage.setItem('agenda-clientes', JSON.stringify(clientesExemplo));
    console.log('✅ Clientes exemplo criados');
  }
  
  if (!localStorage.getItem('agenda-visitas')) {
    localStorage.setItem('agenda-visitas', JSON.stringify(visitasExemplo));
    console.log('✅ Visitas exemplo criadas');
  }
  
  console.log('📊 Dados da Agenda Rep inicializados com exemplos');
};
