const fs = require('fs');
const path = require('path');
const https = require('https');

// Ler o JSON
const jsonPath = path.join(__dirname, 'public/data/products-array.json');
const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Criar pasta de imagens
const imagesDir = path.join(__dirname, 'public/images/produtos');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Função para baixar imagem
function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filename);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Baixado: ${filename}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filename, () => {}); // Delete the file async
            console.log(`❌ Erro ao baixar: ${url}`);
            reject(err);
        });
    });
}

// Baixar as primeiras 10 imagens para teste
async function downloadImages() {
    const sampleProducts = products.slice(0, 10);
    
    for (const product of sampleProducts) {
        const url = product.image;
        const filename = path.join(imagesDir, `${product.id}-${path.basename(url)}`);
        
        try {
            await downloadImage(url, filename);
        } catch (error) {
            console.log(`Erro ao baixar imagem do produto ${product.id}: ${product.name}`);
        }
    }
    
    console.log('🎉 Download concluído!');
}

downloadImages();
