const fs = require('fs');
const path = require('path');

const catalogoPath = path.join(__dirname, 'data', 'catalogo-produtos.json');
const outputPath = path.join(__dirname, 'data', 'superadega_prices.json');

let catalogo = [];
try {
  catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'));
} catch (e) {
  console.error('❌ Erro ao ler catalogo-produtos.json:', e);
  process.exit(1);
}

let results = [];
try {
  if (fs.existsSync(outputPath)) {
    results = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    console.log(`📂 Carregados ${results.length} resultados anteriores.`);
  }
} catch (e) {
  results = [];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

const GENERIC_SEARCH_WORDS = new Set([
  'vinho', 'vinhos', 'garrafa', 'unidade', 'bebida', 'importado',
  'tinto', 'branco', 'rose', 'rosé', 'espumante', 'licor',
  'whisky', 'wisky', 'gin', 'vodka', 'rum', 'tequila',
  'seco', 'suave', 'brut', 'demi', 'sec', 'nature',
  'ml', 'cl', 'lt', 'l', 'de', 'do', 'da', 'dos', 'das',
  'e', 'com', 'para', 'por', 'the', 'le', 'la', 'el', 'los', 'las'
]);

const NON_DECISIVE_WORDS = new Set([
  ...GENERIC_SEARCH_WORDS,
  'cabernet', 'sauvignon', 'malbec', 'merlot', 'chardonnay', 'syrah',
  'sirah', 'carmenere', 'carmener', 'pinot', 'noir', 'tempranillo',
  'tannat', 'moscatel', 'prosecco'
]);

const HARD_TERMS = [
  'reserva', 'gran reserva', 'gran', 'reserve', 'riserva',
  'dv', 'zapata', 'catena', 'angelica', 'animal', 'anubis',
  'almaviva', 'alma', 'viva', 'epu', 'sassicaia', 'purple', 'angel',
  'roble', 'crianza', 'seleccion', 'selection', 'single vineyard'
];

function normalizeText(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str = '') {
  return normalizeText(str).split(' ').filter(Boolean);
}

function extractVintage(str = '') {
  const m = normalizeText(str).match(/\b(19\d{2}|20\d{2})\b/);
  return m ? m[1] : null;
}

function extractVolumeMl(str = '') {
  const s = normalizeText(str);

  let m = s.match(/\b(\d{1,2}[.,]\d)\s*l\b/);
  if (m) {
    return Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
  }

  m = s.match(/\b(\d{2,4})\s*ml\b/);
  if (m) {
    return parseInt(m[1], 10);
  }

  m = s.match(/\b(\d{2,3})\s*cl\b/);
  if (m) {
    return parseInt(m[1], 10) * 10;
  }

  return null;
}

function buildSearchQuery(name = '') {
  const tokens = tokenize(name).filter(w => !GENERIC_SEARCH_WORDS.has(w));
  const uniq = [...new Set(tokens)];
  return uniq.slice(0, 6).join(' ');
}

function has404Page(html = '') {
  const h = normalizeText(html);
  return (
    h.includes('erro 404') ||
    h.includes('erro - 404') ||
    h.includes('a pagina que voce esta procurando nao existe') ||
    h.includes('desculpe mas a pagina que voce esta procurando nao existe')
  );
}

function hasNoSearchResults(html = '') {
  const h = normalizeText(html);
  return (
    h.includes('nao ha resultados') ||
    h.includes('nenhum resultado') ||
    h.includes('nenhum produto encontrado') ||
    h.includes('sua busca nao encontrou resultados')
  );
}

function decodeHtml(str = '') {
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parsePriceBR(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');

  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function flattenJsonLd(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.flatMap(flattenJsonLd);
  if (typeof data !== 'object') return [];

  if (Array.isArray(data['@graph'])) {
    return data['@graph'].flatMap(flattenJsonLd);
  }

  return [data];
}

function getTypeValue(item) {
  const t = item?.['@type'];
  if (Array.isArray(t)) return t.map(x => String(x).toLowerCase());
  if (t) return [String(t).toLowerCase()];
  return [];
}

function extractJsonLdBlocks(html = '') {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;

  while ((m = re.exec(html)) !== null) {
    const raw = decodeHtml(m[1]).trim();
    const parsed = safeJsonParse(raw);
    if (!parsed) continue;
    blocks.push(...flattenJsonLd(parsed));
  }

  return blocks;
}

function extractOffersArray(offers) {
  if (!offers) return [];
  if (Array.isArray(offers)) return offers.flatMap(extractOffersArray);
  if (typeof offers === 'object') {
    if (Array.isArray(offers.offers)) return offers.offers.flatMap(extractOffersArray);
    return [offers];
  }
  return [];
}

function extractProductDataFromHtml(html, fallbackUrl = '') {
  const blocks = extractJsonLdBlocks(html);

  for (const item of blocks) {
    const types = getTypeValue(item);
    if (!types.includes('product')) continue;

    const offers = extractOffersArray(item.offers);
    const prices = offers
      .map(o => parsePriceBR(o.price ?? o.lowPrice ?? o.highPrice ?? o.priceSpecification?.price))
      .filter(v => v && v > 0);

    const price = prices.length ? Math.min(...prices) : null;
    const priceOld = prices.length > 1 ? Math.max(...prices) : null;

    const availability = offers
      .map(o => o.availability || o.priceSpecification?.availability || '')
      .filter(Boolean)
      .join(' | ');

    return {
      nome: item.name || null,
      price,
      priceOld,
      url: item.url || fallbackUrl || null,
      sku: item.sku || null,
      mpn: item.mpn || null,
      gtin: item.gtin13 || item.gtin || null,
      brand: typeof item.brand === 'string' ? item.brand : item.brand?.name || null,
      availability: availability || null,
      image: Array.isArray(item.image) ? item.image[0] : item.image || null,
      source: 'jsonld'
    };
  }

  return null;
}

function extractProductLinksFromSearch(html) {
  const found = new Set();
  const links = [];

  const re = /href=["'](\/produtos\/[^"'?#]+(?:\?[^"'#]*)?)["']/gi;
  let m;

  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const full = href.startsWith('http')
      ? href
      : `https://www.superadega.com.br${href.startsWith('/') ? '' : '/'}${href}`;

    const clean = full.split('#')[0];
    if (found.has(clean)) continue;
    found.add(clean);
    links.push(clean);
  }

  return links;
}

function firstBrandTokens(name) {
  return tokenize(name).filter(w => !NON_DECISIVE_WORDS.has(w)).slice(0, 3);
}

function hardTermPresent(term, textNorm) {
  if (term.includes(' ')) return textNorm.includes(term);
  return tokenize(textNorm).includes(term);
}

function computeMatch(searchName, foundName) {
  const searchNorm = normalizeText(searchName);
  const foundNorm = normalizeText(foundName);

  const searchTokens = tokenize(searchName);
  const foundTokens = tokenize(foundName);

  const matched = searchTokens.filter(t => foundTokens.includes(t));
  let score = 0;
  const reasons = [];
  const rejects = [];

  const brandTokens = firstBrandTokens(searchName);
  if (brandTokens.length) {
    const brandHits = brandTokens.filter(t => foundTokens.includes(t));
    if (!brandHits.length) {
      rejects.push(`marca principal ausente: ${brandTokens.join(', ')}`);
      return { ok: false, score: 0, reasons, rejects };
    }
    score += brandHits.length * 20;
    reasons.push(`marca: ${brandHits.join(', ')}`);
  }

  const vintageSearch = extractVintage(searchName);
  const vintageFound = extractVintage(foundName);
  if (vintageSearch) {
    if (vintageSearch !== vintageFound) {
      rejects.push(`safra divergente: buscada ${vintageSearch}, encontrada ${vintageFound || 'sem safra'}`);
      return { ok: false, score: 0, reasons, rejects };
    }
    score += 18;
    reasons.push(`safra ok: ${vintageSearch}`);
  }

  const volSearch = extractVolumeMl(searchName);
  const volFound = extractVolumeMl(foundName);
  if (volSearch) {
    if (!volFound || Math.abs(volSearch - volFound) > 20) {
      rejects.push(`volume divergente: buscado ${volSearch}ml, encontrado ${volFound || 'sem volume'}`);
      return { ok: false, score: 0, reasons, rejects };
    }
    score += 14;
    reasons.push(`volume ok: ${volSearch}ml`);
  }

  for (const term of HARD_TERMS) {
    const sHas = hardTermPresent(term, searchNorm);
    const fHas = hardTermPresent(term, foundNorm);
    if (sHas && !fHas) {
      rejects.push(`termo crítico ausente: ${term}`);
      return { ok: false, score: 0, reasons, rejects };
    }
    if (sHas && fHas) {
      score += 10;
      reasons.push(`termo crítico ok: ${term}`);
    }
  }

  const usefulSearchTokens = searchTokens.filter(t => !GENERIC_SEARCH_WORDS.has(t));
  const usefulHits = usefulSearchTokens.filter(t => foundTokens.includes(t));
  const ratio = usefulSearchTokens.length ? usefulHits.length / usefulSearchTokens.length : 0;

  score += Math.round(ratio * 30);
  reasons.push(`ratio ${usefulHits.length}/${usefulSearchTokens.length}`);

  if (ratio < 0.5) {
    rejects.push(`similaridade insuficiente: ${ratio.toFixed(2)}`);
    return { ok: false, score, reasons, rejects };
  }

  return { ok: score >= 45, score, reasons, rejects, matched };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    return { ok: false, status: response.status, html: '' };
  }

  const html = await response.text();
  return { ok: true, status: response.status, html };
}

async function scrapeSuperAdega(productName) {
  const queryLimpa = buildSearchQuery(productName);
  const query = encodeURIComponent(queryLimpa);
  const searchUrl = `https://www.superadega.com.br/search/?q=${query}`;

  try {
    const searchResp = await fetchText(searchUrl);

    if (!searchResp.ok) {
      return {
        preco: null,
        nome_superadega: null,
        url_superadega: searchUrl,
        status: `HTTP ${searchResp.status}`,
        debug: { queryLimpa, searchUrl, etapa: 'busca' }
      };
    }

    const html = searchResp.html;

    if (has404Page(html)) {
      return {
        preco: null,
        nome_superadega: null,
        url_superadega: searchUrl,
        status: 'Busca caiu em 404',
        debug: { queryLimpa, searchUrl, pagina404: true }
      };
    }

    if (hasNoSearchResults(html)) {
      return {
        preco: null,
        nome_superadega: null,
        url_superadega: searchUrl,
        status: 'Não Encontrado',
        debug: { queryLimpa, searchUrl, semResultados: true }
      };
    }

    const productLinks = extractProductLinksFromSearch(html).slice(0, 8);

    if (!productLinks.length) {
      return {
        preco: null,
        nome_superadega: null,
        url_superadega: searchUrl,
        status: 'Sem links de produto',
        debug: { queryLimpa, searchUrl }
      };
    }

    const candidates = [];

    for (const link of productLinks) {
      await sleep(500 + Math.floor(Math.random() * 600));

      const prodResp = await fetchText(link);
      if (!prodResp.ok) continue;
      if (has404Page(prodResp.html)) continue;

      const data = extractProductDataFromHtml(prodResp.html, link);
      if (!data?.nome || !data?.price) continue;

      const match = computeMatch(productName, data.nome);
      candidates.push({
        ...data,
        match
      });
    }

    const valid = candidates
      .filter(c => c.match?.ok)
      .sort((a, b) => b.match.score - a.match.score);

    if (!valid.length) {
      return {
        preco: null,
        nome_superadega: candidates[0]?.nome || null,
        url_superadega: candidates[0]?.url || searchUrl,
        status: candidates.length ? 'Candidatos rejeitados' : 'Não Encontrado',
        debug: {
          queryLimpa,
          searchUrl,
          candidates: candidates.map(c => ({
            nome: c.nome,
            preco: c.price,
            score: c.match?.score || 0,
            reasons: c.match?.reasons || [],
            rejects: c.match?.rejects || [],
            url: c.url
          }))
        }
      };
    }

    const best = valid[0];

    return {
      preco: best.price,
      preco_de: best.priceOld || null,
      nome_superadega: best.nome,
      url_superadega: best.url,
      status: 'Encontrado',
      debug: {
        queryLimpa,
        searchUrl,
        score: best.match.score,
        reasons: best.match.reasons,
        sku: best.sku,
        brand: best.brand,
        availability: best.availability
      }
    };
  } catch (e) {
    return {
      preco: null,
      nome_superadega: null,
      url_superadega: searchUrl,
      status: `Erro: ${e.message}`,
      debug: { queryLimpa, searchUrl, exception: e.message }
    };
  }
}

function getNomeProduto(item) {
  return (
    item?.supplierName ||
    item?.nome ||
    item?.name ||
    item?.produto ||
    item?.descricao ||
    ''
  ).trim();
}

function getIdProduto(item, index) {
  return (
    item?.rowId ||
    item?.id ||
    item?.sku ||
    item?.codigo ||
    `idx_${index}`
  );
}

async function main() {
  const jaProcessados = new Set(results.map(r => String(r.id)));
  let novos = 0;

  for (let i = 0; i < catalogo.length; i++) {
    const item = catalogo[i];
    const id = String(getIdProduto(item, i));
    const nome = getNomeProduto(item);

    if (!nome) {
      console.log(`⚠️ [${i + 1}/${catalogo.length}] Produto sem nome. Pulando.`);
      continue;
    }

    if (jaProcessados.has(id)) {
      console.log(`⏭️ [${i + 1}/${catalogo.length}] Já processado: ${nome}`);
      continue;
    }

    console.log(`🔎 [${i + 1}/${catalogo.length}] Buscando: ${nome}`);

    const res = await scrapeSuperAdega(nome);

    const registro = {
      id,
      nome_catalogo: nome,
      preco_superadega: res.preco,
      preco_de_superadega: res.preco_de || null,
      nome_superadega: res.nome_superadega,
      url_superadega: res.url_superadega,
      status: res.status,
      debug: res.debug || null,
      atualizado_em: new Date().toISOString()
    };

    results.push(registro);
    novos++;

    try {
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    } catch (e) {
      console.error('❌ Erro ao salvar superadega_prices.json:', e.message);
    }

    const baseDelay = 1800 + Math.floor(Math.random() * 2200);
    await sleep(baseDelay);
  }

  console.log(`✅ Finalizado. ${novos} novos registros salvos em ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
