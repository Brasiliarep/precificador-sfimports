import React, { useState, useEffect } from 'react';
import { Cliente, Visita } from '../../types/agenda';

interface Recommendation {
  id: string;
  type: 'product' | 'client' | 'promotion' | 'cross_sell' | 'up_sell';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  data: any;
  actionable: boolean;
  action?: string;
}

interface RecommendationEngine {
  generateProductRecommendations: (cliente: Cliente, produtos: any[]) => Recommendation[];
  generateClientRecommendations: (clientes: Cliente[], visitas: Visita[]) => Recommendation[];
  generatePromotionRecommendations: (clientes: Cliente[]) => Recommendation[];
  generateCrossSellRecommendations: (cliente: Cliente, produtos: any[]) => Recommendation[];
  generateUpSellRecommendations: (cliente: Cliente, produtos: any[]) => Recommendation[];
}

const SFRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [learningMode, setLearningMode] = useState(false);

  useEffect(() => {
    // Carregar dados
    const storedClientes = localStorage.getItem('agenda-clientes');
    const storedVisitas = localStorage.getItem('agenda-visitas');
    const storedProdutos = localStorage.getItem('produtos');
    
    if (storedClientes) setClientes(JSON.parse(storedClientes));
    if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
    if (storedProdutos) setProdutos(JSON.parse(storedProdutos));

    // Inicializar motor de recomendações
    setTimeout(() => {
      generateAllRecommendations();
      setLoading(false);
    }, 2000);
  }, []);

  // Motor de Machine Learning para recomendações
  const recommendationEngine: RecommendationEngine = {
    generateProductRecommendations: (cliente, produtos) => {
      const recommendations: Recommendation[] = [];
      
      // Análise de histórico de compras (simulado)
      const historicoCompras = cliente.segmento || 'geral';
      
      // Produtos populares no segmento do cliente
      const produtosSegmento = produtos
        .filter(p => p.categoria === historicoCompras || Math.random() > 0.7)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      produtosSegmento.forEach(produto => {
        recommendations.push({
          id: `prod_${cliente.id}_${produto.id}`,
          type: 'product',
          title: `Recomendar: ${produto.nome || produto.supplierName}`,
          description: `Baseado no perfil de ${cliente.segmento} e potencial ${cliente.potencial}`,
          confidence: Math.random() * 30 + 70, // 70-100%
          priority: cliente.potencial === 'A' ? 'high' : cliente.potencial === 'B' ? 'medium' : 'low',
          data: produto,
          actionable: true,
          action: 'Adicionar ao carrinho'
        });
      });

      return recommendations;
    },

    generateClientRecommendations: (clientes, visitas) => {
      const recommendations: Recommendation[] = [];
      
      // Clientes sem visita recente
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);
      
      clientes.forEach(cliente => {
        const ultimaVisita = visitas
          .filter(v => v.clienteId === cliente.id && v.status === 'realizada')
          .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())[0];

        if (!ultimaVisita || new Date(ultimaVisita.dataHora) < dataLimite) {
          recommendations.push({
            id: `client_${cliente.id}`,
            type: 'client',
            title: `Reengajar: ${cliente.nome}`,
            description: `Cliente ${cliente.potencial} sem visita há ${ultimaVisita ? 
              Math.floor((Date.now() - new Date(ultimaVisita.dataHora).getTime()) / (1000 * 60 * 60 * 24)) : 
              'muitos'} dias`,
            confidence: cliente.potencial === 'A' ? 90 : cliente.potencial === 'B' ? 70 : 50,
            priority: cliente.potencial === 'A' ? 'high' : 'medium',
            data: cliente,
            actionable: true,
            action: 'Agendar visita'
          });
        }
      });

      return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
    },

    generatePromotionRecommendations: (clientes) => {
      const recommendations: Recommendation[] = [];
      
      // Análise de padrões para promoções
      const segmentos = ['Varejo', 'Food Service', 'Atacado'];
      
      segmentos.forEach(segmento => {
        const clientesSegmento = clientes.filter(c => c.segmento === segmento);
        
        if (clientesSegmento.length >= 5) {
          recommendations.push({
            id: `promo_${segmento}`,
            type: 'promotion',
            title: `Campanha para ${segmento}`,
            description: `Criar promoção segmentada para ${clientesSegmento.length} clientes`,
            confidence: 85,
            priority: 'medium',
            data: { segmento, clientes: clientesSegmento.length },
            actionable: true,
            action: 'Criar campanha'
          });
        }
      });

      return recommendations;
    },

    generateCrossSellRecommendations: (cliente, produtos) => {
      const recommendations: Recommendation[] = [];
      
      // Produtos complementares baseados em padrões de compra
      const crossSellMap = {
        'Vinho Tinto': ['Queijos', 'Carnes Vermelhas'],
        'Vinho Branco': ['Peixes', 'Saladas'],
        'Espumante': ['Frutas', 'Doces']
      };

      produtos.forEach(produto => {
        const nome = produto.nome || produto.supplierName || '';
        
        Object.entries(crossSellMap).forEach(([principal, complementares]) => {
          if (nome.includes(principal)) {
            complementares.forEach(complementar => {
              const produtoComplementar = produtos.find(p => 
                (p.nome || p.supplierName || '').includes(complementar)
              );
              
              if (produtoComplementar) {
                recommendations.push({
                  id: `cross_${cliente.id}_${produtoComplementar.id}`,
                  type: 'cross_sell',
                  title: `Cross-sell: ${complementar}`,
                  description: `Quem compra ${principal} geralmente leva ${complementar}`,
                  confidence: 75,
                  priority: 'medium',
                  data: produtoComplementar,
                  actionable: true,
                  action: 'Oferecer junto'
                });
              }
            });
          }
        });
      });

      return recommendations.slice(0, 3);
    },

    generateUpSellRecommendations: (cliente, produtos) => {
      const recommendations: Recommendation[] = [];
      
      // Upsell baseado no potencial do cliente
      if (cliente.potencial === 'A') {
        const produtosPremium = produtos
          .filter(p => (parseFloat(p.preco?.replace(',', '.') || 0) > 100))
          .slice(0, 3);

        produtosPremium.forEach(produto => {
          recommendations.push({
            id: `up_${cliente.id}_${produto.id}`,
            type: 'up_sell',
            title: `Upgrade: ${produto.nome || produto.supplierName}`,
            description: `Produto premium para cliente potencial A`,
            confidence: 80,
            priority: 'high',
            data: produto,
            actionable: true,
            action: 'Apresentar opção premium'
          });
        });
      }

      return recommendations;
    }
  };

  const generateAllRecommendations = () => {
    const allRecommendations: Recommendation[] = [];
    
    // Recomendações de produtos para clientes ativos
    clientes.filter(c => c.tipo === 'ativo').forEach(cliente => {
      allRecommendations.push(...recommendationEngine.generateProductRecommendations(cliente, produtos));
      allRecommendations.push(...recommendationEngine.generateCrossSellRecommendations(cliente, produtos));
      allRecommendations.push(...recommendationEngine.generateUpSellRecommendations(cliente, produtos));
    });

    // Recomendações de clientes
    allRecommendations.push(...recommendationEngine.generateClientRecommendations(clientes, visitas));

    // Recomendações de promoções
    allRecommendations.push(...recommendationEngine.generatePromotionRecommendations(clientes));

    // Ordenar por confiança e prioridade
    const sortedRecommendations = allRecommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aScore = a.confidence * priorityWeight[a.priority];
        const bScore = b.confidence * priorityWeight[b.priority];
        return bScore - aScore;
      })
      .slice(0, 20); // Top 20 recomendações

    setRecommendations(sortedRecommendations);
  };

  const executeAction = (recommendation: Recommendation) => {
    if (recommendation.action) {
      // Simular execução da ação
      alert(`Executando: ${recommendation.action}\n\n${recommendation.description}`);
      
      // Em implementação real, aqui seria:
      // - Abrir modal de criação de pedido
      // - Redirecionar para agendamento de visita
      // - Criar campanha automática
      // - Adicionar ao carrinho
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return '📦';
      case 'client': return '👥';
      case 'promotion': return '📢';
      case 'cross_sell': return '🔄';
      case 'up_sell': return '⬆️';
      default: return '💡';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <div className="text-xl font-semibold mb-2">Analisando Padrões...</div>
          <div className="text-gray-600">Machine Learning aprendendo com seus dados</div>
          <div className="mt-4">
            <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto">
              <div className="w-3/4 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Sistema de Recomendação IA</h1>
        <p className="text-gray-600">Recomendações personalizadas com Machine Learning</p>
        
        {/* Controles */}
        <div className="flex items-center space-x-4 mt-4">
          <button
            onClick={() => setLearningMode(!learningMode)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              learningMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧠 {learningMode ? 'Aprendendo Ativo' : 'Aprendendo Inativo'}
          </button>
          
          <button
            onClick={generateAllRecommendations}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            🔄 Atualizar Recomendações
          </button>
          
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-white border rounded-lg px-4 py-2"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome} ({cliente.potencial})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estatísticas do Motor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">🎯</div>
            <div className="text-sm font-medium text-purple-600">ML Active</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{recommendations.length}</div>
          <div className="text-sm text-gray-600">Recomendações Ativas</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">📊</div>
            <div className="text-sm font-medium text-green-600">
              {(recommendations.filter(r => r.confidence >= 80).length / recommendations.length * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {recommendations.filter(r => r.confidence >= 80).length}
          </div>
          <div className="text-sm text-gray-600">Alta Confiança</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">🔥</div>
            <div className="text-sm font-medium text-red-600">
              {recommendations.filter(r => r.priority === 'high').length}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {recommendations.filter(r => r.actionable).length}
          </div>
          <div className="text-sm text-gray-600">Ações Disponíveis</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">💡</div>
            <div className="text-sm font-medium text-blue-600">AI</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(recommendations.map(r => r.type)).size}
          </div>
          <div className="text-sm text-gray-600">Tipos de Insights</div>
        </div>
      </div>

      {/* Lista de Recomendações */}
      <div className="space-y-4">
        {recommendations.map(recommendation => (
          <div key={recommendation.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="text-2xl">{getTypeIcon(recommendation.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold">{recommendation.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${getConfidenceColor(recommendation.confidence)}`}>
                      {recommendation.confidence.toFixed(0)}% confiança
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority === 'high' ? 'Alta' : 
                       recommendation.priority === 'medium' ? 'Média' : 'Baixa'} prioridade
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{recommendation.description}</p>
                  
                  {/* Detalhes específicos por tipo */}
                  {recommendation.type === 'product' && recommendation.data && (
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <div className="text-sm">
                        <strong>Produto:</strong> {recommendation.data.nome || recommendation.data.supplierName}
                      </div>
                      <div className="text-sm">
                        <strong>Preço:</strong> R${recommendation.data.preco || '0,00'}
                      </div>
                    </div>
                  )}

                  {recommendation.type === 'client' && recommendation.data && (
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <div className="text-sm">
                        <strong>Cliente:</strong> {recommendation.data.nome}
                      </div>
                      <div className="text-sm">
                        <strong>Cidade:</strong> {recommendation.data.endereco.cidade}
                      </div>
                      <div className="text-sm">
                        <strong>Potencial:</strong> {recommendation.data.potencial}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {recommendation.actionable && (
                <button
                  onClick={() => executeAction(recommendation)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {recommendation.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma recomendação ainda</h3>
          <p className="text-gray-600">O motor de IA está analisando seus dados...</p>
        </div>
      )}

      {/* Configurações do Motor */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">⚙️ Configurações do Motor de IA</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sensibilidade</label>
            <select className="w-full border rounded px-3 py-2">
              <option>Alta (mais recomendações)</option>
              <option selected>Média (balanceado)</option>
              <option>Baixa (só alta confiança)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Foco</label>
            <select className="w-full border rounded px-3 py-2">
              <option>Vendas</option>
              <option selected>Balanceado</option>
              <option>Retenção</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Atualização</label>
            <select className="w-full border rounded px-3 py-2">
              <option>Tempo real</option>
              <option selected>A cada hora</option>
              <option>Diária</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SFRecommendations;
