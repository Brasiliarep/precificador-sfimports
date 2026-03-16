import React, { useState, useEffect } from 'react';
import { Cliente, Visita, REPRESENTACOES } from '../../types/agenda';
import IntelligentImporter from '../import/IntelligentImporter';
import { clienteService } from '../../services/clienteService';

interface ClientesCRMProps {
  onClienteSelect: (cliente: Cliente) => void;
  onCriarVisita: (cliente: Cliente) => void;
}

const ClientesCRM: React.FC<ClientesCRMProps> = ({ onClienteSelect, onCriarVisita }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [showImportador, setShowImportador] = useState(false);
  const [filtroRepresentacao, setFiltroRepresentacao] = useState('');
  const [filtroPotencial, setFiltroPotencial] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState(''); // NOVO FILTRO
  const [busca, setBusca] = useState('');

  // Carregar dados da API
  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carregar clientes da API
        const clientesDaAPI = await clienteService.getClientes();
        setClientes(clientesDaAPI);
        
        // Tentar sincronizar dados do localStorage se existirem
        await clienteService.sincronizarComAPI();
        
        // Carregar visitas do localStorage (mantém por enquanto)
        const storedVisitas = localStorage.getItem('agenda-visitas');
        if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        // Fallback para localStorage se a API falhar
        const storedClientes = localStorage.getItem('agenda-clientes');
        const storedVisitas = localStorage.getItem('agenda-visitas');
        
        if (storedClientes) setClientes(JSON.parse(storedClientes));
        if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
      }
    };
    
    carregarDados();
  }, []);

  // Salvar visitas no localStorage (mantém por enquanto)
  useEffect(() => {
    localStorage.setItem('agenda-visitas', JSON.stringify(visitas));
  }, [visitas]);

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(cliente => {
    if (filtroRepresentacao && !cliente.representacoes.includes(filtroRepresentacao)) return false;
    if (filtroPotencial && cliente.potencial !== filtroPotencial) return false;
    if (filtroTipo && cliente.tipo !== filtroTipo) return false;
    if (filtroOrigem && cliente.origem !== filtroOrigem) return false;
    if (busca) {
      const buscaLower = busca.toLowerCase();
      return cliente.nome.toLowerCase().includes(buscaLower) ||
             (cliente.nomeFantasia && cliente.nomeFantasia.toLowerCase().includes(buscaLower)) ||
             cliente.cnpj.includes(buscaLower) ||
             cliente.telefone.includes(buscaLower) ||
             (cliente.telefone2 && cliente.telefone2.includes(buscaLower)) ||
             cliente.whatsapp.includes(buscaLower) ||
             cliente.email.toLowerCase().includes(buscaLower) ||
             (cliente.email2 && cliente.email2.toLowerCase().includes(buscaLower)) ||
             cliente.endereco.cidade.toLowerCase().includes(buscaLower) ||
             (cliente.origem && cliente.origem.toLowerCase().includes(buscaLower)); // Buscar na origem também
    }
    return true;
  });

  const handleNovoCliente = () => {
    const novoCliente: Cliente = {
      id: Date.now().toString(),
      nome: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      dataFundacao: '',
      telefone: '',
      telefone2: '',
      email: '',
      email2: '',
      whatsapp: '',
      contato: '',
      cargoContato: '',
      endereco: {
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        latitude: 0,
        longitude: 0,
      },
      enderecoCobranca: {
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
      },
      tipo: 'prospect',
      segmento: '',
      categoria: '',
      potencial: 'C',
      representacoes: [],
      vendedorResponsavel: '',
      limiteCredito: 0,
      statusCredito: 'sem_limite',
      condicoesPagamento: '',
      diaCompraPreferido: '',
      frequenciaCompra: '',
      regiaoVendas: '',
      observacoes: '',
      origem: '',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      statusCliente: 'regular'
    };
    setEditingCliente(novoCliente);
    setShowModal(true);
  };

  const salvarCliente = async (cliente: Cliente) => {
    try {
      // Salvar na API
      const clienteSalvo = await clienteService.salvarCliente(cliente);
      
      // Atualizar estado local
      if (editingCliente?.id) {
        setClientes(prev => prev.map(c => c.id === cliente.id ? clienteSalvo : c));
      } else {
        setClientes(prev => [...prev, clienteSalvo]);
      }
      
      setShowModal(false);
      setEditingCliente(null);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    }
  };

  const excluirCliente = async (id: string) => {
    if (confirm('Deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      try {
        // Excluir da API
        await clienteService.excluirCliente(id);
        
        // Atualizar estado local
        setClientes(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente. Tente novamente.');
      }
    }
  };

  const getHistoricoVisitas = (clienteId: string) => {
    return visitas
      .filter(v => v.clienteId === clienteId)
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
      .slice(0, 5);
  };

  const getCorPotencial = (potencial: string) => {
    const cores = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-yellow-100 text-yellow-800',
      C: 'bg-gray-100 text-gray-800'
    };
    return cores[potencial as keyof typeof cores] || 'bg-gray-100 text-gray-800';
  };

  const getCorTipo = (tipo: string) => {
    const cores = {
      ativo: 'bg-green-100 text-green-800',
      prospect: 'bg-blue-100 text-blue-800',
      inativo: 'bg-red-100 text-red-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
  };

  const abrirNoMaps = (cliente: Cliente) => {
    if (cliente.endereco.latitude && cliente.endereco.longitude) {
      window.open(`https://www.google.com/maps?q=${cliente.endereco.latitude},${cliente.endereco.longitude}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(cliente.endereco.rua + ', ' + cliente.endereco.cidade)}`, '_blank');
    }
  };

  const handleImportComplete = async (novosClientes: Cliente[]) => {
    try {
      // Importar clientes via API
      await clienteService.importarClientes(novosClientes);
      
      // Recarregar lista da API
      const clientesAtualizados = await clienteService.getClientes();
      setClientes(clientesAtualizados);
      
      setShowImportador(false);
    } catch (error) {
      console.error('Erro ao importar clientes:', error);
      alert('Erro ao importar clientes. Tente novamente.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">👥 Clientes CRM</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportador(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            📥 Importar Clientes
          </button>
          <button
            onClick={handleNovoCliente}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Busca</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, CNPJ ou cidade..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Representação</label>
            <select
              value={filtroRepresentacao}
              onChange={(e) => setFiltroRepresentacao(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todas</option>
              {REPRESENTACOES.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Potencial</label>
            <select
              value={filtroPotencial}
              onChange={(e) => setFiltroPotencial(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="prospect">Prospect</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">🎯 Origem</label>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todas</option>
              <option value="Ravin">Ravin</option>
              <option value="Total Química">Total Química</option>
              <option value="Food Service">Food Service</option>
              <option value="Vinhos">Vinhos</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Higiene">Higiene</option>
              <option value="Manual">Manual</option>
              <option value="Indicado">Indicado</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setBusca('');
                setFiltroRepresentacao('');
                setFiltroPotencial('');
                setFiltroTipo('');
                setFiltroOrigem(''); // LIMPAR FILTRO ORIGEM
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {clientesFiltrados.map(cliente => {
          const historico = getHistoricoVisitas(cliente.id);
          return (
            <div key={cliente.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs ${getCorPotencial(cliente.potencial)}`}>
                        Potencial {cliente.potencial}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getCorTipo(cliente.tipo)}`}>
                        {cliente.tipo === 'ativo' ? 'Ativo' : cliente.tipo === 'prospect' ? 'Prospect' : 'Inativo'}
                      </span>
                      {/* NOVO: Badge de Origem */}
                      {cliente.origem && (
                        <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                          🎯 {cliente.origem}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirNoMaps(cliente)}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded text-sm"
                      title="Abrir no Maps"
                    >
                      📍
                    </button>
                    <button
                      onClick={() => onCriarVisita(cliente)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm"
                      title="Criar Visita"
                    >
                      📅
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div><strong>CNPJ:</strong> {cliente.cnpj}</div>
                  <div><strong>Telefone:</strong> {cliente.telefone}</div>
                  <div><strong>WhatsApp:</strong> {cliente.whatsapp}</div>
                  <div><strong>Email:</strong> {cliente.email}</div>
                  <div><strong>Endereço:</strong> {cliente.endereco.rua}, {cliente.endereco.numero} - {cliente.endereco.cidade}/{cliente.endereco.estado}</div>
                  <div><strong>Segmento:</strong> {cliente.segmento}</div>
                  {/* NOVO: Campo Origem */}
                  {cliente.origem && (
                    <div><strong>🎯 Origem:</strong> <span className="text-purple-600 font-medium">{cliente.origem}</span></div>
                  )}
                  <div><strong>Representações:</strong></div>
                  <div className="flex flex-wrap gap-1">
                    {cliente.representacoes.map(rep => (
                      <span key={rep} className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {rep}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Histórico de Visitas */}
                {historico.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">📋 Histórico de Visitas</h4>
                    <div className="space-y-1">
                      {historico.map(visita => (
                        <div key={visita.id} className="text-xs text-gray-600">
                          <div>
                            {new Date(visita.dataHora).toLocaleDateString('pt-BR')} - {visita.representacao}
                          </div>
                          <div>{visita.tipo} - {visita.status}</div>
                          {visita.proximoPasso && (
                            <div className="text-blue-600">➡️ {visita.proximoPasso}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => onClienteSelect(cliente)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex-1"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => {
                      setEditingCliente(cliente);
                      setShowModal(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluirCliente(cliente.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {clientesFiltrados.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Nenhum cliente encontrado com os filtros selecionados.
        </div>
      )}

      {/* Modal de Novo/Editar Cliente */}
      {showModal && (
        <ModalCliente
          cliente={editingCliente}
          onSave={salvarCliente}
          onCancel={() => {
            setShowModal(false);
            setEditingCliente(null);
          }}
        />
      )}

      {/* Modal de Importação Inteligente */}
      {showImportador && (
        <IntelligentImporter
          config={{
            entityName: 'Clientes',
            requiredFields: ['nome', 'cnpj', 'telefone'],
            optionalFields: [
              'nomeFantasia', 'inscricaoEstadual', 'inscricaoMunicipal', 'dataFundacao',
              'telefone2', 'email2', 'contato', 'cargoContato',
              'endereco', 'complemento', 'enderecoCobranca',
              'categoria', 'vendedorResponsavel', 'limiteCredito', 'statusCredito',
              'condicoesPagamento', 'diaCompraPreferido', 'frequenciaCompra', 'regiaoVendas',
              'mediaCompraMensal', 'statusCliente', 'segmento', 'potencial', 'observacoes'
            ],
            fieldLabels: {
              nome: 'Nome/Razão Social',
              nomeFantasia: 'Nome Fantasia',
              cnpj: 'CNPJ',
              inscricaoEstadual: 'Inscrição Estadual',
              inscricaoMunicipal: 'Inscrição Municipal',
              dataFundacao: 'Data Fundação',
              telefone: 'Telefone Principal',
              telefone2: 'Telefone Secundário',
              email: 'E-mail Principal',
              email2: 'E-mail Secundário',
              whatsapp: 'WhatsApp',
              contato: 'Contato Principal',
              cargoContato: 'Cargo do Contato',
              endereco: 'Endereço',
              complemento: 'Complemento',
              enderecoCobranca: 'Endereço de Cobrança',
              cidade: 'Cidade',
              estado: 'Estado',
              cep: 'CEP',
              segmento: 'Segmento',
              categoria: 'Categoria',
              potencial: 'Potencial',
              vendedorResponsavel: 'Vendedor Responsável',
              limiteCredito: 'Limite de Crédito',
              statusCredito: 'Status do Crédito',
              condicoesPagamento: 'Condições de Pagamento',
              diaCompraPreferido: 'Dia Compra Preferido',
              frequenciaCompra: 'Frequência de Compra',
              regiaoVendas: 'Região de Vendas',
              mediaCompraMensal: 'Média Compra Mensal',
              statusCliente: 'Status do Cliente',
              observacoes: 'Observações'
            },
            fieldTypes: {
              nome: 'text',
              nomeFantasia: 'text',
              cnpj: 'cnpj',
              inscricaoEstadual: 'text',
              inscricaoMunicipal: 'text',
              dataFundacao: 'date',
              telefone: 'phone',
              telefone2: 'phone',
              email: 'email',
              email2: 'email',
              whatsapp: 'phone',
              contato: 'text',
              cargoContato: 'text',
              endereco: 'text',
              complemento: 'text',
              enderecoCobranca: 'text',
              cidade: 'text',
              estado: 'text',
              cep: 'text',
              segmento: 'text',
              categoria: 'text',
              potencial: 'text',
              vendedorResponsavel: 'text',
              limiteCredito: 'number',
              statusCredito: 'text',
              condicoesPagamento: 'text',
              diaCompraPreferido: 'text',
              frequenciaCompra: 'text',
              regiaoVendas: 'text',
              mediaCompraMensal: 'number',
              statusCliente: 'text',
              observacoes: 'text'
            },
            validationRules: {
              nome: (value) => value && value.trim().length > 0,
              cnpj: (value) => value && value.trim().length >= 11,
              telefone: (value) => value && value.trim().length >= 10,
              email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
              email2: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
              limiteCredito: (value) => !value || parseFloat(value) >= 0,
              mediaCompraMensal: (value) => !value || parseFloat(value) >= 0
            },
            templatesKey: 'clientes'
          }}
          enableOrigemField={true}
          origemOptions={['Ravin', 'Total Química', 'Food Service', 'Vinhos', 'Bebidas', 'Limpeza', 'Higiene']}
          onImport={(importedData) => {
            // Transformar dados importados para o formato Cliente
            const newClientes: Cliente[] = importedData.map(row => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              nome: row.nome || '',
              nomeFantasia: row.nomeFantasia || '',
              cnpj: row.cnpj || '',
              inscricaoEstadual: row.inscricaoEstadual || '',
              inscricaoMunicipal: row.inscricaoMunicipal || '',
              dataFundacao: row.dataFundacao || '',
              telefone: row.telefone || '',
              telefone2: row.telefone2 || '',
              email: row.email || '',
              email2: row.email2 || '',
              whatsapp: row.whatsapp || row.telefone || '',
              contato: row.contato || '',
              cargoContato: row.cargoContato || '',
              endereco: {
                rua: row.endereco || '',
                numero: '',
                complemento: row.complemento || '',
                bairro: '',
                cidade: row.cidade || '',
                estado: row.estado || '',
                cep: row.cep || '',
                latitude: 0,
                longitude: 0,
              },
              enderecoCobranca: {
                rua: row.enderecoCobranca || '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                estado: '',
                cep: '',
              },
              tipo: 'prospect',
              segmento: row.segmento || '',
              categoria: row.categoria || '',
              potencial: row.potencial || 'C',
              representacoes: [],
              vendedorResponsavel: row.vendedorResponsavel || '',
              limiteCredito: row.limiteCredito || 0,
              statusCredito: row.statusCredito || 'sem_limite',
              condicoesPagamento: row.condicoesPagamento || '',
              diaCompraPreferido: row.diaCompraPreferido || '',
              frequenciaCompra: row.frequenciaCompra || '',
              regiaoVendas: row.regiaoVendas || '',
              mediaCompraMensal: row.mediaCompraMensal || 0,
              statusCliente: row.statusCliente || 'regular',
              observacoes: row.observacoes || '',
              origem: row.origem || 'Importação Manual',
              criadoEm: new Date().toISOString(),
              atualizadoEm: new Date().toISOString(),
            }));

            // Adicionar clientes existentes
            setClientes(prev => [...prev, ...newClientes]);
            setShowImportador(false);
            
            alert(`✅ ${newClientes.length} clientes importados com sucesso!\n\nOrigem: ${newClientes[0]?.origem || 'Não definida'}`);
          }}
          onClose={() => setShowImportador(false)}
        />
      )}
    </div>
  );
};

// Componente Modal para criar/editar cliente
interface ModalClienteProps {
  cliente: Cliente | null;
  onSave: (cliente: Cliente) => void;
  onCancel: () => void;
}

const ModalCliente: React.FC<ModalClienteProps> = ({ cliente, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Cliente>(
    cliente || {
      id: Date.now().toString(),
      nome: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      dataFundacao: '',
      telefone: '',
      telefone2: '',
      email: '',
      email2: '',
      whatsapp: '',
      contato: '',
      cargoContato: '',
      endereco: {
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        latitude: 0,
        longitude: 0,
      },
      enderecoCobranca: {
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
      },
      tipo: 'prospect',
      segmento: '',
      categoria: '',
      potencial: 'C',
      representacoes: [],
      vendedorResponsavel: '',
      limiteCredito: 0,
      statusCredito: 'sem_limite',
      condicoesPagamento: '',
      diaCompraPreferido: '',
      frequenciaCompra: '',
      regiaoVendas: '',
      mediaCompraMensal: 0,
      statusCliente: 'regular',
      observacoes: '',
      origem: '',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cnpj) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    onSave(formData);
  };

  const handleRepresentacaoChange = (representacao: string) => {
    if (formData.representacoes.includes(representacao)) {
      setFormData({
        ...formData,
        representacoes: formData.representacoes.filter(r => r !== representacao)
      });
    } else {
      setFormData({
        ...formData,
        representacoes: [...formData.representacoes, representacao]
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {cliente?.id ? 'Editar Cliente' : 'Novo Cliente'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome/Razão Social *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={formData.nomeFantasia}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CNPJ *</label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Inscrição Estadual</label>
              <input
                type="text"
                value={formData.inscricaoEstadual}
                onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Inscrição Municipal</label>
              <input
                type="text"
                value={formData.inscricaoMunicipal}
                onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fundação</label>
              <input
                type="date"
                value={formData.dataFundacao}
                onChange={(e) => setFormData({ ...formData, dataFundacao: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Contatos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Telefone Principal *</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefone Secundário</label>
              <input
                type="text"
                value={formData.telefone2}
                onChange={(e) => setFormData({ ...formData, telefone2: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail Principal</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail Secundário</label>
              <input
                type="email"
                value={formData.email2}
                onChange={(e) => setFormData({ ...formData, email2: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contato Principal</label>
              <input
                type="text"
                value={formData.contato}
                onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cargo do Contato</label>
              <input
                type="text"
                value={formData.cargoContato}
                onChange={(e) => setFormData({ ...formData, cargoContato: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Endereço</label>
              <input
                type="text"
                value={formData.endereco.rua}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, rua: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número</label>
              <input
                type="text"
                value={formData.endereco.numero}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, numero: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Complemento</label>
              <input
                type="text"
                value={formData.endereco.complemento}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, complemento: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bairro</label>
              <input
                type="text"
                value={formData.endereco.bairro}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, bairro: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={formData.endereco.cidade}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, cidade: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input
                type="text"
                value={formData.endereco.estado}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, estado: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CEP</label>
              <input
                type="text"
                value={formData.endereco.cep}
                onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, cep: e.target.value } })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vendedor Responsável</label>
              <input
                type="text"
                value={formData.vendedorResponsavel}
                onChange={(e) => setFormData({ ...formData, vendedorResponsavel: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Limite de Crédito</label>
              <input
                type="number"
                value={formData.limiteCredito}
                onChange={(e) => setFormData({ ...formData, limiteCredito: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status do Crédito</label>
              <select
                value={formData.statusCredito}
                onChange={(e) => setFormData({ ...formData, statusCredito: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="sem_limite">Sem Limite</option>
                <option value="liberado">Liberado</option>
                <option value="bloqueado">Bloqueado</option>
                <option value="analise">Em Análise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condições de Pagamento</label>
              <input
                type="text"
                value={formData.condicoesPagamento}
                onChange={(e) => setFormData({ ...formData, condicoesPagamento: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Média Compra Mensal</label>
              <input
                type="number"
                value={formData.mediaCompraMensal}
                onChange={(e) => setFormData({ ...formData, mediaCompraMensal: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status do Cliente</label>
              <select
                value={formData.statusCliente}
                onChange={(e) => setFormData({ ...formData, statusCliente: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="regular">Regular</option>
                <option value="atrasado">Atrasado</option>
                <option value="inadimplente">Inadimplente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dia Compra Preferido</label>
              <select
                value={formData.diaCompraPreferido}
                onChange={(e) => setFormData({ ...formData, diaCompraPreferido: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecione...</option>
                <option value="segunda">Segunda-feira</option>
                <option value="terca">Terça-feira</option>
                <option value="quarta">Quarta-feira</option>
                <option value="quinta">Quinta-feira</option>
                <option value="sexta">Sexta-feira</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Frequência de Compra</label>
              <select
                value={formData.frequenciaCompra}
                onChange={(e) => setFormData({ ...formData, frequenciaCompra: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecione...</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
                <option value="bimestral">Bimestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Região de Vendas</label>
              <input
                type="text"
                value={formData.regiaoVendas}
                onChange={(e) => setFormData({ ...formData, regiaoVendas: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Negócio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Segmento</label>
              <input
                type="text"
                value={formData.segmento}
                onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecione...</option>
                <option value="Varejo">Varejo</option>
                <option value="Atacado">Atacado</option>
                <option value="Food Service">Food Service</option>
                <option value="Distribuidor">Distribuidor</option>
                <option value="Indústria">Indústria</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Potencial</label>
              <select
                value={formData.potencial}
                onChange={(e) => setFormData({ ...formData, potencial: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">🎯 Origem</label>
              <select
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecione...</option>
                <option value="Ravin">Ravin</option>
                <option value="Total Química">Total Química</option>
                <option value="Food Service">Food Service</option>
                <option value="Vinhos">Vinhos</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Higiene">Higiene</option>
                <option value="Manual">Manual</option>
                <option value="Indicado">Indicado</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Classificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="prospect">Prospect</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Potencial</label>
              <select
                value={formData.potencial}
                onChange={(e) => setFormData({ ...formData, potencial: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>

          {/* Representações */}
          <div>
            <label className="block text-sm font-medium mb-1">Representações</label>
            <div className="grid grid-cols-2 gap-2">
              {REPRESENTACOES.map(rep => (
                <label key={rep} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.representacoes.includes(rep)}
                    onChange={() => handleRepresentacaoChange(rep)}
                    className="mr-2"
                  />
                  {rep}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientesCRM;
