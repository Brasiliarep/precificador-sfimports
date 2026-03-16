import React, { useState, useEffect } from 'react';
import { Visita, Cliente, TIPOS_VISITA, STATUS_VISITA, PRIORIDADES, REPRESENTACOES } from '../../types/agenda';

interface VisitasProps {
  onVisitaSelect: (visita: Visita) => void;
}

const Visitas: React.FC<VisitasProps> = ({ onVisitaSelect }) => {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVisita, setEditingVisita] = useState<Visita | null>(null);
  const [filtroRepresentacao, setFiltroRepresentacao] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [mesAtual, setMesAtual] = useState(new Date());

  // Carregar dados do localStorage
  useEffect(() => {
    const storedVisitas = localStorage.getItem('agenda-visitas');
    const storedClientes = localStorage.getItem('agenda-clientes');
    
    if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
    if (storedClientes) setClientes(JSON.parse(storedClientes));
  }, []);

  // Salvar visitas no localStorage
  useEffect(() => {
    localStorage.setItem('agenda-visitas', JSON.stringify(visitas));
  }, [visitas]);

  // Filtrar visitas
  const visitasFiltradas = visitas.filter(visita => {
    if (filtroRepresentacao && visita.representacao !== filtroRepresentacao) return false;
    if (filtroStatus && visita.status !== filtroStatus) return false;
    
    // Filtrar por mês atual
    const dataVisita = new Date(visita.dataHora);
    return dataVisita.getMonth() === mesAtual.getMonth() && 
           dataVisita.getFullYear() === mesAtual.getFullYear();
  });

  // Agrupar visitas por dia
  const visitasPorDia: { [key: string]: Visita[] } = {};
  visitasFiltradas.forEach(visita => {
    const data = new Date(visita.dataHora).toLocaleDateString('pt-BR');
    if (!visitasPorDia[data]) {
      visitasPorDia[data] = [];
    }
    visitasPorDia[data].push(visita);
  });

  const handleNovaVisita = () => {
    const novaVisita: Visita = {
      id: Date.now().toString(),
      clienteId: '',
      clienteNome: '',
      representacao: '',
      dataHora: new Date().toISOString(),
      tipo: 'visita',
      status: 'agendada',
      prioridade: 'media',
      observacoes: '',
      proximoPasso: '',
      anexos: [],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    setEditingVisita(novaVisita);
    setShowModal(true);
  };

  const salvarVisita = (visita: Visita) => {
    if (editingVisita?.id) {
      setVisitas(prev => prev.map(v => v.id === visita.id ? { ...visita, atualizadoEm: new Date().toISOString() } : v));
    } else {
      setVisitas(prev => [...prev, visita]);
    }
    setShowModal(false);
    setEditingVisita(null);
  };

  const excluirVisita = (id: string) => {
    if (confirm('Deseja excluir esta visita?')) {
      setVisitas(prev => prev.filter(v => v.id !== id));
    }
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCorPrioridade = (prioridade: string) => {
    const cores = {
      baixa: 'bg-gray-100 text-gray-800',
      media: 'bg-yellow-100 text-yellow-800',
      alta: 'bg-orange-100 text-orange-800',
      urgente: 'bg-red-100 text-red-800'
    };
    return cores[prioridade as keyof typeof cores] || 'bg-gray-100 text-gray-800';
  };

  const getCorStatus = (status: string) => {
    const cores = {
      agendada: 'bg-blue-100 text-blue-800',
      realizada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
      remarcada: 'bg-orange-100 text-orange-800'
    };
    return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📅 Agenda de Visitas</h2>
        <button
          onClick={handleNovaVisita}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          + Nova Visita
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos</option>
              {STATUS_VISITA.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mês/Ano</label>
            <input
              type="month"
              value={`${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => setMesAtual(new Date(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Lista de Visitas */}
      <div className="space-y-4">
        {Object.entries(visitasPorDia).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([data, visitasDoDia]) => (
          <div key={data} className="bg-white rounded-lg shadow">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-semibold text-lg">{data}</h3>
            </div>
            <div className="divide-y">
              {visitasDoDia.map(visita => (
                <div key={visita.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{visita.clienteNome}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getCorPrioridade(visita.prioridade)}`}>
                          {PRIORIDADES.find(p => p.value === visita.prioridade)?.label}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getCorStatus(visita.status)}`}>
                          {STATUS_VISITA.find(s => s.value === visita.status)?.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>🏢 {visita.representacao}</div>
                        <div>🕐 {formatarData(visita.dataHora)}</div>
                        <div>📋 {TIPOS_VISITA.find(t => t.value === visita.tipo)?.label}</div>
                        {visita.proximoPasso && (
                          <div>➡️ <strong>Próximo passo:</strong> {visita.proximoPasso}</div>
                        )}
                        {visita.observacoes && (
                          <div>📝 {visita.observacoes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => onVisitaSelect(visita)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => {
                          setEditingVisita(visita);
                          setShowModal(true);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirVisita(visita.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {Object.keys(visitasPorDia).length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nenhuma visita encontrada para o período selecionado.
          </div>
        )}
      </div>

      {/* Modal de Nova/Editar Visita */}
      {showModal && (
        <ModalVisita
          visita={editingVisita}
          clientes={clientes}
          onSave={salvarVisita}
          onCancel={() => {
            setShowModal(false);
            setEditingVisita(null);
          }}
        />
      )}
    </div>
  );
};

// Componente Modal para criar/editar visita
interface ModalVisitaProps {
  visita: Visita | null;
  clientes: Cliente[];
  onSave: (visita: Visita) => void;
  onCancel: () => void;
}

const ModalVisita: React.FC<ModalVisitaProps> = ({ visita, clientes, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Visita>(
    visita || {
      id: Date.now().toString(),
      clienteId: '',
      clienteNome: '',
      representacao: '',
      dataHora: new Date().toISOString(),
      tipo: 'visita',
      status: 'agendada',
      prioridade: 'media',
      observacoes: '',
      proximoPasso: '',
      anexos: [],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clienteId || !formData.representacao || !formData.dataHora) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const cliente = clientes.find(c => c.id === formData.clienteId);
    if (cliente) {
      formData.clienteNome = cliente.nome;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {visita?.id ? 'Editar Visita' : 'Nova Visita'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente *</label>
            <select
              value={formData.clienteId}
              onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} ({cliente.endereco.cidade})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Representação *</label>
            <select
              value={formData.representacao}
              onChange={(e) => setFormData({ ...formData, representacao: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Selecione</option>
              {REPRESENTACOES.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data e Hora *</label>
            <input
              type="datetime-local"
              value={formData.dataHora.slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, dataHora: new Date(e.target.value).toISOString() })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              {TIPOS_VISITA.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              {STATUS_VISITA.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prioridade</label>
            <select
              value={formData.prioridade}
              onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              {PRIORIDADES.map(prioridade => (
                <option key={prioridade.value} value={prioridade.value}>{prioridade.label}</option>
              ))}
            </select>
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

          <div>
            <label className="block text-sm font-medium mb-1">Próximo Passo</label>
            <input
              type="text"
              value={formData.proximoPasso}
              onChange={(e) => setFormData({ ...formData, proximoPasso: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ex: Enviar proposta, Agendar reunião, etc."
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

export default Visitas;
