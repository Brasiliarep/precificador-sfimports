// =============================================
// RASPAGEM COMPLETA DA MISTRAL
// =============================================
// Como rodar:
//   1. Abra o terminal na pasta do seu projeto
//   2. Execute: node raspar_mistral.js
//   3. Aguarde — gera o arquivo mistral_completo.json
// =============================================

const fs = require('fs');
const path = require('path');

const CATEGORIAS = [
  'vinhos/tintos',
  'vinhos/brancos',
  'vinhos/roses',
  'vinhos/espumantes',
  'vinhos/sobremesa',
  'destilados/whisky',
  'destilados/gin',
  'destilados/vodka',
  'destilados/rum',
  'destilados/conhaque',
  'destilados/licores',
  'especiais/best-buys',
  'especiais/organicos',
  'especiais/biodinamicos',
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extrairProdutos(html, categoria) {
  const produtos = [];
  const seen = new Set();

  // Regex para cada bloco de produto
  const linkRegex = /<a[^>]*href="(\/produto\/[^"?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = `https://www.mistral.com.br${match[1]}`;
    if (seen.has(url)) continue;

    const bloco = match[2];

    // Nome: preferência pelo alt/title da imagem
    let nome = '';
    const altMatch = bloco.match(/(?:alt|title)="([^"]{5,120})"/i);
    if (altMatch) {
      nome = altMatch[1].trim();
    } else {
      nome = bloco.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 100);
    }

    if (!nome || nome.toLowerCase().includes('comprar') || nome.length < 4) continue;

    // Preço
    let preco_por = 0;
    let preco_de = 0;
    const precoMatch = bloco.match(/R\$[\s&nbsp;]*([0-9]+[.,][0-9]+)/gi);
    if (precoMatch && precoMatch.length >= 1) {
      const extrair = (s) => parseFloat(s.replace(/R\$[\s&nbsp;]*/i, '').replace(/\./g, '').replace(',', '.'));
      if (precoMatch.length === 1) {
        preco_por = extrair(precoMatch[0]);
      } else {
        preco_de = extrair(precoMatch[0]);
        preco_por = extrair(precoMatch[1]);
        if (preco_de < preco_por) [preco_de, preco_por] = [preco_por, preco_de];
      }
    }

    if (preco_por <= 0) continue;

    // Imagem
    let imagem = '';
    const imgMatch = bloco.match(/<img[^>]*src="([^"]+)"/i);
    if (imgMatch) {
      imagem = imgMatch[1].startsWith('/') ? `https://www.mistral.com.br${imgMatch[1]}` : imgMatch[1];
    }

    // Volume
    const nUp = nome.toUpperCase();
    let volume = '750ml';
    if (nUp.includes('MAGNUM') || nUp.includes('1,5L') || nUp.includes('1.5L')) volume = '1500ml';
    else if (nUp.includes('375ML') || nUp.includes('MEIA')) volume = '375ml';
    else if (nUp.includes('3L') || nUp.includes('DOUBLE MAGNUM')) volume = '3000ml';

    seen.add(url);
    produtos.push({
      nome,
      preco_de: preco_de || preco_por,
      preco_por,
      url,
      imagem,
      volume,
      categoria,
      disponivel: true,
      data_raspagem: new Date().toISOString()
    });
  }

  return produtos;
}

async function rasparCategoria(categoria) {
  const todos = [];
  let pagina = 1;

  while (pagina <= 30) {
    const url = pagina === 1
      ? `https://www.mistral.com.br/${categoria}?live_sync%5Brange%5D%5Bsale_price%5D=0%3A9999999`
      : `https://www.mistral.com.br/${categoria}?live_sync%5Brange%5D%5Bsale_price%5D=0%3A9999999&live_sync%5Bpage%5D=${pagina}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        }
      });

      if (!res.ok) break;
      const html = await res.text();
      const produtos = extrairProdutos(html, categoria);

      if (produtos.length === 0) break;

      todos.push(...produtos);
      console.log(`  ✅ ${categoria} | Pág ${pagina} → ${produtos.length} produtos`);
      pagina++;
      await sleep(400);

    } catch (err) {
      console.error(`  ❌ Erro em ${categoria} pág ${pagina}: ${err.message}`);
      break;
    }
  }

  return todos;
}

async function main() {
  console.log('🍷 Iniciando raspagem COMPLETA da Mistral...\n');

  const todos = [];
  const seen_urls = new Set();

  for (const cat of CATEGORIAS) {
    console.log(`📂 Categoria: ${cat}`);
    const produtos = await rasparCategoria(cat);

    // Deduplicar por URL
    const novos = produtos.filter(p => {
      if (seen_urls.has(p.url)) return false;
      seen_urls.add(p.url);
      return true;
    });

    todos.push(...novos);
    console.log(`  → ${novos.length} novos | Total acumulado: ${todos.length}\n`);
    await sleep(300);
  }

  // Salvar JSON
  const outputJson = path.join(__dirname, 'mistral_completo.json');
  fs.writeFileSync(outputJson, JSON.stringify(todos, null, 2));
  console.log(`\n✅ CONCLUÍDO!`);
  console.log(`📦 Total de produtos raspados: ${todos.length}`);
  console.log(`💾 Arquivo salvo: mistral_completo.json`);
  console.log(`\n👉 Agora envie o arquivo mistral_completo.json para o Claude!`);
}

main().catch(console.error);
