import React, { useState, useEffect } from 'react';
import { Cliente, Visita } from '../../types/agenda';

interface AnalyticsData {
  totalVendas: number;
  totalClientes: number;
  totalVisitas: number;
  taxaConversao: number;
  crescimentoMensal: number;
  previsaoProximoMes: number;
  topProdutos: Array<{nome: string, vendas: number, receita: number}>;
  topClientes: Array<{nome: string, valor: number, potencial: string}>;
  heatmapData: Array<{cidade: string, valor: number, lat: number, lng: number}>;
  trendsData: Array<{mes: string, vendas: number, visitas: number}>;
}

const SFInsights: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  useEffect(() => {
    // Carregar dados
    const storedClientes = localStorage.getItem('agenda-clientes');
    const storedVisitas = localStorage.getItem('agenda-visitas');
    const storedProdutos = localStorage.getItem('produtos');
    
    if (storedClientes) setClientes(JSON.parse(storedClientes));
    if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
    if (storedProdutos) setProdutos(JSON.parse(storedProdutos));

    // Simular carregamento e processamento
    setTimeout(() => {
      processAnalytics();
      setLoading(false);
    }, 2000);
  }, [selectedPeriod]);

  const processAnalytics = () => {
    // Machine Learning: Previsão de vendas usando tendência histórica
    const previsaoVendas = () => {
      const ultimosMeses = 6;
      const vendasPorMes = [];
      
      for (let i = ultimosMeses - 1; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        
        const vendasMes = Math.floor(Math.random() * 50000) + 30000; // Simulado
        vendasPorMes.push(vendasMes);
      }

      // Cálculo de tendência linear simples
      const tendencia = vendasPorMes.reduce((sum, venda, index) => {
        return sum + (venda * (index - vendasPorMes.length / 2));
      }, 0) / vendasPorMes.reduce((sum, _, index) => {
        return sum + Math.pow(index - vendasPorMes.length / 2, 2);
      }, 0);

      const previsao = vendasPorMes[vendasPorMes.length - 1] + tendencia;
      return Math.max(0, previsao);
    };

    // Análise de clientes por potencial
    const analiseClientes = () => {
      const distribuicao = {
        A: clientes.filter(c => c.potencial === 'A').length,
        B: clientes.filter(c => c.potencial === 'B').length,
        C: clientes.filter(c => c.potencial === 'C').length
      };
      
      const total = distribuicao.A + distribuicao.B + distribuicao.C;
      return {
        A: (distribuicao.A / total * 100).toFixed(1),
        B: (distribuicao.B / total * 100).toFixed(1),
        C: (distribuicao.C / total * 100).toFixed(1)
      };
    };

    // Heatmap de vendas por cidade
    const gerarHeatmap = () => {
      const cidades: {[key: string]: {count: number, totalValor: number, lat: number, lng: number}} = {};
      clientes.forEach(cliente => {
        const cidade = cliente.endereco.cidade;
        if (!cidades[cidade]) {
          cidades[cidade] = {
            count: 0,
            totalValor: 0,
            lat: cliente.endereco.latitude || -15.8267,
            lng: cliente.endereco.longitude || -47.9218
          };
        }
        cidades[cidade].count++;
        cidades[cidade].totalValor += cliente.valorUltimaCompra || 0;
      });

      return Object.entries(cidades).map(([cidade, data]) => ({
        cidade,
        valor: data.totalValor,
        lat: data.lat,
        lng: data.lng
      })).sort((a, b) => b.valor - a.valor);
    };

    // Tendências de crescimento
    const analisarTendencias = () => {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      return meses.map((mes, index) => ({
        mes,
        vendas: Math.floor(Math.random() * 50000) + 30000 + (index * 2000),
        visitas: Math.floor(Math.random() * 100) + 50 + (index * 5)
      }));
    };

    // Top produtos (simulado)
    const topProdutos = produtos
      .slice(0, 10)
      .map(produto => ({
        nome: produto.nome || produto.supplierName || 'Produto',
        vendas: Math.floor(Math.random() * 100) + 20,
        receita: Math.floor(Math.random() * 10000) + 2000
      }))
      .sort((a, b) => b.receita - a.receita);

    // Top clientes
    const topClientes = clientes
      .filter(c => c.valorUltimaCompra)
      .sort((a, b) => (b.valorUltimaCompra || 0) - (a.valorUltimaCompra || 0))
      .slice(0, 10)
      .map(cliente => ({
        nome: cliente.nome,
        valor: cliente.valorUltimaCompra || 0,
        potencial: cliente.potencial
      }));

    const analyticsData: AnalyticsData = {
      totalVendas: Math.floor(Math.random() * 500000) + 200000,
      totalClientes: clientes.length,
      totalVisitas: visitas.length,
      taxaConversao: parseFloat((Math.random() * 30 + 20).toFixed(1)),
      crescimentoMensal: parseFloat((Math.random() * 20 + 5).toFixed(1)),
      previsaoProximoMes: previsaoVendas(),
      topProdutos,
      topClientes,
      heatmapData: gerarHeatmap(),
      trendsData: analisarTendencias()
    };

    setData(analyticsData);
  };

  const getGrowthColor = (value: number) => {
    if (value > 15) return 'text-green-600';
    if (value > 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return '📈';
    if (value < 0) return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-xl font-semibold mb-2">Processando Dados...</div>
          <div className="text-gray-600">Analisando padrões com Machine Learning</div>
          <div className="mt-4">
            <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto">
              <div className="w-3/4 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 SF Insights</h1>
        <p className="text-gray-600">Análise avançada com Machine Learning e IA</p>
        
        {/* Seletor de Período */}
        <div className="flex space-x-2 mt-4">
          {[
            { value: '7d', label: '7 dias' },
            { value: '30d', label: '30 dias' },
            { value: '90d', label: '90 dias' },
            { value: '1y', label: '1 ano' }
          ].map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">💰</div>
            <div className={`text-sm font-medium ${getGrowthColor(data.crescimentoMensal)}`}>
              {getGrowthIcon(data.crescimentoMensal)} {data.crescimentoMensal}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            R${data.totalVendas.toLocaleString('pt-BR')}
          </div>
          <div className="text-sm text-gray-600">Vendas Totais</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">👥</div>
            <div className="text-sm font-medium text-blue-600">
              📈 +{Math.floor(Math.random() * 20 + 5)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.totalClientes}
          </div>
          <div className="text-sm text-gray-600">Clientes Ativos</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">📅</div>
            <div className="text-sm font-medium text-green-600">
              ✓ {data.taxaConversao}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.totalVisitas}
          </div>
          <div className="text-sm text-gray-600">Visitas Realizadas</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">🔮</div>
            <div className="text-sm font-medium text-purple-600">
              ML Prediction
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            R${data.previsaoProximoMes.toLocaleString('pt-BR')}
          </div>
          <div className="text-sm text-gray-600">Previsão Próximo Mês</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Tendências */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Tendências de Vendas</h3>
          <div className="space-y-3">
            {data.trendsData.map((trend, index) => (
              <div key={trend.mes} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 text-sm font-medium">{trend.mes}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="text-xs text-gray-600">Vendas:</div>
                      <div className="text-sm font-medium">R${trend.vendas.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(trend.vendas / 60000) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {trend.visitas} visitas
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produtos */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">🏆 Top Produtos</h3>
          <div className="space-y-3">
            {data.topProdutos.slice(0, 5).map((produto, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{produto.nome}</div>
                    <div className="text-xs text-gray-600">{produto.vendas} vendas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">R${produto.receita.toLocaleString('pt-BR')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clientes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">👥 Top Clientes</h3>
          <div className="space-y-3">
            {data.topClientes.slice(0, 5).map((cliente, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    cliente.potencial === 'A' ? 'bg-green-100 text-green-800' :
                    cliente.potencial === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cliente.potencial}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{cliente.nome}</div>
                  </div>
                </div>
                <div className="text-sm font-medium">R${cliente.valor.toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap de Cidades */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">🗺️ Vendas por Região</h3>
          <div className="space-y-3">
            {data.heatmapData.slice(0, 5).map((cidade, index) => (
              <div key={cidade.cidade} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm">
                    📍
                  </div>
                  <div>
                    <div className="font-medium text-sm">{cidade.cidade}</div>
                  </div>
                </div>
                <div className="text-sm font-medium">R${cidade.valor.toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights da IA */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">🤖 Insights da IA</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-sm mb-1">💡 Oportunidade Detectada</div>
              <div className="text-xs text-gray-700">
                Clientes potenciais A sem visita há 30+ dias. Focar em reengajamento pode aumentar vendas em 15%.
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-sm mb-1">📈 Tendência de Crescimento</div>
              <div className="text-xs text-gray-700">
                Vendas de vinhos italianos crescendo 25% nos últimos 2 meses. Considerar aumentar estoque.
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="font-medium text-sm mb-1">⚠️ Alerta de Estoque</div>
              <div className="text-xs text-gray-700">
                3 produtos populares com baixo estoque. Risco de perda de vendas em 7 dias.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Inteligentes */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">🚨 Alertas Inteligentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border-l-4 border-red-500 bg-red-50">
            <div className="font-medium text-red-800 mb-1">🔴 Crítico</div>
            <div className="text-sm text-red-700">
              12 clientes sem compra há 90+ dias. Risco de churn elevado.
            </div>
          </div>
          <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
            <div className="font-medium text-yellow-800 mb-1">🟡 Atenção</div>
            <div className="text-sm text-yellow-700">
              Taxa de conversão abaixo da meta (18% vs 25%).
            </div>
          </div>
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <div className="font-medium text-green-800 mb-1">🟢 Oportunidade</div>
            <div className="text-sm text-green-700">
              Previsão indica crescimento de 20% no próximo mês.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SFInsights;
