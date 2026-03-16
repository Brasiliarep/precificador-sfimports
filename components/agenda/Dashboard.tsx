import React, { useState, useEffect } from 'react';
import { Cliente, Visita, DashboardStats, REPRESENTACOES } from '../../types/agenda';
import { inicializarDadosExemplo } from '../../utils/agendaExemplos';

interface DashboardProps {
  onVerVisitas: () => void;
  onVerClientes: () => void;
  onVerCampanhas: () => void;
  onVerMapa: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  onVerVisitas, 
  onVerClientes, 
  onVerCampanhas, 
  onVerMapa 
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    visitasHoje: 0,
    proximosCompromissos: 0,
    clientesSemRetorno30: 0,
    clientesSemRetorno60: 0,
    clientesSemRetorno90: 0,
    taxaConversao: 0,
    campanhasAtivas: 0,
    top10Clientes: []
  });

  // Carregar dados do localStorage
  useEffect(() => {
    // Inicializar dados exemplo se necessário
    inicializarDadosExemplo();
    
    const storedClientes = localStorage.getItem('agenda-clientes');
    const storedVisitas = localStorage.getItem('agenda-visitas');
    
    if (storedClientes) setClientes(JSON.parse(storedClientes));
    if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
  }, []);

  // Calcular estatísticas
  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Visitas hoje
    const visitasHoje = visitas.filter(v => {
      const dataVisita = new Date(v.dataHora);
      return dataVisita >= hoje && dataVisita < amanha && v.status === 'agendada';
    }).length;

    // Próximos compromissos (7 dias)
    const seteDias = new Date();
    seteDias.setDate(seteDias.getDate() + 7);
    const proximosCompromissos = visitas.filter(v => {
      const dataVisita = new Date(v.dataHora);
      return dataVisita >= hoje && dataVisita <= seteDias && v.status === 'agendada';
    }).length;

    // Clientes sem retorno
    const calcularClientesSemRetorno = (dias: number) => {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);
      
      return clientes.filter(cliente => {
        const ultimaVisita = visitas
          .filter(v => v.clienteId === cliente.id && v.status === 'realizada')
          .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())[0];
        
        return !ultimaVisita || new Date(ultimaVisita.dataHora) < dataLimite;
      }).length;
    };

    // Taxa de conversão
    const visitasRealizadas = visitas.filter(v => v.status === 'realizada').length;
    const visitasComResultado = visitas.filter(v => 
      v.status === 'realizada' && v.resultado && v.resultado.toLowerCase().includes('fechado')
    ).length;
    const taxaConversao = visitasRealizadas > 0 ? (visitasComResultado / visitasRealizadas) * 100 : 0;

    // Top 10 clientes (simulado - poderia vir de dados de pedidos)
    const top10Clientes = clientes
      .slice(0, 10)
      .map(cliente => ({
        id: cliente.id,
        nome: cliente.nome,
        volume: Math.random() * 10000 // Simulado
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    setStats({
      visitasHoje,
      proximosCompromissos,
      clientesSemRetorno30: calcularClientesSemRetorno(30),
      clientesSemRetorno60: calcularClientesSemRetorno(60),
      clientesSemRetorno90: calcularClientesSemRetorno(90),
      taxaConversao,
      campanhasAtivas: 0, // Simulado
      top10Clientes
    });
  }, [clientes, visitas]);

  const visitasHojeDetalhe = visitas.filter(v => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const dataVisita = new Date(v.dataHora);
    return dataVisita >= hoje && dataVisita < amanha && v.status === 'agendada';
  });

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">📊 Dashboard Agenda Rep</h2>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visitas Hoje</p>
              <p className="text-2xl font-bold text-blue-600">{stats.visitasHoje}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Próximos 7 dias</p>
              <p className="text-2xl font-bold text-green-600">{stats.proximosCompromissos}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa Conversão</p>
              <p className="text-2xl font-bold text-purple-600">{stats.taxaConversao.toFixed(1)}%</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sem Retorno 30d</p>
              <p className="text-2xl font-bold text-red-600">{stats.clientesSemRetorno30}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Clientes Sem Retorno */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-lg mb-4">⚠️ Clientes Sem Retorno</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.clientesSemRetorno30}</div>
            <div className="text-sm text-gray-600">30 dias</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.clientesSemRetorno60}</div>
            <div className="text-sm text-gray-600">60 dias</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-800">{stats.clientesSemRetorno90}</div>
            <div className="text-sm text-gray-600">90 dias</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas de Hoje */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">📅 Visitas de Hoje</h3>
            <button
              onClick={onVerVisitas}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Ver Todas
            </button>
          </div>
          {visitasHojeDetalhe.length > 0 ? (
            <div className="space-y-2">
              {visitasHojeDetalhe.map(visita => {
                const cliente = clientes.find(c => c.id === visita.clienteId);
                return (
                  <div key={visita.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <div className="font-medium">{cliente?.nome || visita.clienteNome}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(visita.dataHora).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {visita.representacao}
                    </div>
                    <div className="text-sm text-gray-500">{visita.tipo}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Nenhuma visita agendada para hoje.
            </div>
          )}
        </div>

        {/* Top 10 Clientes */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">🏆 Top 10 Clientes</h3>
            <button
              onClick={onVerClientes}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Ver Todos
            </button>
          </div>
          {stats.top10Clientes.length > 0 ? (
            <div className="space-y-2">
              {stats.top10Clientes.map((cliente, index) => (
                <div key={cliente.id} className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{cliente.nome}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    R$ {cliente.volume.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Botões de Navegação Rápida */}
      <div className="mt-6">
        <h3 className="font-semibold text-lg mb-4">🚀 Navegação Rápida</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={onVerVisitas}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="font-medium">Visitas</div>
          </button>
          <button
            onClick={onVerClientes}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium">Clientes CRM</div>
          </button>
          <button
            onClick={onVerCampanhas}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center"
          >
            <div className="text-2xl mb-2">📢</div>
            <div className="font-medium">Campanhas</div>
          </button>
          <button
            onClick={onVerMapa}
            className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-center"
          >
            <div className="text-2xl mb-2">🗺️</div>
            <div className="font-medium">Mapa</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
