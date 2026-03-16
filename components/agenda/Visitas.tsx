import React, { useState, useEffect } from 'react';
import { Visita, Cliente, TIPOS_VISITA, STATUS_VISITA, PRIORIDADES, REPRESENTACOES } from '../../types/agenda';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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
  const [filtroData, setFiltroData] = useState('');

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

  // Converter visitas para formato do calendário
  const eventosCalendario = visitas
    .filter(visita => {
      if (filtroRepresentacao && visita.representacao !== filtroRepresentacao) return false;
      if (filtroStatus && visita.status !== filtroStatus) return false;
      if (filtroData) {
        const dataVisita = new Date(visita.dataHora).toDateString();
        const dataFiltro = new Date(filtroData).toDateString();
        return dataVisita === dataFiltro;
      }
      return true;
    })
    .map(visita => ({
      id: visita.id,
      title: `${visita.clienteNome} - ${visita.representacao}`,
      start: new Date(visita.dataHora),
      end: new Date(new Date(visita.dataHora).getTime() + 60 * 60 * 1000), // +1 hora
      resource: visita,
      style: {
        backgroundColor: PRIORIDADES.find(p => p.value === visita.prioridade)?.color || '#3174ad',
        borderRadius: '4px',
        opacity: visita.status === 'cancelada' ? 0.6 : 1,
      },
    }));

  const handleSelectEvent = (event: any) => {
    onVisitaSelect(event.resource);
  };

  const handleSelectSlot = ({ start, end }: any) => {
    const novaVisita: Visita = {
      id: Date.now().toString(),
      clienteId: '',
      clienteNome: '',
      representacao: '',
      dataHora: start.toISOString(),
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
      // Editar visita existente
      setVisitas(prev => prev.map(v => v.id === visita.id ? { ...visita, atualizadoEm: new Date().toISOString() } : v));
    } else {
      // Nova visita
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📅 Agenda de Visitas</h2>
        <button
          onClick={() => {
            setEditingVisita(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          + Nova Visita
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroRepresentacao('');
                setFiltroStatus('');
                setFiltroData('');
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white p-4 rounded-lg shadow" style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Evento",
            noEventsInRange: "Nenhum evento neste período."
          }}
        />
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
    
    // Validar campos obrigatórios
    if (!formData.clienteId || !formData.representacao || !formData.dataHora) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    // Adicionar nome do cliente
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
                  {cliente.nome} ({cliente.cidade})
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
