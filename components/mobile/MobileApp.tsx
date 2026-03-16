import React, { useState, useEffect } from 'react';
import { Cliente, Visita, REPRESENTACOES } from '../../types/agenda';

interface MobileAppProps {
  onBackToDesktop: () => void;
}

const MobileApp: React.FC<MobileAppProps> = ({ onBackToDesktop }) => {
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'clients' | 'visits' | 'orders' | 'profile'>('home');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cart, setCart] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Carregar dados do localStorage
    const storedClientes = localStorage.getItem('agenda-clientes');
    const storedVisitas = localStorage.getItem('agenda-visitas');
    const storedProdutos = localStorage.getItem('produtos');
    
    if (storedClientes) setClientes(JSON.parse(storedClientes));
    if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
    if (storedProdutos) setProdutos(JSON.parse(storedProdutos));

    // Monitorar conexão
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Obter localização atual
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Erro ao obter localização:', error)
      );
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Registrar PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
    }
  }, []);

  const addToCart = (produto: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === produto.id);
      if (existing) {
        return prev.map(item => 
          item.id === produto.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...produto, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const nearbyClients = clientes.filter(cliente => {
    if (!currentLocation || !cliente.endereco.latitude || !cliente.endereco.longitude) return false;
    const distance = calculateDistance(
      currentLocation.lat, currentLocation.lng,
      cliente.endereco.latitude, cliente.endereco.longitude
    );
    return distance <= 50; // Clientes em 50km de raio
  }).sort((a, b) => {
    const distA = calculateDistance(
      currentLocation!.lat, currentLocation!.lng,
      a.endereco.latitude!, a.endereco.longitude!
    );
    const distB = calculateDistance(
      currentLocation!.lat, currentLocation!.lng,
      b.endereco.latitude!, b.endereco.longitude!
    );
    return distA - distB;
  });

  const renderHome = () => (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline - Modo Limitado'}
            </span>
          </div>
          <button
            onClick={onBackToDesktop}
            className="text-blue-600 text-sm"
          >
            🖥️ Versão Desktop
          </button>
        </div>
      </div>

      {/* Cards Rápidos */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setCurrentView('catalog')}
          className="bg-blue-600 text-white rounded-lg p-4 text-center"
        >
          <div className="text-2xl mb-2">📦</div>
          <div className="text-sm font-medium">Catálogo</div>
          <div className="text-xs opacity-90">{produtos.length} produtos</div>
        </button>

        <button
          onClick={() => setCurrentView('clients')}
          className="bg-green-600 text-white rounded-lg p-4 text-center"
        >
          <div className="text-2xl mb-2">👥</div>
          <div className="text-sm font-medium">Clientes</div>
          <div className="text-xs opacity-90">{clientes.length} ativos</div>
        </button>

        <button
          onClick={() => setCurrentView('visits')}
          className="bg-purple-600 text-white rounded-lg p-4 text-center"
        >
          <div className="text-2xl mb-2">📅</div>
          <div className="text-sm font-medium">Visitas</div>
          <div className="text-xs opacity-90">{visitas.filter(v => v.status === 'agendada').length} agendadas</div>
        </button>

        <button
          onClick={() => setCurrentView('orders')}
          className="bg-orange-600 text-white rounded-lg p-4 text-center relative"
        >
          <div className="text-2xl mb-2">🛒</div>
          <div className="text-sm font-medium">Pedidos</div>
          {cart.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              {cart.length}
            </div>
          )}
        </button>
      </div>

      {/* Clientes Próximos */}
      {currentLocation && nearbyClients.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-3">📍 Clientes Próximos</h3>
          <div className="space-y-2">
            {nearbyClients.slice(0, 3).map(cliente => {
              const distance = calculateDistance(
                currentLocation.lat, currentLocation.lng,
                cliente.endereco.latitude!, cliente.endereco.longitude!
              );
              return (
                <div key={cliente.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium text-sm">{cliente.nome}</div>
                    <div className="text-xs text-gray-500">{cliente.endereco.cidade}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{distance.toFixed(1)} km</div>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${cliente.endereco.latitude},${cliente.endereco.longitude}`, '_blank')}
                      className="text-xs text-blue-600"
                    >
                      🗺️ Rota
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitas de Hoje */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-3">📅 Visitas de Hoje</h3>
        {visitas.filter(v => {
          const hoje = new Date().toDateString();
          return new Date(v.dataHora).toDateString() === hoje && v.status === 'agendada';
        }).length > 0 ? (
          <div className="space-y-2">
            {visitas.filter(v => {
              const hoje = new Date().toDateString();
              return new Date(v.dataHora).toDateString() === hoje && v.status === 'agendada';
            }).map(visita => {
              const cliente = clientes.find(c => c.id === visita.clienteId);
              return (
                <div key={visita.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="font-medium text-sm">{cliente?.nome || visita.clienteNome}</div>
                    <div className="text-xs text-gray-500">{visita.representacao}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{new Date(visita.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <button className="text-xs text-green-600">✓ Iniciar</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhuma visita agendada para hoje.</p>
        )}
      </div>
    </div>
  );

  const renderCatalog = () => (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">📦 Catálogo de Produtos</h2>
        <button
          onClick={() => setCurrentView('home')}
          className="text-blue-600"
        >
          ← Voltar
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Buscar produtos..."
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Lista de Produtos */}
      <div className="grid grid-cols-2 gap-4">
        {produtos.slice(0, 20).map(produto => (
          <div key={produto.id} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="aspect-square bg-gray-200 rounded mb-2 flex items-center justify-center">
              <span className="text-2xl">🍷</span>
            </div>
            <h3 className="font-medium text-sm mb-1 truncate">{produto.nome || produto.supplierName}</h3>
            <div className="text-lg font-bold text-blue-600 mb-2">
              R${produto.preco || '0,00'}
            </div>
            <button
              onClick={() => addToCart(produto)}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm"
            >
              Adicionar
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🛒 Carrinho de Pedidos</h2>
        <button
          onClick={() => setCurrentView('home')}
          className="text-blue-600"
        >
          ← Voltar
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🛒</div>
          <p className="text-gray-500">Seu carrinho está vazio</p>
          <button
            onClick={() => setCurrentView('catalog')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Ver Produtos
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{item.nome || item.supplierName}</h3>
                <div className="text-blue-600 font-bold">R${item.preco || '0,00'}</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        setCart(prev => prev.map(cartItem =>
                          cartItem.id === item.id
                            ? { ...cartItem, quantity: cartItem.quantity - 1 }
                            : cartItem
                        ));
                      }
                    }}
                    className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-600"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total:</span>
              <span className="text-xl font-bold text-blue-600">
                R${cart.reduce((sum, item) => sum + (parseFloat(item.preco?.replace(',', '.') || 0) * item.quantity), 0).toFixed(2)}
              </span>
            </div>
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold">
              Finalizar Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📱</div>
            <div>
              <h1 className="text-lg font-bold">SF Mobile</h1>
              <p className="text-xs opacity-90">App do Vendedor</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs">Online</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-16">
        {currentView === 'home' && renderHome()}
        {currentView === 'catalog' && renderCatalog()}
        {currentView === 'orders' && renderOrders()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => setCurrentView('home')}
            className={`py-2 text-center ${currentView === 'home' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <div className="text-xl">🏠</div>
            <div className="text-xs">Início</div>
          </button>
          <button
            onClick={() => setCurrentView('catalog')}
            className={`py-2 text-center relative ${currentView === 'catalog' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <div className="text-xl">📦</div>
            <div className="text-xs">Catálogo</div>
          </button>
          <button
            onClick={() => setCurrentView('visits')}
            className={`py-2 text-center ${currentView === 'visits' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <div className="text-xl">📅</div>
            <div className="text-xs">Visitas</div>
          </button>
          <button
            onClick={() => setCurrentView('orders')}
            className={`py-2 text-center relative ${currentView === 'orders' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <div className="text-xl">🛒</div>
            <div className="text-xs">Pedidos</div>
            {cart.length > 0 && (
              <div className="absolute top-1 right-4 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {cart.length}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileApp;
