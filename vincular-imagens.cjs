/**
 * VINCULAR IMAGENS AOS PRODUTOS
 * Roda uma vez: node vincular-imagens.cjs
 *
 * Lê tabela_completa.json, converte o nome de cada produto em slug,
 * tenta achar o arquivo correspondente em public/imagens_produtos/
 * Prefere a versão "imagens sem fundo" quando disponível.
 */

const fs   = require('fs');
const path = require('path');

const TABELA_FILE  = path.join(__dirname, 'data', 'tabela_completa.json');
const IMG_DIR      = path.join(__dirname, 'public', 'imagens_produtos');
const SEM_FUNDO    = path.join(IMG_DIR, 'imagens sem fundo');

// ── 1. Indexa TODAS as imagens disponíveis ────────────────────────────────────
const imgIndex = {}; // slug -> url relativa

function indexarPasta(dir, prioridade) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(f)) return;
    const slug = f.toLowerCase()
      .replace(/\.(png|jpg|jpeg|webp)$/, '') // remove extensão
      .trim();
    const url = '/api/img?p=' + encodeURIComponent(f);
    // Maior prioridade sobrescreve (sem fundo > normal)
    if (!imgIndex[slug] || prioridade > (imgIndex[slug]._prio || 0)) {
      imgIndex[slug] = { url, _prio: prioridade };
    }
  });
}

indexarPasta(IMG_DIR,   1); // prioridade baixa
indexarPasta(SEM_FUNDO, 2); // prioridade alta (sem fundo)

console.log(`🖼️  ${Object.keys(imgIndex).length} imagens indexadas`);

// ── 2. Converte nome de produto em slug para busca ────────────────────────────
function toSlug(nome) {
  return (nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, ' ')  // remove especiais
    .trim()
    .replace(/\s+/g, '-');           // espaços → hifens
}

// ── 3. Busca imagem por slug com fallback por similaridade ────────────────────
function encontrarImagem(supplierName) {
  const slug = toSlug(supplierName);

  // Tentativa 1: match exato
  if (imgIndex[slug]) return imgIndex[slug].url;

  // Tentativa 2: slug do produto contido no slug da imagem
  const keys = Object.keys(imgIndex);
  const exactContains = keys.find(k => k === slug || k.startsWith(slug) || slug.startsWith(k));
  if (exactContains) return imgIndex[exactContains].url;

  // Tentativa 3: todas as palavras do produto presentes no slug da imagem
  const words = slug.split('-').filter(w => w.length > 3);
  if (words.length >= 2) {
    const partial = keys.find(k => words.every(w => k.includes(w)));
    if (partial) return imgIndex[partial].url;
  }

  // Tentativa 4: pelo menos 70% das palavras batem
  if (words.length >= 3) {
    let best = null, bestScore = 0;
    for (const k of keys) {
      const matches = words.filter(w => k.includes(w)).length;
      const score = matches / words.length;
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        best = k;
      }
    }
    if (best) return imgIndex[best].url;
  }

  return null;
}

// ── 4. Processa a tabela ──────────────────────────────────────────────────────
const tabela = JSON.parse(fs.readFileSync(TABELA_FILE, 'utf8'));

let vinculados = 0;
let semImagem  = 0;
let jaTemImagem = 0;

tabela.forEach(row => {
  // Pula se já tem imagem válida
  const imgAtual = row.image || row.imagem || '';
  if (imgAtual && (imgAtual.startsWith('/api/img') || imgAtual.startsWith('http'))) {
    jaTemImagem++;
    return;
  }

  const nome = row.supplierName || row.productName || '';
  if (!nome) { semImagem++; return; }

  const url = encontrarImagem(nome);
  if (url) {
    row.image  = url;
    row.imagem = url;
    vinculados++;
    console.log(`  ✅ ${row.rowId} | ${nome.substring(0,40).padEnd(40)} → ${url.substring(0,50)}`);
  } else {
    semImagem++;
    // Descomente para ver quais não acharam imagem:
    // console.log(`  ❌ ${row.rowId} | ${nome}`);
  }
});

// ── 5. Salva ──────────────────────────────────────────────────────────────────
fs.writeFileSync(TABELA_FILE, JSON.stringify(tabela, null, 2));

console.log('\n═══════════════════════════════════');
console.log(`✅ Vinculados:    ${vinculados}`);
console.log(`⏭️  Já tinham:     ${jaTemImagem}`);
console.log(`❌ Sem imagem:    ${semImagem}`);
console.log(`📦 Total:         ${tabela.length}`);
console.log('═══════════════════════════════════');
console.log('\n✅ tabela_completa.json atualizado!');
console.log('🔄 Reinicie o servidor: node server-simple.cjs');
