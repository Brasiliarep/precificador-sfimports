const fs = require('fs');

// Ler o arquivo JSON
const products = JSON.parse(fs.readFileSync('./public/data/products-array.json', 'utf8'));

console.log(`Total de produtos antes: ${products.length}`);

// Encontrar duplicados pelo nome (ignorando maiúsculas/minúsculas)
const seen = new Set();
const duplicates = new Set();

products.forEach((product, index) => {
  const normalizedName = product.name.toLowerCase().trim();
  if (seen.has(normalizedName)) {
    duplicates.add(index);
  } else {
    seen.add(normalizedName);
  }
});

console.log(`Produtos duplicados encontrados: ${duplicates.size}`);

// Filtrar produtos: remover duplicados E produtos sem imagem válida
const cleanedProducts = products.filter((product, index) => {
  // Remover se está na lista de duplicados
  if (duplicates.has(index)) {
    console.log(`Removendo duplicado: ${product.name}`);
    return false;
  }
  
  // Remover se não tiver imagem ou imagem inválida
  if (!product.image || 
      product.image === '' || 
      product.image === 'null' || 
      product.image === 'undefined' ||
      !product.image.startsWith('http')) {
    console.log(`Removendo sem imagem: ${product.name}`);
    return false;
  }
  
  return true;
});

console.log(`Total de produtos depois: ${cleanedProducts.length}`);
console.log(`Produtos removidos: ${products.length - cleanedProducts.length}`);

// Salvar o arquivo limpo
fs.writeFileSync('./public/data/products-array.json', JSON.stringify(cleanedProducts, null, 2));

console.log('Arquivo limpo salvo com sucesso!');

// Estatísticas finais
const stats = {
  totalAntes: products.length,
  totalDepois: cleanedProducts.length,
  removidos: products.length - cleanedProducts.length,
  categorias: [...new Set(cleanedProducts.map(p => p.category))]
};

console.log('\n=== ESTATÍSTICAS ===');
console.log(`Produtos antes: ${stats.totalAntes}`);
console.log(`Produtos depois: ${stats.totalDepois}`);
console.log(`Removidos: ${stats.removidos}`);
console.log(`Categorias: ${stats.categorias.join(', ')}`);
