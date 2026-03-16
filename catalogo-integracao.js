/**
 * INTEGRAÇÃO AUTOMÁTICA PARA CATÁLOGO SF IMPORTS
 * Mantém o design atual e adiciona atualização automática
 * 
 * COMO USAR:
 * 1. Adicionar este script ao seu catálogo atual
 * 2. Modificar a função que carrega produtos
 * 3. Pronto! Catálogo sempre atualizado
 */

// Configuração
const CATALOGO_CONFIG = {
    apiUrl: 'https://sfimportsdf.com.br/api/catalogo-dados.php',
    updateInterval: 30 * 60 * 1000, // 30 minutos
    retryInterval: 5 * 60 * 1000, // 5 minutos em caso de erro
    cacheKey: 'catalogo_sf_cache',
    enableAutoUpdate: true
};

// Cache local para performance
let catalogoCache = {
    data: null,
    timestamp: 0,
    isLoading: false
};

// Função para buscar produtos da API
async function buscarProdutosAPI() {
    try {
        console.log('🔄 Buscando produtos da API...');

        const response = await fetch(CATALOGO_CONFIG.apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro na resposta da API');
        }

        console.log(`✅ ${data.count} produtos carregados da API`);

        // Atualizar cache
        catalogoCache.data = data.products;
        catalogoCache.timestamp = Date.now();

        // Salvar no localStorage
        localStorage.setItem(CATALOGO_CONFIG.cacheKey, JSON.stringify({
            data: data.products,
            timestamp: catalogoCache.timestamp
        }));

        return data.products;

    } catch (error) {
        console.error('❌ Erro ao buscar produtos:', error);

        // Tentar usar cache local
        const cacheLocal = localStorage.getItem(CATALOGO_CONFIG.cacheKey);
        if (cacheLocal) {
            const parsed = JSON.parse(cacheLocal);
            if (Date.now() - parsed.timestamp < 60 * 60 * 1000) { // 1 hora
                console.log('📦 Usando cache local...');
                catalogoCache.data = parsed.data;
                catalogoCache.timestamp = parsed.timestamp;
                return parsed.data;
            }
        }

        throw error;
    }
}

// Função para carregar produtos (substituir a função atual)
async function carregarProdutosCatalogo() {
    if (catalogoCache.isLoading) {
        console.log('⏳ Já está carregando...');
        return catalogoCache.data;
    }

    catalogoCache.isLoading = true;

    try {
        // Mostrar loading
        mostrarLoading(true);

        // Buscar produtos da API
        const produtos = await buscarProdutosAPI();

        // Renderizar produtos (mantendo a função existente)
        if (typeof window.renderizarProdutos === 'function') {
            window.renderizarProdutos(produtos);
        } else {
            // Função padrão se não existir
            renderizarProdutosPadrao(produtos);
        }

        // Atualizar timestamp
        atualizarTimestamp();

        // Esconder loading
        mostrarLoading(false);

        console.log('✅ Catálogo atualizado com sucesso!');

    } catch (error) {
        console.error('❌ Falha ao carregar catálogo:', error);
        mostrarErro('Falha ao carregar produtos. Tente novamente.');
        mostrarLoading(false);
    } finally {
        catalogoCache.isLoading = false;
    }
}

// Função para renderizar produtos (padrão)
function renderizarProdutosPadrao(produtos) {
    // Encontrar o container de produtos no seu catálogo
    const container = document.querySelector('.products-grid, .product-list, .catalogo-produtos, [data-produtos]');

    if (!container) {
        console.warn('⚠️ Container de produtos não encontrado. Verifique os seletores.');
        return;
    }

    // Limpar container
    container.innerHTML = '';

    // Renderizar cada produto
    produtos.forEach(produto => {
        const produtoHTML = criarHTMLProduto(produto);
        container.insertAdjacentHTML('beforeend', produtoHTML);
    });

    // Atualizar contadores
    atualizarContadores(produtos.length);

    // Inicializar funcionalidades dos produtos
    inicializarFuncionalidadesProdutos();
}

// Função para criar HTML de um produto (adaptar ao seu formato)
function criarHTMLProduto(produto) {
    const estaEmPromocao = produto.on_sale;
    const precoFormatado = (preco) => `R$ ${preco.toFixed(2).replace('.', ',')}`;

    // Lógica para forçar imagens locais
    let imagemLocal = '';
    if (produto.image) {
        // Extrai apenas o nome base do arquivo, ignorando a URL e a extensão antiga
        const nomeBase = produto.image.split('/').pop().split('.')[0];
        // Monte o caminho local forçando a extensão png
        imagemLocal = '/imagens_produtos/' + nomeBase + '.png';
    }

    return `
        <div class="product-item" data-product-id="${produto.id}">
            <div class="product-image">
                ${produto.image ?
            `<img src="${imagemLocal}" alt="${produto.name}" loading="lazy">` :
            '<div class="no-image">Sem imagem</div>'
        }
                ${estaEmPromocao ? '<span class="sale-badge">Promoção</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">
                    <a href="${produto.permalink}" title="${produto.name}">
                        ${produto.name}
                    </a>
                </h3>
                ${produto.description ?
            `<p class="product-description">${produto.description}</p>` : ''
        }
                <div class="product-price">
                    ${estaEmPromocao ?
            `<span class="price-original">${precoFormatado(produto.regular_price)}</span>` : ''
        }
                    <span class="price-current">${precoFormatado(produto.price)}</span>
                </div>
                <div class="product-actions">
                    <a href="${produto.permalink}" class="btn-buy">
                        Comprar
                    </a>
                    <button class="btn-favorite" data-product-id="${produto.id}">
                        ❤️
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Funções auxiliares
function mostrarLoading(show) {
    const loading = document.querySelector('.loading, .catalogo-loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

function mostrarErro(mensagem) {
    const errorContainer = document.querySelector('.error-message, .catalogo-erro');
    if (errorContainer) {
        errorContainer.textContent = mensagem;
        errorContainer.style.display = 'block';
    }

    // Também pode mostrar um alert
    if (!errorContainer) {
        alert(mensagem);
    }
}

function atualizarTimestamp() {
    const timestampElement = document.querySelector('.last-update, .ultima-atualizacao');
    if (timestampElement) {
        const agora = new Date();
        timestampElement.textContent = `Última atualização: ${agora.toLocaleString('pt-BR')}`;
    }
}

function atualizarContadores(quantidade) {
    const contadorElement = document.querySelector('.products-count, .contador-produtos');
    if (contadorElement) {
        contadorElement.textContent = `${quantidade} produtos encontrados`;
    }
}

function inicializarFuncionalidadesProdutos() {
    // Inicializar botões de favoritos
    document.querySelectorAll('.btn-favorite').forEach(btn => {
        btn.addEventListener('click', function () {
            const productId = this.dataset.productId;
            this.classList.toggle('active');
            console.log('Produto favoritado:', productId);
        });
    });

    // Inicializar lazy loading nas imagens
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Auto-atualização
function iniciarAutoAtualizacao() {
    if (!CATALOGO_CONFIG.enableAutoUpdate) return;

    setInterval(async () => {
        console.log('🔄 Auto-atualizando catálogo...');
        try {
            await carregarProdutosCatalogo();
        } catch (error) {
            console.error('❌ Erro na auto-atualização:', error);
        }
    }, CATALOGO_CONFIG.updateInterval);
}

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Iniciando catálogo SF Imports com auto-atualização...');

    // Carregar produtos iniciais
    carregarProdutosCatalogo();

    // Iniciar auto-atualização
    iniciarAutoAtualizacao();

    // Adicionar botão de atualização manual
    adicionarBotaoAtualizacao();
});

// Botão de atualização manual
function adicionarBotaoAtualizacao() {
    const header = document.querySelector('header, .header, .topo');
    if (!header) return;

    const btnAtualizar = document.createElement('button');
    btnAtualizar.innerHTML = '🔄 Atualizar Catálogo';
    btnAtualizar.className = 'btn-atualizar-catalogo';
    btnAtualizar.style.cssText = `
        background: #0073aa;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin: 10px;
        font-size: 14px;
    `;

    btnAtualizar.addEventListener('click', carregarProdutosCatalogo);
    header.appendChild(btnAtualizar);
}

// Expor funções globalmente
window.catalogoSF = {
    carregarProdutos: carregarProdutosCatalogo,
    atualizarManual: carregarProdutosCatalogo,
    buscarAPI: buscarProdutosAPI,
    config: CATALOGO_CONFIG
};

console.log('✅ Sistema de catálogo SF Imports carregado!');
