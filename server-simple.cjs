const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
require('dotenv').config();
const { Groq } = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const stringSimilarity = require("string-similarity");
const axios = require("axios");
const sharp = require("sharp");

const app = express();
const PORT = 3002;
const upload = multer({ dest: 'uploads/' });
const memoryUpload = multer({ storage: multer.memoryStorage() });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || "missing_key");

app.use(cors({ origin: '*' }));

app.use((req, res, next) => {
  if (req.url.includes('marques')) console.log('[GLOBAL LOGGER]', req.url);
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ── FUZZY STATIC MIDDLEWARE ──────────────────────────────────────────────────
// Se uma imagem não for encontrada exatamente em /imagens_produtos ou /imagens_sem_fundo,
// tentamos encontrar um arquivo com nome muito similar (ex: cdigo vs codigo).
const fuzzyStatic = (basePath) => (req, res, next) => {
  const requestedFile = decodeURIComponent(req.path.replace(/^\//, ''));
  const fullPath = path.join(basePath, requestedFile);

  if (fs.existsSync(fullPath)) return next(); // Encontrou exato, deixa o express.static tratar

  // Não encontrou? Tenta Fuzzy Match
  try {
    const files = fs.readdirSync(basePath).filter(f => fs.lstatSync(path.join(basePath, f)).isFile());
    if (files.length === 0) return next();

    const matches = stringSimilarity.findBestMatch(requestedFile.toLowerCase(), files.map(f => f.toLowerCase()));
    const best = matches.bestMatch;

    if (best.rating > 0.85) {
      // Encontrou um similar! Usamos o nome original do arquivo (com case correto)
      const actualFile = files[matches.bestMatchIndex];
      console.log(`🔍 [Fuzzy Match Static] "${requestedFile}" -> "${actualFile}" (Rating: ${best.rating.toFixed(2)})`);
      return res.sendFile(path.join(basePath, actualFile));
    }

    // Fallback final para produto.png se for uma requisição de imagem de produto
    const placeholder = path.join(__dirname, 'public', 'produto.png');
    if (fs.existsSync(placeholder)) {
      console.log(`ℹ️ [Fuzzy Static] Servindo placeholder para: ${requestedFile}`);
      return res.sendFile(placeholder);
    }
  } catch (err) {
    console.error('[Fuzzy Static Error]', err.message);
  }
  next();
};

// Serve static files from root, public and dist
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// Serve imagens com tratamento de subpastas e espaços
const IMAGENS_PRODUTOS_DIR = path.join(__dirname, 'public', 'imagens_produtos');
const IMAGENS_SEM_FUNDO_DIR = "c:/app precificador/precificador-sfimports/imagens sem fundo";

app.use('/imagens_produtos', fuzzyStatic(IMAGENS_PRODUTOS_DIR), express.static(IMAGENS_PRODUTOS_DIR));
app.use('/imagens_produtos_root', express.static(path.join(__dirname, 'imagens_produtos'))); // Acesso aos prints na raiz
app.use('/imagens_sem_fundo', fuzzyStatic(IMAGENS_SEM_FUNDO_DIR), express.static(IMAGENS_SEM_FUNDO_DIR));
app.use('/crops', express.static(path.join(__dirname, 'public', 'uploads', 'crops')));
app.use('/uploads/crops', express.static(path.join(__dirname, 'public', 'uploads', 'crops'))); // Fix para os dois caminhos

const DATA_DIR = path.join(__dirname, 'data');
const TABELA_FILE = path.join(DATA_DIR, 'tabela_completa.json');
const CATALOGO_FILE = path.join(DATA_DIR, 'catalogo-produtos.json');
const CROPS_DIR = path.join(__dirname, 'public', 'uploads', 'crops');
const SCRAPING_SUMMARY_FILE = path.join(DATA_DIR, 'scraping-summary.json');

// Garantir que pastas existam
if (!fs.existsSync(CROPS_DIR)) fs.mkdirSync(CROPS_DIR, { recursive: true });
if (!fs.existsSync(IMAGENS_SEM_FUNDO_DIR)) {
  fs.mkdirSync(IMAGENS_SEM_FUNDO_DIR, { recursive: true });
}
const ALIASES_FILE = path.join(DATA_DIR, 'ocr_aliases.json');
const BRASILIA_BASE_DIR = path.join(DATA_DIR, 'brasilia_rep');
// IMAGENS_SEM_FUNDO_DIR ja declarada acima

const stopWordsGlobal = new Set([
  'vinho', 'wine', 'seco', 'suave', 'espumante',
  'champagne', 'champanhe', 'espumoso',
  'gran', 'grande', 'especial', 'premium',
  'classic', 'classico', 'limited', 'edition',
  'tt', 'bco', 'tto', 'bra', 'arg', 'chi', 'ita', 'esp', 'por',
  '750ml', '750', '375ml', 'ml', 'litro', 'garrafa',
  'de', 'do', 'da', 'dos', 'das', 'e', 'com', 'by',
  'le', 'los', 'las', 'el', 'the', 'di', 'del', 'della', 'du'
]);

// 🍷 NORMALIZAÇÃO OFICIAL DO SÉRGIO (vinhos e destilados)
function normalizar(texto) {
    if (!texto) return "";
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\bvinho\b/gi, "")      // Tira a palavra "vinho"
        .replace(/\btto\b/gi, "tinto")    // TT/TTO -> Tinto
        .replace(/\btt\b/gi, "tinto")
        .replace(/\bbco\b/gi, "branco")   // bco -> branco
        .replace(/\brose\b/gi, "rose")
        .replace(/[^\w\s]/g, " ")        // Remove pontuação
        .replace(/\s+/g, " ")            // Remove espaços duplos
        .trim();
}

// 🏷️ DETECTOR DE MARCAS
function detectarMarca(nome) {
  const marcas = (marcasConhecidas || []);
  const texto = normalizar(nome);
  for (const marca of marcas) {
    if (texto.includes(marca)) return marca;
  }
  return null;
}

// 🏷️ BANCO DE MARCAS E INDEXAÇÃO DE IMAGENS
const MARCAS_FILE = path.join(__dirname, 'marcas.json');
let marcasConhecidas = [];
let bancoImagensLocal = [];

function carregarMarcas() {
  try {
    if (fs.existsSync(MARCAS_FILE)) {
      marcasConhecidas = JSON.parse(fs.readFileSync(MARCAS_FILE, 'utf8'));
    }
  } catch (e) { console.error('Erro ao carregar marcas:', e.message); }
}

function indexarImagensLocais() {
  try {
    if (fs.existsSync(IMAGENS_SEM_FUNDO_DIR)) {
      const arquivos = fs.readdirSync(IMAGENS_SEM_FUNDO_DIR);
      bancoImagensLocal = arquivos
        .filter(arq => !fs.lstatSync(path.join(IMAGENS_SEM_FUNDO_DIR, arq)).isDirectory())
        .map(arq => ({
          arquivo: arq,
          nomeNorm: normalizar(arq.replace(/\.[^/.]+$/, ""))
        }));
      console.log(`📑 [Indexador] ${bancoImagensLocal.length} imagens indexadas.`);
    }
  } catch (e) { console.error('Erro ao indexar imagens:', e.message); }
}

// Inicializa marcas e indexador
carregarMarcas();
indexarImagensLocais();

const extrairPalavrasChave = (nomeStr) => {
  if (!nomeStr) return [];
  return nomeStr
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWordsGlobal.has(w));
};

const calcularScoreCompatibilidade = (nomeBuscado, nomeEncontrado) => {
  const chavesBuscado = extrairPalavrasChave(nomeBuscado);
  const chavesEncontrado = extrairPalavrasChave(nomeEncontrado);
  const conjuntoEncontrado = new Set(chavesEncontrado);

  if (chavesBuscado.length === 0) return 0;

  const uvas = new Set(['malbec', 'cabernet', 'sauvignon', 'merlot', 'syrah', 'shiraz',
    'chardonnay', 'pinot', 'noir', 'grigio', 'gris', 'tempranillo', 'carmenere',
    'tannat', 'bonarda', 'torrontes', 'riesling', 'viognier', 'moscato', 'prosecco',
    'sangiovese', 'nebbiolo', 'barbera', 'primitivo', 'montepulciano', 'petit', 'verdot']);

  // Identificação de "Segundos Vinhos" ou linhas de entrada que causam confusão
  const termosDiferenciadores = ['vigneto', 'reserva', 'gran', 'velhas', 'vinhas', 'secondo', 'petit', 'le volte', 'serre nuove', 'sarget', 'epu', 'milla cala', 'alphina', 'escorihuela', 'gascon'];

  const marcasBuscado = chavesBuscado.filter(w => !uvas.has(w));
  const uvasBuscado = chavesBuscado.filter(w => uvas.has(w));

  let score = 0;

  // 1. Verificação de Marca (Flexível para vinhos de luxo)
  if (marcasBuscado.length > 0) {
    const brandMatches = marcasBuscado.filter(w => conjuntoEncontrado.has(w));

    // Se não bateu NADA das marcas, zero na hora
    if (brandMatches.length === 0) return 0;

    // Heurística de Palavra Principal (Chateau, Domaine, Tenuta são genéricos)
    const genericos = new Set(['chateau', 'domaine', 'tenuta', 'vina', 'bodega', 'quinta', 'herdade', 'casa']);
    let palavraPrincipal = marcasBuscado[0];
    if (genericos.has(palavraPrincipal) && marcasBuscado.length > 1) {
      palavraPrincipal = marcasBuscado[1];
    }

    // A palavra principal (ou a segunda se a primeira for genérica) DEVE estar presente
    if (!conjuntoEncontrado.has(palavraPrincipal) && !brandMatches.some(m => genericos.has(m) === false)) {
      return 0;
    }

    // Se a marca tem várias palavras, exigimos pelo menos 50% de overlap
    const ratio = brandMatches.length / marcasBuscado.length;
    if (marcasBuscado.length >= 2 && ratio < 0.5) return 0;

    score += Math.round(ratio * 50);
  }

  // 2. Verificação de "Second Wine" vs "Grand Vin" (CRÍTICO)
  // Usamos regex para garantir que o termo é uma palavra inteira (evita bater 'petit' dentro de outro nome)
  for (const termo of termosDiferenciadores) {
    const regex = new RegExp(`\\b${termo}\\b`, 'i');
    const temBuscado = regex.test(nomeBuscado);
    const temEncontrado = regex.test(nomeEncontrado);
    if (temBuscado !== temEncontrado) {
      return 0; // Se um tem o diferenciador e o outro não, são vinhos diferentes
    }
  }

  // 3. Verificação de Uva
  if (uvasBuscado.length > 0) {
    const todasUvasBatem = uvasBuscado.every(u => conjuntoEncontrado.has(u));
    if (!todasUvasBatem) return 0;
    score += 30;
  }

  const diffLen = Math.abs(nomeEncontrado.length - nomeBuscado.length);
  score += Math.max(0, 20 - (diffLen / 2));

  return score;
};

// ... ENDPOINT: lista todas as imagens sem fundo disponíveis no servidor
app.get('/api/listar-imagens-sem-fundo', (req, res) => {
  try {
    const dir = IMAGENS_SEM_FUNDO_DIR;
    if (!fs.existsSync(dir)) return res.json({ success: true, imagens: [] });
    const exts = ['.png', '.jpg', '.jpeg', '.webp'];
    const files = fs.readdirSync(dir)
      .filter(f => exts.includes(path.extname(f).toLowerCase()))
      .map(f => ({ nome: f, url: `/imagens_sem_fundo/${f}` }));
    res.json({ success: true, imagens: files });
  } catch (e) {
    res.json({ success: false, imagens: [], error: e.message });
  }
});

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 🔍 BUSCA LOCAL CENTRALIZADA (Single Source)
function buscarImagemLocal(nomeProduto) {
    const produtoNorm = normalizar(nomeProduto);
    let melhorArquivo = null;
    let melhorScore = 0;

    // 1. Tenta por produto específico (todas as palavras batendo)
    const palavrasProduto = produtoNorm.split(" ").filter(p => p.length >= 3);
    
    for (const img of bancoImagensLocal) {
        let score = 0;
        for (const p of palavrasProduto) {
            if (img.nomeNorm.includes(p)) score++;
        }
        
        if (score > melhorScore) {
            melhorScore = score;
            melhorArquivo = img.arquivo;
        }
    }

    if (melhorScore >= 2) {
        return "/imagens_sem_fundo/" + melhorArquivo;
    }

    // 2. Fallback: Busca por Marca
    const marca = detectarMarca(nomeProduto);
    if (marca) {
        const porMarca = bancoImagensLocal.find(img => img.nomeNorm.includes(marca));
        if (porMarca) return "/imagens_sem_fundo/" + porMarca.arquivo;
    }

    return null;
}

async function downloadImage(url, dest) {
  const https = require('https');
  const http = require('http');
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      }
    };

    protocol.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Request Failed With Status Code: ${res.statusCode}`));
      }

      res.pipe(fs.createWriteStream(dest))
        .on('error', reject)
        .once('close', () => resolve(dest));
    }).on('error', reject);
  });
}

// --- HELPERS DE DADOS ---
async function readTabela(retryCount = 3) {
  for (let i = 0; i < retryCount; i++) {
    try {
      if (!fs.existsSync(TABELA_FILE)) return [];
      const data = fs.readFileSync(TABELA_FILE, 'utf8');
      if (!data || data.trim() === '') return [];
      return JSON.parse(data);
    } catch (err) {
      console.error(`⚠️ [readTabela] Tentativa ${i + 1} falhou:`, err.message);
      if (i === retryCount - 1) {
        console.error('❌ [readTabela] Erro crítico após retentativas:', err.message);
        throw err;
      }
      // Pequena espera antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// --- HELPERS DE RESUMO DE RASPAGEM ---
function readScrapingSummary() {
  try {
    if (!fs.existsSync(SCRAPING_SUMMARY_FILE)) {
      return {
        updatedAt: new Date().toISOString(),
        fontes: [
          { fonte: 'vivino', status: 'sem_dados', ultimaAtualizacao: null, totalProcessados: 0, alteracoesPreco: 0, erros: 0, semMatch: 0, resumo: 'Aguardando execução', itens: [] },
          { fonte: 'superadega', status: 'sem_dados', ultimaAtualizacao: null, totalProcessados: 0, alteracoesPreco: 0, erros: 0, semMatch: 0, resumo: 'Aguardando execução', itens: [] },
          { fonte: 'milao', status: 'sem_dados', ultimaAtualizacao: null, totalProcessados: 0, alteracoesPreco: 0, erros: 0, semMatch: 0, resumo: 'Aguardando execução', itens: [] }
        ]
      };
    }
    const data = fs.readFileSync(SCRAPING_SUMMARY_FILE, 'utf8');
    if (!data || data.trim() === '') {
      throw new Error('Arquivo de resumo vazio');
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ [readScrapingSummary] Erro:', err.message);
    // Retorna fallback seguro
    return {
      updatedAt: new Date().toISOString(),
      fontes: [
        { fonte: 'vivino', status: 'sem_dados', ultimaAtualizacao: null, totalProcessados: 0, alteracoesPreco: 0, erros: 0, semMatch: 0, resumo: 'Erro ao ler arquivo', itens: [] },
        { fonte: 'superadega', status: 'sem_dados', ultimaAtualizacao: null, totalProcessados: 0, alteracoesPreco: 0, erros: 0, semMatch: 0, resumo: 'Erro ao ler arquivo', itens: [] },
        { fonte: 'milao', status: 'sem_dados', ultimaAtualizacao: null, totalProcessados: 0, alteracoesPreco: 0, erros: 0, semMatch: 0, resumo: 'Erro ao ler arquivo', itens: [] }
      ]
    };
  }
}

function writeScrapingSummary(summary) {
  try {
    fs.writeFileSync(SCRAPING_SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('❌ [writeScrapingSummary] Erro:', err.message);
    return false;
  }
}

function updateScrapingSummarySource(data) {
  try {
    let summary = readScrapingSummary();
    const idx = summary.fontes.findIndex(f => f.fonte === data.fonte);

    const sourceData = {
      fonte: data.fonte,
      status: data.status || 'ok',
      ultimaAtualizacao: new Date().toISOString(),
      totalProcessados: data.totalProcessados || 0,
      alteracoesPreco: data.alteracoesPreco || 0,
      erros: data.erros || 0,
      semMatch: data.semMatch || 0,
      resumo: data.resumo || '',
      itens: data.itens || []
    };

    if (idx !== -1) {
      summary.fontes[idx] = sourceData;
    } else {
      summary.fontes.push(sourceData);
    }

    summary.updatedAt = new Date().toISOString();
    writeScrapingSummary(summary);
    return true;
  } catch (err) {
    console.error('❌ [updateScrapingSummarySource] Erro:', err.message);
    return false;
  }
}

async function writeTabela(dados) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TABELA_FILE, JSON.stringify(dados, null, 2));
    return true;
  } catch (err) {
    console.error('❌ Erro ao gravar tabela:', err.message);
    return false;
  }
}

async function readCatalogo() {
  try {
    const data = fs.readFileSync(CATALOGO_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function writeCatalogo(dados) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CATALOGO_FILE, JSON.stringify(dados, null, 2));
    return true;
  } catch (err) {
    return false;
  }
}

// --- ENDPOINT: TABELA COMPLETA (CRUD BASE) ---
app.get('/api/tabela-completa', async (req, res) => {
  try {
    // 🛡️ Prevenir cache do navegador para evitar carregar dados defasados (F5 issue)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const dados = await readTabela();
    res.json(dados);
  } catch (error) {
    console.error('❌ Erro no GET /api/tabela-completa:', error.message);
    res.status(500).json({ error: 'Erro ao buscar tabela: ' + error.message });
  }
});

app.post('/api/tabela-completa', async (req, res) => {
  try {
    const dados = req.body;
    await writeTabela(dados);
    res.status(201).json({ success: true, message: 'Tabela completa salva com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar tabela' });
  }
});

// --- ENDPOINTS: RESUMO DE RASPAGEM ---
app.get('/api/scraping-summary', (req, res) => {
  try {
    const summary = readScrapingSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler resumo de raspagem' });
  }
});

app.post('/api/scraping-summary', (req, res) => {
  try {
    const summary = req.body;
    if (!summary || !summary.fontes) {
      return res.status(400).json({ error: 'Formato de resumo inválido' });
    }
    writeScrapingSummary(summary);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar resumo de raspagem' });
  }
});

app.post('/api/scraping-summary/update-source', (req, res) => {
  try {
    const data = req.body;
    if (!data.fonte) return res.status(400).json({ error: 'Fonte não especificada' });

    updateScrapingSummarySource(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar fonte de raspagem' });
  }
});

// --- ENDPOINT: CATÁLOGO ---
app.get('/api/catalogo-data', async (req, res) => {
  try {
    const dados = await readCatalogo();
    res.json(dados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do catálogo' });
  }
});

app.post('/api/catalogo-sync', async (req, res) => {
  try {
    const novosDados = req.body;
    await writeCatalogo(novosDados);
    res.status(201).json({ success: true, message: 'Catálogo sincronizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao sincronizar catálogo' });
  }
});

// --- VALIDAÇÃO DE IMAGENS EM LOTE ---
app.post('/api/validar-imagens', (req, res) => {
  try {
    const { paths: reqPaths } = req.body; // array de caminhos relativos ou urls
    if (!reqPaths || !Array.isArray(reqPaths)) return res.json({ existe: [], naoExiste: [] });

    const existe = [];
    const naoExiste = [];
    const imgDir = path.join(__dirname, 'public');
    const semFundoDir = path.join(__dirname, 'public', 'imagens_produtos', 'imagens sem fundo');

    const stringSimilarity = require('string-similarity');

    const normalize = (str) => typeof str === 'string' ? str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/nhno/g, 'nho')
      .replace(/franes/g, 'frances')
      .replace(/ptit/g, 'petit')
      .replace(/tint\b/g, 'tinto')
      .replace(/\s+/g, ' ')
      .trim() : '';

    let filesList = [];
    if (fs.existsSync(semFundoDir)) {
      filesList = fs.readdirSync(semFundoDir);
    }

    for (const p of reqPaths) {
      if (!p) continue;
      // remove parâmetros ?v=... e remove http://localhost:3000
      let localPath = p.split('?')[0].replace(/^https?:\/\/[^\/]+/i, '');

      try {
        localPath = decodeURIComponent(localPath);
      } catch (e) { }

      const fullPath = path.join(imgDir, localPath);

      if (fs.existsSync(fullPath)) {
        existe.push(p);
        continue;
      }

      // Check fuzzy if it's in the imagens sem fundo dir
      if (localPath.includes('imagens sem fundo')) {
        const requestedFile = localPath.split('imagens sem fundo/').pop();
        if (requestedFile) {
          const requestedName = requestedFile.replace(/\.[^/.]+$/, '').toLowerCase();
          const searchStr = requestedName.replace(/^(vinho|tinto|branco|rose|espumante|-)+\s*/gi, '').replace(/-/g, ' ').trim();

          let bestMatch = null;
          let bestScore = 0;

          for (const f of filesList) {
            const fileNameNoExt = f.replace(/\.[^/.]+$/, '').toLowerCase().replace(/-/g, ' ');
            const score = stringSimilarity.compareTwoStrings(normalize(searchStr), normalize(fileNameNoExt));
            if (score > bestScore) {
              bestScore = score;
              bestMatch = f;
            }
          }

          if (bestMatch && bestScore > 0.55) {
            existe.push(p);
            continue;
          }
        }
      }

      naoExiste.push(p);
    }

    res.json({ existe, naoExiste });
  } catch (err) {
    console.error('Erro /api/validar-imagens:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});


// --- GESTÃO DE IMAGENS (SOLUÇÃO CLAUDE + GEMINI + FUZZY MATCH) ---
app.use('/imagens_sem_fundo', express.static(path.join(__dirname, 'public', 'imagens_produtos', 'imagens sem fundo')));

// MIDDLEWARE INTERCEPTADOR PARA IMAGENS FALTANTES (FUZZY MATCH)
app.use('/imagens_produtos', (req, res, next) => {
  try {
    const fullUrl = decodeURIComponent(req.url); // Decodifica %20 e afins

    // Só atuar se for dentro de 'imagens sem fundo' e se a extensão for de imagem
    if (!fullUrl.includes('/imagens sem fundo/') || !fullUrl.match(/\.(png|jpe?g|webp|gif)$/i)) {
      return next();
    }

    const requestedFile = fullUrl.split('/imagens sem fundo/').pop();
    const requestedName = requestedFile.replace(/\.[^/.]+$/, '').toLowerCase();

    if (!requestedName) return next();

    const imgDir = path.join(__dirname, 'public', 'imagens_produtos', 'imagens sem fundo');
    if (!fs.existsSync(imgDir)) return next();

    // Primeiro, verifica se o arquivo exato existe. Se sim, deixa o express.static servir.
    if (fs.existsSync(path.join(imgDir, requestedFile))) return next();

    const files = fs.readdirSync(imgDir);
    let bestMatch = null;
    let bestScore = 0;

    // Remove prefixos genéricos
    const searchStr = requestedName.replace(/^(vinho|tinto|branco|rose|espumante|-)+\s*/gi, '').replace(/-/g, ' ').trim();

    // Normalização agressiva para lidar com acentos e erros comuns (vinhno vs vinho)
    const normalize = (str) => str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/nhno/g, 'nho')
      .replace(/franes/g, 'frances')
      .replace(/ptit/g, 'petit')
      .replace(/tint\b/g, 'tinto')
      .replace(/\s+/g, ' ')
      .trim();

    files.forEach(file => {
      const fileNameNoExt = file.replace(/\.[^/.]+$/, '').toLowerCase().replace(/-/g, ' ');
      const normalizedFile = normalize(fileNameNoExt);
      const normalizedSearch = normalize(searchStr);

      const score = stringSimilarity.compareTwoStrings(normalizedSearch, normalizedFile);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = file;
      }
    });

    console.log(`🔍 [Fuzzy Match] Solicitado: ${requestedName} | Melhor ID: ${bestMatch} (${Math.round(bestScore * 100)}%)`);

    if (bestMatch && bestScore > 0.55) {
      // Retorna a imagem recuperada
      return res.sendFile(path.join(imgDir, bestMatch));
    }
  } catch (err) {
    console.error('Erro no interceptador fuzzy:', err);
  }
  next();
});

// 1. Tenta servir a imagem exata primeiro
app.use('/imagens_produtos', express.static(path.join(__dirname, 'public', 'imagens_produtos')));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// --- ENDPOINT: ATUALIZA COLUNA INSTAGRAM NA PLANILHA MÃE ---
app.post('/api/update-instagram-column', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0)
      return res.status(400).json({ error: 'updates deve ser um array' });

    const tabela = await readTabela();
    let atualizados = 0;

    updates.forEach(({ rowId, novoPrecoInstagram, novoPrecoMilaoDe }) => {
      const idx = tabela.findIndex(r => r.rowId === rowId);
      if (idx !== -1) {
        tabela[idx].instagram = novoPrecoInstagram;
        tabela[idx].instagramAtualizadoEm = new Date().toISOString();

        // Se vier o preço riscado (Milao De), atualiza também
        if (novoPrecoMilaoDe !== undefined && novoPrecoMilaoDe !== null) {
          tabela[idx].milaoDe = novoPrecoMilaoDe;
        }

        atualizados++;
        console.log(`✅ [Sync] Atualizando ${rowId} -> Insta: R$ ${novoPrecoInstagram}${novoPrecoMilaoDe ? `, MilaoDe: R$ ${novoPrecoMilaoDe}` : ''}`);
      } else {
        console.warn(`⚠️ [Instagram] rowId não encontrado: ${rowId}`);
      }
    });

    await writeTabela(tabela);
    console.log(`💰 [Instagram] ${atualizados} preço(s) salvos no JSON`);
    res.json({ success: true, atualizados });
  } catch (error) {
    console.error('❌ [Instagram] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- HELPERS: CADASTRO COMPLETO NA TABELA MÃE ---
function toNumberSafe(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function toUpperSafe(value) {
  return String(value || '').trim().toUpperCase();
}

function mergeProductMetadata(base = {}, extra = {}) {
  return {
    ...base,
    ...extra,
    source: extra.source || base.source || 'milao',
    updatedAt: new Date().toISOString()
  };
}

function buildTabelaMaeEntry(novoProd = {}, nextId = 1) {
  const nome = String(novoProd.nome || novoProd.supplierName || novoProd.productName || '').trim();
  const precoDe = toNumberSafe(novoProd.preco_de ?? novoProd.precoDe ?? novoProd.milao_de ?? novoProd.milaoDe ?? 0);
  const precoPor = toNumberSafe(novoProd.preco_por ?? novoProd.precoPor ?? novoProd.milao_por ?? novoProd.milaoPor ?? novoProd.instagram ?? 0);
  const tipoBebida = String(novoProd.tipo || novoProd.tipoBebida || novoProd.beverageType || 'geral').trim();
  const categoria = String(novoProd.categoria || novoProd.category || tipoBebida || 'geral').trim();
  const imagem = novoProd.imagem || novoProd.image || '';
  const descricao = novoProd.descricao || novoProd.description || '';
  const pais = novoProd.pais || novoProd.country || '';
  const regiao = novoProd.regiao || novoProd.region || '';
  const uva = novoProd.uva || novoProd.grapes || '';
  const safra = novoProd.safra || '';
  const teorAlcoolico = novoProd.teor_alcoolico || novoProd.teorAlcoolico || novoProd.alcoholContent || '';
  const volumeMl = toNumberSafe(novoProd.volume_ml ?? novoProd.volumeMl ?? 0);
  const tipoVenda = novoProd.tipo_venda || novoProd.tipoVenda || '';
  const produtor = novoProd.produtor || '';
  const harmonizacao = novoProd.harmonizacao || '';
  const subcategoria = novoProd.subcategoria || novoProd.subCategory || '';
  const rowId = `produto-${nextId}`;

  return {
    rowId,
    id: nextId,
    supplierName: toUpperSafe(nome),
    productName: nome,
    sfDe: precoDe,
    sfPor: precoPor,
    sfFinal: precoPor,
    image: imagem,
    description: descricao,
    category: categoria || 'geral',
    subcategory: subcategoria,
    tipoBebida,
    tipoVenda,
    status: 'milao-only',
    hasMilao: true,
    milaoDe: precoDe,
    milaoPor: precoPor,
    hasSF: false,
    isLinked: false,
    instagram: precoPor,
    instagramAtualizadoEm: new Date().toISOString(),
    pais,
    country: pais,
    regiao,
    region: regiao,
    uva,
    grapes: uva,
    teorAlcoolico,
    alcoholContent: teorAlcoolico,
    safra,
    volumeMl,
    produtor,
    harmonizacao,
    metadata: mergeProductMetadata(novoProd.metadata || {}, {
      source: 'milao',
      milaoId: novoProd.sourceId || novoProd.milaoId || novoProd.idExterno || null,
      categoriaOriginal: novoProd.categoria || categoria || '',
      tipoVenda,
      pais,
      regiao,
      uva,
      teorAlcoolico,
      safra,
      volumeMl,
      produtor,
      harmonizacao
    })
  };
}

function applyMilaoDataToTabelaEntry(entry = {}, novoProd = {}) {
  const precoDe = toNumberSafe(novoProd.preco_de ?? novoProd.precoDe ?? novoProd.milao_de ?? novoProd.milaoDe ?? entry.milaoDe ?? 0);
  const precoPor = toNumberSafe(novoProd.preco_por ?? novoProd.precoPor ?? novoProd.milao_por ?? novoProd.milaoPor ?? entry.milaoPor ?? 0);
  const pais = novoProd.pais || novoProd.country || entry.pais || entry.country || '';
  const regiao = novoProd.regiao || novoProd.region || entry.regiao || entry.region || '';
  const uva = novoProd.uva || novoProd.grapes || entry.uva || entry.grapes || '';
  const teorAlcoolico = novoProd.teor_alcoolico || novoProd.teorAlcoolico || novoProd.alcoholContent || entry.teorAlcoolico || entry.alcoholContent || '';
  const volumeMl = toNumberSafe(novoProd.volume_ml ?? novoProd.volumeMl ?? entry.volumeMl ?? 0);
  const categoria = novoProd.categoria || novoProd.category || entry.category || '';
  const tipoBebida = novoProd.tipo || novoProd.tipoBebida || novoProd.beverageType || entry.tipoBebida || '';
  const tipoVenda = novoProd.tipo_venda || novoProd.tipoVenda || entry.tipoVenda || '';
  const descricaoNova = String(novoProd.descricao || novoProd.description || '').trim();
  const descricaoAtual = String(entry.description || '').trim();
  const imagemNova = novoProd.imagem || novoProd.image || '';

  const atualizado = {
    ...entry,
    supplierName: toUpperSafe(novoProd.nome || novoProd.supplierName || entry.productName || entry.supplierName || ''),
    productName: String(novoProd.nome || novoProd.supplierName || entry.productName || entry.supplierName || '').trim(),
    description: descricaoNova.length > descricaoAtual.length ? descricaoNova : descricaoAtual,
    image: entry.image || imagemNova,
    category: categoria || entry.category || 'geral',
    subcategory: novoProd.subcategoria || entry.subcategory || '',
    tipoBebida: tipoBebida || entry.tipoBebida || '',
    tipoVenda: tipoVenda || entry.tipoVenda || '',
    hasMilao: true,
    milaoDe: precoDe,
    milaoPor: precoPor,
    pais,
    country: pais,
    regiao,
    region: regiao,
    uva,
    grapes: uva,
    teorAlcoolico,
    alcoholContent: teorAlcoolico,
    safra: novoProd.safra || entry.safra || '',
    volumeMl: volumeMl || entry.volumeMl || 0,
    produtor: novoProd.produtor || entry.produtor || '',
    harmonizacao: novoProd.harmonizacao || entry.harmonizacao || '',
    metadata: mergeProductMetadata(entry.metadata || {}, {
      ...(novoProd.metadata || {}),
      source: 'milao',
      milaoId: novoProd.sourceId || novoProd.milaoId || entry.metadata?.milaoId || null,
      milaoSyncAt: new Date().toISOString(),
      categoriaOriginal: novoProd.categoria || categoria || entry.metadata?.categoriaOriginal || '',
      tipoVenda: tipoVenda || entry.metadata?.tipoVenda || ''
    })
  };

  if (!entry.instagram || entry.status === 'milao-only') {
    atualizado.instagram = precoPor;
    atualizado.instagramAtualizadoEm = new Date().toISOString();
  }

  if (!entry.status || entry.status === 'milao-only') {
    atualizado.status = 'milao-only';
  }

  return atualizado;
}

// --- ENDPOINT: PERSISTIR NOVO PRODUTO NA TABELA MÃE ---
app.post('/api/persist-product', async (req, res) => {
  try {
    const novoProd = req.body || {};
    const tabela = await readTabela();

    const lastId = tabela.reduce((max, r) => {
      const id = parseInt(String(r.rowId || '').replace('produto-', ''));
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);

    const entry = buildTabelaMaeEntry(novoProd, lastId + 1);
    tabela.push(entry);
    const writeResult = await writeTabela(tabela);

    if (writeResult) {
      console.log(`✅ [Produto] Cadastro PERSISTIDO com sucesso: ${entry.supplierName} (${entry.rowId})`);
      res.json({ success: true, rowId: entry.rowId, product: entry });
    } else {
      throw new Error("Falha ao escrever no arquivo tabela_completa.json");
    }
  } catch (error) {
    console.error('❌ [Persist] Erro Crítico ao salvar produto:', error.message);
    res.status(500).json({ success: false, message: "Erro interno ao persistir produto: " + error.message });
  }
});

// --- ENDPOINT: LEARN MATCH (OCR ALIASES) ---
app.post('/api/learn-match', async (req, res) => {
  try {
    const { ocrName, rowId } = req.body;
    if (!ocrName || !rowId) return res.status(400).json({ error: 'ocrName e rowId são obrigatórios' });

    let aliases = {};
    if (fs.existsSync(ALIASES_FILE)) {
      try {
        aliases = JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8'));
      } catch (e) {
        console.error('Erro ao ler aliases:', e);
      }
    }

    // Normaliza a chave para evitar problemas de case/espaço
    const key = ocrName.toUpperCase().trim();
    aliases[key] = rowId;

    fs.writeFileSync(ALIASES_FILE, JSON.stringify(aliases, null, 2));
    console.log(`🧠 [Learn] Mapeado: "${key}" -> ${rowId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Learn] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/buscar-imagem-vivino', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ success: false, message: 'Query é obrigatória' });

  try {
    // Vivino exige pelo menos um filtro para não dar erro 400.
    // Tipos: 1=Tinto, 2=Branco, 3=Espumante, 4=Rosé, 7=Sobremesa, 24=Fortificado.
    const filters = 'wine_type_ids[]=1&wine_type_ids[]=2&wine_type_ids[]=3&wine_type_ids[]=4&wine_type_ids[]=7&wine_type_ids[]=24';
    const url = `https://www.vivino.com/api/explore/explore?language=pt&q=${encodeURIComponent(query)}&country_code=br&currency_code=BRL&page=1&facets=true&${filters}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.vivino.com/',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) throw new Error(`Vivino API error: ${response.status}`);

    const data = await response.json();

    // Vivino structure as reported by browser inspection
    const exploreVintage = data.explore_vintage || {};
    const matches = exploreVintage.matches || [];
    let imageUrl = null;

    if (matches.length > 0) {
      const first = matches[0];
      // O campo 'location' geralmente tem a URL da imagem da garrafa
      imageUrl = first.vintage?.image?.location || first.wine?.image?.location;

      // Fallback para variações se location falhar
      if (!imageUrl && first.vintage?.image?.variations) {
        imageUrl = first.vintage.image.variations.bottle_large || first.vintage.image.variations.label_medium;
      }

      if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
    }

    if (!imageUrl) {
      return res.json({ success: false, message: 'Nenhuma imagem encontrada no Vivino' });
    }

    const slug = slugify(query);
    const fileName = `${slug}.png`;
    const filePath = path.join(IMAGENS_SEM_FUNDO_DIR, fileName);

    console.log(`[Vivino] Image found: ${imageUrl}. Downloading to ${fileName}...`);
    await downloadImage(imageUrl, filePath);

    res.json({
      success: true,
      path: `/imagens_produtos/imagens sem fundo/${fileName}`,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('❌ [Vivino] Erro ao buscar imagem:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- ENDPOINT: IDENTIFICAR PRODUTO VIA IA (Usado pelo StoreMaster) ---
app.all('/api/identify-product', async (req, res) => {
  try {
    const query = req.query.q || req.body.q;
    if (!query) return res.status(400).json({ success: false, message: 'Query faltante' });

    console.log(`🤖 [IA] Identificando: "${query}"`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um assistente que extrai informações de produtos e retorna APENAS JSON puro." },
        {
          role: "user",
          content: `Analise: "${query}". 
          Retorne este JSON:
          {
            "nome": "Nome comercial",
            "preco_de": 0.0,
            "preco_por": 0.0,
            "uva": "N/A",
            "safra": "N/A",
            "pais": "Origem",
            "regiao": "Região",
            "tipo": "Tipo",
            "categoria": "Categoria",
            "descricao": "Breve descrição",
            "imagem": "URL da imagem ou null"
          }`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    let data;
    try {
      data = JSON.parse(chatCompletion.choices[0].message.content);
      console.log("✅ [IA] Sucesso:", data.nome);

      // --- HEURÍSTICA: Buscar imagem local (Single Source) ---
      const imagemLocal = buscarImagemLocal(data.nome);
      if (imagemLocal) {
        data.imagem = imagemLocal.split('/').pop(); // Retorna só o nome do arquivo para o frontend tratar ou a URL parcial
        console.log(`🖼️ [IA] Imagem sugerida (Single Source): ${data.imagem}`);
      } else {
        console.log(`🖼️ [IA] Nenhuma imagem local encontrada para: ${data.nome}`);
        data.imagem = null;
      }
    } catch (e) {
      console.error("❌ [IA] Erro ao parsear JSON:", chatCompletion.choices[0].message.content);
      throw new Error("Resposta da IA inválida");
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [IA] Erro Geral:', error.message);
    res.status(500).json({ success: false, message: 'V3-IA: ' + error.message });
  }
});

// --- ENDPOINT: REMOVER FUNDO VIA PYTHON REMBG ---
app.post('/api/removebg-local', multer({ dest: 'uploads/' }).single('image'), async (req, res) => {
  let inputPath = req.file ? req.file.path : null;
  const url = req.body.url;

  if (!inputPath && !url) {
    return res.status(400).json({ error: 'Nenhuma imagem ou URL enviada' });
  }

  try {
    // Se for URL (remota ou local)
    if (url && !inputPath) {
      if (url.startsWith('http')) {
        console.log(`🌐 [RemoveBG] Baixando imagem da URL remota: ${url}`);
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!resp.ok) throw new Error(`Falha ao baixar imagem: ${resp.statusText}`);
        const buffer = Buffer.from(await resp.arrayBuffer());
        inputPath = path.join(__dirname, 'uploads', `url-${Date.now()}.png`);
        fs.writeFileSync(inputPath, buffer);
      } else if (url.startsWith('/')) {
        // Trata caminhos locais relativos (ex: /uploads/crops/...)
        console.log(`📁 [RemoveBG] Processando caminho local: ${url}`);
        const localRelativePath = url.startsWith('/') ? url.substring(1) : url;
        const fullLocalPath = path.join(__dirname, 'public', localRelativePath);

        if (!fs.existsSync(fullLocalPath)) {
          throw new Error(`Arquivo local não encontrado: ${fullLocalPath}`);
        }

        // Copia para uploads para processamento e cleanup consistente
        inputPath = path.join(__dirname, 'uploads', `local-${Date.now()}-${path.basename(fullLocalPath)}`);
        fs.copyFileSync(fullLocalPath, inputPath);
      }
    }

    const outputPath = inputPath + '_nobg.png';
    const scriptPath = path.join(__dirname, 'remover_fundo.py');

    exec(`python "${scriptPath}" "${inputPath}" "${outputPath}"`, (error, stdout, stderr) => {
      if (error || (stdout && stdout.includes('ERROR'))) {
        console.error('❌ Erro no Python RemoveBG:', error || stdout);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        return res.status(500).json({ error: 'Falha ao processar imagem no RemoveBG' });
      }

      try {
        const processedImage = fs.readFileSync(outputPath);
        const base64Image = Buffer.from(processedImage).toString('base64');
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        res.json({ success: true, image: `data:image/png;base64,${base64Image}` });
      } catch (e) {
        console.error('❌ Erro ao ler imagem local gerada:', e);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        res.status(500).json({ error: 'Falha interna ao gerar Base64 do RemoveBG' });
      }
    });
  } catch (err) {
    console.error('❌ Erro ao processar URL no RemoveBG:', err.message);
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({ error: err.message });
  }
});

// --- ENDPOINT: UPLOAD DE IMAGEM BASE64 ---
app.post('/api/upload-image-base64', async (req, res) => {
  try {
    const { filename, imageBase64 } = req.body;
    if (!filename || !imageBase64) return res.status(400).json({ error: 'Filename and base64 required' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const targetDir = IMAGENS_SEM_FUNDO_DIR;
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Slugify filename to avoid issues with spaces or special chars
    const cleanFilename = slugify(filename.replace(/\.png$/i, ''));
    const filePath = path.join(targetDir, `${cleanFilename}.png`);
    
    fs.writeFileSync(filePath, buffer);

    console.log(`💾 [Single Source] Imagem salva e unificada: ${cleanFilename}.png`);
    res.json({ 
      success: true, 
      path: `/imagens_sem_fundo/${cleanFilename}.png`,
      filename: `${cleanFilename}.png`
    });
  } catch (error) {
    console.error('❌ [Upload] Erro:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- ROTA OCR COM LÓGICA DE CORES ---
app.post('/api/vision-ocr', multer({ dest: 'uploads/' }).single('image'), async (req, res) => {
  console.log('📥 [OCR] Request recebido. File:', req.file?.originalname, 'Size:', req.file?.size);
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhuma imagem recebida. Verifique o upload.' });
    }

    // Redimensiona a imagem para max 800px para reduzir tokens enviados ao Groq
    let imageBase64;
    let mimeType = 'image/jpeg';
    try {
      const sharp = require('sharp');
      const resized = await sharp(req.file.path).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      imageBase64 = resized.toString('base64');
      mimeType = 'image/jpeg';
      console.log(`📸 [Vision] Imagem redimensionada: ${Math.round(resized.length / 1024)}KB`);
    } catch (sharpErr) {
      // Fallback: usa imagem original sem redimensionar
      const rawBuf = fs.readFileSync(req.file.path);
      imageBase64 = rawBuf.toString('base64');
      const ext = (req.file.originalname || req.file.filename || '').toLowerCase();
      mimeType = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';
      console.log(`📸 [Vision] sharp não disponível, usando original: ${Math.round(rawBuf.length / 1024)}KB`);
    }
    console.log("📸 [Vision] Chamando Groq (Llama 4 Scout)...");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Você é um especialista em OCR de bebidas e supermercado. Extraia os produtos da imagem.\n\nREGRAS:\n1. LOJA: Identifique a unidade no topo. Use EXATAMENTE: 'CE' (Celina), 'GL' (Gloria/Alto da Gloria), 'NS' (Nova Suiça) ou 'EP' (Emporio Prime).\n2. NOME: Nome completo do produto. SEMPRE inclua o volume (ex: 750ml, 1,5L, 375ml) se estiver visível.\n3. PREÇOS: Preço DE e POR (promocional). Use PONTO para decimais (ex: 16.99).\n4. ZERO IA: Jamais use a sigla 'IA' para loja. Se não identificar, use 'ML'.\n5. COMBOS: Quando o print mostrar VÁRIAS GARRAFAS DA MESMA MARCA com UM SÓ PREÇO e uvas/tipos diferentes listados (ex: 'Primitivo, Nero d'Avola, Sangiovese'), crie UM ÚNICO produto. Use o nome da marca no campo 'nome' e liste as variações no campo 'variacoes'. NÃO crie produtos separados para cada uva.\n6. BBOX: Para cada produto, inclua 'bbox' {x, y, w, h} em % (0-100).\nREGRAS CRÍTICAS PARA O BOUNDING BOX:\n- O bounding box deve envolver A GARRAFA INTEIRA (da tampa até a base)\n- PRIORIZE manter a garrafa completa mesmo que pegue um pedaço de etiqueta de preço próxima; é melhor ter um pouco de 'ruído' que será removido depois do que cortar a garrafa\n- NUNCA inclua texto de preço principal se estiver afastado da garrafa\n- Adicione 10% de padding vertical (topo e base) ao bounding box\n\nRetorne APENAS um array JSON puro:\n[{\"loja\": \"CE\", \"nome\": \"VINHO ITALIANO CORBELLI\", \"variacoes\": \"Primitivo, Nero d'Avola, Montepulciano ou Sangiovese\", \"de\": 68.90, \"por\": 49.90, \"bbox\": {\"x\": 0, \"y\": 10, \"w\": 55, \"h\": 80}, \"crop_vertical_padding\": 0.10}]" },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.1,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
    });

    let resultText = completion.choices[0]?.message?.content || "";
    console.log("🤖 [Groq] Resposta COMPLETA:", resultText.substring(0, 300));

    // Limpeza de Markdown
    if (resultText.includes("```json")) {
      resultText = resultText.split("```json")[1].split("```")[0];
    } else if (resultText.includes("```")) {
      resultText = resultText.split("```")[1].split("```")[0];
    }
    resultText = resultText.trim();

    // Extrai o array JSON da resposta (mais robusto contra texto extra)
    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    if (jsonMatch) resultText = jsonMatch[0];

    let extraidos = [];
    try {
      extraidos = JSON.parse(resultText);
      if (!Array.isArray(extraidos)) extraidos = [];
    } catch (e) {
      console.error("❌ [Vision] Falha JSON. Texto recebido:", resultText.substring(0, 500));
      // Retorna lista vazia em vez de 500
      extraidos = [];
    }

    const tabelaMae = await readTabela();
    const nomesTabela = tabelaMae.map(item => (item.supplierName || "").toUpperCase());

    // Carrega aliases aprendidos
    let aliases = {};
    if (fs.existsSync(ALIASES_FILE)) {
      try {
        aliases = JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8'));
      } catch (e) { }
    }

    // Normalização backend para garantir zero "IA" no histórico/frontend
    extraidos = extraidos.map(p => {
      const up = (p.loja || '').toUpperCase();
      if (up === 'IA' || !up) p.loja = 'ML';
      return p;
    });

    const resultados = extraidos.map(p => {
      let produtoVinculado = null;
      let rating = 0;
      const ocrNomeUpper = p.nome.toUpperCase().trim();

      // 1. Tenta Match via Alias (Aprendizado)
      if (aliases[ocrNomeUpper]) {
        const linkedRowId = aliases[ocrNomeUpper];
        produtoVinculado = tabelaMae.find(item => item.rowId === linkedRowId);
        if (produtoVinculado) {
          rating = 1.0; // Força match perfeito
          console.log(`✨ [Match] Alias encontrado para "${ocrNomeUpper}": ${linkedRowId}`);
        }
      }

      // 2. Se não encontrou alias, tenta String Similarity
      if (!produtoVinculado && nomesTabela.length > 0) {
        const matches = stringSimilarity.findBestMatch(ocrNomeUpper, nomesTabela);
        rating = matches.bestMatch.rating;
        const bestCandidate = tabelaMae[matches.bestMatchIndex];

        // 🛡️ Filtro de Volume: Evitar que 1,5L bata com 750ml
        const v15 = (ocrNomeUpper.includes('1,5L') || ocrNomeUpper.includes('1.5L') || ocrNomeUpper.includes('1500ML'));
        const v75 = (ocrNomeUpper.includes('750') || ocrNomeUpper.includes('750ML'));

        const candName = (bestCandidate.supplierName || bestCandidate.productName || "").toUpperCase();
        const candV15 = (candName.includes('1,5L') || candName.includes('1.5L') || candName.includes('1500ML'));
        const candV75 = (candName.includes('750') || candName.includes('750ML'));

        if ((v15 && !candV15) || (v75 && !candV75)) {
          rating = rating * 0.5; // Derruba o match se o volume for conflitante
          if (rating < 0.9) produtoVinculado = null;
        } else {
          produtoVinculado = bestCandidate;
        }
      }

      return {
        ...p,
        status: rating >= 0.9 ? 'verde' : rating > 0.4 ? 'amarelo' : 'vermelho',
        matchRating: rating,
        produtoVinculado: produtoVinculado
      };
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ success: true, data: resultados });
  } catch (error) {
    console.error("❌ [Vision/OCR] Erro Crítico:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno no processamento Vision',
      stack: error.stack
    });
  }
});

// --- NOVOS ENDPOINTS: ML E SUPERADEGA ---

// Compras Mercado Livre
// --- ENDPOINTS: PRICE PROOFS ---
const PRICE_PROOFS_DIR = path.join(DATA_DIR, 'price_proofs');

app.post('/api/price-proofs/save', (req, res) => {
  try {
    const { items, metadata } = req.body;
    if (!fs.existsSync(PRICE_PROOFS_DIR)) fs.mkdirSync(PRICE_PROOFS_DIR, { recursive: true });

    // Gera nome de arquivo com data e timestamp
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = now.getTime();
    const fileName = `proof_${dateStr}_${timestamp}.json`;
    const filePath = path.join(PRICE_PROOFS_DIR, fileName);

    const dataToSave = {
      date: dateStr,
      timestamp,
      items,
      metadata: metadata || {}
    };

    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    res.json({ success: true, fileName });
  } catch (err) {
    console.error('Erro ao salvar prova de preço:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/price-proofs/list', (req, res) => {
  try {
    if (!fs.existsSync(PRICE_PROOFS_DIR)) return res.json([]);
    const files = fs.readdirSync(PRICE_PROOFS_DIR).filter(f => f.endsWith('.json'));
    const allProofs = files.map(f => {
      try {
        const content = fs.readFileSync(path.join(PRICE_PROOFS_DIR, f), 'utf8');
        const parsed = JSON.parse(content);
        return { ...parsed, fileName: f };
      } catch (e) {
        return null;
      }
    }).filter(p => p !== null);
    res.json(allProofs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ml/compras', (req, res) => {
  const filePath = path.join(DATA_DIR, 'ml_compras.json');
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});

app.post('/api/ml/compras', (req, res) => {
  const filePath = path.join(DATA_DIR, 'ml_compras.json');
  let compras = [];
  if (fs.existsSync(filePath)) {
    try { compras = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { }
  }
  compras.push({ ...req.body, id: Date.now() });
  fs.writeFileSync(filePath, JSON.stringify(compras, null, 2));
  res.json({ success: true });
});

// Preços SuperAdega
app.get('/api/superadega-prices', (req, res) => {
  const filePath = path.join(DATA_DIR, 'superadega_prices.json');
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});

// Preços Mercado Livre (Todos)
app.get('/api/ml/precos', (req, res) => {
  const filePath = path.join(DATA_DIR, 'ml_precos_todos.json');
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});


// Sync Mistral ML (Placeholder)
app.get('/api/ml/sync-mistral', (req, res) => {
  const filePath = path.join(DATA_DIR, 'ml_precos_todos.json');
  let data = [];
  if (fs.existsSync(filePath)) {
    try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { }
  }
  res.json({ success: true, total_encontrados: data.length, data: data });
});

// (Middleware catch-all removido daqui para ir para o final)


// --- ENDPOINT: OCR WIP (Salvar progresso não finalizado) ---
const OCR_WIP_FILE = path.join(DATA_DIR, 'ocr_wip.json');

app.get('/api/ocr-wip', async (req, res) => {
  try {
    if (!fs.existsSync(OCR_WIP_FILE)) return res.json({ queue: [], manualPrices: {} });
    const data = JSON.parse(fs.readFileSync(OCR_WIP_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ocr-wip', async (req, res) => {
  try {
    const { queue, manualPrices } = req.body;
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OCR_WIP_FILE, JSON.stringify({ queue, manualPrices }, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT: HISTÓRICO DIÁRIO OCR ---
app.post('/api/salvar-historico-ocr', async (req, res) => {
  try {
    const { data, produtos } = req.body;
    if (!data || !Array.isArray(produtos)) return res.status(400).json({ error: 'Dados inválidos' });

    const historicoDir = path.join(DATA_DIR, 'historico');
    if (!fs.existsSync(historicoDir)) fs.mkdirSync(historicoDir, { recursive: true });

    const filePath = path.join(historicoDir, data + '.json');

    // Se já existir, ACRESCENTA (não sobrescreve)
    let existente = [];
    if (fs.existsSync(filePath)) {
      try { existente = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { }
    }

    // Evita duplicatas pelo nome+loja+por
    const novos = produtos.filter(p =>
      !existente.some(e => e.nome === p.nome && e.loja === p.loja && e.por === p.por)
    );

    const tudo = [...existente, ...novos];
    fs.writeFileSync(filePath, JSON.stringify(tudo, null, 2));

    console.log('[Historico] ' + data + ': ' + novos.length + ' novos / ' + tudo.length + ' total');
    res.json({ success: true, salvos: novos.length, total: tudo.length, data });
  } catch (error) {
    console.error('[Historico] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT: LER HISTÓRICO DE UMA DATA ---
app.get('/api/historico-ocr/:data', async (req, res) => {
  try {
    const { data } = req.params;
    const filePath = path.join(DATA_DIR, 'historico', data + '.json');
    if (!fs.existsSync(filePath)) return res.json([]);
    const dados = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(dados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT: LISTAR DATAS COM HISTÓRICO ---
app.get('/api/historico-ocr', async (req, res) => {
  try {
    const historicoDir = path.join(DATA_DIR, 'historico');
    if (!fs.existsSync(historicoDir)) return res.json([]);
    const files = fs.readdirSync(historicoDir).filter(f => f.endsWith('.json')).sort().reverse();
    res.json(files.map(f => f.replace('.json', '')));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT: BUSCAR EM TODO O HISTÓRICO ---
app.get('/api/historico-ocr-search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const term = q.toLowerCase();

    const historicoDir = path.join(DATA_DIR, 'historico');
    if (!fs.existsSync(historicoDir)) return res.json([]);

    const files = fs.readdirSync(historicoDir).filter(f => f.endsWith('.json')).sort().reverse();
    let results = [];

    for (const f of files) {
      try {
        const date = f.replace('.json', '');
        const content = JSON.parse(fs.readFileSync(path.join(historicoDir, f), 'utf8'));
        const matches = content.filter(p => p.nome.toLowerCase().includes(term));
        if (matches.length > 0) {
          results.push(...matches.map(m => ({ ...m, data_registro: date })));
        }
        if (results.length > 500) break; // Limite de performance
      } catch (e) { }
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper para garantir diretório da representada
function getRepDir(supplier) {
  const dir = path.join(BRASILIA_BASE_DIR, supplier.toUpperCase());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const specsDir = path.join(dir, 'especificacoes');
  if (!fs.existsSync(specsDir)) fs.mkdirSync(specsDir, { recursive: true });
  return dir;
}

// Produtos Brasília
app.get('/api/brasilia/produtos', (req, res) => {
  const { supplier } = req.query;
  if (!supplier) return res.status(400).json({ error: 'Supplier is required' });
  const filePath = path.join(getRepDir(supplier), 'produtos.json');
  try {
    if (!fs.existsSync(filePath)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});

app.post('/api/brasilia/produtos', (req, res) => {
  const { supplier } = req.query;
  if (!supplier) return res.status(400).json({ error: 'Supplier is required' });
  const filePath = path.join(getRepDir(supplier), 'produtos.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Clientes Brasília
app.get('/api/brasilia/clientes', (req, res) => {
  const { supplier } = req.query;
  // Se não passar supplier, busca no global ou deixa flexível (User pediu por pasta)
  const baseDir = supplier ? getRepDir(supplier) : BRASILIA_BASE_DIR;
  const filePath = path.join(baseDir, 'clientes.json');
  try {
    if (!fs.existsSync(filePath)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});

app.post('/api/brasilia/clientes', (req, res) => {
  const { supplier } = req.query;
  const baseDir = supplier ? getRepDir(supplier) : BRASILIA_BASE_DIR;
  const filePath = path.join(baseDir, 'clientes.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pedidos Brasília
app.get('/api/brasilia/pedidos', (req, res) => {
  const { supplier } = req.query;
  if (!supplier) return res.status(400).json({ error: 'Supplier is required' });
  const filePath = path.join(getRepDir(supplier), 'pedidos.json');
  try {
    if (!fs.existsSync(filePath)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});

app.post('/api/brasilia/pedidos', (req, res) => {
  const { supplier } = req.query;
  if (!supplier) return res.status(400).json({ error: 'Supplier is required' });
  const filePath = path.join(getRepDir(supplier), 'pedidos.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cadastros (Formulário) Brasília
app.get('/api/brasilia/cadastros', (req, res) => {
  const { supplier } = req.query;
  const baseDir = supplier ? getRepDir(supplier) : BRASILIA_BASE_DIR;
  const filePath = path.join(baseDir, 'cadastros.json');
  try {
    if (!fs.existsSync(filePath)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json([]); }
});

app.post('/api/brasilia/cadastros', (req, res) => {
  const { supplier } = req.query;
  const baseDir = supplier ? getRepDir(supplier) : BRASILIA_BASE_DIR;
  const filePath = path.join(baseDir, 'cadastros.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Condições Comerciais ---
app.get('/api/brasilia/condicoes', (req, res) => {
  const { supplier } = req.query;
  const baseDir = supplier ? getRepDir(supplier) : BRASILIA_BASE_DIR;
  const filePath = path.join(baseDir, 'condicoes.json');
  try {
    if (!fs.existsSync(filePath)) return res.json(null);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (e) { res.json(null); }
});

app.post('/api/brasilia/condicoes', (req, res) => {
  const { supplier } = req.query;
  const baseDir = supplier ? getRepDir(supplier) : BRASILIA_BASE_DIR;
  const filePath = path.join(baseDir, 'condicoes.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Upload de Especificações ---
const specsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { supplier } = req.query;
    cb(null, path.join(getRepDir(supplier || 'OUTROS'), 'especificacoes'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadSpecs = multer({ storage: specsStorage });

app.post('/api/brasilia/specs', uploadSpecs.single('file'), (req, res) => {
  res.json({ success: true, filename: req.file.filename });
});

app.get('/api/brasilia/specs', (req, res) => {
  const { supplier } = req.query;
  if (!supplier) return res.status(400).json({ error: 'Supplier is required' });
  const specsDir = path.join(getRepDir(supplier), 'especificacoes');
  try {
    const files = fs.readdirSync(specsDir);
    res.json(files);
  } catch (e) { res.json([]); }
});

app.delete('/api/brasilia/specs/:filename', (req, res) => {
  const { supplier } = req.query;
  const { filename } = req.params;
  const filePath = path.join(getRepDir(supplier || 'OUTROS'), 'especificacoes', filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve static specs files
app.use('/brasilia_specs', express.static(BRASILIA_BASE_DIR));


// ── PROXY DE IMAGEM — resolve caminhos Windows/absolutos salvos no JSON ──────
app.get('/api/img', (req, res) => {
  const raw = decodeURIComponent(req.query.p || '');
  if (!raw) return res.status(400).end();

  // Se já é URL http, redireciona
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return res.redirect(raw);
  }

  // Extrai só o filename do caminho (Windows ou Unix)
  const filename = raw.split(/[\/]/).pop();

  // Tenta em ordem as pastas de imagens
  const candidates = [
    path.join(__dirname, 'public', 'imagens_produtos', 'imagens sem fundo', filename),
    path.join(__dirname, 'public', 'imagens_produtos', filename),
    path.join(__dirname, 'public', 'imagens', filename),
    path.join(__dirname, 'public', filename),
    path.join(__dirname, raw.replace(/^[\/]/, '')), // path relativo
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }

  // Tenta buscar recursivamente em public/
  const publicDir = path.join(__dirname, 'public');
  function findFile(dir, name) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { const r = findFile(full, name); if (r) return r; }
        else if (entry.name === name) return full;
      }
    } catch { }
    return null;
  }
  const found = findFile(publicDir, filename);
  if (found) return res.sendFile(found);

  res.status(404).json({ error: 'Imagem não encontrada', filename });
});

// ── LISTAR IMAGENS DISPONÍVEIS ────────────────────────────────────────────────
app.get('/api/listar-imagens', (req, res) => {
  const publicDir = path.join(__dirname, 'public');
  const images = [];
  function scan(dir) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(entry.name)) {
          images.push({
            filename: entry.name,
            path: full.replace(__dirname, '').replace(/\\/g, '/'),
            url: '/api/img?p=' + encodeURIComponent(entry.name)
          });
        }
      }
    } catch { }
  }
  scan(publicDir);
  res.json(images);
});

// ── REPARAR IMAGENS NA TABELA ─────────────────────────────────────────────────
// Converte caminhos absolutos Windows em URLs relativas /api/img?p=filename
app.post('/api/repair-images', async (req, res) => {
  try {
    const tabela = await readTabela();
    let fixed = 0;
    const publicDir = path.join(__dirname, 'public');

    // Indexa TODAS as imagens em public/ recursivamente
    const imgIndex = {};
    function scanDir(dir) {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) { scanDir(full); }
          else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(entry.name)) {
            imgIndex[entry.name.toLowerCase()] = '/api/img?p=' + encodeURIComponent(entry.name);
          }
        }
      } catch (e) { }
    }
    scanDir(publicDir);
    console.log('[Repair] ' + Object.keys(imgIndex).length + ' imagens encontradas em public/');

    tabela.forEach(row => {
      let img = row.image || row.imagem || '';

      if (img.startsWith('/api/img')) return; // ja correto

      let fn = '';
      if (img) {
        // localhost:3000 ou localhost:3002
        if (img.startsWith('http')) {
          try { fn = new URL(img).pathname.split('/').pop().toLowerCase(); }
          catch { fn = img.split('/').pop().toLowerCase(); }
        }
        // caminho Windows
        else if (img.includes(':') || img.includes('\\')) {
          fn = img.split(/[\\\/]/).pop().toLowerCase();
        }
        // path relativo
        else {
          fn = img.split('/').pop().toLowerCase();
        }
      } else {
        // 💡 Tentar Match pelo Nome se a imagem estiver VAZIA
        const nomeParaCheck = (row.supplierName || '').split('|')[0].trim().toLowerCase();
        // Tenta achar um arquivo que contenha o nome do vinho ou algo próximo
        // Para simplificar, vamos tentar ver se existe um arquivo exatamente com o nome formatado
        const possibleFn = nomeParaCheck.replace(/[^a-z0-9]/g, '-') + '.png';
        const possibleFnJpg = nomeParaCheck.replace(/[^a-z0-9]/g, '-') + '.jpg';
        const possibleFnWebp = nomeParaCheck.replace(/[^a-z0-9]/g, '-') + '.webp';

        fn = imgIndex[possibleFn] ? possibleFn : (imgIndex[possibleFnJpg] ? possibleFnJpg : (imgIndex[possibleFnWebp] ? possibleFnWebp : ''));

        // Se não achou exato, tenta match parcial (custoso mas ajuda no desespero)
        if (!fn) {
          const candidates = Object.keys(imgIndex);
          const best = stringSimilarity.findBestMatch(nomeParaCheck, candidates);
          if (best.bestMatch.rating > 0.8) {
            fn = best.bestMatch.target;
            console.log(`🔍 [Fuzzy Match] "${nomeParaCheck}" -> ${fn} (${best.bestMatch.rating})`);
          }
        }
      }

      if (fn && imgIndex[fn]) {
        console.log('  FIX ' + row.rowId + ': ' + (img ? 'path' : 'empty') + ' -> ' + imgIndex[fn]);
        row.image = imgIndex[fn];
        row.imagem = imgIndex[fn];
        fixed++;
      }
    });

    await writeTabela(tabela);
    console.log('[Repair] ' + fixed + '/' + tabela.length + ' imagens reparadas');
    res.json({ success: true, fixed, total: tabela.length, indexed: Object.keys(imgIndex).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── STORY TEMPLATES ───────────────────────────────────────────────────────
const STORY_TPL_DIR = path.join(DATA_DIR, 'story_templates');

app.get('/api/story-templates', (req, res) => {
  try {
    if (!fs.existsSync(STORY_TPL_DIR)) return res.json([]);
    const files = fs.readdirSync(STORY_TPL_DIR).filter(f => f.endsWith('.json')).sort().reverse();
    const tpls = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(STORY_TPL_DIR, f), 'utf8')); }
      catch { return null; }
    }).filter(Boolean);
    res.json(tpls);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/story-templates', (req, res) => {
  try {
    if (!fs.existsSync(STORY_TPL_DIR)) fs.mkdirSync(STORY_TPL_DIR, { recursive: true });
    const tpl = req.body;
    tpl.id = tpl.id || ('tpl_' + Date.now());
    tpl.updatedAt = new Date().toISOString();
    const filePath = path.join(STORY_TPL_DIR, tpl.id + '.json');
    fs.writeFileSync(filePath, JSON.stringify(tpl, null, 2));
    res.json({ success: true, id: tpl.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/story-templates/:id', (req, res) => {
  try {
    const filePath = path.join(STORY_TPL_DIR, req.params.id + '.json');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ══════════════════════════════════════════════════════════════════════════════
// 🍷 SUPER ADEGA — Scraper automático (superadega.com.br / Nuvemshop)
// ══════════════════════════════════════════════════════════════════════════════

const SA_PRICES_FILE = path.join(DATA_DIR, 'superadega_prices.json');
const SA_CATEGORIES = [
  'vinho/tinto', 'vinho/branco', 'vinho/rose', 'vinho/espumante',
  'vinho/porto', 'whisky', 'gin', 'vodka', 'rum', 'bebidas-destiladas'
];

// Versão segura e corrigida (inserida para garantir regex válido)
function normalizarPreco(valor) {
  if (valor === null || valor === undefined) return null;
  const raw = String(valor).trim();
  if (!raw) return null;

  // remove tudo exceto dígitos, ponto e hífen; trata milhares e decimais
  const numero = raw
    .replace(/[^\d.,\-]/g, '')
    // remove pontos que funcionam como separador de milhar (mantém decimais como ,)
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.')
    .trim();

  if (!numero) return null;
  const n = parseFloat(numero);
  if (Number.isNaN(n) || !Number.isFinite(n)) return null;
  if (n <= 0 || n > 5000) return null;
  return n;
}

function validarPreco(preco, precoReferencia) {
  if (preco === null || preco === undefined) return null;
  if (precoReferencia && preco > precoReferencia * 5) return null;
  return preco;
}

function parseBRLSA(str) {
  const n = normalizarPreco(str);
  return n || 0;
}

async function scrapeSupeAdegaPage(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) return { products: [], hasNextPage: false };
  const html = await resp.text();
  const products = [];

  // Nuvemshop: cada produto aparece como link /produtos/SLUG/
  // Extrai: slug, nome, preço original, preço promocional
  const reItem = /href="(\/produtos\/([^"\/]+)\/)"/g;
  const slugsSeen = new Set();
  let m;
  while ((m = reItem.exec(html)) !== null) {
    const slug = m[2];
    if (slugsSeen.has(slug)) continue;
    slugsSeen.add(slug);

    // Extrai bloco de contexto ao redor do link (~1200 chars)
    const start = Math.max(0, m.index - 100);
    const end = Math.min(html.length, m.index + 1200);
    const block = html.slice(start, end);

    // Nome: primeiro texto após "item-name" ou "product-name" ou no <h2>/<h3>
    const nomeMatch = block.match(/class="[^"]*(?:item-name|product-name)[^"]*"[^>]*>\s*([^<]{3,80})/i)
      || block.match(/<(?:h2|h3|a)[^>]*>\s*([A-Za-záéíóúàèìòùâêîôûãõçñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇÑ][^<]{3,80})\s*<\/(?:h2|h3|a)>/);
    if (!nomeMatch) continue;
    const nome = nomeMatch[1].replace(/<[^>]+>/g, '').trim();
    if (!nome || nome.length < 4) continue;

    // Preços: R$ seguido de número
    const precos = [...block.matchAll(/R\$\s*([\d.,]+)/g)].map(x => parseBRLSA(x[1])).filter(x => x > 0);
    if (precos.length === 0) continue;

    const preco_por = Math.min(...precos);
    const preco_de = Math.max(...precos);

    products.push({
      id: slug,
      nome,
      preco_de,
      preco_por,
      url: 'https://www.superadega.com.br' + m[1],
      scraped_at: new Date().toISOString(),
    });
  }

  // Fallback: JSON-LD
  if (products.length === 0) {
    const ldRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let ldm;
    while ((ldm = ldRe.exec(html)) !== null) {
      try {
        const data = JSON.parse(ldm[1]);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' && item.name) {
            const price = parseBRLSA(String((item.offers || {}).price || '0'));
            if (price > 0) {
              const s2 = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
              products.push({ id: s2, nome: item.name, preco_de: price, preco_por: price, url: item.url || '', scraped_at: new Date().toISOString() });
            }
          }
        }
      } catch (e) { }
    }
  }

  const hasNextPage = /(?:js-paginator-next|aria-label="Próximo"|page-next|pagination.*next)/i.test(html);
  return { products, hasNextPage };
}

async function runSuperAdegaScraper() {
  console.log('[SuperAdega] 🍷 Iniciando scraping...');
  const allProducts = new Map();

  for (const cat of SA_CATEGORIES) {
    let page = 1;
    while (page <= 25) {
      const url = `https://www.superadega.com.br/${cat}/?page=${page}`;
      try {
        const result = await scrapeSupeAdegaPage(url);
        let added = 0;
        for (const p of result.products) {
          if (!allProducts.has(p.id)) { allProducts.set(p.id, p); added++; }
        }
        console.log(`[SuperAdega] ${cat} p.${page}: +${added} | total ${allProducts.size}`);
        if (!result.hasNextPage || result.products.length === 0) break;
        page++;
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error(`[SuperAdega] Erro ${cat} p.${page}:`, err.message);
        break;
      }
    }
  }

  const data = Array.from(allProducts.values());
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SA_PRICES_FILE, JSON.stringify(data, null, 2));
  console.log(`[SuperAdega] ✅ Concluído: ${data.length} produtos salvos.`);

  // Atualiza Resumo Global
  try {
    updateScrapingSummarySource({
      fonte: 'superadega_bulk',
      status: 'ok',
      totalProcessados: data.length,
      alteracoesPreco: 0,
      erros: 0,
      semMatch: 0,
      resumo: `Catálogo completo sincronizado com ${data.length} itens.`,
      itens: data.slice(0, 50).map(p => ({
        id: p.id,
        produto: p.nome,
        precoAnterior: 0,
        precoNovo: p.preco_por,
        status: 'sem_alteracao',
        observacao: 'Sincronização em lote'
      }))
    });
  } catch (e) { }

  return data;
}

// GET /api/superadega/sync — dispara scraping em background
app.get('/api/superadega/sync', async (req, res) => {
  res.json({ success: true, message: 'Scraping Super Adega iniciado. Aguarde ~3 min e depois clique "Super A." novamente.' });
  runSuperAdegaScraper().catch(err => console.error('[SuperAdega] Erro fatal:', err.message));
});

// GET /api/superadega/status
app.get('/api/superadega/status', (req, res) => {
  if (!fs.existsSync(SA_PRICES_FILE)) return res.json({ total: 0, ultima_atualizacao: null });
  try {
    const data = JSON.parse(fs.readFileSync(SA_PRICES_FILE, 'utf8'));
    const ultima = data.length > 0 ? data[data.length - 1].scraped_at : null;
    res.json({ total: data.length, ultima_atualizacao: ultima });
  } catch (e) { res.json({ total: 0, ultima_atualizacao: null }); }
});

// ── CRON: roda todo dia às 6h da manhã ───────────────────────────────────────
; (function agendarScraperDiario() {
  const agora = new Date();
  const proxima = new Date();
  proxima.setHours(6, 0, 0, 0);
  if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
  const ms = proxima - agora;
  console.log(`[SuperAdega] ⏰ Próximo scraping automático: ${proxima.toLocaleString('pt-BR')}`);
  setTimeout(() => {
    runSuperAdegaScraper().catch(console.error);
    setInterval(() => runSuperAdegaScraper().catch(console.error), 24 * 60 * 60 * 1000);
  }, ms);
})();


// ══════════════════════════════════════════════════════════════════════════════
// 🍷 MILÃO PRIME — SINCRONIZAÇÃO AUTOMÁTICA + CADASTRO COMPLETO NA TABELA MÃE
// ══════════════════════════════════════════════════════════════════════════════
const MILAO_PRICES_FILE = path.join(DATA_DIR, 'milao_prices.json');
const MILAO_SYNC_STATUS_FILE = path.join(DATA_DIR, 'milao_sync_status.json');
const MILAO_BASE_URL = 'https://emporiomilaoprime.meucardapio.ai';
const MILAO_API_URL = `${MILAO_BASE_URL}/api/produtos/venda/DELIVERY`;

function milaoReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function milaoWriteJson(filePath, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function milaoNormalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function milaoNoAccent(value) {
  return milaoNormalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function milaoCompareName(value) {
  return milaoNoAccent(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(vinho|vinhos|vinhoo|vin|tt|bco|rose|rosee|tinto|branco|frasco|garrafa|de|do|da|dos|das|e|com|ml|litro|l)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function milaoParseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function milaoFormatAlcohol(value) {
  const n = milaoParseNumber(value);
  if (!n) return '';
  return `${String(n).replace(/\.0$/, '')}%`;
}

function buildMilaoImageUrl(linkImagem) {
  const raw = milaoNormalizeText(linkImagem);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${MILAO_BASE_URL}/imagens/${raw}`;
}

function categoriaEhVitrineMilao(nome) {
  const n = milaoNoAccent(nome);
  return ['mais vendidos', 'promocoes', 'promocoes especiais', 'outros', 'destaques'].includes(n);
}

function pickMilaoPor(prod) {
  const novoPreco = milaoParseNumber(prod?.novoPreco);
  const menorPreco = milaoParseNumber(prod?.menorPreco);
  const preco = milaoParseNumber(prod?.preco);
  if (novoPreco > 0) return novoPreco;
  if (menorPreco > 0) return menorPreco;
  return preco;
}

function pickMilaoDe(prod, milaoPor) {
  const precoAntigo = milaoParseNumber(prod?.precoAntigo);
  const preco = milaoParseNumber(prod?.preco);
  if (precoAntigo > milaoPor) return precoAntigo;
  if (preco > milaoPor && milaoParseNumber(prod?.novoPreco) > 0) return preco;
  return 0;
}

function milaoFindCategorias(node, depth = 0) {
  if (!node || depth > 5) return null;
  if (Array.isArray(node?.categorias)) return node.categorias;
  if (Array.isArray(node?.data?.categorias)) return node.data.categorias;
  if (typeof node !== 'object') return null;
  for (const key of Object.keys(node)) {
    const found = milaoFindCategorias(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

const MILAO_UVAS = [
  'Touriga Nacional', 'Touriga Franca', 'Tinta Roriz', 'Aragonez', 'Alicante Bouschet', 'Syrah', 'Shiraz', 'Merlot',
  'Cabernet Sauvignon', 'Cabernet Franc', 'Malbec', 'Carmenere', 'Tannat', 'Tempranillo', 'Pinot Noir', 'Pinot Grigio',
  'Pinot Gris', 'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Moscato', 'Moscatel', 'Viognier', 'Glera', 'Macabeo',
  'Parellada', 'Xarel-lo', 'Bonarda', 'Nebbiolo', 'Sangiovese', 'Barbera', 'Primitivo', 'Montepulciano', 'Gamay', 'Grenache'
];

const MILAO_PAISES = [
  { nome: 'Portugal', termos: [' portugal ', ' douro ', ' dao ', ' d ao ', ' alentejo ', ' vinho verde ', ' lisboa ', ' bairrada ', ' setubal '] },
  { nome: 'França', termos: [' franca ', ' france ', ' bordeaux ', ' borgonha ', ' bourgogne ', ' chablis ', ' champagne ', ' macon ', ' medoc ', ' saint emilion ', ' cotes du rhone '] },
  { nome: 'Itália', termos: [' italia ', ' italy ', ' toscana ', ' piemonte ', ' veneto ', ' puglia ', ' sicilia ', ' montepulciano ', ' barolo ', ' chianti '] },
  { nome: 'Espanha', termos: [' espanha ', ' spain ', ' rioja ', ' ribera del duero ', ' rueda ', ' priorat ', ' penedes '] },
  { nome: 'Argentina', termos: [' argentina ', ' mendoza ', ' salta ', ' patagonia '] },
  { nome: 'Chile', termos: [' chile ', ' valle central ', ' maipo ', ' colchagua ', ' casablanca ', ' aconcagua '] },
  { nome: 'Uruguai', termos: [' uruguai ', ' uruguay ', ' canelones ', ' montevideo '] },
  { nome: 'Brasil', termos: [' brasil ', ' vale dos vinhedos ', ' serra gaucha ', ' campanha gaucha ', ' rio grande do sul '] },
  { nome: 'Alemanha', termos: [' alemanha ', ' germany ', ' sekt ', ' mosel ', ' rheingau ', ' rheinhessen '] },
  { nome: 'África do Sul', termos: [' africa do sul ', ' south africa ', ' stellenbosch ', ' paarl '] },
  { nome: 'Estados Unidos', termos: [' usa ', ' california ', ' napa valley ', ' sonoma ', ' oregon '] }
];

const MILAO_REGIOES = [
  'Douro', 'Dão', 'Alentejo', 'Vinho Verde', 'Bairrada', 'Lisboa', 'Setúbal', 'Mendoza', 'Patagonia', 'Vale dos Vinhedos',
  'Serra Gaúcha', 'Campanha Gaúcha', 'Bordeaux', 'Borgonha', 'Bourgogne', 'Mâcon', 'Macon', 'Chablis', 'Champagne',
  'Piemonte', 'Toscana', 'Veneto', 'Puglia', 'Sicília', 'Sicilia', 'Rioja', 'Ribera del Duero', 'Rueda', 'Penedès',
  'Penedes', 'Mosel', 'Rheingau', 'Rheinhessen', 'Stellenbosch', 'Paarl', 'Napa Valley', 'Sonoma', 'Maipo', 'Colchagua',
  'Casablanca', 'Aconcagua', 'Canelones'
];

function inferVolumeMl(text) {
  const source = milaoNormalizeText(text);
  const matchMl = source.match(/(\d{2,4})\s*ml\b/i);
  if (matchMl) return milaoParseNumber(matchMl[1]);
  const matchL = source.match(/(\d{1,2}(?:[\.,]\d)?)\s*l\b/i);
  if (matchL) return Math.round(milaoParseNumber(matchL[1]) * 1000);
  return 0;
}

function inferSafra(text) {
  const matches = String(text || '').match(/\b(19\d{2}|20\d{2})\b/g);
  if (!matches || !matches.length) return '';
  return matches[0];
}

function inferTeorAlcoolico(text) {
  const source = milaoNoAccent(text);
  let m = source.match(/teor\s*alcoolic[ao]?\s*(?:de)?\s*(\d{1,2}(?:[\.,]\d)?)/i);
  if (m) return milaoFormatAlcohol(m[1]);
  m = source.match(/(\d{1,2}(?:[\.,]\d)?)\s*%\s*(?:vol)?/i);
  if (m) return milaoFormatAlcohol(m[1]);
  return '';
}

function inferPais(text) {
  const source = ` ${milaoNoAccent(text)} `;
  for (const item of MILAO_PAISES) {
    if (item.termos.some(t => source.includes(t))) return item.nome;
  }
  return '';
}

function inferRegiao(text) {
  const source = milaoNormalizeText(text);
  const normalized = milaoNoAccent(text);
  const regex = source.match(/regi[aã]o(?:\s+do|\s+da|\s+de)?\s+([^\.,;\n]{2,50})/i);
  if (regex && regex[1]) return regex[1].trim();
  for (const regiao of MILAO_REGIOES) {
    if (normalized.includes(milaoNoAccent(regiao))) return regiao;
  }
  return '';
}

function inferUvas(text) {
  const source = milaoNoAccent(text);
  const found = MILAO_UVAS.filter(uva => source.includes(milaoNoAccent(uva)));
  return [...new Set(found)].join(', ');
}

function inferTipoBebida(nome, categoria, descricao) {
  const source = milaoNoAccent(`${nome} ${categoria} ${descricao}`);
  if (source.includes('espumante') || source.includes('sekt') || source.includes('charmat') || source.includes('brut')) return 'Espumante';
  if (source.includes('frisante')) return 'Frisante';
  if (source.includes('whisky') || source.includes('bourbon')) return 'Whisky';
  if (source.includes('gin')) return 'Gin';
  if (source.includes('vodka')) return 'Vodka';
  if (source.includes('licor')) return 'Licor';
  if (source.includes('cerveja')) return 'Cerveja';
  if (source.includes('cachaca') || source.includes('cachaça')) return 'Cachaça';
  if (source.includes('branco') || source.includes(' bco ')) return 'Vinho Branco';
  if (source.includes('rose') || source.includes('rosado')) return 'Vinho Rosé';
  if (source.includes('tinto') || source.includes(' tt ')) return 'Vinho Tinto';
  if (source.includes('vinho')) return 'Vinho';
  return categoria || 'Bebida';
}

function inferProdutor(text) {
  const match = milaoNormalizeText(text).match(/produtor\s+([^\.\n]{2,80})/i);
  return match && match[1] ? match[1].trim() : '';
}

function inferHarmonizacao(text) {
  const source = milaoNormalizeText(text);
  const match = source.match(/(harmoniza com|acompanha bem|ideal para|combina com)([^\.\n]{3,120})/i);
  if (!match) return '';
  return `${match[1]} ${match[2]}`.trim();
}

function normalizeMilaoProduct(prod, categoria = {}) {
  const nome = milaoNormalizeText(prod?.nome);
  const descricao = milaoNormalizeText(prod?.descricao);
  const categoriaNome = milaoNormalizeText(categoria?.nome || prod?.categoria?.nome || '');
  const milaoPor = pickMilaoPor(prod);
  const milaoDe = pickMilaoDe(prod, milaoPor);
  const combined = `${nome}. ${descricao}. ${categoriaNome}`;
  const pais = inferPais(combined);
  const regiao = inferRegiao(combined);
  const uva = inferUvas(combined);
  const teorAlcoolico = inferTeorAlcoolico(combined);
  const tipoBebida = inferTipoBebida(nome, categoriaNome, descricao);
  const volumeMl = inferVolumeMl(combined);
  const safra = inferSafra(combined);
  const primeiraImagem = Array.isArray(prod?.imagens) && prod.imagens.length > 0 ? prod.imagens[0] : null;
  const produtor = inferProdutor(combined);
  const harmonizacao = inferHarmonizacao(combined);

  return {
    source: 'milao',
    sourceId: prod?.id || null,
    nome,
    descricao,
    preco_de: milaoDe,
    preco_por: milaoPor,
    milao_de: milaoDe,
    milao_por: milaoPor,
    categoria: categoriaNome,
    tipo: tipoBebida,
    tipoBebida,
    tipoVenda: milaoNormalizeText(prod?.tipoDeVenda),
    pais,
    regiao,
    uva,
    safra,
    teorAlcoolico,
    volumeMl,
    produtor,
    harmonizacao,
    imagem: buildMilaoImageUrl(primeiraImagem?.linkImagem),
    disponivel: Boolean(prod?.disponivel ?? true),
    destaque: Boolean(prod?.destaque),
    scraped_at: new Date().toISOString(),
    metadata: {
      source: 'milao',
      milaoId: prod?.id || null,
      categoriaId: categoria?.id || prod?.categoria?.id || null,
      categoriaNome,
      percentualDesconto: milaoParseNumber(prod?.percentualDesconto),
      novoPreco: milaoParseNumber(prod?.novoPreco),
      precoAntigo: milaoParseNumber(prod?.precoAntigo),
      precoOriginal: milaoParseNumber(prod?.preco),
      menorPreco: milaoParseNumber(prod?.menorPreco),
      exibirPrecoSite: Boolean(prod?.exibirPrecoSite),
      tipoDeVenda: milaoNormalizeText(prod?.tipoDeVenda),
      disponivelParaDelivery: Boolean(prod?.disponivelParaDelivery),
      linkImagem: primeiraImagem?.linkImagem || '',
      ultimaAtualizacaoProdutos: prod?.catalogo?.ultimaAtualizacaoProdutos || null
    }
  };
}

function escolherMelhorVersaoMilao(atual, novo) {
  if (!atual) return novo;
  const scoreAtual = (atual.imagem ? 2 : 0) + (atual.descricao ? Math.min(atual.descricao.length, 300) / 300 : 0) + (categoriaEhVitrineMilao(atual.categoria) ? 0 : 2);
  const scoreNovo = (novo.imagem ? 2 : 0) + (novo.descricao ? Math.min(novo.descricao.length, 300) / 300 : 0) + (categoriaEhVitrineMilao(novo.categoria) ? 0 : 2);
  return scoreNovo >= scoreAtual ? novo : atual;
}

async function fetchMilaoPayload() {
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'nomeempresa': 'emporiomilaoprime',
    'Origin': MILAO_BASE_URL,
    'Referer': `${MILAO_BASE_URL}/`
  };

  let lastError = null;

  for (const method of ['GET', 'POST']) {
    try {
      console.log(`🌐 [Milão] Tentando ${method} em ${MILAO_API_URL}...`);
      const response = await fetch(MILAO_API_URL, {
        method,
        headers: method === 'POST' ? { ...headers, 'Content-Type': 'application/json' } : headers,
        body: method === 'POST' ? JSON.stringify({}) : undefined,
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // A API real usa 'sucesso' em vez de 'success'
      if (data?.sucesso === false) {
        throw new Error('Milão retornou sucesso=false');
      }

      return data;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ [Milão] Falha no método ${method}:`, err.message);
    }
  }

  throw lastError || new Error('Não foi possível consultar a API do Milão.');
}

async function scrapeMilaoCatalog() {
  const payload = await fetchMilaoPayload();
  const produtosRaw = Array.isArray(payload?.data?.produtos) ? payload.data.produtos : [];
  const map = new Map();

  console.log(`📊 [Milão] Processando ${produtosRaw.length} produtos brutos do flat list...`);

  for (const prod of produtosRaw) {
    const id = String(prod?.id || '');
    if (!id) continue;

    // Na lista flat, a categoria já vem dentro do produto
    const categoria = prod.categoria || {};
    const normalizado = normalizeMilaoProduct(prod, categoria);

    if (!normalizado.nome || !normalizado.preco_por) continue;

    const key = String(normalizado.sourceId || `${normalizado.nome}::${normalizado.preco_por}`);

    if (!map.has(key)) {
      map.set(key, normalizado);
      continue;
    }

    // Se houver duplicados, prioriza a melhor versão (com imagem/descrição)
    map.set(key, escolherMelhorVersaoMilao(map.get(key), normalizado));
  }

  const items = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  milaoWriteJson(MILAO_PRICES_FILE, items);

  return {
    payload,
    totalProdutosApi: produtosRaw.length,
    items
  };
}

function milaoEntryVolume(entry) {
  return milaoParseNumber(entry?.volumeMl || inferVolumeMl(`${entry?.supplierName || entry?.productName || ''} ${entry?.description || ''}`));
}

function volumeCompativel(entry, item) {
  const a = milaoEntryVolume(entry);
  const b = milaoParseNumber(item?.volumeMl || 0);
  if (!a || !b) return true;
  return Math.abs(a - b) <= 100;
}

function findTabelaMaeMatch(tabela, item) {
  const sourceId = String(item?.sourceId || '');
  if (sourceId) {
    const byId = tabela.find(row => String(row?.metadata?.milaoId || row?.milaoId || '') === sourceId);
    if (byId) return { row: byId, score: 1, reason: 'milaoId' };
  }

  const itemExact = milaoCompareName(item?.nome);
  if (!itemExact) return null;

  const exato = tabela.find(row => {
    const nomeTabela = milaoCompareName(row?.supplierName || row?.productName || '');
    return nomeTabela && nomeTabela === itemExact && volumeCompativel(row, item);
  });
  if (exato) return { row: exato, score: 0.99, reason: 'exact-name' };

  const candidates = tabela.map(row => milaoCompareName(row?.supplierName || row?.productName || ''));
  if (!candidates.length) return null;

  const best = stringSimilarity.findBestMatch(itemExact, candidates);
  if (best.bestMatch.rating >= 0.94) {
    const row = tabela[best.bestMatchIndex];
    if (volumeCompativel(row, item)) {
      return { row, score: best.bestMatch.rating, reason: 'similarity' };
    }
  }

  return null;
}

async function syncMilaoWithTabelaMae(items) {
  const tabela = await readTabela();
  const atualizados = [];
  const criados = [];
  const ignorados = [];

  let nextId = tabela.reduce((max, r) => {
    const id = parseInt(String(r?.rowId || '').replace('produto-', ''));
    return isNaN(id) ? max : Math.max(max, id);
  }, 0);

  for (const item of items) {
    const found = findTabelaMaeMatch(tabela, item);
    if (found?.row) {
      const idx = tabela.findIndex(row => row.rowId === found.row.rowId);
      if (idx !== -1) {
        tabela[idx] = applyMilaoDataToTabelaEntry(tabela[idx], item);
        atualizados.push({ rowId: tabela[idx].rowId, nome: tabela[idx].supplierName, reason: found.reason, score: found.score });
        continue;
      }
    }

    if (!item.nome || !item.preco_por) {
      ignorados.push({ nome: item.nome || 'sem-nome', motivo: 'sem nome ou preço' });
      continue;
    }

    nextId += 1;
    const novo = buildTabelaMaeEntry(item, nextId);
    tabela.push(novo);
    criados.push({ rowId: novo.rowId, nome: novo.supplierName });
  }

  await writeTabela(tabela);
  return { atualizados, criados, ignorados, totalTabela: tabela.length };
}

async function runMilaoSync(options = {}) {
  const startedAt = new Date().toISOString();
  try {
    const scraped = await scrapeMilaoCatalog();
    const tabelaResult = await syncMilaoWithTabelaMae(scraped.items);

    const status = {
      success: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      source: options.source || 'manual',
      totalProdutos: scraped.items.length,
      criados: tabelaResult.criados.length,
      atualizados: tabelaResult.atualizados.length,
      ignorados: tabelaResult.ignorados.length,
      totalTabela: tabelaResult.totalTabela,
      detalhes: {
        criados: tabelaResult.criados.slice(0, 50),
        atualizados: tabelaResult.atualizados.slice(0, 50),
        ignorados: tabelaResult.ignorados.slice(0, 50)
      }
    };

    milaoWriteJson(MILAO_SYNC_STATUS_FILE || path.join(DATA_DIR, 'milao_sync_status.json'), status);
    
    // Atualiza o Resumo de Raspagem Global
    try {
      const summaryItems = [
        ...tabelaResult.criados.map(c => ({
          id: c.rowId,
          produto: c.nome,
          precoAnterior: 0,
          precoNovo: 0,
          variacao: 0,
          status: 'sem_alteracao',
          observacao: 'Produto novo cadastrado'
        })),
        ...tabelaResult.atualizados.map(a => ({
          id: a.rowId,
          produto: a.nome,
          precoAnterior: null,
          precoNovo: null,
          variacao: 0,
          status: 'alterado',
          observacao: `Sincronizado via ${a.reason}`
        }))
      ].slice(0, 100);

      updateScrapingSummarySource({
        fonte: 'milao',
        status: status.success ? 'ok' : 'erro',
        totalProcessados: status.totalProdutos,
        alteracoesPreco: status.atualizados.length,
        erros: status.ignorados.length,
        semMatch: 0,
        resumo: `Sincronização ${status.source}: ${status.criados.length} novos, ${status.atualizados.length} atualizados.`,
        itens: summaryItems
      });
    } catch (err) {
      console.error('[Milão] Erro ao atualizar resumo global:', err.message);
    }

    console.log(`[Milão] ✅ Sync concluído. Produtos: ${status.totalProdutos} | Criados: ${status.criados} | Atualizados: ${status.atualizados}`);
    return status;
  } catch (error) {
    const status = {
      success: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      source: options.source || 'manual',
      error: error.message || 'Erro desconhecido'
    };
    milaoWriteJson(MILAO_SYNC_STATUS_FILE, status);
    console.error('[Milão] ❌ Erro no sync:', error.message);
    throw error;
  }
}

app.get('/api/milao-prices', (req, res) => {
  res.json(milaoReadJson(MILAO_PRICES_FILE, []));
});

app.get('/api/milao-status', (req, res) => {
  res.json(milaoReadJson(MILAO_SYNC_STATUS_FILE, {
    success: false,
    totalProdutos: 0,
    totalCategorias: 0,
    criados: 0,
    atualizados: 0,
    finishedAt: null
  }));
});

app.all('/api/milao-sync', async (req, res) => {
  try {
    const result = await runMilaoSync({ source: 'manual' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

; (function agendarSyncAutomaticoMilao() {
  const agora = new Date();
  const proxima = new Date();
  proxima.setHours(6, 10, 0, 0);
  if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
  const ms = proxima - agora;

  console.log(`[Milão] ⏰ Próxima sincronização automática: ${proxima.toLocaleString('pt-BR')}`);

  setTimeout(() => {
    runMilaoSync({ source: 'cron' }).catch(err => console.error('[Milão] Erro no cron:', err.message));
    setInterval(() => {
      runMilaoSync({ source: 'cron' }).catch(err => console.error('[Milão] Erro no cron:', err.message));
    }, 24 * 60 * 60 * 1000);
  }, ms);

  setTimeout(() => {
    runMilaoSync({ source: 'startup' }).catch(err => console.error('[Milão] Erro no sync de startup:', err.message));
  }, 15000);
})();

// --- FIM DOS ENDPOINTS ---

// --- CATCH-ALL PARA SPA (Mover para o FINAL para evitar 404s em novos APIs) ---
app.use((req, res, next) => {
  if (req.url.startsWith('/api') || req.url.includes('.')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// (Lógica de busca v1.0 removida)
// ─── EXTRAIR IMAGEM DA GARRAFA DO PRINT ──────────────────────────────────────
app.post('/api/extrair-imagem-print', multer({ dest: 'uploads/' }).single('print'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum print enviado' });
  try {
    const imageBase64 = Buffer.from(fs.readFileSync(req.file.path)).toString('base64');
    const ext = req.file.mimetype.includes('png') ? 'png' : 'jpeg';

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Nessa imagem há uma ou mais garrafas de vinho/bebida. Localize a garrafa PRINCIPAL e retorne APENAS este JSON com as coordenadas em PORCENTAGEM (0 a 100) da posição dela na imagem:
{"x": 10, "y": 5, "w": 25, "h": 60}
Onde x=esquerda, y=topo, w=largura, h=altura. Seja generoso nas margens para não cortar a garrafa. Retorne APENAS o JSON, sem explicação.`
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/${ext};base64,${imageBase64}` }
          }
        ]
      }],
      temperature: 0.1,
      max_tokens: 100
    });

    let text = completion.choices[0]?.message?.content || '';
    // Limpa markdown se vier
    text = text.replace(/```json|```/g, '').trim();
    const bbox = JSON.parse(text);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (bbox && typeof bbox.x === 'number' && typeof bbox.y === 'number') {
      console.log(`✅ [ExtractPrint] bbox encontrado:`, bbox);
      return res.json({ success: true, bbox });
    }
    return res.json({ success: false, message: 'Garrafa não encontrada no print' });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('[ExtractPrint] Erro:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
});

const CACHE_FILE = path.join(__dirname, "cache", "wineCache.json");

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    console.error('❌ [Cache] Erro ao carregar:', e.message);
    return {};
  }
}

function saveCache(cache) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('❌ [Cache] Erro ao salvar:', e.message);
  }
}

let wineCache = loadCache();

// normalização inteligente V6.2
function normalizarNome(nome){
  return nome
    .toLowerCase()
    .replace(/^vinho\s+/i,"")
    .replace(/\b(tt|bco|rose|tto|bra|arg|chi|ita|esp|por)\b/gi,"")
    .replace(/\b\d{4}\b/g,"")
    .replace(/\b(750ml|700ml|1000ml|1l|375ml|1,5l)\b/gi,"")
    .replace(/[^\w\s]/g," ")
    .replace(/\s+/g," ")
    .trim()
}

// gerar buscas V6.1
function gerarQueriesV6(nome){
  const base = normalizarNome(nome)
  return [
    `${base} wine bottle`,
    `${base} bottle wine`,
    `${base} wine bottle product`,
    `${base} wine bottle isolated`,
    `${base} red wine bottle`
  ]
}

// busca bing robusta
async function buscarImagensBing(query){
  try{
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`
    const html = (await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })).data
    const matches = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)]
    return matches.map(m => m[1])
  }catch(e){
    return []
  }
}

// validador V6.2 (mais flexível para garrafas)
async function validarImagemV6(url){
  try{
    const res = await axios.get(url,{
      responseType:"arraybuffer",
      timeout:4000
    })
    const buffer = Buffer.from(res.data)
    const meta = await sharp(buffer).metadata()
    if(!meta.width || !meta.height) return false
    
    // Dimensões mínimas saudáveis
    if(meta.width < 150) return false
    if(meta.height < 150) return false
    
    const ratio = meta.height / meta.width
    // Garrafas são verticais. Aceitamos de 0.85 (quase quadrado) até 4.0 (muito alta)
    if(ratio < 0.85 || ratio > 4.5) return false
    
    return true
  }catch(e){
    return false
  }
}

// Fallback Google Images Scraper (V6.2)
async function buscarImagensGoogleFallback(query) {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`
    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = resp.data;
    const candidatas = (html.match(/https?:\/\/[^"'\s]+\.(?:png|jpe?g|webp)/gi) || [])
      .filter(u => !u.includes('google') && !u.includes('gstatic') && u.length > 30);
    return candidatas;
  } catch (e) {
    return [];
  }
}

// ─── ENDPOINT TURBO IMAGENS V6.2 (BING + GOOGLE HYBRID + CACHE) ──────────────
app.get("/api/buscar-imagem-google", async (req,res)=>{
  const nome=(req.query.q||"").trim()
  if(!nome) return res.json({success:false,urls:[]})

  const key = normalizarNome(nome)

  // 1️⃣ BUSCA LOCAL (SINGLE SOURCE) - PRIORIDADE ZERO
  const imagemLocal = buscarImagemLocal(nome);
  if (imagemLocal) {
    console.log(`✨ [Single Source HIT] ${nome} -> ${imagemLocal}`);
    return res.json({
      success: true,
      urls: [imagemLocal]
    });
  }

  // 2️⃣ CACHE TURBO V6
  if(wineCache[key]){
    console.log(`⚡ [Cache HIT V6.2] ${key}`);
    return res.json({
      success:true,
      urls:[wineCache[key]]
    })
  }

  try{
    console.log(`🚀 [Turbo V6.2] Buscando: "${nome}"`);
    const queries = gerarQueriesV6(nome)
    let imagens = []

    // 2️⃣ BING SEARCH (Prioritário)
    const bingResults = await buscarImagensBing(queries[0])
    imagens = imagens.concat(bingResults)

    // 3️⃣ GOOGLE FALLBACK (Se Bing for pobre)
    if(imagens.length < 5){
      console.log(`🔍 [Turbo V6.2] Bing insuficiente, tentando Google Fallback...`);
      const googleResults = await buscarImagensGoogleFallback(queries[0])
      imagens = imagens.concat(googleResults)
    }

    // remover duplicadas e filtrar por tamanho de URL (evitar base64/thumbs)
    imagens = [...new Set(imagens)].filter(u => u.length > 40 && u.startsWith('http'))
    const boas = []

    // 4️⃣ VALIDAÇÃO EM LOTE (Top 15)
    for(const url of imagens.slice(0,15)){
      const ok = await validarImagemV6(url)
      if(ok){
        boas.push(url)
        // REMOVIDO: Salvamento automático no cache (Regra do Sérgio)
      }
    }

    // Se ainda não achou, reduzimos o rigor da chave para futuras buscas ou retornamos vazio
    return res.json({
      success:true,
      urls:boas
    })
  }catch(e){
    console.error("❌ [Turbo V6.2] Erro:", e.message)
    return res.json({success:false,urls:[]})
  }
})

// 💾 NOVO ENDPOINT: SALVAR IMAGEM MANUALMENTE (Regra do Sérgio)
app.post("/api/salvar-imagem", async (req, res) => {
  const { url, nome, produtoId } = req.body;
  if (!url) return res.status(400).json({ success: false, message: "URL faltante" });

  try {
    const slug = slugify(nome || `produto-${produtoId}`);
    const dest = path.join(IMAGENS_SEM_FUNDO_DIR, `${slug}.png`);
    
    console.log(`📥 [Single Source] Baixando imagem para ${nome}: ${url}`);
    await downloadImage(url, dest);
    
    console.log(`✅ [Single Source] Imagem salva: ${slug}.png`);
    
    // 🔥 APRENDIZADO AUTOMÁTICO DE MARCA
    const marcaExistente = detectarMarca(nome);
    if (!marcaExistente) {
        console.log(`🧠 [Aprendizado] Tentando aprender marca para: ${nome}`);
        try {
            const completion = await groq.chat.completions.create({
              messages: [{ role: 'system', content: 'Extraia apenas a MARCA principal do vinho (ex: Catena, Almaviva, Pacheca). Se não tiver certeza, retorne "null". Responda apenas a palavra.' }, { role: 'user', content: nome }],
              model: 'llama-3.3-70b-versatile',
            });
            const novaMarca = completion.choices[0].message.content.trim().toLowerCase();
            if (novaMarca && novaMarca !== 'null' && novaMarca.length > 2 && !marcasConhecidas.includes(novaMarca)) {
                console.log(`✨ [Aprendizado] Nova marca detectada: ${novaMarca}`);
                marcasConhecidas.push(novaMarca);
                fs.writeFileSync(MARCAS_FILE, JSON.stringify(marcasConhecidas, null, 2));
            }
        } catch (e) {
            console.error('❌ Erro no aprendizado:', e.message);
        }
    }

    // Re-indexa para garantir que a busca local encontre o que acabou de salvar
    indexarImagensLocais();

    res.json({ 
      success: true, 
      path: `/imagens_sem_fundo/${slug}.png`,
      filename: `${slug}.png`
    });
  } catch (error) {
    console.error("❌ Erro ao salvar imagem:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/buscar-imagem-tripla', async (req, res) => {
  const nome = (req.query.q || '').trim();
  if (!nome) return res.status(400).json({ success: false, message: 'Nome faltante' });

  const slug = nome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  console.log(`🔍 [Tripla v2.0] Buscando: "${nome}" (slug: ${slug})`);

  // ── CAMADA 1: Varredura Local (Single Source) ─────────────────────────────
  const imagemLocal = buscarImagemLocal(nome);
  if (imagemLocal) {
    console.log(`✅ [Tripla] Single Source HIT: ${imagemLocal}`);
    return res.json({ success: true, camada: 1, url: imagemLocal, fonte: 'local_single_source' });
  }

  // ── CAMADA 2: Groq IA pergunta se conhece URL pública ──────────────────────
  try {
    const chat = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Você é especialista em vinhos. Para o produto "${nome}", retorne SOMENTE este JSON:
{"url": "URL_PUBLICA_DA_IMAGEM_DA_GARRAFA_OU_NULL"}
REGRA: Se não tiver 100% de certeza que a URL existe hoje, retorne {"url": null}. Jamais invente URLs.`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 150
    });
    const ia = JSON.parse(chat.choices[0].message.content);
    if (ia.url && typeof ia.url === 'string' && ia.url.startsWith('http')) {
      const check = await fetch(ia.url, { method: 'HEAD' }).catch(() => null);
      if (check && check.ok) {
        console.log(`✅ [Tripla] Camada 2 IA: ${ia.url}`);
        return res.json({ success: true, camada: 2, url: ia.url, fonte: 'ia' });
      }
    }
  } catch (e) {
    console.warn('[Tripla] Camada 2 falhou:', e.message);
  }

  // ── CAMADA 3: Google Images scrape ──────────────────────────────────────────
  try {
    const query = encodeURIComponent(`${nome} vinho garrafa`);
    const resp = await fetch(`https://www.google.com/search?q=${query}&tbm=isch&num=5`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await resp.text();
    const candidatas = (html.match(/https?:\/\/[^"'\s]+\.(?:png|jpe?g|webp)/gi) || [])
      .filter(u => !u.includes('google') && !u.includes('gstatic') && u.length > 40);

    if (candidatas.length > 0) {
      const url = candidatas[0];
      console.log(`✅ [Tripla] Camada 3 Google: ${url}`);
      // Download para uso local (salva na principal "imagens sem fundo")
      try {
        const imgResp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (imgResp.ok) {
          const buffer = Buffer.from(await imgResp.arrayBuffer());
          const dir = path.join(__dirname, 'public', 'imagens sem fundo');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${slug}.png`), buffer);
          console.log(`💾 [Tripla] Salvo localmente: ${slug}.png`);
        }
      } catch (e) { }
      return res.json({ success: true, camada: 3, url, fonte: 'google' });
    }
  } catch (e) {
    console.warn('[Tripla] Camada 3 falhou:', e.message);
  }

  return res.json({ success: false, camada: 0, url: null, fonte: null });
});

// ─── SALVAR IMAGEM RECORTADA (CROPS) ──────────────────────────────────────────
app.post('/api/upload-cropped-image', async (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64) return res.status(400).json({ success: false, message: 'Sem imagem' });

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const name = filename || `crop-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
    const finalPath = path.join(CROPS_DIR, name);

    fs.writeFileSync(finalPath, buffer);
    console.log(`💾 [UploadCrop] Salvo: ${name} (${Math.round(buffer.length / 1024)} KB)`);

    return res.json({
      success: true,
      url: `/uploads/crops/${name}`
    });
  } catch (e) {
    console.error('❌ [UploadCrop] Erro:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ─── SALVAR IMAGEM DO PRINT COMPLETO ─────────────────────────────────────────
const PRINTS_DIR = path.join(__dirname, 'public', 'uploads', 'prints');
if (!fs.existsSync(PRINTS_DIR)) fs.mkdirSync(PRINTS_DIR, { recursive: true });

app.post('/api/upload-print', async (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64) return res.status(400).json({ success: false, message: 'Sem imagem' });

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const name = filename || `print-${Date.now()}.jpg`;
    const finalPath = path.join(PRINTS_DIR, name);

    fs.writeFileSync(finalPath, buffer);
    console.log(`💾 [UploadPrint] Salvo: ${name}`);

    return res.json({
      success: true,
      url: `/uploads/prints/${name}`
    });
  } catch (e) {
    console.error('❌ [UploadPrint] Erro:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
});

app.use('/uploads/prints', express.static(PRINTS_DIR));

// ─── ENDPOINT: BUSCAR PREÇO SUPERADEGA ───
app.get('/api/superadega-preco', async (req, res) => {
  try {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ success: false });

    console.log(`🔍 [SuperAdega] Iniciando busca para: "${nome}"`);

    // Sanatiza o nome para busca
    let buscaNome = nome;
    if (nome.toLowerCase().includes('alma viva')) buscaNome = nome.replace(/alma viva/gi, 'Almaviva');
    if (nome.trim().toLowerCase() === 'epu') {
        buscaNome = 'Almaviva EPU';
    } else if ((nome.toLowerCase().includes(' epu') || nome.toLowerCase().startsWith('epu ')) && !nome.toLowerCase().includes('almaviva')) {
        buscaNome = buscaNome.replace(/epu/gi, 'Almaviva EPU');
    }

    const query = encodeURIComponent(buscaNome);
    const urlAjax = `https://www.superadega.com.br/search/?q=${query}&limit=6`;
    
    let produtos = [];

    // CAMADA 1: AJAX SEARCH (Mais limpo)
    try {
        console.log(`   📡 Tentando AJAX: ${urlAjax}`);
        const response = await fetch(urlAjax, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*'
            }
        });
        
        let html = '';
        try {
            const json = await response.json();
            html = json.html || '';
            console.log(`   ✅ AJAX JSON recebido (${html.length} chars de HTML)`);
        } catch (e) {
            html = await response.text();
            console.log(`   ✅ AJAX Text recebido (${html.length} chars)`);
        }

        if (html && !html.toLowerCase().includes('não há resultados')) {
            const blocos = html.split('<li');
            console.log(`   🧱 Encontrados ${blocos.length - 1} blocos de <li> no AJAX`);
            for (let i = 1; i < blocos.length; i++) {
                const bloco = blocos[i];
                if (bloco.toLowerCase().includes('talvez voce se interesse') || bloco.includes('sugestão')) continue;

                const nomeM = bloco.match(/class="[^"]*search-suggestions-name[^"]*"[^>]*>([^<]+)</i);
                const precoM = bloco.match(/class="[^"]*search-suggestions-price[^"]*"[^>]*>([^<]+)</i);
                if (nomeM && precoM) {
                    const n = nomeM[1].trim();
                    const p = parseFloat(precoM[1].replace('R$', '').replace('.', '').replace(',', '.').trim());
                    const score = calcularScoreCompatibilidade(buscaNome, n);
                    console.log(`      🔸 Candidato: "${n}" | R$ ${p} | Score: ${score}`);
                    if (n && p > 0 && score > 0) {
                        produtos.push({ nome: n, preco: p, score, url: bloco.match(/href="([^"]+)"/i)?.[1] || '' });
                    }
                }
            }
        } else {
            console.log('   ⚠️ AJAX não retornou resultados válidos.');
        }
    } catch (e) {
        console.error('   ❌ AJAX SA FAIL:', e.message);
    }

    // CAMADA 2: FULL HTML (Se AJAX estiver vazio ou falhar)
    if (produtos.length === 0) {
        try {
            const urlFull = `https://www.superadega.com.br/search/?q=${query}`;
            console.log(`   📡 Tentando FULL HTML: ${urlFull}`);
            const resFull = await fetch(urlFull, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
            const htmlFull = await resFull.text();

            console.log(`   ✅ FULL HTML recebido (${htmlFull.length} chars)`);

            // Se detectar explicitamente que não há resultados, não tenta scraping genérico
            if (!htmlFull.toLowerCase().includes('não há resultados') && !htmlFull.includes('js-no-results-message')) {
                // ISOLA A GRID DE PRODUTOS PARA EVITAR BANNERS GLOBAIS
                let searchArea = htmlFull;
                const gridStartIdx = htmlFull.indexOf('js-product-grid');
                if (gridStartIdx !== -1) {
                    searchArea = htmlFull.substring(gridStartIdx, gridStartIdx + 150000);
                }

                const itemRegex = /<a href="([^"]+)"[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
                let m;
                let foundItems = 0;
                while ((m = itemRegex.exec(searchArea)) !== null && produtos.length < 5) {
                    const url = m[1];
                    const n = m[2].trim();
                    const inner = m[3];
                    
                    // Pula se não for link de produto (contém categoria ou algo similar)
                    if (url.includes('/categoria/')) continue;

                    const score = calcularScoreCompatibilidade(buscaNome, n);
                    if (score > 60) { // Exige score mínimo para reduzir ruído
                        const pM = inner.match(/class="item-price"[^>]*>R\$\s*([\d.,]+)/i) || inner.match(/R\$\s*([\d.,]+)/);
                        if (pM) {
                            const p = parseFloat(pM[1].replace('.', '').replace(',', '.'));
                            console.log(`      🔹 Candidato Full: "${n}" | R$ ${p} | Score: ${score}`);
                            if (p > 0) produtos.push({ nome: n, preco: p, score, url });
                        }
                    }
                }
                console.log(`   🧱 Scan finalizado. Resultados compatíveis: ${produtos.length}`);
            } else {
                console.log('   ⚠️ Site indicou explicitamente que não há resultados.');
            }
        } catch (e) {
            console.error('   ❌ FULL HTML SA FAIL:', e.message);
        }
    }

    // CAMADA 3: IA Groq (Fallback final)
    if (produtos.length === 0) {
        try {
            console.log('   📡 Tentando IA Groq Fallback...');
            const urlFull = `https://www.superadega.com.br/search/?q=${query}`;
            const resFull = await fetch(urlFull, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const htmlFullText = await resFull.text();
            
            const trecho = htmlFullText.slice(0, 10000);
            const completion = await groq.chat.completions.create({
              messages: [{ role: 'system', content: `Extraia o preço de "${buscaNome}" do HTML da SuperAdega. Retorne JSON: {"produtos":[{"nome":"...","preco":0.0}]}. Se não achar nada relevante, retorne {"produtos":[]}` }, { role: 'user', content: trecho }],
              model: 'llama-3.3-70b-versatile',
              response_format: { type: 'json_object' }
            });
            const p = JSON.parse(completion.choices[0].message.content);
            const items = p.produtos || p.items || (p.preco ? [p] : []);
            if (Array.isArray(items)) {
                for (const it of items) {
                    const score = calcularScoreCompatibilidade(buscaNome, it.nome);
                    console.log(`      🔸 Candidato IA: "${it.nome}" | R$ ${it.preco} | Score: ${score}`);
                    if (it.preco > 0 && score > 0) {
                        produtos.push({ nome: it.nome, preco: it.preco, score, url: '' });
                    }
                }
            }
        } catch (e) {
            console.error('   ❌ GROQ SA FAIL:', e.message);
        }
    }

    // Ordena pelo melhor score
    produtos.sort((a, b) => b.score - a.score);

    console.log(`🛒 [SuperAdega] "${nome}" → ${produtos.length} resultados`);
    return res.json({ success: true, found: produtos.length > 0, produtos: produtos.slice(0, 5) });
  } catch (error) {
    console.error('❌ [SuperAdega] Erro crítico:', error.message);
    return res.json({ success: true, found: false, produtos: [], error: error.message });
  }
});

// --- Alias para compatibilidade com templates ---
app.get('/api/produtos', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tabela-mae.json'), 'utf8'));
    res.json(data);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/buscar-imagem', async (req, res) => {
  const { nome } = req.query;
  if (!nome) return res.json([]);
  try {
    const query = encodeURIComponent(nome);
    const url = `http://localhost:3002/api/buscar-imagem-google?q=${query}`;
    const r = await fetch(url);
    const data = await r.json();
    return res.json(data.urls || []);
  } catch (e) {
    return res.json([]);
  }
});

// ─── ENDPOINT: BUSCAR PONTUAÇÃO VIVINO ───
app.get('/api/vivino-score', async (req, res) => {
  const { nome } = req.query;
  if (!nome) return res.status(400).json({ success: false });

  try {
    const nomeLimpo = nome
      .replace(/^(vinho\s+(tinto|branco|rosé|rose|tt|bco)\s+)/i, '')
      .replace(/\s+(750ml|1,5l|1l|375ml)$/i, '')
      .trim();

    const query = encodeURIComponent(nomeLimpo);

    // TENTATIVA 1: API (Rápida)
    const url = `https://www.vivino.com/api/explore/explore?language=pt&q=${query}&min_rating=1&per_page=25`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.vivino.com/'
      }
    });

    let records = [];
    if (response.ok) {
      const data = await response.json();
      records = data.explore_vintage?.matches || [];
    }

    // FALLBACK: Se não achar nada, tenta com nome simplificado
    if (records.length === 0) {
      try {
        const nomeSimplesArr = nomeLimpo
          .replace(/^(vinho\s+|wine\s+|espumante\s+|cava\s+|champagne\s+)/i, '')
          .replace(/\s+(reserva|gran reserva|grande reserva|premium|especial|brut|demi.sec|nature)$/i, '')
          .split(' ')
          .filter(w => w.length >= 4)
          .slice(0, 3);

        const nomeSimples = nomeSimplesArr.join(' ');

        if (nomeSimples && nomeSimples !== nomeLimpo) {
          console.log(`🍷 [Vivino] Tentando fallback simplificado: "${nomeSimples}"`);
          const query2 = encodeURIComponent(nomeSimples);
          const url2 = `https://www.vivino.com/api/explore/explore?language=pt&q=${query2}&min_rating=1&per_page=5`;
          const r2 = await fetch(url2, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Referer': 'https://www.vivino.com/',
              'Origin': 'https://www.vivino.com'
            }
          });
          const data2 = await r2.json();
          records = data2?.explore_vintage?.matches || [];
        }
      } catch (e) {
        console.error('Vivino Internal Fallback Error:', e.message);
      }
    }

    // Scoring inteligente local
    let melhorMatch = null;
    let maiorScore = 0;

    for (const item of records) {
      const nomeVinho = (item.vintage?.name || item.vintage?.wine?.name || "").toLowerCase();
      const score = calcularScoreCompatibilidade(nomeLimpo, nomeVinho);

      if (score > maiorScore) {
        maiorScore = score;
        melhorMatch = item;
      }
    }

    // TENTATIVA 2: Puppeteer Fallback (Se a API não achou um bom match ou falhou)
    if (!melhorMatch || maiorScore < 40) {
      try {
        if (!browser) {
          browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        }
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.goto(`https://www.vivino.com/search/wines?q=${query}`, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Aguarda os resultados carregarem via JS
        await page.waitForSelector('.search-results-list .wine-card, .search-results-list .card', { timeout: 8000 }).catch(() => { });

        const scraped = await page.evaluate(() => {
          const first = document.querySelector('.search-results-list .wine-card, .search-results-list .card');
          if (!first) return null;
          const ratingText = first.querySelector('.average__number, .wine-card__rating__average')?.innerText || "0";
          const countText = first.querySelector('.average__stars .text-micro, .wine-card__rating__count')?.innerText || "0";
          return {
            name: first.querySelector('.wine-card__name, .wine-card__link')?.innerText,
            rating: parseFloat(ratingText.replace(',', '.')),
            reviews: parseInt(countText.replace(/[^0-9]/g, '')) || 0
          };
        });
        await page.close();

        if (scraped && scraped.rating > 0) {
          const rating = scraped.rating;
          const reviews = scraped.reviews;
          const nomeVivino = scraped.name;
          let classificacao = 'BOM', emoji = '✅';
          if (rating >= 4.3) { classificacao = 'EXCEPCIONAL'; emoji = '💎'; }
          else if (rating >= 4.0) { classificacao = 'EXCELENTE'; emoji = '⭐'; }
          else if (rating >= 3.7) { classificacao = 'MUITO BOM'; emoji = '👍'; }
          return res.json({ success: true, rating, classificacao, emoji, reviews, nomeVivino });
        }
      } catch (pe) {
        console.error('Vivino Puppeteer Fallback Error:', pe.message);
      }
    }

    // Se saiu do fallback ou a API foi boa o suficiente
    if (melhorMatch) {
      const rating = melhorMatch.vintage?.statistics?.ratings_average || 0;
      const reviews = melhorMatch.vintage?.statistics?.ratings_count || 0;
      const nomeVivino = melhorMatch.vintage?.name || '';
      let classificacao = 'BOM', emoji = '✅';
      if (rating >= 4.3) { classificacao = 'EXCEPCIONAL'; emoji = '💎'; }
      else if (rating >= 4.0) { classificacao = 'EXCELENTE'; emoji = '⭐'; }
      else if (rating >= 3.7) { classificacao = 'MUITO BOM'; emoji = '👍'; }
      else if (rating === 0) { classificacao = 'NÃO ENCONTRADO'; emoji = '❓'; }
      return res.json({ success: true, rating, classificacao, emoji, reviews, nomeVivino });
    }

    // Resumo Vivino
    try {
       updateScrapingSummarySource({
          fonte: 'vivino',
          status: melhorMatch ? 'ok' : 'parcial',
          totalProcessados: 1,
          alteracoesPreco: melhorMatch ? 1 : 0,
          erros: 0,
          semMatch: melhorMatch ? 0 : 1,
          resumo: melhorMatch ? `Avaliação encontrada: ${melhorMatch.vintage?.statistics?.ratings_average || 0}` : `Vinho não encontrado: ${nome}`,
          itens: melhorMatch ? [{
            id: 'viv-' + Date.now(),
            produto: melhorMatch.vintage?.name || '',
            precoAnterior: 0,
            precoNovo: melhorMatch.vintage?.statistics?.ratings_average || 0,
            status: 'id_only',
            observacao: `Avaliação: ${melhorMatch.vintage?.statistics?.ratings_average}`
          }] : []
        });
    } catch(e) {}

    res.json({ success: true, rating: 0, classificacao: 'NÃO ENCONTRADO', emoji: '❓', reviews: 0, nomeVivino: '' });

  } catch (error) {
    console.error('🍷 [Vivino Global Error]:', error);
    res.json({ success: true, rating: 0, classificacao: 'ERRO', emoji: '❓', reviews: 0, nomeVivino: '', error: error.message });
  }
});

app.get('/api/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('URL missing');
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const contentType = resp.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/download-png', memoryUpload.single('image'), (req, res) => {
  let buffer;
  let filename = (req.body && req.body.filename) || `sf-story-${Date.now()}.png`;

  if (req.file) {
    buffer = req.file.buffer;
  } else if (req.body && req.body.base64) {
    const base64Data = req.body.base64.replace(/^data:image\/\w+;base64,/, "");
    buffer = Buffer.from(base64Data, 'base64');
  }

  if (!buffer || buffer.length === 0) {
    console.error('[/api/download-png] Erro: Dados ausentes.', {
      hasFile: !!req.file,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });
    return res.status(400).send('Dados da imagem não recebidos.');
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

app.listen(PORT, () => console.log(`🚀 Motor Milão ${PORT} Online`));
