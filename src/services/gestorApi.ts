import { Pedido } from '../types/pedidos';

const API_URL = '/api/pedidos'; // Apontando para o endpoint real de pedidos

class GestorAPI {
  async login(user: string, pass: string) {
    try {
      console.log('🔑 Tentando login...', { user, pass: '***' });

      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass })
      });

      console.log('📡 Resposta status:', res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('📦 Resposta data:', data);

      return data;
    } catch (error) {
      console.error('❌ Erro login completo:', error);
      throw error;
    }
  }

  async checkAuth() {
    try {
      const res = await fetch('/api/check-auth', {
        credentials: 'include'
      });
      return await res.json();
    } catch (error) {
      return { status: 'not_authenticated' };
    }
  }

  async getPedidos(): Promise<Pedido[]> {
    try {
      const res = await fetch(API_URL, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('Erro ao buscar pedidos');

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      return [];
    }
  }

  async salvarPedido(pedido: Pedido) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido)
      });
      return await res.json();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      throw error;
    }
  }

  async deletePedido(id: number) {
    try {
      const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      return await res.json();
    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      throw error;
    }
  }

  async limparTudo() {
    try {
      const res = await fetch(`${API_URL}?id=all`, {
        method: 'DELETE',
        credentials: 'include'
      });
      return await res.json();
    } catch (error) {
      console.error('Erro ao limpar tudo:', error);
      throw error;
    }
  }
}

export const gestorAPI = new GestorAPI();

// ========================================
// MODO MOCK PARA TESTES TEMPORÁRIOS (DESATIVADO)
// ========================================
if (false) { // Desativado conscientemente
  // MOCK DATA para teste
  const mockPedidos: Pedido[] = [
    {
      id: 1,
      date: "15/02/2026 01:30",
      client: "João Silva",
      phone: "(62) 99853-4087",
      items: [
        { qty: 6, name: "Vinho Chileno", price: 58.9 },
        { qty: 9, name: "Vinho TT Casas", price: 59.9 },
        { qty: 3, name: "Vinho TT Casas", price: 59.9 }
      ],
      total: 1491.60,
      pay: "Cartão 3x",
      obs: "",
      discount: 0,
      payLink: "",
      origin: "Manual",
      paid: true,
      delivered: true
    },
    {
      id: 2,
      date: "20/12/2025 18:26",
      client: "Maria Santos",
      phone: "(11) 98765-4321",
      items: [
        { qty: 6, name: "Vinho TT Casas", price: 59.9 },
        { qty: 2, name: "Vinho TT Portilho", price: 49.9 }
      ],
      total: 459.20,
      pay: "Pix",
      obs: "Entrega amanhã",
      discount: 20,
      payLink: "62.99853-4087",
      origin: "WhatsApp",
      paid: false,
      delivered: false
    },
    {
      id: 3,
      date: "19/12/2025 16:20",
      client: "Pedro Costa",
      phone: "(85) 99876-5432",
      items: [
        { qty: 3, name: "Vinho Tinto Cárnivor", price: 79.9 },
        { qty: 3, name: "Vinho Tinto Bons Ventos", price: 52.9 },
        { qty: 1, name: "Vinho Tinto Juliana Florista", price: 29.99 }
      ],
      total: 727.80,
      pay: "Dinheiro",
      obs: "Cliente VIP",
      discount: 0,
      payLink: "",
      origin: "Loja Física",
      paid: false,
      delivered: false
    }
  ];

  // Sobrescrever métodos com mock
  GestorAPI.prototype.login = async function (user: string, pass: string) {
    console.log('🔑 MOCK LOGIN:', user);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (user === 'admin' && pass === 'sfimports2026') {
      return { status: 'success', message: 'Login mock sucesso!' };
    } else {
      return { status: 'error', message: 'Usuário ou senha inválidos (mock)' };
    }
  };

  GestorAPI.prototype.checkAuth = async function () {
    console.log('🔍 MOCK CHECK AUTH');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { status: 'authenticated' };
  };

  GestorAPI.prototype.getPedidos = async function (): Promise<Pedido[]> {
    console.log('📋 MOCK GET PEDIDOS');
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPedidos;
  };

  GestorAPI.prototype.salvarPedido = async function (pedido: Pedido) {
    console.log('💾 MOCK SALVAR PEDIDO:', pedido);
    await new Promise(resolve => setTimeout(resolve, 400));
    return { status: 'success', message: 'Pedido salvo (mock)' };
  };

  GestorAPI.prototype.deletePedido = async function (id: number) {
    console.log('🗑️ MOCK DELETE PEDIDO:', id);
    await new Promise(resolve => setTimeout(resolve, 300));
    return { status: 'success', message: 'Pedido deletado (mock)' };
  };

  GestorAPI.prototype.limparTudo = async function () {
    console.log('🧹 MOCK LIMPAR TUDO');
    await new Promise(resolve => setTimeout(resolve, 500));
    return { status: 'success', message: 'Todos os pedidos deletados (mock)' };
  };

  console.log('🎭 MODO MOCK ATIVADO - Usando dados de teste');
}
