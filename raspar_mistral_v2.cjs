// raspar_mistral_v2.cjs
// Roda: node raspar_mistral_v2.cjs
// Gera: mistral_completo.json

const fs = require('fs');

// URLs corretas descobertas analisando o HTML real do site
const CATEGORIAS = [
  '/tipo-de-vinho/tinto',
  '/tipo-de-vinho/branco',
  '/tipo-de-vinho/rosado',
  '/tipo-de-vinho/espumante',
  '/tipo-de-vinho/porto',
  '/tipo-de-vinho/branco-doce',
  '/tipo-de-vinho/tinto-doce',
  '/tipo-de-vinho/madeira',
  '/tipo-de-vinho/jerez',
  '/tipo-de-vinho/grappa',
  '/especiais/best-buys',
  '/especiais/acabou-de-chegar',
  '/especiais/vinhos-classicos',
  '/especiais/vinhos-de-guarda',
  '/especiais/vinhos-novo-mundo',
  '/especiais/vinhos-velho-mundo',
  '/kits-de-vinho',
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function unescapeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extrairProdutos(html, categoria) {
  const produtos = [];

  // Extrair blocos JSON embutidos no HTML (formato do site Mistral)
  const jsonRegex = /\{&quot;productID&quot;[^<]+\}/g;
  const slugRegex = /href="\/produto\/([^"]+)"/g;

  const jsonBlocks = [];
  let m;
  while ((m = jsonRegex.exec(html)) !== null) {
    jsonBlocks.push(m[0]);
  }

  const slugs = [];
  while ((m = slugRegex.exec(html)) !== null) {
    if (!slugs.includes(m[1])) slugs.push(m[1]);
  }

  for (let i = 0; i < jsonBlocks.length; i++) {
    try {
      const decoded = unescapeHtml(jsonBlocks[i]);
      const d = JSON.parse(decoded);

      const prodID = d.productID || '';
      const nome = d.productName || '';
      const preco = parseFloat(d.productPrice || 0);
      const slug = slugs[i] || '';

      if (!nome || preco <= 0) continue;

      produtos.push({
        productID: prodID,
        nome: nome,
        preco_de: preco,   // Mistral geralmente tem preço único
        preco_por: preco,
        disponivel: String(d.productAvailability || '').includes('Em Estoque'),
        volume: d.productBottleSize || '750ml',
        pais: d.productCountry || '',
        marca: d.productBrand || '',
        regiao: d.productRegion || '',
        tipo: d.productWineType || '',
        uvas: d.productGrapeType || '',
        categoria: categoria.replace('/', '').replace(/\//g, ' > '),
        imagem: `https://cdn.mistral.com.br/products/${prodID}/img_m_${prodID}.png`,
        url: `https://www.mistral.com.br/produto/${slug}`,
        data_raspagem: new Date().toISOString()
      });
    } catch (e) {
      // skip bloco com erro
    }
  }

  return produtos;
}

async function rasparCategoria(categoria) {
  const todos = [];
  let pagina = 1;
  const BASE = 'https://www.mistral.com.br';

  while (pagina <= 50) {
    const url = pagina === 1
      ? `${BASE}${categoria}`
      : `${BASE}${categoria}?live_sync%5Bpage%5D=${pagina}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        }
      });

      if (res.status === 404) {
        if (pagina === 1) console.log(`    ⚠️  Categoria não encontrada: ${categoria}`);
        break;
      }

      if (!res.ok) break;

      const html = await res.text();
      const produtos = extrairProdutos(html, categoria);

      if (produtos.length === 0) break;

      todos.push(...produtos);
      process.stdout.write(`\r    📄 Pág ${pagina} → ${todos.length} produtos`);
      pagina++;
      await sleep(500);

    } catch (err) {
      console.error(`\n    ❌ Erro: ${err.message}`);
      break;
    }
  }

  if (todos.length > 0) process.stdout.write('\n');
  return todos;
}

async function main() {
  console.log('🍷 Raspagem COMPLETA da Mistral — v2\n');
  console.log('━'.repeat(50));

  const todos = [];
  const seenIDs = new Set();

  for (const cat of CATEGORIAS) {
    console.log(`\n📂 ${cat}`);
    const produtos = await rasparCategoria(cat);

    // Deduplicar por productID
    let novos = 0;
    for (const p of produtos) {
      const key = p.productID || p.url;
      if (!seenIDs.has(key)) {
        seenIDs.add(key);
        todos.push(p);
        novos++;
      }
    }

    console.log(`    ✅ ${novos} novos | Total: ${todos.length}`);
    await sleep(300);
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`✅ CONCLUÍDO! ${todos.length} produtos únicos raspados`);

  // Salvar JSON
  fs.writeFileSync('mistral_completo.json', JSON.stringify(todos, null, 2));
  console.log(`💾 Salvo: mistral_completo.json`);
  console.log(`\n👉 Envie o arquivo mistral_completo.json para o Claude!`);

  // Resumo por tipo
  const porTipo = {};
  todos.forEach(p => {
    const t = p.tipo || 'Outros';
    porTipo[t] = (porTipo[t] || 0) + 1;
  });
  console.log('\n📊 Por tipo:');
  Object.entries(porTipo).sort((a,b) => b[1]-a[1]).forEach(([t, c]) => {
    console.log(`   ${t}: ${c}`);
  });
}

main().catch(console.error);
