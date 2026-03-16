import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Edit, Trash2, Eye, EyeOff, Plus, X, Save, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { getImagemLocalPrecificador } from '../utils/imageUtils';

interface Produto {
  id: string;
  nome: string;
  nomePopular: string[];
  imagem: string;
  precoOriginal: number;
  precoVenda: number;
  categoria: string;
  volume?: string;
  pais?: string;
  tipo?: string;
}

interface Template {
  id: string;
  nome: string;
  arquivo: string;
  corPrimaria: string;
  whatsapp: string;
}

interface StoryConfig {
  template: 'sf' | 'parceiro';
  precoDe: string;
  precoPor: string;
  imagemX: number;
  imagemY: number;
  imagemWidth: number;
  imagemHeight: number;
  nomeX: number;
  nomeY: number;
  nomeTamanho: number;
  precoDeX: number;
  precoDeY: number;
  precoDeTamanho: number;
  precoPorX: number;
  precoPorY: number;
  precoPorTamanho: number;
}

export default function CatalogoMaster() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [storyConfig, setStoryConfig] = useState<StoryConfig>({
    template: 'sf',
    precoDe: '',
    precoPor: '',
    imagemX: 540,
    imagemY: 400,
    imagemWidth: 600,
    imagemHeight: 600,
    nomeX: 540,
    nomeY: 1200,
    nomeTamanho: 48,
    precoDeX: 540,
    precoDeY: 1300,
    precoDeTamanho: 36,
    precoPorX: 540,
    precoPorY: 1450,
    precoPorTamanho: 72
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ======================================================================
  // 🏪 ESTADOS DO NOVO STORE MASTER INTEGRADO NO CATÁLOGO MASTER
  // ======================================================================
  const [modalStoreMaster, setModalStoreMaster] = useState(false);
  const [isAnalyzingSM, setIsAnalyzingSM] = useState(false);
  const [storeMasterProd, setStoreMasterProd] = useState({
    nome: '', idWooCommerce: '', precoDe: '', precoPor: '',
    tipoUva: '', safra: '', descricao: '', pais: '', regiao: '',
    ml: '750ml', categoria: 'Vinho', teorAlcoolico: '', tipoVinho: 'Tinto', imagem: null as string | null
  });

  const handleSMInputChange = (field: string, value: string) => {
    setStoreMasterProd(prev => ({ ...prev, [field]: value }));
  };

  const handleSMInternetSearch = () => {
    const productName = prompt('Digite o nome do produto para buscar na internet:', storeMasterProd.nome);
    if (productName) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' vinho garrafa fundo branco')}&tbm=isch`;
      window.open(searchUrl, '_blank');
      alert('Pesquisa aberta em nova aba!\n\n1. Encontre a imagem desejada\n2. Clique com o botão direito na imagem\n3. Escolha "Copiar endereço da imagem" (ou Copy Image Link)\n4. Volte aqui e clique no botão verde "🌐 Colar URL da Imagem"');
    }
  };

  const handleSMImageUrl = () => {
    const url = prompt('Cole aqui a URL (endereço) da imagem:');
    if (url) {
      try {
        new URL(url);
        setStoreMasterProd(prev => ({ ...prev, imagem: url }));
      } catch (error) {
        alert('URL inválida! Por favor, cole um link válido (começando com http).');
      }
    }
  };

  const handleSMImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const res = await fetch('/api/upload-image-base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: storeMasterProd.nome.replace(/\s+/g, '-') || 'novo-produto', imageBase64: base64 })
          });
          const data = await res.json();
          if (data.success) {
            setStoreMasterProd(prev => ({ ...prev, imagem: data.path }));
          } else {
            setStoreMasterProd(prev => ({ ...prev, imagem: base64 }));
          }
        } catch (err) {
          setStoreMasterProd(prev => ({ ...prev, imagem: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSMAIAssistant = async () => {
    if (!storeMasterProd.nome) {
      alert('Por favor, digite o nome do produto primeiro!');
      return;
    }
    setIsAnalyzingSM(true);
    try {
      const res = await fetch(`/api/identify-product?q=${encodeURIComponent(storeMasterProd.nome)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setStoreMasterProd(prev => ({
          ...prev,
          nome: p.nome || prev.nome,
          precoDe: p.preco_de ? p.preco_de.toString() : prev.precoDe,
          precoPor: p.preco_por ? p.preco_por.toString() : prev.precoPor,
          imagem: p.imagem || prev.imagem,
          pais: p.pais || prev.pais,
          safra: p.safra || prev.safra,
          tipoUva: p.uva || prev.tipoUva,
          regiao: p.regiao || prev.regiao,
          tipoVinho: p.tipo || prev.tipoVinho,
          descricao: p.descricao || prev.descricao
        }));
      } else {
        alert(data.message || 'Não foi possível identificar.');
      }
    } catch (err) {
      alert('Erro na comunicação com a Inteligência Tripla.');
    } finally {
      setIsAnalyzingSM(false);
    }
  };

  const adicionarATabelaStoreMaster = async () => {
    if (!storeMasterProd.nome || (!storeMasterProd.precoDe && !storeMasterProd.precoPor)) {
      alert('❌ Preencha nome e pelo menos um preço!');
      return;
    }

    const pDe = parseFloat(storeMasterProd.precoDe.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    const pPor = parseFloat(storeMasterProd.precoPor.replace('R$', '').replace(/\./g, '').replace(',', '.')) || pDe;
    const pDeFinal = pDe || pPor;

    // 1. Adiciona na visualização do Story Editor instantaneamente
    const novoParaStory: Produto = {
      id: `story-novo-${Date.now()}`,
      nome: storeMasterProd.nome,
      nomePopular: [storeMasterProd.nome],
      imagem: storeMasterProd.imagem || '',
      precoOriginal: pDeFinal,
      precoVenda: pPor,
      categoria: storeMasterProd.categoria,
      volume: '750ml',
      pais: storeMasterProd.pais,
      tipo: storeMasterProd.tipoVinho
    };

    setProdutos(prev => [novoParaStory, ...prev]);

    // 2. Manda pro servidor geral
    try {
      await fetch('/api/persist-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: storeMasterProd.nome,
          preco_de: pDeFinal,
          preco_por: pPor,
          imagem: storeMasterProd.imagem,
          descricao: storeMasterProd.descricao,
          tipo: storeMasterProd.categoria
        })
      });
      alert('✅ Produto salvo no banco de dados com sucesso!');
    } catch (e) {
      console.error(e);
    }

    // 3. Se o usuário estava com a janela de editar story aberta, já joga o produto lá!
    if (modalAberto) {
      setProdutoSelecionado(novoParaStory);
      setStoryConfig(prev => ({
        ...prev,
        precoDe: `R$ ${pDeFinal.toFixed(2).replace('.', ',')}`,
        precoPor: `R$ ${pPor.toFixed(2).replace('.', ',')}`
      }));
      setTimeout(() => desenharPreview(), 200);
    }

    setModalStoreMaster(false);
    setStoreMasterProd({
      nome: '', idWooCommerce: '', precoDe: '', precoPor: '',
      tipoUva: '', safra: '', descricao: '', pais: '', regiao: '',
      ml: '750ml', categoria: 'Vinho', teorAlcoolico: '', tipoVinho: 'Tinto', imagem: null
    });
  };
  // ======================================================================

  useEffect(() => {
    fetch('/api/catalogo-data')
      .then(response => response.json())
      .then(data => {
        const produtosConvertidos = data.map((produto: any) => ({
          id: produto.id.toString(),
          nome: produto.nome || produto.name,
          nomePopular: [(produto.nome || produto.name).split(' ')[0]],
          imagem: produto.imagem || produto.image,
          precoOriginal: parseFloat((produto.preco_de || produto.old_price || produto.preco || produto.price || '0').toString().replace('.', '').replace(',', '.')),
          precoVenda: parseFloat((produto.preco_por || produto.preco || produto.price || '0').toString().replace('.', '').replace(',', '.')),
          categoria: produto.categoria || produto.category || 'geral',
          volume: '750ml',
          pais: 'Brasil',
          tipo: 'Vinho'
        }));
        setProdutos(produtosConvertidos);
      })
      .catch(error => {
        console.error("Erro ao carregar catálogo:", error);
      });
  }, []);

  const filtrarProdutos = () => {
    if (!busca) return produtos;
    const buscaLower = busca.toLowerCase();
    return produtos.filter(produto =>
      produto.nome.toLowerCase().includes(buscaLower) ||
      produto.nomePopular.some(nome => nome.toLowerCase().includes(buscaLower)) ||
      produto.categoria.toLowerCase().includes(buscaLower) ||
      produto.tipo?.toLowerCase().includes(buscaLower) ||
      produto.pais?.toLowerCase().includes(buscaLower) ||
      produto.volume?.toLowerCase().includes(buscaLower)
    );
  };

  const abrirModalStory = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setStoryConfig(prev => ({
      ...prev,
      precoDe: `R$ ${produto.precoOriginal.toFixed(2).replace('.', ',')}`,
      precoPor: `R$ ${produto.precoVenda.toFixed(2).replace('.', ',')}`
    }));
    setModalAberto(true);
    setTimeout(() => desenharPreview(), 100);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setProdutoSelecionado(null);
  };

  const templates: Template[] = [
    {
      id: 'sf',
      nome: 'SF IMPORTS',
      arquivo: '/templates/sf-imports.png',
      corPrimaria: '#8B5A3C',
      whatsapp: '61 99868-4666'
    },
    {
      id: 'parceiro',
      nome: 'OTOVAL',
      arquivo: '/templates/parceiro.png',
      corPrimaria: '#2E7D32',
      whatsapp: 'WhatsApp do Parceiro'
    }
  ];

  const selecionarTemplate = (templateId: 'sf' | 'parceiro') => {
    setStoryConfig(prev => ({ ...prev, template: templateId }));
    setTimeout(() => desenharPreview(), 100);
  };

  const desenharPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !produtoSelecionado) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const template = templates.find(t => t.id === storyConfig.template);
    ctx.fillStyle = template?.corPrimaria || '#8B5A2B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('IMAGEM DO PRODUTO', canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(storyConfig.nomeTamanho * 0.3)}px Arial`;
    ctx.fillText(produtoSelecionado.nome, canvas.width / 2, canvas.height * 0.7);

    if (storyConfig.precoDe) {
      ctx.fillStyle = '#888888';
      ctx.font = `${Math.round(storyConfig.precoDeTamanho * 0.3)}px Arial`;
      ctx.fillText(storyConfig.precoDe, canvas.width / 2, canvas.height * 0.75);
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.round(storyConfig.precoPorTamanho * 0.3)}px Arial`;
    ctx.fillText(storyConfig.precoPor, canvas.width / 2, canvas.height * 0.85);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText(template?.whatsapp || '', canvas.width / 2, canvas.height * 0.95);
  };

  const gerarDownload = () => {
    if (!produtoSelecionado) return;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 1080;
    finalCanvas.height = 1920;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    const template = templates.find(t => t.id === storyConfig.template);
    finalCtx.fillStyle = template?.corPrimaria || '#8B5A2B';
    finalCtx.fillRect(0, 0, 1080, 1920);

    finalCtx.fillStyle = '#FFD700';
    finalCtx.font = 'bold 48px Arial';
    finalCtx.textAlign = 'center';
    finalCtx.fillText('IMAGEM DO PRODUTO', 540, 400);

    finalCtx.fillStyle = '#FFFFFF';
    finalCtx.font = `bold ${storyConfig.nomeTamanho}px Arial`;
    finalCtx.fillText(produtoSelecionado.nome, storyConfig.nomeX, storyConfig.nomeY);

    if (storyConfig.precoDe) {
      finalCtx.strokeStyle = '#888888';
      finalCtx.lineWidth = 3;
      finalCtx.font = `${storyConfig.precoDeTamanho}px Arial`;
      finalCtx.strokeText(storyConfig.precoDe, storyConfig.precoDeX, storyConfig.precoDeY);
      finalCtx.fillStyle = '#888888';
      finalCtx.fillText(storyConfig.precoDe, storyConfig.precoDeX, storyConfig.precoDeY);
    }

    finalCtx.fillStyle = '#FFD700';
    finalCtx.font = `bold ${storyConfig.precoPorTamanho}px Arial`;
    finalCtx.fillText(storyConfig.precoPor, storyConfig.precoPorX, storyConfig.precoPorY);

    finalCtx.fillStyle = '#FFFFFF';
    finalCtx.font = '24px Arial';
    finalCtx.fillText(template?.whatsapp || '', 540, 1800);

    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `story-${produtoSelecionado.nome.replace(/[^a-z0-9]/gi, '_')}.jpg`;
    a.click();
  };

  const importarProdutos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setProdutos(json);
        alert(`${json.length} produtos importados com sucesso!`);
      } catch (error) {
        alert('Erro ao importar arquivo JSON');
      }
    };
    reader.readAsText(file);
  };

  const produtosFiltrados = filtrarProdutos();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 relative">
      <div className="max-w-7xl mx-auto">
        {/* CABEÇALHO */}
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">🍷 CATÁLOGO MASTER</h1>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importarProdutos}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
              >
                📁 Importar
              </button>
              {/* O BOTÃO NOVO AQUI NO TOPO */}
              <button
                onClick={() => setModalStoreMaster(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-lg transition-all"
              >
                ➕ NOVO PRODUTO
              </button>
            </div>
          </div>

          {/* BUSCA */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
            />
            <span className="absolute left-4 top-3.5 text-gray-400 text-xl">🔍</span>
          </div>
        </div>

        {/* GRID DE PRODUTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {produtosFiltrados.map(produto => (
            <div key={produto.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
              {/* IMAGEM */}
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <img
                  src={
                    produto.imagem.startsWith('http') || produto.imagem.startsWith('data:')
                      ? produto.imagem
                      : getImagemLocalPrecificador(produto.imagem)
                  }
                  alt={produto.nome}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="%23374151"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">Sem imagem</text></svg>';
                  }}
                />
              </div>

              {/* INFORMAÇÕES */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 text-gray-800">{produto.nome}</h3>
                <div className="text-sm text-gray-600 mb-3">
                  <p>📦 {produto.volume} | 🌍 {produto.pais}</p>
                  <p>🏷️ {produto.categoria}</p>
                </div>

                {/* PREÇOS */}
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm text-gray-500 line-through">
                      DE: R$ {produto.precoOriginal.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      POR: R$ {produto.precoVenda.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => abrirModalStory(produto)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition-all transform hover:scale-105"
                >
                  📸 GERAR STORY
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL STORY EDITOR */}
        {modalAberto && produtoSelecionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">📸 GERAR STORY</h2>
                  <button onClick={fecharModal} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">×</button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-xl font-bold mb-2">{produtoSelecionado.nome}</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>📦 {produtoSelecionado.volume}</div>
                    <div>🌍 {produtoSelecionado.pais}</div>
                    <div>🏷️ {produtoSelecionado.categoria}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">🎨 TEMPLATE</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => selecionarTemplate(template.id as 'sf' | 'parceiro')}
                        className={`p-4 rounded-lg border-2 transition-all ${storyConfig.template === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                      >
                        <div className="w-full h-16 rounded mb-2" style={{ backgroundColor: template.corPrimaria }} />
                        <p className="font-semibold">{template.nome}</p>
                        <p className="text-sm text-gray-600">{template.whatsapp}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">💰 PREÇOS</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">PREÇO DE</label>
                      <input type="text" value={storyConfig.precoDe} onChange={(e) => setStoryConfig(prev => ({ ...prev, precoDe: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">PREÇO POR ⭐</label>
                      <input type="text" value={storyConfig.precoPor} onChange={(e) => setStoryConfig(prev => ({ ...prev, precoPor: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none bg-yellow-50 font-bold" required />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">👁️ PREVIEW (1080x1920)</h3>
                  <div className="border-4 border-gray-300 rounded-xl overflow-hidden max-w-sm mx-auto">
                    <canvas ref={canvasRef} width={360} height={640} className="w-full h-auto bg-black" />
                  </div>
                </div>

                <div className="text-center mb-4">
                  <button onClick={gerarDownload} className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-xl shadow-lg hover:shadow-green-500/50 transform hover:scale-105 transition-all">📸 GERAR & DOWNLOAD STORY</button>
                </div>

                {/* AQUI ESTAVA O SEU ERRO, SÉRGIO! AGORA ESTÁ 100% UNIFICADO */}
                <div className="text-center mt-6 border-t pt-6">
                  <button
                    onClick={() => setModalStoreMaster(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 transition-all"
                  >
                    ➕ ADICIONAR NOVO PRODUTO
                  </button>
                  <p className="text-gray-500 text-sm mt-2">Esqueceu de algum produto? Adicione agora sem sair da tela.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL STORE MASTER UNIFICADO (FLUTUANTE NO STORIES) ── */}
      {modalStoreMaster && (
        <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm" style={{ position: 'fixed', zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}>
          <div style={{ background: '#111827', color: '#fff', padding: '32px', width: '100%', maxWidth: '896px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', border: '1px solid #374151' }}>
            <button onClick={() => setModalStoreMaster(false)} style={{ position: 'absolute', top: '16px', right: '16px', color: '#9ca3af', background: '#1f2937', padding: '8px', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            <div style={{ marginBottom: '32px', textAlign: 'center', marginTop: '8px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>🏪 STORE MASTER</h1>
              <p style={{ color: '#9ca3af', margin: 0 }}>Adicionar novo produto direto ao sistema SF Imports</p>
            </div>

            <div style={{ background: '#1f2937', borderRadius: '12px', padding: '32px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', border: '1px solid #374151' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                {/* Coluna Esquerda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>🏷️ NOME DO PRODUTO *</label>
                      <button
                        onClick={handleSMAIAssistant}
                        disabled={isAnalyzingSM}
                        style={{ padding: '4px 12px', background: '#eab308', color: '#111827', fontSize: '12px', fontWeight: 'bold', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                      >
                        {isAnalyzingSM ? '⏳ Analisando...' : '✨ Identificar Produto (IA)'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={storeMasterProd.nome}
                      onChange={(e) => handleSMInputChange('nome', e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                      placeholder="Ex: VINHO TINTO CABERNET SAUVIGNON"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>🛒 ID WOOCOMMERCE</label>
                    <input
                      type="text"
                      value={storeMasterProd.idWooCommerce}
                      onChange={(e) => handleSMInputChange('idWooCommerce', e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                      placeholder="ID do produto no WooCommerce (Opcional)"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>💰 PREÇO DE *</label>
                      <input
                        type="text"
                        value={storeMasterProd.precoDe}
                        onChange={(e) => handleSMInputChange('precoDe', e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                        placeholder="R$ 189,90"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>💰 PREÇO POR *</label>
                      <input
                        type="text"
                        value={storeMasterProd.precoPor}
                        onChange={(e) => handleSMInputChange('precoPor', e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: '#fefce8', border: '1px solid #4b5563', borderRadius: '8px', color: '#000', fontWeight: 'bold', boxSizing: 'border-box' }}
                        placeholder="R$ 149,90"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>🍇 TIPO DE UVA / 📅 SAFRA</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        value={storeMasterProd.tipoUva}
                        onChange={(e) => handleSMInputChange('tipoUva', e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                        placeholder="Ex: Malbec"
                      />
                      <input
                        type="text"
                        value={storeMasterProd.safra}
                        onChange={(e) => handleSMInputChange('safra', e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                        placeholder="Ex: 2022"
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna Direita */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>🌍 PAÍS</label>
                      <input
                        type="text"
                        value={storeMasterProd.pais}
                        onChange={(e) => handleSMInputChange('pais', e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                        placeholder="Ex: Chile"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>📂 CATEGORIA</label>
                      <select
                        value={storeMasterProd.categoria}
                        onChange={(e) => handleSMInputChange('categoria', e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                      >
                        <option value="Vinho">Vinho</option>
                        <option value="Espumante">Espumante</option>
                        <option value="Whisky">Whisky</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>🖼️ IMAGEM DO PRODUTO</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '12px' }}>
                      <button onClick={() => document.getElementById('sm-file-upload-editor')?.click()} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        📁 Buscar imagem do Desktop
                      </button>
                      <button onClick={handleSMImageUrl} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', borderRadius: '8px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        🌐 Colar URL da Imagem
                      </button>
                      <button onClick={handleSMInternetSearch} style={{ padding: '8px 16px', background: '#9333ea', color: '#fff', borderRadius: '8px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        🔍 Pesquisar imagem no Google
                      </button>
                    </div>

                    <input id="sm-file-upload-editor" type="file" accept="image/*" onChange={handleSMImageUpload} style={{ display: 'none' }} />

                    {storeMasterProd.imagem && (
                      <div style={{ marginTop: '16px' }}>
                        <img
                          src={
                            storeMasterProd.imagem.startsWith('http') || storeMasterProd.imagem.startsWith('data:')
                              ? storeMasterProd.imagem
                              : getImagemLocalPrecificador(storeMasterProd.imagem)
                          }
                          alt="Preview"
                          style={{ width: '100%', height: '192px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #4b5563', background: '#fff' }}
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="%23374151"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">Sem imagem</text></svg>';
                          }}
                        />
                        <button onClick={() => handleSMInputChange('imagem', '')} style={{ marginTop: '8px', padding: '4px 12px', background: '#dc2626', color: '#fff', fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                          🗑️ Remover imagem
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px', textAlign: 'center' }}>
                <button
                  onClick={adicionarATabelaStoreMaster}
                  style={{ padding: '16px 48px', background: 'linear-gradient(to right, #16a34a, #059669)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', fontSize: '20px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                >
                  📦 CRIAR E USAR NO STORY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}