import React, { useState, useEffect } from 'react';
import { Cliente } from '../../types/agenda';

interface Marketplace {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  lastSync?: Date;
  productsCount: number;
  ordersCount: number;
  revenue: number;
  apiEndpoint?: string;
  apiKey?: string;
}

interface SyncStatus {
  marketplace: string;
  status: 'syncing' | 'success' | 'error' | 'idle';
  progress?: number;
  message?: string;
  lastSync?: Date;
}

interface Order {
  id: string;
  marketplace: string;
  customerName: string;
  customerEmail: string;
  products: Array<{name: string, quantity: number, price: number}>;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: Date;
  trackingCode?: string;
}

const SFConnect: React.FC = () => {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([
    {
      id: 'mercadolivre',
      name: 'Mercado Livre',
      icon: '🛍️',
      color: 'yellow',
      connected: false,
      productsCount: 0,
      ordersCount: 0,
      revenue: 0
    },
    {
      id: 'amazon',
      name: 'Amazon',
      icon: '📦',
      color: 'orange',
      connected: false,
      productsCount: 0,
      ordersCount: 0,
      revenue: 0
    },
    {
      id: 'magalu',
      name: 'Magazine Luiza',
      icon: '🛒',
      color: 'blue',
      connected: false,
      productsCount: 0,
      ordersCount: 0,
      revenue: 0
    },
    {
      id: 'americanas',
      name: 'Americanas',
      icon: '🏪',
      color: 'red',
      connected: false,
      productsCount: 0,
      ordersCount: 0,
      revenue: 0
    },
    {
      id: 'olx',
      name: 'OLX',
      icon: '📱',
      color: 'green',
      connected: false,
      productsCount: 0,
      ordersCount: 0,
      revenue: 0
    }
  ]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Carregar produtos do sistema
    const storedProducts = localStorage.getItem('produtos');
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    }

    // Carregar configurações salvas
    const storedMarketplaces = localStorage.getItem('sf-connect-marketplaces');
    if (storedMarketplaces) {
      setMarketplaces(JSON.parse(storedMarketplaces));
    }

    // Carregar pedidos
    const storedOrders = localStorage.getItem('sf-connect-orders');
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    }

    // Inicializar status de sincronização
    const initialSyncStatus = marketplaces.map(mp => ({
      marketplace: mp.id,
      status: 'idle' as const
    }));
    setSyncStatus(initialSyncStatus);
  }, []);

  // Conectar marketplace
  const connectMarketplace = (marketplaceId: string, credentials: {apiKey: string, apiEndpoint?: string}) => {
    setMarketplaces(prev => prev.map(mp => 
      mp.id === marketplaceId 
        ? { 
            ...mp, 
            connected: true, 
            apiKey: credentials.apiKey,
            apiEndpoint: credentials.apiEndpoint,
            lastSync: new Date()
          }
        : mp
    ));

    // Salvar configurações
    const updatedMarketplaces = marketplaces.map(mp => 
      mp.id === marketplaceId 
        ? { ...mp, connected: true, apiKey: credentials.apiKey }
        : mp
    );
    localStorage.setItem('sf-connect-marketplaces', JSON.stringify(updatedMarketplaces));

    setShowConnectModal(false);
    
    // Iniciar sincronização inicial
    setTimeout(() => syncMarketplace(marketplaceId), 1000);
  };

  // Sincronizar marketplace
  const syncMarketplace = async (marketplaceId: string) => {
    setSyncStatus(prev => prev.map(status => 
      status.marketplace === marketplaceId 
        ? { ...status, status: 'syncing', progress: 0 }
        : status
    ));

    // Simular sincronização
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setSyncStatus(prev => prev.map(status => 
        status.marketplace === marketplaceId 
          ? { ...status, progress: i, message: `Sincronizando... ${i}%` }
          : status
      ));
    }

    // Gerar pedidos simulados
    const newOrders = generateMockOrders(marketplaceId, 5);
    setOrders(prev => [...prev, ...newOrders]);

    // Atualizar estatísticas
    setMarketplaces(prev => prev.map(mp => 
      mp.id === marketplaceId 
        ? { 
            ...mp, 
            productsCount: products.length,
            ordersCount: mp.ordersCount + 5,
            revenue: mp.revenue + Math.floor(Math.random() * 10000) + 5000,
            lastSync: new Date()
          }
        : mp
    ));

    setSyncStatus(prev => prev.map(status => 
      status.marketplace === marketplaceId 
        ? { ...status, status: 'success', progress: 100, message: 'Sincronizado com sucesso!', lastSync: new Date() }
        : status
    ));

    // Salvar pedidos
    const allOrders = [...orders, ...newOrders];
    localStorage.setItem('sf-connect-orders', JSON.stringify(allOrders));
  };

  // Gerar pedidos simulados
  const generateMockOrders = (marketplaceId: string, count: number): Order[] => {
    const marketplace = marketplaces.find(mp => mp.id === marketplaceId);
    const mockOrders: Order[] = [];

    for (let i = 0; i < count; i++) {
      const orderProducts = products.slice(0, Math.floor(Math.random() * 3) + 1).map(product => ({
        name: product.nome || product.supplierName || 'Produto',
        quantity: Math.floor(Math.random() * 3) + 1,
        price: parseFloat(product.preco?.replace(',', '.') || '50')
      }));

      mockOrders.push({
        id: `${marketplaceId}_${Date.now()}_${i}`,
        marketplace: marketplace?.name || '',
        customerName: `Cliente ${Math.floor(Math.random() * 1000)}`,
        customerEmail: `cliente${Math.floor(Math.random() * 1000)}@email.com`,
        products: orderProducts,
        total: orderProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0),
        status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)] as any,
        date: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        trackingCode: Math.random() > 0.5 ? `BR${Math.floor(Math.random() * 10000000000000)}` : undefined
      });
    }

    return mockOrders;
  };

  // Sincronizar todos
  const syncAllMarketplaces = async () => {
    const connectedMarketplaces = marketplaces.filter(mp => mp.connected);
    
    for (const marketplace of connectedMarketplaces) {
      await syncMarketplace(marketplace.id);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay entre sincronizações
    }
  };

  // Desconectar marketplace
  const disconnectMarketplace = (marketplaceId: string) => {
    if (confirm('Tem certeza que deseja desconectar este marketplace?')) {
      setMarketplaces(prev => prev.map(mp => 
        mp.id === marketplaceId 
          ? { ...mp, connected: false, apiKey: undefined, apiEndpoint: undefined }
          : mp
      ));

      // Remover pedidos deste marketplace
      setOrders(prev => prev.filter(order => !order.marketplace.includes(marketplaces.find(mp => mp.id === marketplaceId)?.name || '')));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'syncing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔄 SF Connect</h1>
        <p className="text-gray-600">Integração com Marketplaces - Venda em múltiplos canais</p>
        
        {/* Ações Globais */}
        <div className="flex items-center space-x-4 mt-4">
          <button
            onClick={syncAllMarketplaces}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            🔄 Sincronizar Todos
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">
              {marketplaces.filter(mp => mp.connected).length} de {marketplaces.length} conectados
            </span>
          </div>
        </div>
      </div>

      {/* Cards de Marketplaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {marketplaces.map(marketplace => {
          const status = syncStatus.find(s => s.marketplace === marketplace.id);
          
          return (
            <div key={marketplace.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{marketplace.icon}</div>
                  <div>
                    <h3 className="font-semibold">{marketplace.name}</h3>
                    <div className={`text-sm ${getStatusColor(status?.status || 'idle')}`}>
                      {getStatusIcon(status?.status || 'idle')} {status?.message || 'Idle'}
                    </div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  marketplace.connected ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
              </div>

              {marketplace.connected ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold">{marketplace.productsCount}</div>
                      <div className="text-xs text-gray-600">Produtos</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{marketplace.ordersCount}</div>
                      <div className="text-xs text-gray-600">Pedidos</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">R${marketplace.revenue.toLocaleString('pt-BR')}</div>
                      <div className="text-xs text-gray-600">Receita</div>
                    </div>
                  </div>

                  {status?.status === 'syncing' && (
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${status.progress || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{status.progress}%</div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => syncMarketplace(marketplace.id)}
                      disabled={status?.status === 'syncing'}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded text-sm"
                    >
                      {status?.status === 'syncing' ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                    <button
                      onClick={() => disconnectMarketplace(marketplace.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                    >
                      Desconectar
                    </button>
                  </div>

                  {marketplace.lastSync && (
                    <div className="text-xs text-gray-500">
                      Última sinc: {marketplace.lastSync.toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-500 mb-3">Não conectado</div>
                  <button
                    onClick={() => {
                      setSelectedMarketplace(marketplace.id);
                      setShowConnectModal(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Conectar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pedidos Recentes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📦 Pedidos Recentes</h3>
        
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Marketplace</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Produtos</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Rastreio</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map(order => (
                  <tr key={order.id} className="border-b">
                    <td className="px-4 py-2">{order.marketplace}</td>
                    <td className="px-4 py-2">
                      <div>
                        <div className="font-medium text-sm">{order.customerName}</div>
                        <div className="text-xs text-gray-600">{order.customerEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm">
                        {order.products.map((p, i) => (
                          <div key={i}>{p.quantity}x {p.name}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium">R${order.total.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${getOrderStatusColor(order.status)}`}>
                        {order.status === 'pending' ? 'Pendente' :
                         order.status === 'processing' ? 'Processando' :
                         order.status === 'shipped' ? 'Enviado' :
                         order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {order.date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {order.trackingCode ? (
                        <span className="text-blue-600">{order.trackingCode}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-gray-600">Nenhum pedido encontrado. Conecte um marketplace para começar.</p>
          </div>
        )}
      </div>

      {/* Modal de Conexão */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Conectar {marketplaces.find(mp => mp.id === selectedMarketplace)?.name}
            </h3>
            
            <ConnectMarketplaceForm
              marketplaceId={selectedMarketplace}
              onConnect={connectMarketplace}
              onCancel={() => setShowConnectModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Formulário de conexão
interface ConnectMarketplaceFormProps {
  marketplaceId: string;
  onConnect: (marketplaceId: string, credentials: {apiKey: string, apiEndpoint?: string}) => void;
  onCancel: () => void;
}

const ConnectMarketplaceForm: React.FC<ConnectMarketplaceFormProps> = ({
  marketplaceId,
  onConnect,
  onCancel
}) => {
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiEndpoint: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.apiKey.trim()) {
      alert('Preencha a API Key!');
      return;
    }

    onConnect(marketplaceId, credentials);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">API Key *</label>
        <input
          type="password"
          value={credentials.apiKey}
          onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
          className="w-full border rounded px-3 py-2"
          placeholder="Sua API Key do marketplace"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">API Endpoint (opcional)</label>
        <input
          type="url"
          value={credentials.apiEndpoint}
          onChange={(e) => setCredentials({ ...credentials, apiEndpoint: e.target.value })}
          className="w-full border rounded px-3 py-2"
          placeholder="https://api.marketplace.com"
        />
      </div>

      <div className="bg-blue-50 p-3 rounded">
        <p className="text-sm text-blue-800">
            <strong>Como obter a API Key:</strong><br/>
            1. Acesse o painel do vendedor<br/>
            2. Vá em Configurações &gt; API<br/>
            3. Gere uma nova chave<br/>
            4. Copie e cole aqui
          </p>
      </div>

      <div className="flex space-x-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          Conectar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default SFConnect;
