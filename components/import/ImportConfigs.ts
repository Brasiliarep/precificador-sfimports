import { ImportConfig } from './IntelligentImporter';

// Configuração para importação de Produtos (SF Imports)
export const PRODUTO_IMPORT_CONFIG: ImportConfig = {
  entityName: 'Produtos',
  requiredFields: ['nome', 'preco'],
  optionalFields: ['codigo', 'descricao', 'categoria', 'estoque', 'fornecedor', 'peso', 'volume', 'unidade'],
  fieldLabels: {
    nome: 'Nome do Produto',
    codigo: 'Código/SKU',
    preco: 'Preço',
    descricao: 'Descrição',
    categoria: 'Categoria',
    estoque: 'Estoque',
    fornecedor: 'Fornecedor',
    peso: 'Peso',
    volume: 'Volume',
    unidade: 'Unidade'
  },
  fieldTypes: {
    nome: 'text',
    codigo: 'text',
    preco: 'number',
    descricao: 'text',
    categoria: 'text',
    estoque: 'number',
    fornecedor: 'text',
    peso: 'number',
    volume: 'number',
    unidade: 'text'
  },
  validationRules: {
    nome: (value) => value && value.trim().length > 0,
    preco: (value) => value && parseFloat(value) > 0,
    estoque: (value) => !value || parseFloat(value) >= 0,
    peso: (value) => !value || parseFloat(value) > 0,
    volume: (value) => !value || parseFloat(value) > 0
  },
  templatesKey: 'produtos'
};

// Configuração para importação de Pedidos (Gestor de Pedidos)
export const PEDIDO_IMPORT_CONFIG: ImportConfig = {
  entityName: 'Pedidos',
  requiredFields: ['cliente', 'produto', 'quantidade', 'valor'],
  optionalFields: ['data', 'status', 'observacoes', 'endereco_entrega', 'forma_pagamento'],
  fieldLabels: {
    cliente: 'Cliente',
    produto: 'Produto',
    quantidade: 'Quantidade',
    valor: 'Valor Total',
    data: 'Data do Pedido',
    status: 'Status',
    observacoes: 'Observações',
    endereco_entrega: 'Endereço de Entrega',
    forma_pagamento: 'Forma de Pagamento'
  },
  fieldTypes: {
    cliente: 'text',
    produto: 'text',
    quantidade: 'number',
    valor: 'number',
    data: 'date',
    status: 'text',
    observacoes: 'text',
    endereco_entrega: 'text',
    forma_pagamento: 'text'
  },
  validationRules: {
    cliente: (value) => value && value.trim().length > 0,
    produto: (value) => value && value.trim().length > 0,
    quantidade: (value) => value && parseFloat(value) > 0,
    valor: (value) => value && parseFloat(value) > 0,
    data: (value) => !value || !isNaN(Date.parse(value))
  },
  templatesKey: 'pedidos'
};

// Configuração para importação de Fornecedores
export const FORNECEDOR_IMPORT_CONFIG: ImportConfig = {
  entityName: 'Fornecedores',
  requiredFields: ['nome', 'cnpj'],
  optionalFields: ['telefone', 'email', 'endereco', 'cidade', 'estado', 'cep', 'contato', 'condicoes_pagamento'],
  fieldLabels: {
    nome: 'Nome do Fornecedor',
    cnpj: 'CNPJ',
    telefone: 'Telefone',
    email: 'E-mail',
    endereco: 'Endereço',
    cidade: 'Cidade',
    estado: 'Estado',
    cep: 'CEP',
    contato: 'Contato',
    condicoes_pagamento: 'Condições de Pagamento'
  },
  fieldTypes: {
    nome: 'text',
    cnpj: 'cnpj',
    telefone: 'phone',
    email: 'email',
    endereco: 'text',
    cidade: 'text',
    estado: 'text',
    cep: 'text',
    contato: 'text',
    condicoes_pagamento: 'text'
  },
  validationRules: {
    nome: (value) => value && value.trim().length > 0,
    cnpj: (value) => value && value.trim().length >= 11,
    telefone: (value) => value && value.trim().length >= 10,
    email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  templatesKey: 'fornecedores'
};

// Configuração para importação de Visitas (Agenda Rep)
export const VISITA_IMPORT_CONFIG: ImportConfig = {
  entityName: 'Visitas',
  requiredFields: ['cliente', 'data', 'representacao'],
  optionalFields: ['hora', 'tipo', 'prioridade', 'observacoes', 'status'],
  fieldLabels: {
    cliente: 'Cliente',
    data: 'Data',
    hora: 'Hora',
    representacao: 'Representação',
    tipo: 'Tipo de Visita',
    prioridade: 'Prioridade',
    observacoes: 'Observações',
    status: 'Status'
  },
  fieldTypes: {
    cliente: 'text',
    data: 'date',
    hora: 'text',
    representacao: 'text',
    tipo: 'text',
    prioridade: 'text',
    observacoes: 'text',
    status: 'text'
  },
  validationRules: {
    cliente: (value) => value && value.trim().length > 0,
    data: (value) => value && !isNaN(Date.parse(value)),
    representacao: (value) => value && ['SF Imports', 'Otoval', 'Vinibrasil', 'Outros'].includes(value)
  },
  templatesKey: 'visitas'
};

// Configuração para importação de Campanhas (Agenda Rep)
export const CAMPANHA_IMPORT_CONFIG: ImportConfig = {
  entityName: 'Campanhas',
  requiredFields: ['nome', 'data_inicio', 'data_fim'],
  optionalFields: ['descricao', 'publico_alvo', 'tipo', 'status', 'orcamento'],
  fieldLabels: {
    nome: 'Nome da Campanha',
    descricao: 'Descrição',
    data_inicio: 'Data de Início',
    data_fim: 'Data de Término',
    publico_alvo: 'Público Alvo',
    tipo: 'Tipo de Campanha',
    status: 'Status',
    orcamento: 'Orçamento'
  },
  fieldTypes: {
    nome: 'text',
    descricao: 'text',
    data_inicio: 'date',
    data_fim: 'date',
    publico_alvo: 'text',
    tipo: 'text',
    status: 'text',
    orcamento: 'number'
  },
  validationRules: {
    nome: (value) => value && value.trim().length > 0,
    data_inicio: (value) => value && !isNaN(Date.parse(value)),
    data_fim: (value) => value && !isNaN(Date.parse(value)),
    orcamento: (value) => !value || parseFloat(value) >= 0
  },
  templatesKey: 'campanhas'
};
