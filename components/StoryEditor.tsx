import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { getImagemLocalPrecificador } from '../utils/imageUtils';
import { X } from 'lucide-react'; // Adicionado para o ícone de fechar


// ======= CONFIGURAÇÕES ORIGINAIS DO SÉRGIO (editor.html) =======
const FONT_PRESETS: Record<number, { sName: number; sPrice: number }> = {
  1: { sName: 11, sPrice: 17 },
  2: { sName: 11, sPrice: 17 },
  4: { sName: 11, sPrice: 17 },
  6: { sName: 12, sPrice: 12 },
  9: { sName: 8, sPrice: 8 }
};

interface Rect { x: number; y: number; w: number; h: number }
interface TxtRect { x: number; y: number; w: number }

interface SlotData {
  id: number;
  imgOriginal: string;
  imgView: string;
  name: string;
  variacoes: string;
  old: string;
  new: string;
  sName: number;
  sPrice: number;
  cName: string;
  cPrice: string;
  bold: boolean;
  strike: boolean;
  imgRect: Rect | null;
  txtRect: TxtRect | null;
  imgAspect?: number; // Proporção natural da imagem (w/h)
}

const getLayoutConfigs = (n: number) => {
  let configs: Rect[] = [];
  if (n === 1) {
    configs = [{ x: 60, y: 110, w: 240, h: 240 }];
  } else if (n === 2) {
    configs = [
      { x: 20, y: 110, w: 150, h: 150 },
      { x: 190, y: 110, w: 150, h: 150 }
    ];
  } else if (n === 4) {
    configs = [
      { x: 20, y: 120, w: 150, h: 180 }, { x: 190, y: 120, w: 150, h: 180 },
      { x: 20, y: 340, w: 150, h: 180 }, { x: 190, y: 340, w: 150, h: 180 }
    ];
  } else if (n === 6) {
    const w = 100; const h = 160; const gap = 10; const startX = 20; const startY = 120;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        configs.push({ x: startX + c * (w + gap), y: startY + r * (h + gap), w: w, h: h });
      }
    }
  } else if (n === 9) {
    const w = 100; const h = 130; const gap = 10; const startX = 20; const startY = 110;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        configs.push({ x: startX + c * (w + gap), y: startY + r * (h + gap), w: w, h: h });
      }
    }
  }
  return configs;
};

const getImageAspect = (imgRaw?: string | null, imgView?: string | null): Promise<number> => {
  return new Promise((resolve) => {
    const urls = [imgRaw, imgView].filter(Boolean);
    if (urls.length === 0) return resolve(1);

    let currentIndex = 0;
    const loadNext = () => {
      if (currentIndex >= urls.length) return resolve(1);
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        if (aspect > 0) resolve(aspect);
        else resolve(1);
      };
      img.onerror = () => {
        currentIndex++;
        loadNext();
      };
      img.src = urls[currentIndex]!;
    };
    loadNext();
    // Timeout longo de segurança
    setTimeout(() => resolve(1), 10000);
  });
};

const createFittedImageRect = (cfg: Rect, layoutN: number, aspect: number): Rect => {
  let availableH = cfg.h;
  if (layoutN >= 4) availableH = cfg.h - 60; // Desconto para o texto

  const containerAspect = cfg.w / Math.max(1, availableH);

  let w = cfg.w;
  let h = availableH;

  if (aspect > containerAspect) {
    // Imagem mais larga que o container
    h = Math.round(cfg.w / aspect);
  } else {
    // Imagem mais alta que o container
    w = Math.round(availableH * aspect);
  }

  // Centralização
  const x = cfg.x + (cfg.w - w) / 2;
  const y = cfg.y + (availableH - h) / 2;

  return { x, y, w, h };
};

const defaultRectsForSlot = (layoutN: number, cfg: Rect) => {
  let imgH = cfg.h;
  if (layoutN >= 4) imgH = cfg.h - 60;

  const imgRect = { x: cfg.x, y: cfg.y, w: cfg.w, h: imgH };

  let txtRect: TxtRect;
  if (layoutN === 1) {
    txtRect = { x: 30, y: 420, w: 300 };
  } else if (layoutN === 2) {
    txtRect = { x: cfg.x, y: (cfg.y + 160), w: cfg.w };
  } else {
    txtRect = { x: cfg.x, y: (cfg.y + imgH + 5), w: cfg.w };
  }

  return { imgRect, txtRect };
};
export default function StoryEditor({ onClose, sfRows = [] }: { onClose: () => void; sfRows?: any[] }) {
  const [currentLayout, setCurrentLayout] = useState(1);
  const [modoCliente, setModoCliente] = useState<'SF' | 'OTOVAL'>('SF');
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [slotsData, setSlotsData] = useState<SlotData[]>(() => {
    const initial: SlotData[] = [];
    for (let i = 0; i < 9; i++) {
      initial.push({
        id: i,
        imgOriginal: '',
        imgView: '',
        name: 'Nome do Produto',
        variacoes: '',
        old: '',
        new: 'R$ 00,00',
        sName: 11,
        sPrice: 17,
        cName: '#ffffff',
        cPrice: '#ffd400',
        bold: true,
        strike: false,
        imgRect: null,
        txtRect: null
      });
    }
    return initial;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const applyImageToSlot = async (index: number, p: { name: string, imgOriginal: string, old?: string, new?: string, variacoes?: string, imgRaw?: string, imgView?: string }) => {
    // 1. Identifica a fonte original bruta (Prioridade Máxima para Geometria)
    const imgRaw = p.imgRaw || p.imgOriginal;

    // 2. Obtém a versão processada via modo seguro do imageUtils
    const imgView = getImagemLocalPrecificador(imgRaw, p.name);

    // 3. Mede a proporção REAL usando a fonte bruta (imgRaw) se disponível
    const aspect = await getImageAspect(imgRaw, imgView);

    setSlotsData(prev => prev.map((s, i) => {
      if (i !== index) return s;

      const configs = getLayoutConfigs(currentLayout);
      const cfg = configs[i] || configs[0];

      // GARANTE QUE O ASPECT SEJA ÚTIL
      const finalAspect = aspect > 0 ? aspect : (s.imgAspect || 1);
      const fittedRect = createFittedImageRect(cfg, currentLayout, finalAspect);
      const { txtRect } = defaultRectsForSlot(currentLayout, cfg);

      return {
        ...s,
        name: p.name,
        imgOriginal: imgRaw,
        imgView: imgView,
        imgAspect: finalAspect,
        imgRect: fittedRect,
        txtRect: txtRect,
        old: p.old !== undefined ? p.old : s.old,
        new: p.new !== undefined ? p.new : s.new,
        variacoes: p.variacoes !== undefined ? p.variacoes : s.variacoes
      };
    }));
  };
  const [localSfRows, setLocalSfRows] = React.useState<any[]>(sfRows);
  React.useEffect(() => {
    if (sfRows.length === 0) {
      try {
        const stored = localStorage.getItem('sfRows_full') || localStorage.getItem('catalogoSFImports');
        if (stored) setLocalSfRows(JSON.parse(stored));
      } catch { }
    } else {
      setLocalSfRows(sfRows);
    }
  }, [sfRows]);
  const effectiveSfRows = localSfRows;


  // ======================================================================
  // 🏪 ESTADOS DO NOVO STORE MASTER INTEGRADO NO EDITOR DE STORIES
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
          const res = await fetch('http://localhost:3002/api/upload-image-base64', {
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
      // Passo 1: Groq identifica metadados
      const res = await fetch(`http://localhost:3002/api/identify-product?q=${encodeURIComponent(storeMasterProd.nome)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setStoreMasterProd(prev => ({
          ...prev,
          nome: p.nome || prev.nome,
          precoDe: p.preco_de ? p.preco_de.toString() : prev.precoDe,
          precoPor: p.preco_por ? p.preco_por.toString() : prev.precoPor,
          pais: p.pais || prev.pais,
          safra: p.safra || prev.safra,
          tipoUva: p.uva || prev.tipoUva,
          regiao: p.regiao || prev.regiao,
          tipoVinho: p.tipo || prev.tipoVinho,
          descricao: p.descricao || prev.descricao
        }));
      }

      // Passo 2: Busca Tripla de Imagem (independente do passo 1)
      const nomeBusca = (data.success && data.data?.nome) ? data.data.nome : storeMasterProd.nome;
      const imgRes = await fetch(`http://localhost:3002/api/buscar-imagem-tripla?q=${encodeURIComponent(nomeBusca)}`);
      const imgData = await imgRes.json();

      if (imgData.success && imgData.url) {
        const fonteLabel = imgData.camada === 1 ? '📁 Local' : imgData.camada === 2 ? '🤖 IA' : '🍷 Vivino';
        setStoreMasterProd(prev => ({ ...prev, imagem: imgData.url }));
        console.log(`✅ Imagem encontrada via ${fonteLabel}: ${imgData.url}`);
      } else {
        console.log('⚠️ Nenhuma imagem encontrada nas 3 camadas.');
      }

    } catch (err) {
      console.error('Erro no assistente IA:', err);
      alert('Erro ao consultar IA. Verifique o servidor.');
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

    try {
      await fetch('http://localhost:3002/api/persist-product', {
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
      alert('✅ Produto salvo e já inserido na arte do Story!');
    } catch (e) {
      console.error(e);
    }

    // MAGIA: Insere o produto recém-criado direto no slot atual do Editor de Stories
    const sfFinalMatch = sfMatch ? Number(sfMatch.sfFinal) || 0 : 0;
    const precoPorBase = sfFinalMatch > 0 ? sfFinalMatch : pPor;
    const precoPorFinal = Math.round((precoPorBase + 10) * 100) / 100;

    await applyImageToSlot(activeSlotIndex, {
      name: storeMasterProd.nome,
      imgOriginal: storeMasterProd.imagem || '',
      old: pDeFinal > precoPorFinal ? `De R$ ${pDeFinal.toFixed(2).replace('.', ',')}` : '',
      new: `Por R$ ${precoPorFinal.toFixed(2).replace('.', ',')}`
    });

    setModalStoreMaster(false);
    setStoreMasterProd({
      nome: '', idWooCommerce: '', precoDe: '', precoPor: '',
      tipoUva: '', safra: '', descricao: '', pais: '', regiao: '',
      ml: '750ml', categoria: 'Vinho', teorAlcoolico: '', tipoVinho: 'Tinto', imagem: null
    });
  };
  // ======================================================================

  useEffect(() => {
    if (slotsData.length === 0) return;
    const configs = getLayoutConfigs(currentLayout);
    const presets = FONT_PRESETS[currentLayout] || FONT_PRESETS[1];

    setSlotsData(prev => prev.map((slot, idx) => {
      if (idx >= configs.length) return slot;
      const cfg = configs[idx];
      const { txtRect } = defaultRectsForSlot(currentLayout, cfg);

      // Se já tem imagem e proporção, recalcula o FIT proporcional centralizado
      let fittedRect = slot.imgRect;
      if (slot.imgAspect) {
        fittedRect = createFittedImageRect(cfg, currentLayout, slot.imgAspect);
      } else {
        const { imgRect } = defaultRectsForSlot(currentLayout, cfg);
        fittedRect = imgRect;
      }

      return {
        ...slot,
        sName: presets.sName,
        sPrice: presets.sPrice,
        imgRect: fittedRect,
        txtRect: txtRect
      };
    }));
  }, [currentLayout, slotsData.length === 0]);

  const handleUpdateSlot = (index: number, updates: Partial<SlotData>) => {
    setSlotsData(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const fillVisibleSlots = async (items: any[]) => {
    if (!items || items.length === 0) return;
    const configs = getLayoutConfigs(currentLayout);
    const visibleCount = configs.length;

    for (let idx = 0; idx < visibleCount; idx++) {
      const p = items[idx % items.length];
      if (!p) continue;

      const imgRaw = p.image || p.imagem || '';
      const precoDe = p.old_price || p.preco_de || '';
      const precoPor = p.price || p.preco_por || '';

      await applyImageToSlot(idx, {
        name: p.name || p.nome || 'Produto',
        imgOriginal: imgRaw,
        variacoes: p.variacoes || '',
        old: precoDe ? (precoDe.toString().startsWith('De') ? precoDe : `De R$ ${precoDe}`) : '',
        new: precoPor ? (precoPor.toString().startsWith('Por') ? precoPor : `Por R$ ${precoPor}`) : ''
      });
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRODUCT_SELECTED') {
        const p = event.data.product;
        if (Array.isArray(p)) {
          await fillVisibleSlots(p);
        } else {
          await applyImageToSlot(activeSlotIndex, {
            name: p.name,
            imgOriginal: p.image || '',
            old: p.old_price ? `De R$ ${p.old_price}` : '',
            new: `Por R$ ${p.price}`
          });
        }
      } else if (event.data && event.data.type === 'BATCH_PRODUCTS_SELECTED') {
        await fillVisibleSlots(event.data.products);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeSlotIndex, currentLayout]);

  const openExternalCatalog = () => {
    window.open('catalogo.html?picker=true', 'CatalogWindow', 'width=1000,height=800');
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;

    // 1. Verificação de inteligência competitiva
    const activeSlotNome = slotsData[activeSlotIndex]?.name || '';
    if (activeSlotNome && activeSlotNome !== 'Nome do Produto') {
      const sfRowsAll = JSON.parse(localStorage.getItem('sfRows_full') || '[]');
      for (const row of sfRowsAll) {
        const n = (row.supplierName || '').toLowerCase();
        const palavra = activeSlotNome.toLowerCase().split(' ').find((w: string) => w.length > 3);
        if (palavra && n.includes(palavra)) {
          const intel = (JSON.parse(localStorage.getItem('sf_inteligencia_cache') || '{}'))[row.rowId || ''];
          if (intel && intel.saPreco > 0) {
            const sfFinal = Number(row.sfFinal || 0);
            if (sfFinal > intel.saPreco) {
              const ok = window.confirm(`⚠️ ATENÇÃO!\n\n"${activeSlotNome}"\n\nSuperAdega cobra R$${intel.saPreco.toFixed(2).replace('.', ',')} e você está a R$${sfFinal.toFixed(2).replace('.', ',')}.\n\nVocê está MAIS CARO que a SuperAdega!\n\nDeseja exportar mesmo assim?`);
              if (!ok) return;
            }
          }
          break;
        }
      }
    }

    setIsExporting(true);

    try {
      // 1. Aguarda todas as imagens do canvas estarem carregadas
      const originalImgs = Array.from(canvasRef.current.querySelectorAll<HTMLImageElement>('img'));
      await Promise.all(originalImgs.map((img: HTMLImageElement) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 3000);
        });
      }));

      // 2. CAPTURA DIRETA COM LIMPEZA NO CLONE
      console.log('--- STARTING STORY EXPORT V10 ---');
      console.log('Target element:', canvasRef.current);

      const canvas = await html2canvas(canvasRef.current!, {
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: false,
        scale: 2,
        logging: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          console.log('CLONE DEBUG: Document cloned.');
          const canvasClone = clonedDoc.getElementById('canvas');
          if (!canvasClone) {
            console.error('CLONE DEBUG: #canvas NOT FOUND in clone!');
            return;
          }

          // Garante que o canvas e seus filhos diretos estão visíveis
          canvasClone.style.display = 'block';
          canvasClone.style.visibility = 'visible';
          canvasClone.style.opacity = '1';
          canvasClone.style.overflow = 'hidden';

          const layersContainer = clonedDoc.getElementById('layersContainer');
          if (layersContainer) {
            layersContainer.style.display = 'block';
            layersContainer.style.visibility = 'visible';
            layersContainer.style.opacity = '1';
          }

          const template = clonedDoc.getElementById('template');
          if (template) {
            (template as HTMLElement).style.display = 'block';
            (template as HTMLElement).style.visibility = 'visible';
            (template as HTMLElement).style.opacity = '1';
          }

          const productLayers = canvasClone.querySelectorAll<HTMLElement>('.product-layer');
          console.log(`CLONE DEBUG: Found ${productLayers.length} product layers.`);

          productLayers.forEach((layer, i) => {
            layer.style.display = 'block';
            layer.style.visibility = 'visible';
            layer.style.opacity = '1';

            const img = layer.querySelector('img');
            if (img) {
              console.log(`CLONE DEBUG: Slot ${i} image src:`, img.src.substring(0, 50));
              let aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
              if (img.naturalWidth === 0) {
                aspect = parseFloat(layer.getAttribute('data-img-aspect') || '1');
                console.log(`CLONE DEBUG: Slot ${i} aspect fallback:`, aspect);
              }

              const cW = layer.offsetWidth;
              const cH = layer.offsetHeight;
              const containerAspect = cW / Math.max(1, cH);

              let finalW, finalH;
              if (aspect > containerAspect) {
                finalW = cW;
                finalH = cW / aspect;
              } else {
                finalH = cH;
                finalW = cH * aspect;
              }

              img.style.position = 'absolute';
              img.style.width = Math.round(finalW) + 'px';
              img.style.height = Math.round(finalH) + 'px';
              img.style.left = Math.round((cW - finalW) / 2) + 'px';
              img.style.top = Math.round((cH - finalH) / 2) + 'px';
              img.style.objectFit = 'contain';
            }
          });

          // Esconder UI
          const uiElements = clonedDoc.querySelectorAll('.pick-overlay, .handle, .pick-btn');
          uiElements.forEach(el => (el as HTMLElement).style.display = 'none');
        }
      });

      console.log('Resulting canvas size:', canvas.width, 'x', canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      console.log('DataURL size:', dataUrl.length);

      if (dataUrl.length < 10000) {
        console.warn('CRITICAL: Image data is suspiciously small!');
      }

      // 3. DOWNLOAD
      const fileName = `sf-story-${Date.now()}.png`;

      // Converte DataURL para Blob para garantir download correto em todos os browsers
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        console.log('Download triggered successfully:', fileName);
      }, 500);

    } catch (err) {
      alert('Erro ao exportar: ' + err);
      console.error('EXPORT ERROR:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const loadProducts = async (search: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`wc - proxy.php ? action = list & search=${encodeURIComponent(search)}& per_page=12`);
      const text = await res.text();
      if (text.trim().startsWith('<?php')) {
        throw new Error('Ambiente local sem suporte a PHP. Por favor, utilize o botão "Escolher do Site".');
      }
      try {
        const json = JSON.parse(text);
        setProducts(Array.isArray(json) ? json : (json.products || []));
      } catch (parseError) {
        throw new Error('Resposta do servidor inválida (não JSON).');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao buscar produtos.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectProduct = async (p: any) => {
    const imgRaw = (p.images && p.images[0]) ? p.images[0].src : '';

    // Buscar na tabela SF pelo nome (mesma lógica do sfMatch)
    const norm = (s: string) => s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(vinho|tinto|branco|rose|750ml|ml|tt)\b/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').trim();

    const n1 = norm(p.name || '');
    const palavras1 = n1.split(/\s+/).filter((x: string) => x.length > 2);
    let match: any = null;
    let bestScore = 0;
    for (const row of effectiveSfRows) {
      const n2 = norm(row.supplierName || row.nome || '');
      const palavras2 = n2.split(/\s+/).filter((x: string) => x.length > 2);
      if (!palavras2.length) continue;
      const comuns = palavras1.filter((w: string) => palavras2.some((w2: string) => w2.includes(w) || w.includes(w2)));
      const score = comuns.length / Math.max(palavras1.length, palavras2.length);
      if (score > bestScore) { bestScore = score; match = row; }
    }

    // Preços: usa tabela SF se encontrou (score >= 0.5), senão usa WooCommerce
    const sfDe = bestScore >= 0.5 && match?.sfDe ? Number(match.sfDe) : parseFloat(p.regular_price || '0');
    const sfFinal = bestScore >= 0.5 && match?.sfFinal ? Number(match.sfFinal) : parseFloat(p.sale_price || p.price || '0');

    // Se OTOVAL ativo, soma +10
    const extra = modoCliente === 'OTOVAL' ? 10 : 0;
    const precoDe = sfDe > 0 ? (sfDe + extra) : 0;
    const precoPor = sfFinal > 0 ? (sfFinal + extra) : 0;

    await applyImageToSlot(activeSlotIndex, {
      name: p.name,
      imgOriginal: imgRaw,
      old: precoDe > 0 ? `De R$ ${precoDe.toFixed(2).replace('.', ',')} ` : '',
      new: precoPor > 0 ? `Por R$ ${precoPor.toFixed(2).replace('.', ',')} ` : ''
    });
    setShowPicker(false);
  };

  const dragRef = useRef({
    isDragging: false,
    isResizing: false,
    startX: 0, startY: 0,
    startL: 0, startT: 0,
    startW: 0, startH: 0,
    aspect: 1, targetIdx: -1,
    kind: '' as 'img' | 'txt'
  });

  const onPointerDown = useCallback((e: React.PointerEvent, idx: number, kind: 'img' | 'txt') => {
    if ((e.target as HTMLElement).closest('.pick-btn')) return;

    setActiveSlotIndex(idx);
    const el = e.currentTarget as HTMLElement;
    const isHandle = (e.target as HTMLElement).classList.contains('handle');

    const state = dragRef.current;
    state.targetIdx = idx;
    state.kind = kind;

    if (isHandle) {
      state.isResizing = true;
      state.startW = el.offsetWidth;
      state.startH = el.offsetHeight;
      const slot = slotsData[idx];
      state.aspect = (kind === 'img' && slot?.imgAspect) ? slot.imgAspect : (state.startW / Math.max(1, state.startH));
    } else {
      state.isDragging = true;
      state.startL = el.offsetLeft;
      state.startT = el.offsetTop;
    }

    state.startX = e.clientX;
    state.startY = e.clientY;

    el.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragRef.current;
    if (!state.isDragging && !state.isResizing) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    const slot = slotsData[state.targetIdx];
    if (!slot) return;

    // Calcula o multiplicador de escala real se o canvas estiver reduzido no CSS
    const container = canvasRef.current;
    let multiplier = 1;
    if (container) {
      const rect = container.getBoundingClientRect();
      multiplier = 360 / rect.width; // 360 é a largura nominal
    }

    if (state.isDragging) {
      const newX = state.startL + (dx * multiplier);
      const newY = state.startT + (dy * multiplier);
      if (state.kind === 'img') {
        handleUpdateSlot(state.targetIdx, { imgRect: { ...slot.imgRect!, x: newX, y: newY } });
      } else {
        handleUpdateSlot(state.targetIdx, { txtRect: { ...slot.txtRect!, x: newX, y: newY } });
      }
    } else if (state.isResizing) {
      const scaledDx = dx * multiplier;
      const scaledDy = dy * multiplier;
      if (state.kind === 'img') {
        const scaleW = (state.startW + scaledDx) / state.startW;
        const scaleH = (state.startH + scaledDy) / state.startH;
        let scale = Math.max(scaleW, scaleH);
        if (scale < 0.1) scale = 0.1;
        const newW = Math.max(50, Math.round(state.startW * scale));
        const newH = Math.max(50, Math.round(newW / state.aspect));
        handleUpdateSlot(state.targetIdx, { imgRect: { ...slot.imgRect!, w: newW, h: newH } });
      } else {
        const newW = Math.max(50, state.startW + scaledDx);
        handleUpdateSlot(state.targetIdx, { txtRect: { ...slot.txtRect!, w: newW } });
      }
    }
  }, [slotsData, handleUpdateSlot]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const state = dragRef.current;
    state.isDragging = false;
    state.isResizing = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) { }
  }, []);

  const activeSlot = slotsData[activeSlotIndex] || slotsData[0];
  const configs = getLayoutConfigs(currentLayout);

  // --- MATCH AUTOMÁTICO COM TABELA SF IMPORTS ---
  const normalizarSF = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(vinho|tinto|branco|rose|750ml|ml|tt)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').trim();

  const sfMatch = React.useMemo(() => {
    const nome = activeSlot?.name || '';
    if (!nome || nome === 'Nome do Produto' || effectiveSfRows.length === 0) return null;
    const n1 = normalizarSF(nome);
    const palavras1 = n1.split(/\s+/).filter(p => p.length > 2);
    if (palavras1.length === 0) return null;
    let best: any = null;
    let bestScore = 0;
    for (const row of effectiveSfRows) {
      const n2 = normalizarSF(row.supplierName || row.nome || '');
      const palavras2 = n2.split(/\s+/).filter(p => p.length > 2);
      if (palavras2.length === 0) continue;
      const comuns = palavras1.filter(p => palavras2.some(p2 => p2.includes(p) || p.includes(p2)));
      const score = comuns.length / Math.max(palavras1.length, palavras2.length);
      if (score > bestScore) { bestScore = score; best = row; }
    }
    return bestScore >= 0.5 ? best : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot?.name, effectiveSfRows]);


  return (
    <div style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: '#1c1c1c', gap: '10px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '16px', margin: 0 }}>SF Editor Multi</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalStoreMaster(true)} style={{ background: '#ff8c00', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>➕ Novo Produto (IA)</button>
          <button onClick={openExternalCatalog} style={{ background: '#00ff88', color: '#002015', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Escolher do Site</button>
          <button onClick={() => alert('ℹ️ Imagens locais já estão sem fundo!')} style={{ background: '#666', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800, opacity: 0.6 }}>Sem Fundo (Local)</button>
          <button onClick={handleDownload} style={{ background: '#00ff88', color: '#002015', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Baixar PNG</button>
          <button onClick={onClose} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Sair</button>
        </div>
      </header>

      <main style={{ display: 'flex', gap: '15px', padding: '15px', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>

        <section className="controls" style={{ width: '350px', background: '#1e1e1e', padding: '12px', borderRadius: '10px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => {
                if (modoCliente === 'SF') return;
                setModoCliente('SF');
                const sub10FromPrice = (priceStr: string) => {
                  if (!priceStr) return '';
                  // Regex mais flexível: busca qualquer número com ou sem vírgula/ponto
                  const matches = priceStr.match(/(\d+([.,]\d+)?)/);
                  if (!matches) return priceStr;

                  const num = parseFloat(matches[1].replace(',', '.'));
                  const newVal = Math.max(0, num - 10);

                  // Preserva o que veio antes do número (ex: "De R$ ", "Por R$ ")
                  const prefix = priceStr.substring(0, matches.index);
                  return `${prefix}${newVal.toFixed(2).replace('.', ',')} `;
                };

                setSlotsData(prev => prev.map(slot => ({
                  ...slot,
                  old: slot.old ? sub10FromPrice(slot.old) : '',
                  new: sub10FromPrice(slot.new),
                  imgView: getImagemLocalPrecificador(slot.imgOriginal, slot.name)
                })));
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer',
                background: modoCliente === 'SF' ? '#1c1c1c' : '#1e1e1e',
                color: modoCliente === 'SF' ? '#00ff88' : '#aaa',
                border: modoCliente === 'SF' ? '2px solid #00ff88' : '1px solid #333'
              }}
            >TEMPLATES SF</button>
            <button
              onClick={() => {
                if (modoCliente === 'OTOVAL') return;
                setModoCliente('OTOVAL');
                const add10ToPrice = (priceStr: string) => {
                  if (!priceStr) return '';
                  // Regex mais flexível: busca qualquer número com ou sem vírgula/ponto
                  const matches = priceStr.match(/(\d+([.,]\d+)?)/);
                  if (!matches) return priceStr;

                  const num = parseFloat(matches[1].replace(',', '.'));
                  const newVal = num + 10;

                  // Preserva o que veio antes do número (ex: "De R$ ", "Por R$ ")
                  const prefix = priceStr.substring(0, matches.index);
                  return `${prefix}${newVal.toFixed(2).replace('.', ',')} `;
                };

                setSlotsData(prev => prev.map(slot => ({
                  ...slot,
                  old: slot.old ? add10ToPrice(slot.old) : '',
                  new: add10ToPrice(slot.new),
                  imgView: getImagemLocalPrecificador(slot.imgOriginal, slot.name)
                })));
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer',
                background: modoCliente === 'OTOVAL' ? '#003020' : '#1e1e1e',
                color: modoCliente === 'OTOVAL' ? '#00ff88' : '#aaa',
                border: modoCliente === 'OTOVAL' ? '2px solid #00ff88' : '1px solid #333'
              }}
            >TEMPLATES OTOVAL</button>
          </div>

          <label style={{ display: 'block', marginTop: '10px', fontSize: '13px', opacity: 0.9 }}>Layout (Produtos)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[1, 2, 4, 6, 9].map(n => (
              <button
                key={n}
                onClick={() => setCurrentLayout(n)}
                style={{
                  flex: 1, minWidth: '40px', color: currentLayout === n ? '#002015' : '#fff',
                  background: currentLayout === n ? '#00ff88' : '#2a2a2a',
                  border: currentLayout === n ? '1px solid #00ff88' : '1px solid #333',
                  borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 800
                }}
              >{n}</button>
            ))}
          </div>

          <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px' }}>
            <label style={{ color: '#00ff88', display: 'block', fontSize: '13px', marginBottom: '5px' }}>EDITANDO SLOT: <span>Produto #{activeSlotIndex + 1}</span></label>

            <button onClick={() => setShowPicker(true)} style={{ width: '100%', marginTop: '5px', background: '#333', border: '1px dashed #555', padding: '10px', color: '#ccc', cursor: 'pointer', borderRadius: '6px' }}>
              🔍 Escolher Produto do Site
            </button>

            <button onClick={() => setModalStoreMaster(true)} style={{ width: '100%', marginTop: '8px', background: '#ff8c00', border: 'none', padding: '10px', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}>
              ✨ Criar Produto Novo com IA
            </button>

            <label style={{ display: 'block', marginTop: '15px', fontSize: '13px' }}>Nome</label>
            <textarea
              value={activeSlot.name}
              onChange={e => handleUpdateSlot(activeSlotIndex, { name: e.target.value })}
              rows={2} style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', outline: 'none', background: '#111', color: '#fff' }}
            />

            <label style={{ color: '#aaa', fontSize: '12px', marginTop: '10px', display: 'block' }}>
              VARIAÇÕES (ex: Primitivo, Malbec ou Sangiovese)
            </label>
            <textarea
              value={activeSlot.variacoes}
              onChange={e => handleUpdateSlot(activeSlotIndex, { variacoes: e.target.value })}
              placeholder="Primitivo, Nero d'Avola, Malbec ou Sangiovese"
              rows={2}
              style={{
                width: '100%', marginTop: '5px', padding: '8px', borderRadius: '6px', border: 'none',
                fontSize: '12px', outline: 'none', background: '#111', color: '#fff', resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Preço De (R$)</label>
                <input value={activeSlot.old} onChange={e => handleUpdateSlot(activeSlotIndex, { old: e.target.value })} type="text" style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', outline: 'none', background: '#111', color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Preço Por (R$)</label>
                <input value={activeSlot.new} onChange={e => handleUpdateSlot(activeSlotIndex, { new: e.target.value })} type="text" style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', outline: 'none', background: '#111', color: '#fff' }} />
              </div>
            </div>

            {/* 📊 REFERÊNCIA TABELA SF IMPORTS - SEMPRE VISÍVEL QUANDO ESTIVER EDITANDO */}
            <div style={{ marginTop: '10px', padding: '8px 10px', background: '#0a1a0a', borderRadius: '8px', border: '1px solid #00ff8866', fontSize: '12px' }}>
              <div style={{ fontWeight: 800, color: '#aaa', marginBottom: '4px' }}>📊 Referência Tabela SF Imports</div>
              {sfMatch ? (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span>SF Final: <strong style={{ color: '#00ff88' }}>{sfMatch.sfFinal ? `R$ ${Number(sfMatch.sfFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ` : '--'}</strong></span>
                  <span style={{ color: '#ccc' }}>SF De: <strong>{sfMatch.sfDe ? `R$ ${Number(sfMatch.sfDe).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ` : '--'}</strong></span>
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '11px' }}>
                  {activeSlot?.name && activeSlot.name !== 'Nome do Produto' ? '⚠️ Produto não encontrado na tabela' : 'Aguardando seleção de produto...'}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px' }}>
            <label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Ajuste Fino (Texto)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => handleUpdateSlot(activeSlotIndex, { bold: !activeSlot.bold })}
                style={{
                  flex: 1, color: activeSlot.bold ? '#002015' : '#fff',
                  background: activeSlot.bold ? '#00ff88' : '#2a2a2a',
                  border: '1px solid #333', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 800
                }}
              >Negrito</button>
              <button
                onClick={() => handleUpdateSlot(activeSlotIndex, { strike: !activeSlot.strike })}
                style={{
                  flex: 1, color: activeSlot.strike ? '#002015' : '#fff',
                  background: activeSlot.strike ? '#00ff88' : '#2a2a2a',
                  border: '1px solid #333', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 800
                }}
              >Tachado</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Tam. Nome</label>
                <input type="number" value={activeSlot.sName} onChange={e => handleUpdateSlot(activeSlotIndex, { sName: parseInt(e.target.value) })} style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', outline: 'none', background: '#111', color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Tam. Preço</label>
                <input type="number" value={activeSlot.sPrice} onChange={e => handleUpdateSlot(activeSlotIndex, { sPrice: parseInt(e.target.value) })} style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', outline: 'none', background: '#111', color: '#fff' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Cor Nome</label>
                <input type="color" value={activeSlot.cName} onChange={e => handleUpdateSlot(activeSlotIndex, { cName: e.target.value })} style={{ width: '100%', marginTop: '5px', padding: 0, height: '38px', borderRadius: '6px', border: 'none', outline: 'none', background: '#111' }} />
              </div>
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginTop: '10px', fontSize: '13px' }}>Cor Preço</label>
                <input type="color" value={activeSlot.cPrice} onChange={e => handleUpdateSlot(activeSlotIndex, { cPrice: e.target.value })} style={{ width: '100%', marginTop: '5px', padding: 0, height: '38px', borderRadius: '6px', border: 'none', outline: 'none', background: '#111' }} />
              </div>
            </div>
          </div>
        </section>

        <section style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div ref={canvasRef} id="canvas" data-export-root="true" style={{ position: 'relative', width: '360px', height: '640px', background: '#000', overflow: 'hidden', borderRadius: '10px', touchAction: 'none' }}>
            <img id="template" src="templatesf.png" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', zIndex: 1 }} />
            <div id="layersContainer">
              {configs.map((cfg, idx) => {
                const d = slotsData[idx];
                if (!d || !d.imgRect || !d.txtRect) return null;
                const isSelected = activeSlotIndex === idx;

                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`node product-layer ${!isExporting && isSelected ? 'is-selected' : ''}`}
                      onPointerDown={e => onPointerDown(e, idx, 'img')}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      data-idx={idx}
                      data-img-aspect={d.imgAspect || 1}
                      style={{
                        position: 'absolute', zIndex: 10 + idx, touchAction: 'none', userSelect: 'none',
                        left: d.imgRect.x, top: d.imgRect.y, width: d.imgRect.w, height: d.imgRect.h,
                        border: isExporting ? 'none' : '1px dashed rgba(0,255,136,.3)',
                        background: isExporting ? 'transparent' : 'rgba(0,0,0,.1)',
                        outline: !isExporting && isSelected ? '2px solid #00ff88' : 'none',
                        outlineOffset: '2px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* MODO SEGURO DEFINITIVO: Prioridade de render para a Original/Bruta */}
                      <img
                        src={d.imgView || d.imgOriginal}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                        onError={(e) => {
                          // Se a view falhar, tenta a original como fallback
                          if (d.imgView && d.imgOriginal && e.currentTarget.src !== d.imgOriginal) {
                            e.currentTarget.src = d.imgOriginal;
                          }
                        }}
                      />
                      {!isExporting && (
                        <div className="pick-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                          <span className="pick-btn" onClick={() => { setActiveSlotIndex(idx); setShowPicker(true); }} style={{ background: '#000', color: '#00ff88', padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #00ff88', pointerEvents: 'auto', cursor: 'pointer' }}>TROCAR</span>
                        </div>
                      )}
                      {!isExporting && isSelected && (
                        <div className="handle se" style={{ position: 'absolute', width: '18px', height: '18px', margin: '-9px', background: '#00ff88', border: '2px solid #000', borderRadius: '50%', zIndex: 9999, right: 0, bottom: 0, cursor: 'nwse-resize' }}></div>
                      )}
                    </div>

                    <div
                      className={`node text - group ${!isExporting && isSelected ? 'is-selected' : ''} `}
                      onPointerDown={e => onPointerDown(e, idx, 'txt')}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      style={{
                        position: 'absolute', zIndex: 10, touchAction: 'none', userSelect: 'none',
                        left: d.txtRect.x, top: d.txtRect.y, width: d.txtRect.w,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                        border: isExporting ? 'none' : '1px dashed rgba(255,255,255,0.1)',
                        outline: !isExporting && isSelected ? '2px solid #00ff88' : 'none',
                        outlineOffset: '2px'
                      }}
                    >
                      <div className="t-name" style={{ fontWeight: d.bold ? 900 : 400, lineHeight: 1.1, marginBottom: '2px', fontSize: d.sName, color: d.cName }}>{d.name}</div>
                      {d.variacoes && (
                        <div className="t-variacoes" style={{
                          fontSize: Math.max((d.sName || 14) - 3, 8),
                          color: d.cName || '#fff',
                          fontWeight: 'normal',
                          lineHeight: 1.3,
                          marginBottom: '3px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>{d.variacoes}</div>
                      )}
                      <div className="t-old" style={{ textDecoration: 'line-through', color: '#aaa', fontWeight: 700, fontSize: d.sName * 0.8, display: d.strike === false && (d.old === '' || d.old === ' ') ? 'none' : 'block' }}>{d.old}</div>
                      <div className="t-new" style={{ fontWeight: 900, fontSize: d.sPrice, color: d.cPrice }}>{d.new}</div>
                      {!isExporting && isSelected && (
                        <div className="handle se" style={{ position: 'absolute', width: '18px', height: '18px', margin: '-9px', background: '#00ff88', border: '2px solid #000', borderRadius: '50%', zIndex: 9999, right: 0, bottom: 0, cursor: 'nwse-resize' }}></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* MODAL PICKER */}
      {
        showPicker && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
            <div onClick={() => setShowPicker(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }}></div>
            <div style={{ position: 'relative', width: '90%', maxWidth: '800px', height: '80vh', background: '#1a1a1a', borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid #333' }}>
              <header style={{ padding: '15px', borderBottom: '1px solid #333', display: 'flex', gap: '10px', background: 'transparent' }}>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '10px', background: '#000', border: '1px solid #444', color: '#fff', outline: 'none' }}
                />
                <button onClick={() => loadProducts(searchQuery)} style={{ background: '#00ff88', color: '#002015', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Buscar</button>
                <button onClick={() => setShowPicker(false)} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>Fechar</button>
              </header>
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {isSearching ? <div style={{ color: '#aaa' }}>Carregando...</div> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                    {products.map((p, i) => (
                      <div key={i} onClick={() => selectProduct(p)} style={{ background: '#000', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', padding: '10px' }}>
                        <img src={getImagemLocalPrecificador((p.images && p.images[0]) ? p.images[0].src : '')} style={{ width: '100%', height: '120px', objectFit: 'contain', background: '#111' }} />
                        <p style={{ fontSize: '12px', margin: '5px 0 0', lineHeight: 1.2 }}>{p.name}</p>
                        <p style={{ color: '#00ff88', fontWeight: 'bold', marginTop: '4px' }}>{p.price ? `R$ ${p.price} ` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ── MODAL STORE MASTER UNIFICADO (FLUTUANTE) ── */}
      {
        modalStoreMaster && (
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
        )
      }

    </div >
  );
}