/* ===== editor.js (COMPLETO - corrigido) =====
- Move + resize produto e textos
- Se .layer for IMG, faz wrap automático em DIV (para handles funcionarem)
- Produto mantém proporção (menos “borda” em cima/baixo)
- removebg.php na mesma pasta (/story/removebg.php)
- Export PNG via html2canvas (se você tiver o vendor/html2canvas.min.js)
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url + (url.includes('?') ? '' : `?v=${Date.now()}`);
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureInteract() {
    if (typeof window.interact === 'function') return true;

    const urls = [
      'vendor/interact.min.js',
      'https://unpkg.com/interactjs/dist/interact.min.js',
      'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js',
    ];

    for (const u of urls) {
      try {
        await loadScript(u);
        if (typeof window.interact === 'function') return true;
      } catch (e) { }
    }
    return false;
  }

  async function ensureHtml2Canvas() {
    if (typeof window.html2canvas === 'function') return true;

    const urls = [
      'vendor/html2canvas.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    ];

    for (const u of urls) {
      try {
        await loadScript(u);
        if (typeof window.html2canvas === 'function') return true;
      } catch (e) { }
    }
    return false;
  }

  function ensureHandles(el) {
    if (el.querySelector('.handle')) return;
    ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
      const h = document.createElement('div');
      h.className = `handle ${pos}`;
      el.appendChild(h);
    });
  }

  function clearSelection() {
    for (const el of $$('.layer, .text-layer')) el.classList.remove('is-selected');
  }

  function setSelected(el) {
    clearSelection();
    if (!el) return;
    el.classList.add('is-selected');

    // sobe z-index do selecionado
    const all = $$('.layer, .text-layer');
    let maxZ = 1;
    for (const n of all) {
      const z = parseInt(getComputedStyle(n).zIndex || '0', 10);
      if (!Number.isNaN(z)) maxZ = Math.max(maxZ, z);
    }
    el.style.zIndex = String(maxZ + 1);
  }

  function normalizeAbsolute(el, canvas) {
    // converte bottom/translate/center para left/top reais em px
    const crect = canvas.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    el.style.left = `${rect.left - crect.left}px`;
    el.style.top = `${rect.top - crect.top}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.transform = 'none';

    el.setAttribute('data-x', '0');
    el.setAttribute('data-y', '0');

    // garante width/height definidos (resize precisa)
    if (!el.style.width) el.style.width = `${rect.width}px`;
    if (!el.style.height) el.style.height = `${rect.height}px`;
  }

  function wrapLayerIfImg(layerEl) {
    // Se .layer for IMG, cria DIV.layer e coloca IMG dentro
    if (!layerEl) return null;
    if (layerEl.tagName !== 'IMG') return layerEl;

    const img = layerEl;
    const parent = img.parentElement;

    const crect = parent.getBoundingClientRect();
    const r = img.getBoundingClientRect();

    const wrap = document.createElement('div');
    wrap.className = img.className; // mantém "layer"
    wrap.id = img.id ? (img.id + '_wrap') : 'productLayer';

    // posiciona wrapper onde o IMG estava
    wrap.style.position = 'absolute';
    wrap.style.left = (r.left - crect.left) + 'px';
    wrap.style.top = (r.top - crect.top) + 'px';
    wrap.style.width = r.width + 'px';
    wrap.style.height = r.height + 'px';
    wrap.style.transform = 'none';

    // IMG vira conteúdo do wrapper
    img.className = '';
    img.id = img.id || 'productImg';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.pointerEvents = 'none';
    img.style.userSelect = 'none';

    parent.replaceChild(wrap, img);
    wrap.appendChild(img);

    // garante data-x/y
    wrap.setAttribute('data-x', '0');
    wrap.setAttribute('data-y', '0');

    return wrap;
  }

  function getProductImgFromLayer(layerEl) {
    if (!layerEl) return null;
    if (layerEl.tagName === 'IMG') return layerEl;
    return $('img', layerEl);
  }

  function setupInteract(canvas, productEl, textEls) {
    // aspect ratio preserve (Interact.js)
    const arMod = (interact.modifiers && interact.modifiers.aspectRatio)
      ? interact.modifiers.aspectRatio({ ratio: 'preserve' })
      : null;

    // drag helper
    const makeDraggable = (el) => {
      interact(el).draggable({
        ignoreFrom: '.handle',
        listeners: {
          move(event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          }
        }
      });
    };

    // resize produto proporcional
    interact(productEl).resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      allowFrom: '.handle',
      modifiers: [
        ...(arMod ? [arMod] : []),
        interact.modifiers.restrictSize({ min: { width: 60, height: 60 } }),
      ],
      listeners: {
        move(event) {
          const target = event.target;
          let x = (parseFloat(target.getAttribute('data-x')) || 0);
          let y = (parseFloat(target.getAttribute('data-y')) || 0);

          target.style.width = event.rect.width + 'px';
          target.style.height = event.rect.height + 'px';

          x += event.deltaRect.left;
          y += event.deltaRect.top;

          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        }
      }
    });

    // resize textos livre
    textEls.forEach((el) => {
      interact(el).resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        allowFrom: '.handle',
        modifiers: [
          interact.modifiers.restrictSize({ min: { width: 80, height: 40 } }),
        ],
        listeners: {
          move(event) {
            const target = event.target;
            let x = (parseFloat(target.getAttribute('data-x')) || 0);
            let y = (parseFloat(target.getAttribute('data-y')) || 0);

            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          }
        }
      });

      makeDraggable(el);
    });

    makeDraggable(productEl);

    // clique no fundo deseleciona
    canvas.addEventListener('pointerdown', () => clearSelection());
  }

  async function setupRemoveBg() {
    const btn = $('#removeBgBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const layer = $('.layer');
      const img = getProductImgFromLayer(layer);
      if (!img || !img.src) return alert('Imagem do produto não encontrada.');

      const res = await fetch(`removebg.php?image_url=${encodeURIComponent(img.src)}`, { cache: 'no-store' });
      if (!res.ok) {
        const t = await res.text();
        return alert('Erro no removebg.php:\n\n' + t.slice(0, 300));
      }
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(blob);
    });
  }

  async function setupDownload() {
    const btn = $('#download') || $('#downloadBtn');
    if (!btn) return;

    const ok = await ensureHtml2Canvas();
    if (!ok) return;

    btn.addEventListener('click', async () => {
      const canvasEl = $('#canvas');
      if (!canvasEl) return;

      canvasEl.classList.add('exporting');

      try {
        const out = await html2canvas(canvasEl, {
          backgroundColor: null,
          useCORS: true,
          allowTaint: false,
          scale: 2
        });

        // GATILHO DE DOWNLOAD ROBUSTO (toBlob -> FileReader -> DataURL)
        const fileName = `sf-story-${Date.now()}.png`;
        await new Promise((resolve) => {
          out.toBlob((blob) => {
            if (!blob) { alert('Falha ao gerar imagem.'); resolve(); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
              const a = document.createElement('a');
              a.href = e.target.result; // data:image/png;base64,...
              a.download = fileName;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                resolve();
              }, 100);
            };
            reader.readAsDataURL(blob);
          }, 'image/png', 1.0);
        });
      } catch (err) {
        console.error('Download error:', err);
      } finally {
        canvasEl.classList.remove('exporting');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await ensureInteract();
    if (!ok) {
      alert('Interact.js não carregou. Confira /story/vendor/interact.min.js');
      return;
    }

    const canvas = $('#canvas');
    let productEl = $('.layer');
    const textEls = $$('.text-layer');

    if (!canvas || !productEl) {
      alert('Não achei #canvas ou .layer no HTML.');
      return;
    }

    // se .layer for IMG, transforma em DIV.layer com IMG dentro
    productEl = wrapLayerIfImg(productEl);

    // agora pega a IMG do produto de forma segura
    const productImg = getProductImgFromLayer(productEl);

    // prepara elementos (handles + normalização)
    [productEl, ...textEls].forEach((el) => {
      normalizeAbsolute(el, canvas);
      ensureHandles(el);
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); setSelected(el); });
    });

    // Ajusta o box do produto para a proporção real da imagem no primeiro load
    if (productImg) {
      productImg.addEventListener('load', () => {
        const w = productImg.naturalWidth || 0;
        const h = productImg.naturalHeight || 0;
        if (!w || !h) return;

        const ratio = w / h;
        const currentW = productEl.getBoundingClientRect().width;
        productEl.style.width = currentW + 'px';
        productEl.style.height = Math.round(currentW / ratio) + 'px';
      }, { once: true });
    }

    setupInteract(canvas, productEl, textEls);
    setupRemoveBg();
    setupDownload();

    // Inputs -> textos (se existirem)
    const nameInput = $('#nameInput');
    const oldInput = $('#oldPriceInput');
    const newInput = $('#newPriceInput');

    const nameLayer = $('.text-layer.nome') || textEls[0] || null;
    const oldLayer = $('.text-layer.de') || textEls[1] || null;
    const newLayer = $('.text-layer.preco') || textEls[2] || textEls[1] || null;

    if (nameInput && nameLayer) {
      nameInput.value = nameLayer.textContent.trim();
      nameInput.addEventListener('input', () => nameLayer.textContent = nameInput.value);
    }
    if (oldInput && oldLayer) {
      oldInput.addEventListener('input', () => {
        const v = oldInput.value.trim();
        oldLayer.textContent = v ? `De R$ ${v}` : 'De R$ ';
      });
    }
    if (newInput && newLayer) {
      newInput.addEventListener('input', () => {
        const v = newInput.value.trim();
        newLayer.textContent = v ? `Por R$ ${v}` : 'Por R$ ';
      });
    }

    setSelected(productEl);
  });
})();
