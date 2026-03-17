import React, { useState, useEffect } from 'react';
import { SFImportsModule } from './components/SFImportsModule';
import { RepresentationModule as BrasiliaRepModule } from './components/RepresentationModule';
import GestorPedidosModule from './src/components/GestorPedidosModule';
import StoreMaster from './components/StoreMaster';
import AgendaRepModule from './components/AgendaRepModule';
import SFBot from './components/ai/SFBot';
import MobileApp from './components/mobile/MobileApp';
import SFInsights from './components/analytics/SFInsights';
import SFRecommendations from './components/ai/SFRecommendations';
import SFConnect from './components/marketplaces/SFConnect';
import ManualUsuario from './components/ManualUsuario';
import StoryEditor from './components/StoryEditor';
import { OCRModule } from './components/OCRModule';
import { Login } from './components/auth/Login';
import { setupApiSecurity } from './services/apiSecurity';
import InteligentePanel from './src/InteligentePanel';
import TurboImagens from './components/TurboImagens';
import { authService } from './src/services/authService';

// Inicializar proteção de API
setupApiSecurity();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-900 text-white min-h-screen flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-black mb-4">CRASH DETECTADO</h1>
          <p className="text-red-200 mb-8 max-w-lg">O projeto tentou carregar um módulo que falhou. Isso acontece quando algum arquivo está faltando ou tem erro de sintaxe.</p>
          <div className="bg-black/50 p-6 rounded-xl text-left font-mono text-sm mb-8 max-w-2xl overflow-auto w-full border border-white/10">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-all"
          >
            TENTAR NOVAMENTE (F5)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Verificar se há um parâmetro 'module' na URL para renderização isolada (para abrir em nova aba)
  const queryParams = new URLSearchParams(window.location.search);
  const initialModule = queryParams.get('module') as any;

    useEffect(() => {
        console.log('🔍 App: Efetuando verificação de sessão Firebase...');
        
        // Safety timeout
        const safetyTimeout = setTimeout(() => {
            console.warn('⚠️ App: Timeout de segurança atingido.');
            setIsCheckingAuth(false);
        }, 5000);

        // Subscrever às mudanças de autenticação do Firebase
        const unsubscribe = authService.onAuthChange((user) => {
            console.log('🔍 App: Estado do Firebase:', user ? 'Logado' : 'Deslogado');
            if (user) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
            setIsCheckingAuth(false);
            clearTimeout(safetyTimeout);
        });

        return () => unsubscribe();
    }, []);

  const [moduloAtivo, setModuloAtivo] = useState<'sf' | 'brasilia' | 'story' | 'gestor' | 'agenda' | 'bot' | 'mobile' | 'insights' | 'recommendations' | 'connect' | 'manual' | 'ocr' | 'inteligente'>(initialModule || 'sf');

  // Detectar rota direta /ocr
  useEffect(() => {
    if (window.location.pathname === '/ocr') {
      setModuloAtivo('ocr');
    }
  }, []);

  // Loading state para evitar flash da tela de login
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
          <p className="text-purple-400 font-medium animate-pulse">Iniciando SF Imports...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar tela de login (exceto para o StoryEditor se for acessado diretamente via link de preview, se necessário)
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login onLogin={() => setIsAuthenticated(true)} />
      </ErrorBoundary>
    );
  }

  // Se o módulo inicial for 'story', renderizar apenas o StoryEditor (versão isolada para nova aba)
  if (initialModule === 'story') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#111]">
          <StoryEditor onClose={() => window.close()} />
        </div>
      </ErrorBoundary>
    );
  }

  // Se o módulo inicial for 'turbo', renderizar apenas o TurboImagens (versão isolada para nova aba)
  if (initialModule === 'turbo') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#0a0a0a]">
          <TurboImagens onClose={() => window.close()} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* HEADER - Não fixo para permitir que a tabela abaixo fixe seu próprio cabeçalho */}
        <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 relative z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <img
                  src="/logo.jpg"
                  alt="SF Imports"
                  className="h-12 md:h-24 w-auto shadow-sm object-contain"
                />
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white">SF IMPORTS</h1>
                  <p className="text-xs md:text-sm text-purple-300">Gestão Inteligente & Automação</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open('catalogo.html', '_blank')}
                  className="px-4 md:px-6 py-2 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-lg md:shadow-xl hover:scale-105 transition-all"
                >
                  📋 CATÁLOGO
                </button>
                <button
                  onClick={() => authService.logout().then(() => window.location.reload())}
                  className="px-4 md:px-6 py-2 md:py-3 bg-red-600/20 hover:bg-red-600 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base border border-red-500/50 transition-all"
                >
                   Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* MENU PRINCIPAL - 4 ABAS */}
        <nav className="bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* MOBILE: Menu Horizontal - 4 ITENS */}
            <div className="grid grid-cols-4 gap-2 md:gap-4">

              {/* SF IMPORTS */}
              <button
                onClick={() => setModuloAtivo('sf')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'sf'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl md:shadow-2xl shadow-purple-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📊</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">SF</h3>
                <p className="text-xs md:text-sm opacity-90">Precificação</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Upload</li>
                  <li>• Dashboard</li>
                  <li>• WooCommerce</li>
                </ul>
              </button>

              {/* BRASÍLIA REP */}
              <button
                onClick={() => setModuloAtivo('brasilia')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'brasilia'
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl md:shadow-2xl shadow-blue-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">🏢</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">BRASÍLIA</h3>
                <p className="text-xs md:text-sm opacity-90">Rep</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Produtos</li>
                  <li>• Clientes</li>
                  <li>• Relatórios</li>
                </ul>
              </button>

              {/* STORY MASTER - EXISTENTE */}
              <button
                onClick={() => window.open('/story/editor.html', '_blank')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'story'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl md:shadow-2xl shadow-indigo-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📖</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">STORIES</h3>
                <p className="text-xs md:text-sm opacity-90">Master</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Templates</li>
                  <li>• Geração</li>
                  <li>• Online</li>
                </ul>
              </button>

              {/* AGENDA REP (NOVO) */}
              <button
                onClick={() => setModuloAtivo('agenda')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'agenda'
                  ? 'bg-gradient-to-br from-green-600 to-teal-600 text-white shadow-xl md:shadow-2xl shadow-green-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📅</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">AGENDA REP</h3>
                <p className="text-xs md:text-sm opacity-90">CRM</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Visitas</li>
                  <li>• Clientes</li>
                  <li>• Campanhas</li>
                  <li>• Mapa</li>
                </ul>
              </button>

              {/* GESTOR PEDIDOS (NOVO) */}
              <button
                onClick={() => setModuloAtivo('gestor')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'gestor'
                  ? 'bg-gradient-to-br from-yellow-600 to-orange-600 text-white shadow-xl md:shadow-2xl shadow-yellow-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📦</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">GESTOR</h3>
                <p className="text-xs md:text-sm opacity-90">CRM</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• WhatsApp</li>
                  <li>• Status</li>
                  <li>• Pedidos</li>
                </ul>
              </button>

              {/* 🤖 SF BOT (NOVO) */}
              <button
                onClick={() => setModuloAtivo('bot')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'bot'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl md:shadow-2xl shadow-purple-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">🤖</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">SF BOT</h3>
                <p className="text-xs md:text-sm opacity-90">IA Assistant</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Chat IA</li>
                  <li>• Relatórios</li>
                  <li>• Voz</li>
                </ul>
              </button>

              {/* 📱 MOBILE APP (NOVO) */}
              <button
                onClick={() => setModuloAtivo('mobile')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'mobile'
                  ? 'bg-gradient-to-br from-green-600 to-teal-600 text-white shadow-xl md:shadow-2xl shadow-green-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📱</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">MOBILE</h3>
                <p className="text-xs md:text-sm opacity-90">App Vendedor</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• PWA</li>
                  <li>• Offline</li>
                  <li>• GPS</li>
                </ul>
              </button>

              {/* 📊 INSIGHTS (NOVO) */}
              <button
                onClick={() => setModuloAtivo('insights')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'insights'
                  ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white shadow-xl md:shadow-2xl shadow-orange-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📊</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">INSIGHTS</h3>
                <p className="text-xs md:text-sm opacity-90">Analytics</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• ML</li>
                  <li>• Previsão</li>
                  <li>• Dash</li>
                </ul>
              </button>

              {/* 🎯 RECOMMENDATIONS (NOVO) */}
              <button
                onClick={() => setModuloAtivo('recommendations')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'recommendations'
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xl md:shadow-2xl shadow-indigo-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">🎯</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">RECOMMEND</h3>
                <p className="text-xs md:text-sm opacity-90">IA Engine</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Cross-sell</li>
                  <li>• Up-sell</li>
                  <li>• AI</li>
                </ul>
              </button>

              {/* 🔄 CONNECT (NOVO) */}
              <button
                onClick={() => setModuloAtivo('connect')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'connect'
                  ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-xl md:shadow-2xl shadow-cyan-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">🔄</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">CONNECT</h3>
                <p className="text-xs md:text-sm opacity-90">Marketplaces</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Multi-canal</li>
                  <li>• Sync</li>
                  <li>• API</li>
                </ul>
              </button>

              {/* 📚 MANUAL DO USUÁRIO */}
              <button
                onClick={() => setModuloAtivo('manual')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'manual'
                  ? 'bg-gradient-to-br from-yellow-600 to-orange-600 text-white shadow-xl md:shadow-2xl shadow-yellow-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">📚</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">MANUAL</h3>
                <p className="text-xs md:text-sm opacity-90">Usuário</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Guia completo</li>
                  <li>• Fórmulas</li>
                  <li>• Regras</li>
                </ul>
              </button>

              {/* 🔍 OCR LENTE (NOVO) */}
              <button
                onClick={() => setModuloAtivo('ocr')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'ocr'
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-xl md:shadow-2xl shadow-purple-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">🔍</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">OCR</h3>
                <p className="text-xs md:text-sm opacity-90">Lente Milão</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Scanner</li>
                  <li>• Milão</li>
                  <li>• Preços</li>
                </ul>
              </button>

              {/* 🧠 PAINEL IA (NOVO) */}
              <button
                onClick={() => setModuloAtivo('inteligente')}
                className={`p-2 md:p-4 rounded-lg md:rounded-xl text-left transition-all transform hover:scale-105 ${moduloAtivo === 'inteligente'
                  ? 'bg-gradient-to-br from-purple-400 to-indigo-400 text-white shadow-xl md:shadow-2xl shadow-purple-500/50'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
              >
                <div className="text-lg md:text-2xl mb-1">🧠</div>
                <h3 className="text-sm md:text-lg font-bold mb-1">IA</h3>
                <p className="text-xs md:text-sm opacity-90">Painel Inteligente</p>
                <ul className="text-[8px] md:text-xs mt-1 space-y-1 opacity-80 hidden md:block">
                  <li>• Análise</li>
                  <li>• Vivino</li>
                  <li>• SuperAdega</li>
                </ul>
              </button>

            </div>
          </div>
        </nav>

        {/* CONTEÚDO - RENDERIZA MÓDULO ATIVO */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 min-h-[600px]">
          {moduloAtivo === 'sf' && <SFImportsModule navigateTo={setModuloAtivo} />}
          {moduloAtivo === 'ocr' && <OCRModule />}
          {moduloAtivo === 'bot' && <SFBot />}
          {moduloAtivo === 'story' && <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-4"><StoryEditor onClose={() => setModuloAtivo('sf')} /></div>}
          {moduloAtivo === 'mobile' && <MobileApp onBackToDesktop={() => setModuloAtivo('sf')} />}
          {moduloAtivo === 'gestor' && <GestorPedidosModule />}
          {moduloAtivo === 'brasilia' && <BrasiliaRepModule />}
          {moduloAtivo === 'insights' && <SFInsights />}
          {moduloAtivo === 'recommendations' && <SFRecommendations />}
          {moduloAtivo === 'connect' && <SFConnect />}
          {moduloAtivo === 'agenda' && <AgendaRepModule />}
          {moduloAtivo === 'manual' && <ManualUsuario />}
          {moduloAtivo === 'inteligente' && <InteligentePanel onCriarStory={(p) => setModuloAtivo('story')} />}
        </main>

        {/* FOOTER */}
        <footer className="bg-black/30 backdrop-blur-xl border-t border-white/10 mt-12 md:mt-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6 text-center text-white/50 text-xs md:text-sm">
            <p className="text-xs md:text-sm">v3.0 System Architecture • Powered by Gemini Flash 2.5 • SF Imports © 2026</p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}