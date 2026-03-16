// ─── SERVIÇO DE INTELIGÊNCIA COMPETITIVA ───
// Cache local com fila de prioridade silenciosa

const CACHE_KEY = 'sf_inteligencia_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface IntelCache {
    vivino: number;       // nota 0-5
    vivinoClass: string;  // EXCELENTE, BOM, etc
    vivinoEmoji: string;
    vivinoReviews: number;
    saPreco: number;      // preço SuperAdega
    saNome: string;
    saUrl: string;
    ts: number;           // timestamp da busca
}

export interface Oportunidade {
    rowId: string;
    nome: string;
    sfFinal: number;
    milaoPor: number;
    imagem?: string;
    vivino: number;
    vivinoClass: string;
    vivinoEmoji: string;
    saPreco: number;
    vantagem: number; // saPreco - sfFinal
    margem: number;   // sfFinal - milaoPor
}

// Lê cache completo
export const lerCache = (): Record<string, IntelCache> => {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    } catch { return {}; }
};

// Salva entrada no cache - corrigido com lógica de merge atômico (evita race condition)
export const salvarCache = (rowId: string, data: IntelCache) => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        const cache = raw ? JSON.parse(raw) : {};
        cache[rowId] = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { }
};

// Verifica se cache ainda é válido
export const cacheValido = (rowId: string): boolean => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return false;
        const cache = JSON.parse(raw);
        const entry = cache[rowId];
        if (!entry) return false;
        return (Date.now() - entry.ts) < CACHE_TTL_MS;
    } catch { return false; }
};

// Helper para fetch seguro (evita 500 ou quebras de JSON)
async function fetchJsonSafe(url: string) {
    try {
        const r = await fetch(url);
        const text = await r.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch { }

        if (!r.ok) return { ok: false, status: r.status, data };
        return { ok: true, status: r.status, data };
    } catch (error: any) {
        return { ok: false, status: 0, data: { error: error?.message || 'network error' } };
    }
}

// Busca dados de UM produto (Vivino + SuperAdega)
export const buscarIntelProduto = async (rowId: string, nome: string, preco?: number): Promise<IntelCache | null> => {
    if (cacheValido(rowId)) return lerCache()[rowId];

    try {
        const precoParam = preco ? `&preco=${preco}` : '';
        const [vivinoResp, saResp] = await Promise.all([
            fetchJsonSafe(`/api/vivino-score?nome=${encodeURIComponent(nome)}`),
            fetchJsonSafe(`/api/superadega-preco?nome=${encodeURIComponent(nome)}${precoParam}`)
        ]);

        const houveErro = !vivinoResp.ok || !saResp.ok || vivinoResp.data?.success === false || saResp.data?.success === false;

        // Se houve erro de rede ou de API (500 ou success:false), não salvamos no cache para tentar novamente depois
        if (houveErro) {
            console.warn(`⚠️ Erro na busca intel para: ${nome}`, { vivino: vivinoResp.data, sa: saResp.data });
            return null;
        }

        const entry: IntelCache = {
            vivino: vivinoResp.data?.found ? Number(vivinoResp.data.rating || 0) : 0,
            vivinoClass: vivinoResp.data?.classificacao || 'NÃO ENCONTRADO',
            vivinoEmoji: vivinoResp.data?.emoji || '❓',
            vivinoReviews: vivinoResp.data?.reviews || 0,
            saPreco: (saResp.data?.found && saResp.data?.produtos?.[0]?.preco) ? Number(saResp.data.produtos[0].preco) : 0,
            saNome: saResp.data?.produtos?.[0]?.nome || '',
            saUrl: saResp.data?.produtos?.[0]?.url || '',
            ts: Date.now()
        };

        salvarCache(rowId, entry);
        return entry;
    } catch (err) {
        console.error(`❌ Erro crítico buscarIntel: ${nome}`, err);
        return null;
    }
};

// Identifica oportunidades da tabela
export const calcularOportunidades = (sfRows: any[]): Oportunidade[] => {
    const cache = lerCache();
    const ops: Oportunidade[] = [];
    for (const row of sfRows) {
        const rId = row.rowId || row.id;
        const entry = cache[rId];
        if (entry && entry.saPreco > 0) {
            const sfFinal = Number(row.sfFinal || row.sfPor || 0);
            const milaoPor = Number(row.milaoPor || row.venda_milao || 0);
            const vantagem = entry.saPreco - sfFinal;

            // Regra: Barato comparado SA E Vivino >= 4.0
            if (vantagem >= 10 && entry.vivino >= 4.0) {
                ops.push({
                    rowId: rId,
                    nome: row.supplierName || row.nome || 'Produto',
                    sfFinal,
                    milaoPor,
                    vivino: entry.vivino,
                    vivinoClass: entry.vivinoClass,
                    vivinoEmoji: entry.vivinoEmoji,
                    saPreco: entry.saPreco,
                    vantagem,
                    margem: sfFinal - milaoPor
                });
            }
        }
    }
    return ops.sort((a, b) => b.vantagem - a.vantagem);
};

// Fila silenciosa — processa lotes maiores e mais frequentes (seguro)
let filaAtiva = false;
export const iniciarFilaSilenciosa = async (sfRows: any[], onProgresso?: (done: number, total: number) => void) => {
    if (filaAtiva) {
        console.log('⏳ Fila de inteligência já está ativa. Ignorando nova chamada.');
        return;
    }

    const pendentes = sfRows
        .filter(r => {
            const nome = (r.supplierName || r.nome || '').toLowerCase().trim();
            const rId = r.rowId || r.id || '';
            
            // Filtros de exclusão: IDs vazios ou nomes genéricos/vazios
            if (!rId || !nome || nome === 'produto' || nome === 'produto sem nome') return false;
            
            return !cacheValido(rId);
        })
        .sort((a, b) => {
            const sfA = Number(a.sfFinal || a.sfPor || a.sfDe || 0);
            const sfB = Number(b.sfFinal || b.sfPor || b.sfDe || 0);
            return sfB - sfA; // mais caro primeiro
        });

    if (pendentes.length === 0) {
        console.log('✅ Todos os produtos já estão no cache. Fila encerrada.');
        return;
    }

    console.log(`🎯 Fila priorizada: ${pendentes.length} produtos sem cache.`);
    filaAtiva = true;
    let done = 0;
    const BATCH_SIZE = 4;

    try {
        for (let i = 0; i < pendentes.length; i += BATCH_SIZE) {
            const lote = pendentes.slice(i, i + BATCH_SIZE);
            console.log(`📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}...`);

            await Promise.all(lote.map(async (r) => {
                const nome = r.supplierName || r.nome || '';
                const preco = Number(r.sfFinal || r.sfPor || 0);
                const res = await buscarIntelProduto(r.rowId || r.id || '', nome, preco);

                if (!res) {
                    console.warn(`⚠️ Falhou: ${nome}`);
                } else if (res.saPreco > 0 || res.vivino > 0) {
                    console.log(`✅ Encontrado: ${nome} (SA: R$${res.saPreco} | Vivino: ${res.vivino})`);
                } else {
                    console.log(`🔎 Sem match: ${nome}`);
                }
            }));

            done += lote.length;
            onProgresso?.(done, pendentes.length);

            if (i + BATCH_SIZE < pendentes.length) {
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    } catch (err) {
        console.error('❌ Erro crítico na fila silenciosa:', err);
    } finally {
        filaAtiva = false;
        console.log('🏁 Fila finalizada.');
    }
};

// Limpa todo o cache
export const limparCache = () => {
    localStorage.removeItem(CACHE_KEY);
    window.location.reload(); // Recarrega para limpar estados dos componentes
};
