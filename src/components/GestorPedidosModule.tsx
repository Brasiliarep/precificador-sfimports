import React, { useState, useEffect } from 'react';
import { gestorAPI } from '../services/gestorApi';
import { Pedido } from '../types/pedidos';

export default function GestorPedidosModule() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  
  // Estados para fornecedores
  const [fornecedores, setFornecedores] = useState<string[]>(['Fornecedor Principal', 'Distribuidora A', 'Distribuidora B']);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<string>('');
  const [fornecedorInput, setFornecedorInput] = useState('');

  useEffect(() => {
    checkAuthAndLoad();
  }, [refreshKey]);

  const checkAuthAndLoad = async () => {
    setLoading(true);
    try {
      const auth = await gestorAPI.checkAuth();
      if (auth.status === 'authenticated') {
        setAuthenticated(true);
        await loadPedidos();
      } else {
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro auth:', error);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadPedidos = async () => {
    try {
      const data = await gestorAPI.getPedidos();
      setPedidos(data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const handleLogin = async (user: string, pass: string) => {
    try {
      console.log('🔑 Iniciando login com usuário:', user);
      const res = await gestorAPI.login(user, pass);
      
      if (res.status === 'success') {
        console.log('✅ Login sucesso!');
        setAuthenticated(true);
        await loadPedidos();
      } else {
        console.error('❌ Login falhou:', res);
        alert(`❌ Login inválido!\n\n${res.message || 'Verifique usuário e senha'}`);
      }
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      alert(`❌ Erro ao fazer login!\n\n${error.message || 'Tente novamente mais tarde'}`);
    }
  };

  const togglePaid = async (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    pedido.paid = !pedido.paid;
    await gestorAPI.salvarPedido(pedido);
    setRefreshKey(prev => prev + 1);
  };

  const toggleDelivered = async (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    pedido.delivered = !pedido.delivered;
    await gestorAPI.salvarPedido(pedido);
    setRefreshKey(prev => prev + 1);
  };

  const deletePedido = async (id: number) => {
    if (!confirm('🗑️ Apagar este pedido?')) return;
    
    await gestorAPI.deletePedido(id);
    setRefreshKey(prev => prev + 1);
  };

  const limparTudo = async () => {
    if (!confirm('⚠️ APAGAR TODOS OS PEDIDOS?\n\n(Backup automático será feito)')) return;
    
    await gestorAPI.limparTudo();
    setRefreshKey(prev => prev + 1);
  };

  const sendZap = (pedido: Pedido) => {
    if (!pedido.phone) {
      alert('❌ Cliente sem telefone cadastrado!');
      return;
    }

    let phone = pedido.phone.replace(/[^0-9]/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    let msg = `Olá ${pedido.client}! 😊\n\n✅ Confirmação do seu pedido SF Imports:\n\n`;
    pedido.items.forEach(i => {
      msg += `${i.qty}x ${i.name}\n`;
    });
    msg += `\n💰 Total: R$ ${pedido.total.toFixed(2)}`;
    msg += `\n📱 Pagamento: ${pedido.pay}`;
    
    if (pedido.payLink) {
      msg += pedido.pay === 'Pix' 
        ? `\n🔑 Chave Pix: ${pedido.payLink}` 
        : `\n🔗 Link: ${pedido.payLink}`;
    }
    
    msg += '\n\n⭐ Obrigado pela preferência!';

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const editPedido = async (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;
    
    // Abrir modal de edição completo
    setEditingPedido({ ...pedido });
  };

  const savePedidoEditado = async () => {
    if (!editingPedido) return;
    
    try {
      await gestorAPI.salvarPedido(editingPedido);
      setRefreshKey(prev => prev + 1);
      setEditingPedido(null);
      alert('✅ Pedido atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar pedido:', error);
      alert('❌ Erro ao salvar pedido!');
    }
  };

  const cancelEditPedido = () => {
    setEditingPedido(null);
  };

  const updatePedidoField = (field: keyof Pedido, value: any) => {
    if (!editingPedido) return;
    setEditingPedido({ ...editingPedido, [field]: value });
  };

  const updatePedidoItem = (index: number, field: 'name' | 'qty' | 'price', value: any) => {
    if (!editingPedido) return;
    const novosItems = [...editingPedido.items];
    novosItems[index] = { ...novosItems[index], [field]: value };
    
    // Recalcular total
    const novoTotal = novosItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    
    setEditingPedido({ 
      ...editingPedido, 
      items: novosItems,
      total: novoTotal
    });
  };

  const addPedidoItem = () => {
    if (!editingPedido) return;
    const novoItem = { qty: 1, name: '', price: 0 };
    const novosItems = [...editingPedido.items, novoItem];
    const novoTotal = novosItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    
    setEditingPedido({ 
      ...editingPedido, 
      items: novosItems,
      total: novoTotal
    });
  };

  const removePedidoItem = (index: number) => {
    if (!editingPedido) return;
    const novosItems = editingPedido.items.filter((_, i) => i !== index);
    const novoTotal = novosItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    
    setEditingPedido({ 
      ...editingPedido, 
      items: novosItems,
      total: novoTotal
    });
  };

  const sendToFornecedor = async (id: number) => {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;

    let listaCompras = '🛒 LISTA DE COMPRAS - SF IMPORTS\n\n';
    listaCompras += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    listaCompras += `Fornecedor: [Preencher]\n`;
    listaCompras += `----------------------------------------\n`;
    
    pedido.items.forEach((item, index) => {
      listaCompras += `${index + 1}. ${item.qty}x ${item.name} - R$ ${item.price.toFixed(2)}\n`;
    });
    
    listaCompras += `----------------------------------------\n`;
    listaCompras += `Total: R$ ${pedido.total.toFixed(2)}\n`;
    listaCompras += `Observações: ${pedido.obs || 'Nenhuma'}\n`;
    listaCompras += `Contato: ${pedido.client} - ${pedido.phone}`;

    // Copiar para área de transferência
    navigator.clipboard.writeText(listaCompras);
    
    alert(' Lista de compras copiada!\n\nCole no WhatsApp/Email do fornecedor.');
  };

  const gerarListaGeral = async () => {
    if (pedidos.length === 0) {
      alert(' Nenhum pedido para gerar lista!');
      return;
    }

    // Abrir modal para selecionar fornecedor
    setShowFornecedorModal(true);
  };

  const gerarListaSecundaria = async () => {
    if (pedidos.length === 0) {
      alert(' Nenhum pedido para Gerar lista!');
      return;
    }

    let listaSecundaria = ' LISTA DE COMPRAS SECUNDÁRIA - SF IMPORTS\n\n';
    listaSecundaria += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    listaSecundaria += `========================================\n`;
    
    // Apenas pedidos não entregues para lista secundária
    const pedidosPendentes = pedidos.filter(p => !p.delivered);
    
    pedidosPendentes.forEach((pedido, pIndex) => {
      listaSecundaria += `PEDIDO ${pIndex + 1}:\n`;
      listaSecundaria += `Cliente: ${pedido.client}\n`;
      listaSecundaria += `Telefone: ${pedido.phone}\n`;
      listaSecundaria += `Data: ${pedido.date}\n`;
      listaSecundaria += `----------------------------------------\n`;
      
      pedido.items.forEach((item, iIndex) => {
        listaSecundaria += ` ${iIndex + 1}. ${item.qty}x ${item.name} - R$ ${item.price.toFixed(2)}\n`;
      });
      
      listaSecundaria += ` Total: R$ ${pedido.total.toFixed(2)}\n`;
      listaSecundaria += ` Pagamento: ${pedido.pay}\n`;
      listaSecundaria += ` Status: ${pedido.delivered ? 'Entregue' : 'Pendente'}\n`;
      listaSecundaria += ` Obs: ${pedido.obs || 'Nenhuma'}\n`;
      listaSecundaria += `----------------------------------------\n`;
    });

    // Copiar para área de transferência
    navigator.clipboard.writeText(listaSecundaria);
    
    alert(' Lista secundária copiada!\n\nApenas pedidos pendentes.');
  };

  // FUNÇÕES DE FORNECEDORES
  const addFornecedor = () => {
    if (!fornecedorInput.trim()) return;
    
    if (editingFornecedor) {
      // Editando fornecedor existente
      setFornecedores(prev => 
        prev.map(f => f === editingFornecedor ? fornecedorInput.trim() : f)
      );
      setEditingFornecedor('');
    } else {
      // Adicionando novo fornecedor
      if (!fornecedores.includes(fornecedorInput.trim())) {
        setFornecedores(prev => [...prev, fornecedorInput.trim()]);
      }
    }
    
    setFornecedorInput('');
  };

  const editFornecedor = (fornecedor: string) => {
    setEditingFornecedor(fornecedor);
    setFornecedorInput(fornecedor);
    setShowFornecedorModal(true);
  };

  const deleteFornecedor = (fornecedor: string) => {
    if (!confirm(`🗑️ Apagar fornecedor "${fornecedor}"?`)) return;
    
    setFornecedores(prev => prev.filter(f => f !== fornecedor));
  };

  const openFornecedorModal = () => {
    setEditingFornecedor('');
    setFornecedorInput('');
    setShowFornecedorModal(true);
  };

  // Estado para lista de produtos do fornecedor
  const [listaProdutos, setListaProdutos] = useState<any[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string>('');

  const gerarListaParaFornecedor = (fornecedor: string) => {
    setFornecedorSelecionado(fornecedor);
    
    // Filtrar apenas pedidos não entregues
    const pedidosPendentes = pedidos.filter(p => !p.delivered);
    
    // Agrupar produtos por nome
    const produtosAgrupados: any[] = [];
    
    pedidosPendentes.forEach(pedido => {
      pedido.items.forEach(item => {
        const produtoExistente = produtosAgrupados.find(p => p.name === item.name);
        
        if (produtoExistente) {
          // Se já existe, somar quantidade
          produtoExistente.qty += item.qty;
        } else {
          // Se não existe, adicionar novo
          produtosAgrupados.push({
            id: Date.now() + Math.random(),
            name: item.name,
            qty: item.qty,
            price: item.price,
            originalQty: item.qty,
            pedidos: [pedido.client]
          });
        }
      });
    });
    
    setListaProdutos(produtosAgrupados);
    setShowFornecedorModal(false);
  };

  const atualizarQuantidadeProduto = (id: number, novaQty: number) => {
    setListaProdutos(prev => 
      prev.map(produto => 
        produto.id === id 
          ? { ...produto, qty: Math.max(1, novaQty) }
          : produto
      )
    );
  };

  const removerProduto = (id: number) => {
    if (!confirm('🗑️ Remover este produto da lista?')) return;
    
    setListaProdutos(prev => prev.filter(produto => produto.id !== id));
  };

  const finalizarListaFornecedor = () => {
    if (listaProdutos.length === 0) {
      alert('❌ Lista vazia!');
      return;
    }

    let listaFinal = `🛒 LISTA DE COMPRAS - SF IMPORTS\n\n`;
    listaFinal += `Fornecedor: ${fornecedorSelecionado}\n`;
    listaFinal += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    listaFinal += `========================================\n`;
    
    listaProdutos.forEach((produto, index) => {
      listaFinal += `${index + 1}. ${produto.qty}x ${produto.name} - R$ ${produto.price.toFixed(2)}\n`;
    });
    
    const totalGeral = listaProdutos.reduce((sum, p) => sum + (p.qty * p.price), 0);
    listaFinal += `========================================\n`;
    listaFinal += `Total: R$ ${totalGeral.toFixed(2)}\n`;
    listaFinal += `Total Itens: ${listaProdutos.reduce((sum, p) => sum + p.qty, 0)}\n`;

    // Copiar para área de transferência
    navigator.clipboard.writeText(listaFinal);
    
    alert(`✅ Lista copiada!\n\nFornecedor: ${fornecedorSelecionado}\nTotal: R$ ${totalGeral.toFixed(2)}\nItens: ${listaProdutos.length}`);
    
    // Resetar estados
    setListaProdutos([]);
    setFornecedorSelecionado('');
  };

  const enviarListaWhatsApp = () => {
    if (listaProdutos.length === 0) {
      alert('❌ Lista vazia!');
      return;
    }

    let listaFinal = `🛒 LISTA DE COMPRAS - SF IMPORTS\n\n`;
    listaFinal += `Fornecedor: ${fornecedorSelecionado}\n`;
    listaFinal += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    listaFinal += `========================================\n`;
    
    listaProdutos.forEach((produto, index) => {
      listaFinal += `${index + 1}. ${produto.qty}x ${produto.name} - R$ ${produto.price.toFixed(2)}\n`;
    });
    
    const totalGeral = listaProdutos.reduce((sum, p) => sum + (p.qty * p.price), 0);
    listaFinal += `========================================\n`;
    listaFinal += `Total: R$ ${totalGeral.toFixed(2)}\n`;
    listaFinal += `Total Itens: ${listaProdutos.reduce((sum, p) => sum + p.qty, 0)}\n`;
    listaFinal += `\n⭐ Por favor, confirmar disponibilidade e prazo de entrega.`;

    // Abrir WhatsApp com a lista
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(listaFinal)}`;
    window.open(whatsappUrl, '_blank');
    
    // Resetar estados
    setListaProdutos([]);
    setFornecedorSelecionado('');
  };

  const visualizarImpressao = () => {
    if (listaProdutos.length === 0) {
      alert('❌ Lista vazia!');
      return;
    }

    const totalGeral = listaProdutos.reduce((sum, p) => sum + (p.qty * p.price), 0);
    
    // Criar HTML para impressão
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Compras - ${fornecedorSelecionado}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2c3e50;
            margin: 10px 0;
          }
          .info { 
            display: flex; 
            justify-content: space-between; 
            margin: 15px 0;
            font-size: 16px;
          }
          .products { 
            margin: 30px 0;
          }
          .product-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }
          .product-row:last-child {
            border-bottom: none;
          }
          .product-name { 
            flex: 1; 
            font-weight: 500;
          }
          .product-qty { 
            width: 80px; 
            text-align: center;
            font-weight: bold;
          }
          .product-price { 
            width: 100px; 
            text-align: right;
          }
          .product-total { 
            width: 120px; 
            text-align: right;
            font-weight: bold;
          }
          .summary { 
            border-top: 2px solid #333; 
            padding-top: 20px; 
            margin-top: 30px;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 10px 0;
            font-size: 16px;
          }
          .total { 
            font-size: 20px; 
            font-weight: bold; 
            color: #27ae60;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-style: italic; 
            color: #666;
          }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
            .footer button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">🛒 LISTA DE COMPRAS</div>
          <div style="font-size: 18px; color: #666;">SF IMPORTS</div>
        </div>
        
        <div class="info">
          <div><strong>Fornecedor:</strong> ${fornecedorSelecionado}</div>
          <div><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
        
        <div class="products">
          <div style="font-weight: bold; margin-bottom: 15px; font-size: 18px;">📦 Produtos</div>
          <div class="product-row" style="border-bottom: 2px solid #333; font-weight: bold;">
            <div class="product-name">PRODUTO</div>
            <div class="product-qty">QTD</div>
            <div class="product-price">UNITÁRIO</div>
            <div class="product-total">TOTAL</div>
          </div>
          ${listaProdutos.map((produto, index) => `
            <div class="product-row">
              <div class="product-name">${index + 1}. ${produto.name}</div>
              <div class="product-qty">${produto.qty}</div>
              <div class="product-price">R$ ${produto.price.toFixed(2)}</div>
              <div class="product-total">R$ ${(produto.qty * produto.price).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="summary">
          <div class="summary-row">
            <div><strong>Total de Produtos:</strong></div>
            <div>${listaProdutos.length}</div>
          </div>
          <div class="summary-row">
            <div><strong>Total de Itens:</strong></div>
            <div>${listaProdutos.reduce((sum, p) => sum + p.qty, 0)}</div>
          </div>
          <div class="summary-row total">
            <div><strong>VALOR TOTAL:</strong></div>
            <div>R$ ${totalGeral.toFixed(2)}</div>
          </div>
        </div>
        
        <div class="footer">
          <div>⭐ Por favor, confirmar disponibilidade e prazo de entrega.</div>
          <div style="margin-top: 10px;">Gerenciado por SF Imports System</div>
          
          <!-- Botões de ação -->
          <div style="margin-top: 30px; text-align: center; padding: 20px; border: 2px solid #ddd; background: #f9f9f9;">
            <button onclick="window.print()" style="margin: 0 10px; padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer;">
              🖨️ Imprimir Lista
            </button>
            <button onclick="window.close()" style="margin: 0 10px; padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer;">
              ❌ Fechar Janela
            </button>
          </div>
        </div>
        
        <script>
          // Mostrar página imediatamente (sem delay)
          // Usuário pode revisar antes de imprimir
        </script>
      </body>
      </html>
    `;

    // Abrir nova janela com conteúdo formatado
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
    
    // Resetar estados
    setListaProdutos([]);
    setFornecedorSelecionado('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <div className="text-2xl text-white">Carregando gestor...</div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const totalValue = pedidos.reduce((sum, p) => sum + p.total, 0);
  const totalItems = pedidos.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.qty, 0), 0);
  const totalPaid = pedidos.filter(p => p.paid).length;
  const totalDelivered = pedidos.filter(p => p.delivered).length;

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">
          📦 Gestor de Pedidos
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
            title="Atualizar"
          >
            🔄
          </button>
          <button
            onClick={gerarListaGeral}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
            title="Gerar Lista Geral"
          >
            🛒 Lista Geral
          </button>
          <button
            onClick={gerarListaSecundaria}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
            title="Gerar Lista Secundária"
          >
            📋 Lista 2
          </button>
          <button
            onClick={limparTudo}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
            title="Limpar Tudo"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <DashCard label="Pedidos" value={pedidos.length} color="purple" icon="📋" />
        <DashCard label="Faturamento" value={`R$ ${totalValue.toFixed(0)}`} color="gold" icon="💰" />
        <DashCard label="Garrafas" value={totalItems} color="blue" icon="🍾" />
        <DashCard label="Pagos" value={totalPaid} color="green" icon="✅" />
        <DashCard label="Entregues" value={totalDelivered} color="cyan" icon="🚚" />
      </div>

      {/* LISTA DE PEDIDOS */}
      <div className="space-y-4">
        {pedidos.map(pedido => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            onTogglePaid={() => togglePaid(pedido.id)}
            onToggleDelivered={() => toggleDelivered(pedido.id)}
            onDelete={() => deletePedido(pedido.id)}
            onSendZap={() => sendZap(pedido)}
            onEditPedido={() => editPedido(pedido.id)}
            onSendToFornecedor={() => sendToFornecedor(pedido.id)}
          />
        ))}
      </div>

      {pedidos.length === 0 && (
        <div className="text-center text-gray-500 py-20 bg-gray-800/30 rounded-2xl">
          <div className="text-8xl mb-6">📭</div>
          <p className="text-2xl font-bold mb-2">Nenhum pedido cadastrado</p>
          <p className="text-sm">Use o gestor.php para adicionar pedidos</p>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE FORNECEDOR */}
      {showFornecedorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">🏭 Selecionar Fornecedor</h2>
              <button onClick={() => setShowFornecedorModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {/* ADICIONAR/EDITAR FORNECEDOR */}
            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={fornecedorInput}
                  onChange={(e) => setFornecedorInput(e.target.value)}
                  placeholder="Nome do fornecedor..."
                  className="flex-1 bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
                <button
                  onClick={addFornecedor}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  {editingFornecedor ? '✏️ Salvar' : '➕ Adicionar'}
                </button>
                {editingFornecedor && (
                  <button
                    onClick={() => { setEditingFornecedor(''); setFornecedorInput(''); }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg"
                  >
                    ❌ Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* LISTA DE FORNECEDORES */}
            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-bold text-white mb-3">Fornecedores Cadastrados:</h3>
              {fornecedores.map((fornecedor, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                  <span className="text-white font-medium">{fornecedor}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editFornecedor(fornecedor)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteFornecedor(fornecedor)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️
                    </button>
                    <button
                      onClick={() => gerarListaParaFornecedor(fornecedor)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      📦 Gerar Lista
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {fornecedores.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🏭</div>
                <p>Nenhum fornecedor cadastrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE LISTA DE PRODUTOS DO FORNECEDOR */}
      {listaProdutos.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">📦 Lista de Compras - {fornecedorSelecionado}</h2>
              <button onClick={() => { setListaProdutos([]); setFornecedorSelecionado(''); }} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {/* RESUMO */}
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-3 gap-4 text-white">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{listaProdutos.length}</div>
                  <div className="text-sm text-gray-400">Produtos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{listaProdutos.reduce((sum, p) => sum + p.qty, 0)}</div>
                  <div className="text-sm text-gray-400">Itens</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">R$ {listaProdutos.reduce((sum, p) => sum + (p.qty * p.price), 0).toFixed(2)}</div>
                  <div className="text-sm text-gray-400">Total</div>
                </div>
              </div>
            </div>

            {/* LISTA DE PRODUTOS */}
            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-bold text-white mb-3">Produtos Pendentes:</h3>
              {listaProdutos.map((produto, index) => (
                <div key={produto.id} className="flex items-center gap-3 bg-gray-700 p-3 rounded-lg">
                  <div className="text-white font-medium w-8">{index + 1}</div>
                  <div className="flex-1 text-white">{produto.name}</div>
                  <div className="text-white text-sm w-24 text-right">R$ {produto.price.toFixed(2)}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => atualizarQuantidadeProduto(produto.id, produto.qty - 1)}
                      className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-lg"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={produto.qty}
                      onChange={(e) => atualizarQuantidadeProduto(produto.id, parseInt(e.target.value) || 1)}
                      className="w-16 bg-gray-600 text-white text-center rounded border border-gray-500"
                      min="1"
                    />
                    <button
                      onClick={() => atualizarQuantidadeProduto(produto.id, produto.qty + 1)}
                      className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-lg"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-white font-bold w-20 text-right">
                    R$ {(produto.qty * produto.price).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removerProduto(produto.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* BOTÕES */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setListaProdutos([]); setFornecedorSelecionado(''); }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={finalizarListaFornecedor}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                📋 Copiar Lista
              </button>
              <button
                onClick={enviarListaWhatsApp}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
              >
                💬 Enviar WhatsApp
              </button>
              <button
                onClick={visualizarImpressao}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PEDIDO */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">✏️ Editar Pedido #{editingPedido.id}</h2>
              <button onClick={cancelEditPedido} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {/* DADOS DO CLIENTE */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Nome do Cliente</label>
                <input
                  type="text"
                  value={editingPedido.client}
                  onChange={(e) => updatePedidoField('client', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Telefone</label>
                <input
                  type="text"
                  value={editingPedido.phone}
                  onChange={(e) => updatePedidoField('phone', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
            </div>

            {/* DADOS DO PEDIDO */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Data</label>
                <input
                  type="text"
                  value={editingPedido.date}
                  onChange={(e) => updatePedidoField('date', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Pagamento</label>
                <select
                  value={editingPedido.pay}
                  onChange={(e) => updatePedidoField('pay', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Desconto</label>
                <input
                  type="number"
                  value={editingPedido.discount}
                  onChange={(e) => updatePedidoField('discount', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
            </div>

            {/* ITENS DO PEDIDO */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">📦 Itens do Pedido</h3>
                <button onClick={addPedidoItem} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">
                  ➕ Adicionar Item
                </button>
              </div>
              
              <div className="space-y-2">
                {editingPedido.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center bg-gray-700 p-3 rounded-lg">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updatePedidoItem(index, 'qty', parseInt(e.target.value) || 1)}
                      className="w-20 bg-gray-600 text-white p-2 rounded border border-gray-500 text-center"
                      min="1"
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updatePedidoItem(index, 'name', e.target.value)}
                      className="flex-1 bg-gray-600 text-white p-2 rounded border border-gray-500"
                      placeholder="Nome do produto"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updatePedidoItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-32 bg-gray-600 text-white p-2 rounded border border-gray-500 text-right"
                      step="0.01"
                      min="0"
                    />
                    <button
                      onClick={() => removePedidoItem(index)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* OBSERVAÇÕES */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Observações</label>
              <textarea
                value={editingPedido.obs}
                onChange={(e) => updatePedidoField('obs', e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                rows={3}
                placeholder="Observações do pedido..."
              />
            </div>

            {/* RESUMO */}
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center text-white">
                <span className="text-lg font-bold">💰 Total:</span>
                <span className="text-2xl font-bold text-green-400">R$ {editingPedido.total.toFixed(2)}</span>
              </div>
            </div>

            {/* BOTÕES */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelEditPedido}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={savePedidoEditado}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
              >
                ✅ Salvar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// COMPONENTES AUXILIARES
// ========================================

function LoginForm({ onLogin }: { onLogin: (u: string, p: string) => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(user, pass);
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="bg-gray-800 p-8 rounded-2xl w-96 border-2 border-gray-700 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍷</div>
          <h2 className="text-3xl font-bold text-yellow-500 mb-2">
            SF IMPORTS
          </h2>
          <p className="text-gray-400 text-sm">Gestor de Pedidos V10</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">
              Usuário
            </label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              className="w-full bg-gray-900 text-white p-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none transition-all"
              placeholder="admin"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">
              Senha
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full bg-gray-900 text-white p-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none transition-all"
              placeholder="•••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>⏳ ENTRANDO...</span>
            ) : (
              <span>🔑 ENTRAR</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  const colors: Record<string, string> = {
    purple: 'from-purple-600 to-purple-800',
    gold: 'from-yellow-500 to-orange-600',
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    cyan: 'from-cyan-600 to-cyan-800'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-5 rounded-xl shadow-lg border border-white/10`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-3xl">{icon}</div>
        <div className="text-3xl font-black text-white">{value}</div>
      </div>
      <div className="text-xs text-white/70 uppercase font-semibold">{label}</div>
    </div>
  );
}

function PedidoCard({ pedido, onTogglePaid, onToggleDelivered, onDelete, onSendZap, onEditPedido, onSendToFornecedor }: any) {
  return (
    <div className="bg-gray-800 border-l-4 border-yellow-500 p-5 rounded-xl shadow-lg hover:shadow-2xl transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-bold text-xl text-white mb-1">{pedido.client}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            📅 {pedido.date}
          </div>
        </div>
        <div className="flex gap-2">
          {pedido.phone && (
            <button
              onClick={onSendZap}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-bold transition-all"
              title="Enviar WhatsApp"
            >
              💬
            </button>
          )}
          <button
            onClick={onEditPedido}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-bold transition-all"
            title="Editar Pedido"
          >
            ✏️
          </button>
          <button
            onClick={onSendToFornecedor}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm font-bold transition-all"
            title="Enviar para Fornecedor"
          >
            🛒
          </button>
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-all"
            title="Apagar Pedido"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-300 mb-4 border-l-2 border-gray-700 pl-4 space-y-1">
        {pedido.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between">
            <span>{item.qty}x {item.name}</span>
            <span className="text-gray-500">R$ {(item.qty * item.price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {pedido.obs && (
        <div className="text-xs text-gray-500 mb-3 italic">
          📝 {pedido.obs}
        </div>
      )}

      <div className="flex justify-between items-center border-t border-gray-700 pt-4">
        <div>
          <div className="text-yellow-500 font-bold text-2xl">
            R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">
            {pedido.pay} {pedido.payLink && '• ' + pedido.payLink.substring(0, 20) + '...'}
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onTogglePaid}
            className={`text-2xl transition-all ${pedido.paid ? 'text-green-500' : 'text-gray-600 hover:text-green-500'}`}
            title={pedido.paid ? 'Pago ✅' : 'Marcar como pago'}
          >
            💵
          </button>
          <button
            onClick={onToggleDelivered}
            className={`text-2xl transition-all ${pedido.delivered ? 'text-blue-500' : 'text-gray-600 hover:text-blue-500'}`}
            title={pedido.delivered ? 'Entregue 🚚' : 'Marcar como entregue'}
          >
            🚚
          </button>
        </div>
      </div>
    </div>
  );
}
