import React, { useState } from 'react';
import { Book, X, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  subsections?: ManualSection[];
}

const manualData: ManualSection[] = [
  {
    id: 'sf-imports',
    title: 'SF IMPORTS (Precificação)',
    icon: '📊',
    content: `Sistema automatizado de precificação com cálculos inteligentes.

🧮 FÓRMULA PRINCIPAL:
SF FINAL = SF POR + FRETE + TAXA + LUCRO MÍNIMO

📋 FLUXO DE TRABALHO:
1. Upload → Selecionar arquivo (Excel/CSV)
2. Processamento → Cálculos automáticos
3. Validação → Verificação de margens
4. Aplicação → Atualização de preços

⚠️ REGRAS DE NEGÓCIO:
• Margem Mínima: 10%
• Arredondamento: 2 casas decimais
• Alerta Vermelho: Margem abaixo do mínimo
• Formatação: R$ 1.234,56`,
    subsections: [
      {
        id: 'importacao',
        title: 'Importação de Dados',
        icon: '📥',
        content: `Formatos Suportados:
✅ Excel (.xlsx)
✅ CSV (.csv)

Colunas Obrigatórias:
• Nome: Identificação do produto
• Custo: Preço de compra (R$)
• Frete: Valor unitário (R$)
• Taxa: Percentual de impostos (%)
• Lucro Mínimo: Margem desejada (%)`
      },
      {
        id: 'calculos',
        title: 'Cálculos Automáticos',
        icon: '🧮',
        content: `Componentes do Cálculo:
• SF Por: Preço base sem markup
• SF Sugestão: Preço com markup padrão (20%)
• SF Final: Preço final com todos os componentes
• Margem Real: (SF Final - Custo - Frete) / SF Final × 100`
      }
    ]
  },
  {
    id: 'brasilia-rep',
    title: 'BRASÍLIA REP (Representação)',
    icon: '🏢',
    content: `Sistema completo para gestão comercial.

👥 GESTÃO DE CLIENTES:
• Cadastro completo com validação
• Segmentação por potencial e categoria
• Histórico de compras e visitas
• Controle de comissões

💰 CÁLCULO DE COMISSÕES:
COMISSÃO = VALOR TOTAL × PERCENTUAL REPRESENTANTE

Regras:
• Comissão Mínima: 5%
• Pagamento: 30 dias após faturamento
• Metas: Trimestrais com bônus`
  },
  {
    id: 'gestor-pedidos',
    title: 'GESTOR DE PEDIDOS (CRM)',
    icon: '📦',
    content: `Central de gestão com integração WhatsApp.

📱 CANAIS DE ENTRADA:
• WhatsApp → Email → Site → Telefone → Manual

🔄 STATUS DO PEDIDO:
📝 Orçamento → ✅ Confirmado → 🚚 Em Transporte → ✅ Entregue → 💰 Faturado

⏰ SLA: Atualização em até 2 horas
📱 Notificação: WhatsApp automático`
  },
  {
    id: 'agenda-rep',
    title: 'AGENDA REP (Visitas)',
    icon: '📅',
    content: `Agendamento inteligente com otimização de rotas.

📅 CALENDÁRIO:
• Visualização: Mês → Semana → Dia
• Horários: 8h às 18h (comercial)
• Confirmação: WhatsApp 24h antes

🗺️ OTIMIZAÇÃO DE ROTAS:
• GPS: Tempo real
• Trânsito: Condições da via
• Clima: Previsão do tempo
• Menor Caminho: Algoritmo inteligente`
  },
  {
    id: 'store-master',
    title: 'STORE MASTER (Produtos)',
    icon: '🏪',
    content: `Cadastro completo de produtos.

📦 INFORMAÇÕES BÁSICAS:
• Nome, Descrição, Categoria, SKU
• NCM, Unidade, Peso, Dimensões

💰 GESTÃO DE PREÇOS:
💰 Custo → 💵 Varejo → 🏪 Atacado → 🎯 Especial

📊 ESTOQUE:
• Controle Manual/Importação
• Alerta: < 10 unidades
• Reposição: Sugestão automática`
  },
  {
    id: 'sf-bot',
    title: 'SF BOT (Assistente IA)',
    icon: '🤖',
    content: `Assistente virtual inteligente.

💬 COMANDOS SUPORTADOS:
• "Mostrar vendas de hoje"
• "Ver estoque do produto X"
• "Listar clientes VIP"
• "Gerar relatório mensal"

🧠 FUNCIONALIDADES:
• Conversação natural
• Memória de contexto
• Relatórios automáticos
• Previsões inteligentes`
  },
  {
    id: 'mobile-app',
    title: 'MOBILE APP',
    icon: '📱',
    content: `App para vendedores com funcionalidades offline.

📱 MODO OFFLINE:
• Clientes → Produtos → Agenda → Pedidos
• Sincronização automática ao voltar online

📍 GPS E LOCALIZAÇÃO:
• Rastreamento em tempo real
• Check-in de visitas
• Otimização de rotas
• Distâncias precisas`
  },
  {
    id: 'insights',
    title: 'INSIGHTS (Analytics)',
    icon: '📊',
    content: `Analytics com Machine Learning.

📈 KPIs MONITORADOS:
💰 Faturamento → 📊 Volume → 👥 Clientes → 📦 Produtos

🤖 MACHINE LEARNING:
• Previsão: Demanda futura (30 dias)
• Segmentação: Clientes automáticos
• Anomalias: Detecção automática
• Clustering: Produtos similares`
  },
  {
    id: 'recommendations',
    title: 'RECOMMENDATIONS (IA Engine)',
    icon: '🎯',
    content: `Motor inteligente de recomendações.

🛒 CROSS-SELL:
• "Quem comprou X, também comprou Y"
• Produtos complementares
• Análise de cestas de compras

⬆️ UP-SELL:
• Versões premium
• Produtos superiores
• Pacotes vantajosos
• Maior valor/comissão`
  },
  {
    id: 'connect',
    title: 'CONNECT (Marketplaces)',
    icon: '🔄',
    content: `Integração multi-canal.

🛒 MARKETPLACES:
• Mercado Livre (Full integration)
• Amazon (API completa)
• Site Próprio (WooCommerce)
• Instagram (Shopping)

🔄 SINCRONIZAÇÃO:
📦 Estoque → 💰 Preços → 📋 Descrições → 🖼️ Imagens
• Tempo real
• Bidirecional
• Seguro com criptografia`
  }
];

export default function ManualUsuario() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<ManualSection | null>(null);

  const filteredSections = manualData.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Book className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Manual do Usuário
                </h1>
                <p className="text-purple-300">SF Imports System v3.0</p>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              ← Voltar
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="text"
              placeholder="Buscar funcionalidades, fórmulas, módulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Sections List */}
        <div className="lg:col-span-1">
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-purple-300">Módulos</h2>
            <div className="space-y-2">
              {filteredSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedSection?.id === section.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl'
                      : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <div>
                      <div className="font-semibold">{section.title}</div>
                      {section.subsections && (
                        <div className="text-xs opacity-80">
                          {section.subsections.length} subseções
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {selectedSection ? (
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">{selectedSection.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">{selectedSection.title}</h2>
                  <p className="text-purple-300">Guia completo de funcionalidades</p>
                </div>
              </div>

              {/* Section Content */}
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-purple-100 leading-relaxed">
                  {selectedSection.content}
                </div>
              </div>

              {/* Subsections */}
              {selectedSection.subsections && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4 text-purple-300">Subseções</h3>
                  <div className="space-y-4">
                    {selectedSection.subsections.map(subsection => (
                      <div key={subsection.id} className="bg-white/5 rounded-xl p-4">
                        <button
                          onClick={() => toggleSection(subsection.id)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{subsection.icon}</span>
                            <span className="font-semibold">{subsection.title}</span>
                          </div>
                          {expandedSections.includes(subsection.id) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        {expandedSections.includes(subsection.id) && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="whitespace-pre-wrap text-purple-100 text-sm leading-relaxed">
                              {subsection.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex gap-4">
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-xl">
                  🎯 Acessar Módulo
                </button>
                <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all">
                  📧 Enviar Dúvida
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
              <Book className="w-16 h-16 text-purple-400 mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-4">Selecione um Módulo</h3>
              <p className="text-purple-300">
                Escolha um módulo na lista à esquerda para ver o guia completo de funcionalidades, fórmulas e regras.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12">
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-purple-300">
            📚 Para dúvidas adicionais, contate nosso suporte 24/7
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <span className="text-sm">📧 suporte@sfimports.com.br</span>
            <span className="text-sm">📱 (61) 9999-9999</span>
            <span className="text-sm">💬 Chat Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
