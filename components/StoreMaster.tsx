import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Plus, X, Save, Eye, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';
import { getImagemLocalPrecificador } from '../utils/imageUtils';

interface ProdutoStore {
  nome: string;
  idWooCommerce: string;
  precoDe: string;
  precoPor: string;
  tipoUva: string;
  safra: string;
  descricao: string;
  pais: string;
  regiao: string;
  ml: string;
  categoria: string;
  imagem: string | null;
}

export default function StoreMaster() {
  const [produto, setProduto] = useState<ProdutoStore>({
    nome: '',
    idWooCommerce: '',
    precoDe: '',
    precoPor: '',
    tipoUva: '',
    safra: '',
    descricao: '',
    pais: '',
    regiao: '',
    ml: '750ml',
    categoria: 'Vinho',
    imagem: null
  });

  const handleInputChange = (field: keyof ProdutoStore, value: string) => {
    setProduto(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProduto(prev => ({ ...prev, imagem: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrl = () => {
    const url = prompt('Digite a URL da imagem:');
    if (url) {
      // Validar se é uma URL válida
      try {
        new URL(url);
        setProduto(prev => ({ ...prev, imagem: url }));
      } catch (error) {
        alert('URL inválida! Por favor, digite uma URL válida.');
      }
    }
  };

  const handleInternetSearch = () => {
    const productName = prompt('Digite o nome do produto para buscar na internet:', produto.nome);
    if (productName) {
      // Abrir Google Images em nova aba com o nome do produto
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' vinho imagem')}&tbm=isch`;
      window.open(searchUrl, '_blank');
      
      // Mostrar instruções
      alert('Pesquisa aberta em nova aba!\n\n1. Encontre a imagem desejada\n2. Clique com o botão direito na imagem\n3. Copie o URL da imagem\n4. Volte aqui e cole no campo "Buscar imagem da internet"');
    }
  };

  const adicionarATabela = () => {
    // Validação básica
    if (!produto.nome || !produto.precoDe || !produto.precoPor) {
      alert('❌ Preencha nome, preço DE e preço POR!');
      return;
    }

    // Criar objeto no formato da tabela principal
    const novoProduto = {
      id: produto.idWooCommerce || Math.random().toString(36).substr(2, 9),
      supplierName: produto.nome,
      sfDe: parseFloat(produto.precoDe.replace('R$', '').replace(',', '.')) || 0,
      sfPor: parseFloat(produto.precoPor.replace('R$', '').replace(',', '.')) || 0,
      tipoUva: produto.tipoUva,
      safra: produto.safra,
      descricao: produto.descricao,
      pais: produto.pais,
      regiao: produto.regiao,
      volume: produto.ml,
      categoria: produto.categoria,
      imagem: produto.imagem
    };

    // Salvar no localStorage para ser capturado pelo precificador
    const produtosExistentes = JSON.parse(localStorage.getItem('novosProdutos') || '[]');
    produtosExistentes.push(novoProduto);
    localStorage.setItem('novosProdutos', JSON.stringify(produtosExistentes));

    alert('✅ Produto adicionado à tabela de preços!\n\n' +
          '📦 Produto: ' + produto.nome + '\n' +
          '💰 Preço DE: ' + produto.precoDe + '\n' +
          '💰 Preço POR: ' + produto.precoPor + '\n\n' +
          '🔄 Volte ao precificador para ver o produto na tabela!');

    // Limpar formulário
    setProduto({
      nome: '',
      idWooCommerce: '',
      precoDe: '',
      precoPor: '',
      tipoUva: '',
      safra: '',
      descricao: '',
      pais: '',
      regiao: '',
      ml: '750ml',
      categoria: 'Vinho',
      imagem: null
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🏪 STORE MASTER</h1>
          <p className="text-gray-400">Adicionar novo produto ao sistema SF Imports</p>
        </div>

        {/* Formulário */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">🏷️ NOME DO PRODUTO *</label>
                <input
                  type="text"
                  value={produto.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: VINHO TINTO CABERNET SAUVIGNON"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🛒 ID WOOCOMMERCE</label>
                <input
                  type="text"
                  value={produto.idWooCommerce}
                  onChange={(e) => handleInputChange('idWooCommerce', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="ID do produto no WooCommerce"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">💰 PREÇO DE *</label>
                  <input
                    type="text"
                    value={produto.precoDe}
                    onChange={(e) => handleInputChange('precoDe', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="R$ 189,90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">💰 PREÇO POR *</label>
                  <input
                    type="text"
                    value={produto.precoPor}
                    onChange={(e) => handleInputChange('precoPor', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none bg-yellow-50 text-black font-bold"
                    placeholder="R$ 149,90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🍇 TIPO DE UVA</label>
                <input
                  type="text"
                  value={produto.tipoUva}
                  onChange={(e) => handleInputChange('tipoUva', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Cabernet Sauvignon, Malbec, Merlot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">📅 SAFRA</label>
                <input
                  type="text"
                  value={produto.safra}
                  onChange={(e) => handleInputChange('safra', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: 2022, 2023"
                />
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">🌍 PAÍS</label>
                <input
                  type="text"
                  value={produto.pais}
                  onChange={(e) => handleInputChange('pais', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Brasil, Argentina, Chile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">📍 REGIÃO</label>
                <input
                  type="text"
                  value={produto.regiao}
                  onChange={(e) => handleInputChange('regiao', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Vale dos Vinhedos, Mendoza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🍶 VOLUME (ML)</label>
                <select
                  value={produto.ml}
                  onChange={(e) => handleInputChange('ml', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="750ml">750ml</option>
                  <option value="1000ml">1000ml</option>
                  <option value="1500ml">1500ml</option>
                  <option value="200ml">200ml</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">📂 CATEGORIA</label>
                <select
                  value={produto.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="Vinho">Vinho</option>
                  <option value="Espumante">Espumante</option>
                  <option value="Whisky">Whisky</option>
                  <option value="Vodka">Vodka</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🖼️ IMAGEM DO PRODUTO</label>
                
                {/* Botões de opções de imagem */}
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <button
                    onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    📁 Buscar imagem do Desktop
                  </button>
                  
                  <button
                    onClick={handleImageUrl}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🌐 Buscar imagem da Internet (URL)
                  </button>
                  
                  <button
                    onClick={handleInternetSearch}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🔍 Pesquisar imagem no Google
                  </button>
                </div>
                
                {/* Input file escondido */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                {/* Preview da imagem */}
                {produto.imagem && (
                  <div className="mt-4">
                    <img 
                      src={getImagemLocalPrecificador(produto.imagem)} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbmFvIGNhcnJlZ2FkYTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                    <button
                      onClick={() => setProduto(prev => ({ ...prev, imagem: null }))}
                      className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                      🗑️ Remover imagem
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">📝 DESCRIÇÃO</label>
                <textarea
                  value={produto.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Descrição detalhada do produto..."
                />
              </div>
            </div>
          </div>

          {/* Botão de Ação */}
          <div className="mt-8 text-center">
            <button
              onClick={adicionarATabela}
              className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-xl shadow-lg hover:shadow-green-500/50 transform hover:scale-105 transition-all"
            >
              📦 ADICIONAR À TABELA DE PREÇOS
            </button>
          </div>

          <div className="mt-4 text-center text-gray-400 text-sm">
            <p>Os campos com * são obrigatórios</p>
            <p className="mt-2">Após adicionar, volte ao precificador para ver o produto na tabela!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
