import React, { useState } from 'react';
import Dashboard from './agenda/Dashboard';
import VisitasSimples from './agenda/VisitasSimples';
import ClientesCRM from './agenda/ClientesCRM';
import { Visita, Cliente } from '../types/agenda';

type AgendaView = 'dashboard' | 'visitas' | 'clientes' | 'campanhas' | 'mapa';

const AgendaRepModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<AgendaView>('dashboard');
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const handleVisitaSelect = (visita: Visita) => {
    setSelectedVisita(visita);
    // Aqui poderia abrir um modal de detalhes da visita
    alert(`Detalhes da visita:\n\nCliente: ${visita.clienteNome}\nData: ${new Date(visita.dataHora).toLocaleString('pt-BR')}\nStatus: ${visita.status}\nObservações: ${visita.observacoes}`);
  };

  const handleClienteSelect = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    // Aqui poderia abrir um modal de detalhes do cliente
    alert(`Detalhes do cliente:\n\nNome: ${cliente.nome}\nCNPJ: ${cliente.cnpj}\nTelefone: ${cliente.telefone}\nCidade: ${cliente.endereco.cidade}\nPotencial: ${cliente.potencial}`);
  };

  const handleCriarVisita = (cliente: Cliente) => {
    setCurrentView('visitas');
    // Aqui poderia pré-preencher o formulário de visita com o cliente selecionado
    setTimeout(() => {
      alert(`Criando visita para: ${cliente.nome}\n\n(O formulário seria pré-preenchido com os dados deste cliente)`);
    }, 100);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onVerVisitas={() => setCurrentView('visitas')}
            onVerClientes={() => setCurrentView('clientes')}
            onVerCampanhas={() => setCurrentView('campanhas')}
            onVerMapa={() => setCurrentView('mapa')}
          />
        );
      
      case 'visitas':
        return (
          <VisitasSimples
            onVisitaSelect={handleVisitaSelect}
          />
        );
      
      case 'clientes':
        return (
          <ClientesCRM
            onClienteSelect={handleClienteSelect}
            onCriarVisita={handleCriarVisita}
          />
        );
      
      case 'campanhas':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">📢 Campanhas</h2>
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
              <p className="text-gray-600 mb-4">
                O módulo de campanhas estará disponível em breve. Você poderá criar campanhas de WhatsApp, 
                email e SMS para seus clientes.
              </p>
              <div className="text-left max-w-md mx-auto bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2">🎯 Funcionalidades planejadas:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Criação de campanhas segmentadas</li>
                  <li>• Envio via WhatsApp, Email e SMS</li>
                  <li>• Templates de mensagens personalizados</li>
                  <li>• Relatórios de envio e conversão</li>
                  <li>• LGPD: Opt-in e descadastro</li>
                </ul>
              </div>
            </div>
          </div>
        );
      
      case 'mapa':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">🗺️ Mapa de Clientes</h2>
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
              <p className="text-gray-600 mb-4">
                O mapa interativo estará disponível em breve. Você poderá visualizar todos os seus clientes 
                no mapa e otimizar rotas de visita.
              </p>
              <div className="text-left max-w-md mx-auto bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2">🗺️ Funcionalidades planejadas:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Visualização de clientes no mapa</li>
                  <li>• Pins coloridos por status</li>
                  <li>• Filtros por representação</li>
                  <li>• Geração de rotas otimizadas</li>
                  <li>• Integração com Google Maps/Waze</li>
                </ul>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Menu de Navegação */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentView('visitas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'visitas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📅 Visitas
            </button>
            <button
              onClick={() => setCurrentView('clientes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'clientes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Clientes CRM
            </button>
            <button
              onClick={() => setCurrentView('campanhas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'campanhas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📢 Campanhas
            </button>
            <button
              onClick={() => setCurrentView('mapa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'mapa'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🗺️ Mapa
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AgendaRepModule;
