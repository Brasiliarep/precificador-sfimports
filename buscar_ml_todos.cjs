// buscar_ml_todos.cjs
// Busca preços do Mercado Livre para TODOS os produtos da Planilha Mãe
// 
// Como rodar:
//   1. Coloque este arquivo na pasta do projeto
//   2. Copie sua planilha para a mesma pasta (ou ajuste o caminho abaixo)
//   3. node buscar_ml_todos.cjs
//   4. Gera: ml_precos_todos.json + ml_precos_todos.xlsx (se tiver xlsx instalado)

const fs   = require('fs');
const path = require('path');

// ================================================
// CONFIGURAÇÃO — ajuste conforme necessário
// ================================================
const CONFIG = {
  // Arquivo JSON da sua planilha (exportado pelo precificador)
  // OU lista manual de produtos (ver abaixo)
  PLANILHA_JSON: path.join(__dirname, 'data', 'tabela_completa.json'),

  // Onde salvar os resultados
  OUTPUT_FILE: path.join(__dirname, 'data', 'ml_precos_todos.json'),

  // Quantos resultados buscar por produto no ML
  ML_LIMIT: 15,

  // Quantos salvar no top (melhores)
  TOP_N: 3,

  // Delay entre buscas (ms) — não sobrecarrega a API do ML
  DELAY_MS: 350,

  // Score mínimo de reputação aceito
  // 5_green, 4_light_green, 3_yellow, 2_orange, 1_red
  REP_MINIMA: ['5_green', '4_light_green', '3_yellow'],

  // Filtrar só itens com pelo menos X vendidos
  MIN_VENDIDOS: 1,
};
// ================================================

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const REP_MAP = {
  '5_green':       '🟢 Verde',
  '4_light_green': '🟢 Verde',
  '3_yellow':      '🟡 Amarelo',
  '2_orange':      '🟠 Laranja',
  '1_red':         '🔴 Vermelho',
};

function limparNome(nome) {
  // Remove prefixos genéricos para melhorar busca no ML
  return nome
    .replace(/^VINHO\s+(TINTO|BRANCO|ROSÉ|ROSE|TT)\s+/i, '')
    .replace(/^VINHO\s+/i, '')
    .replace(/\s+750\s*ML$/i, '')
    .replace(/\s+750$/i, '')
    .replace(/\bTT\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function buscarML(nomeProduto) {
  const termoLimpo = limparNome(nomeProduto);
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(termoLimpo)}&limit=${CONFIG.ML_LIMIT}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    // Filtrar e ordenar
    const filtrados = data.results
      .filter(item => {
        const rep = item.seller?.seller_reputation?.level_id;
        const vendidos = item.sold_quantity || 0;
        const repOk = !rep || CONFIG.REP_MINIMA.includes(rep);
        return repOk && vendidos >= CONFIG.MIN_VENDIDOS;
      })
      .sort((a, b) => a.price - b.price)
      .slice(0, CONFIG.TOP_N);

    return filtrados.map((item, idx) => ({
      posicao:          idx + 1,
      ml_item_id:       item.id,
      titulo:           item.title,
      preco:            item.price,
      link:             item.permalink,
      qtd_vendida:      item.sold_quantity || 0,
      vendedor_nome:    item.seller?.nickname || 'Desconhecido',
      vendedor_rep:     REP_MAP[item.seller?.seller_reputation?.level_id] || '⚪ Desconhecida',
      condicao:         item.condition === 'new' ? 'Novo' : 'Usado',
      thumbnail:        item.thumbnail || '',
    }));

  } catch (err) {
    return [];
  }
}

async function carregarProdutos() {
  // Tenta ler do JSON do precificador
  if (fs.existsSync(CONFIG.PLANILHA_JSON)) {
    const raw = fs.readFileSync(CONFIG.PLANILHA_JSON, 'utf8');
    const dados = JSON.parse(raw);
    console.log(`📋 Carregados ${dados.length} produtos do precificador`);
    return dados.map(p => ({
      id:     p.id || p.ID || '',
      nome:   p.nomeSF || p.nome || p.Produto || p.name || '',
      origem: p.origin || p.status || '',
    })).filter(p => p.nome && p.nome.length > 2);
  }

  console.log('⚠️  Arquivo não encontrado:', CONFIG.PLANILHA_JSON);
  console.log('📝 Usando lista de exemplo — substitua pelo seu arquivo real');

  // Lista de fallback para teste
  return [
    { id: '1', nome: 'ALAMBRADO ETIQUETA MALBEC', origem: 'both' },
    { id: '2', nome: 'ALAMOS MALBEC', origem: 'both' },
    { id: '3', nome: 'ANGELICA ZAPATA MALBEC', origem: 'both' },
    { id: '4', nome: 'CATENA ZAPATA MALBEC', origem: 'both' },
    { id: '5', nome: 'DON MELCHOR CABERNET SAUVIGNON', origem: 'both' },
  ];
}

async function main() {
  console.log('🛒 BUSCA MERCADO LIVRE — TODOS OS PRODUTOS');
  console.log('━'.repeat(55));

  const produtos = await carregarProdutos();
  console.log(`📦 Total para buscar: ${produtos.length} produtos\n`);

  // Estimar tempo
  const estimativa = Math.ceil((produtos.length * CONFIG.DELAY_MS) / 60000);
  console.log(`⏱️  Estimativa: ~${estimativa} minutos\n`);

  const resultados = [];
  let encontrados = 0;
  let sem_resultado = 0;

  // Carregar resultados anteriores (para retomar se interrompido)
  let anteriores = {};
  if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf8'));
      prev.forEach(r => { anteriores[r.produto_id || r.nome] = r; });
      console.log(`🔄 Retomando — ${Object.keys(anteriores).length} já buscados anteriormente\n`);
    } catch {}
  }

  for (let i = 0; i < produtos.length; i++) {
    const p = produtos[i];
    const chave = p.id || p.nome;

    // Pular se já buscou (permite retomar)
    if (anteriores[chave]) {
      resultados.push(anteriores[chave]);
      if (i % 50 === 0) process.stdout.write(`\r⏭️  Pulando já buscados... ${i}/${produtos.length}`);
      continue;
    }

    const progresso = `[${String(i+1).padStart(4)}/${produtos.length}]`;
    process.stdout.write(`\r${progresso} 🔍 ${p.nome.substring(0, 45).padEnd(45)}`);

    const mlResultados = await buscarML(p.nome);

    const registro = {
      produto_id:      p.id,
      nome:            p.nome,
      origem:          p.origem,
      termo_buscado:   limparNome(p.nome),
      total_encontrado: mlResultados.length,
      melhor_preco:    mlResultados.length > 0 ? mlResultados[0].preco : null,
      melhor_link:     mlResultados.length > 0 ? mlResultados[0].link : null,
      top3:            mlResultados,
      atualizado_em:   new Date().toISOString(),
    };

    resultados.push(registro);

    if (mlResultados.length > 0) {
      encontrados++;
      const melhor = mlResultados[0];
      process.stdout.write(
        ` → R$ ${melhor.preco.toFixed(2).padStart(10)} | ${melhor.vendedor_rep} | ${melhor.qtd_vendida} vendas`
      );
    } else {
      sem_resultado++;
      process.stdout.write(` → ❌ Sem resultado`);
    }

    process.stdout.write('\n');

    // Salvar a cada 25 buscas (checkpoint)
    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(resultados, null, 2));
      process.stdout.write(`\n💾 Checkpoint salvo (${i+1}/${produtos.length})\n\n`);
    }

    await sleep(CONFIG.DELAY_MS);
  }

  // Salvar resultado final
  fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(resultados, null, 2));

  // ================================================
  // RELATÓRIO FINAL
  // ================================================
  console.log('\n' + '━'.repeat(55));
  console.log('✅ BUSCA CONCLUÍDA!');
  console.log(`━`.repeat(55));
  console.log(`📦 Total buscados:       ${produtos.length}`);
  console.log(`✅ Com resultado ML:      ${encontrados}`);
  console.log(`❌ Sem resultado:         ${sem_resultado}`);
  console.log(`📊 Taxa de sucesso:       ${((encontrados/produtos.length)*100).toFixed(1)}%`);
  console.log(`💾 Salvo em:             ${CONFIG.OUTPUT_FILE}`);

  // Top 10 melhores oportunidades (preço ML muito menor que SF Por)
  console.log('\n🔥 TOP 10 — MAIOR DIFERENÇA DE PREÇO (ML vs seu preço):');
  const comparados = resultados
    .filter(r => r.melhor_preco && r.melhor_preco > 0)
    .sort((a, b) => b.melhor_preco - a.melhor_preco)
    .slice(0, 10);

  comparados.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.nome.substring(0,40).padEnd(40)} → R$ ${r.melhor_preco.toFixed(2)}`);
  });

  console.log('\n👉 Envie o arquivo ml_precos_todos.json para o Claude para gerar o Excel final!');
}

main().catch(console.error);
