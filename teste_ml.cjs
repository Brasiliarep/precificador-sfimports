// teste_ml.cjs
// Roda: node teste_ml.cjs
// Testa a API do ML e mostra o que vem de verdade

async function testar() {
  const termo = 'Alamos Malbec';
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=5`;

  console.log(`🔍 Buscando: "${termo}"`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    console.log(`Status HTTP: ${res.status}`);

    const data = await res.json();
    console.log(`Total resultados: ${data.results?.length || 0}`);
    console.log(`Paging:`, data.paging);

    if (data.results && data.results.length > 0) {
      console.log(`\n📦 Primeiros resultados:\n`);
      data.results.slice(0, 3).forEach((item, i) => {
        console.log(`--- Item ${i+1} ---`);
        console.log(`  título:       ${item.title}`);
        console.log(`  preço:        R$ ${item.price}`);
        console.log(`  sold_qty:     ${item.sold_quantity}`);
        console.log(`  condition:    ${item.condition}`);
        console.log(`  seller.id:    ${item.seller?.id}`);
        console.log(`  seller.nick:  ${item.seller?.nickname}`);
        console.log(`  seller.rep:   ${JSON.stringify(item.seller?.seller_reputation)}`);
        console.log(`  permalink:    ${item.permalink}`);
      });
    } else {
      console.log('\n❌ Nenhum resultado retornado pela API');
      console.log('Resposta completa:', JSON.stringify(data).substring(0, 500));
    }

  } catch (err) {
    console.log(`\n❌ ERRO: ${err.message}`);
    console.log(err);
  }
}

testar();
