import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Star, ShoppingCart, DollarSign, Award, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ProdutoAnalise {
    nome: string;
    milaoPor: number;
    sfFinal: number;
    sfDe: number;
    imagem?: string;
    rowId?: string;
}

interface Analise {
    produto: ProdutoAnalise;
    vivino: { rating: number; classificacao: string; emoji: string; reviews: number; nomeVivino: string } | null;
    superadega: { nome: string; preco: number; url: string; imagem: string } | null;
    recomendado: number;
    vantagem: number;
    margem: number;
    alerta: 'verde' | 'amarelo' | 'vermelho';
    mensagem: string;
}

export default function InteligentePanel({ sfRows = [], onCriarStory }: {
    sfRows?: any[];
    onCriarStory?: (produto: any) => void;
}) {
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(false);
    const [analise, setAnalise] = useState<Analise | null>(null);
    const [sugestoes, setSugestoes] = useState<any[]>([]);
    const [localSfRows, setLocalSfRows] = useState<any[]>(sfRows);

    useEffect(() => {
        if (sfRows.length === 0) {
            const stored = localStorage.getItem('sfRows_full') || localStorage.getItem('catalogoSFImports');
            if (stored) setLocalSfRows(JSON.parse(stored));
        }
    }, []);

    const normalizar = (s: string) => s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\b(vinho|tinto|branco|rose|rosé|750ml|ml)\b/g, '')
        .replace(/[^a-z0-9\s]/g, ' ').trim();

    const buscarProdutoLocal = (nome: string) => {
        const n1 = normalizar(nome);
        const p1 = n1.split(/\s+/).filter(x => x.length > 2);
        let melhor: any = null; let melhorScore = 0;
        for (const row of localSfRows) {
            const n2 = normalizar(row.supplierName || row.nome || '');
            const p2 = n2.split(/\s+/).filter(x => x.length > 2);
            if (!p2.length) continue;
            const comuns = p1.filter(w => p2.some(w2 => w2.includes(w) || w.includes(w2)));
            const score = comuns.length / Math.max(p1.length, p2.length);
            if (score > melhorScore) { melhorScore = score; melhor = row; }
        }
        return melhorScore >= 0.4 ? melhor : null;
    };

    const handleBusca = async (nomeBusca: string) => {
        setLoading(true);
        setAnalise(null);
        try {
            // Busca local na tabela mãe
            const prodLocal = buscarProdutoLocal(nomeBusca);

            const produto: ProdutoAnalise = {
                nome: nomeBusca,
                milaoPor: prodLocal ? Number(prodLocal.milaoPor || 0) : 0,
                sfFinal: prodLocal ? Number(prodLocal.sfFinal || 0) : 0,
                sfDe: prodLocal ? Number(prodLocal.sfDe || 0) : 0,
                imagem: prodLocal?.imagem || prodLocal?.image || '',
                rowId: prodLocal?.rowId || ''
            };

            // Busca paralela: Vivino + SuperAdega
            const [vivinoRes, superadegaRes] = await Promise.all([
                fetch(`/api/vivino-score?nome=${encodeURIComponent(nomeBusca)}`).then(r => r.json()).catch(() => null),
                fetch(`/api/superadega-preco?nome=${encodeURIComponent(nomeBusca)}`).then(r => r.json()).catch(() => null)
            ]);

            const vivino = vivinoRes?.success ? vivinoRes : null;
            const saItem = superadegaRes?.success && superadegaRes.produtos?.length > 0
                ? superadegaRes.produtos[0] : null;

            // Calcula preço recomendado e vantagem
            const precoSA = saItem?.preco || 0;
            const recomendado = precoSA > 0 ? Math.max(produto.milaoPor * 1.15, precoSA - 5) : produto.sfFinal;
            const vantagem = precoSA > 0 ? precoSA - recomendado : 0;
            const margem = recomendado - produto.milaoPor;

            // Define alerta
            let alerta: 'verde' | 'amarelo' | 'vermelho' = 'verde';
            let mensagem = '';

            if (precoSA > 0 && recomendado >= precoSA) {
                alerta = 'vermelho';
                mensagem = `⚠️ Difícil competir — SuperAdega cobra R$ ${precoSA.toFixed(2).replace('.', ',')} e você precisaria de R$ ${recomendado.toFixed(2).replace('.', ',')} para ter margem.`;
            } else if (vantagem < 5 && precoSA > 0) {
                alerta = 'amarelo';
                mensagem = `⚡ Atenção — você fica apenas R$ ${vantagem.toFixed(2).replace('.', ',')} mais barato. Pouco diferencial.`;
            } else if (vivino && vivino.rating > 0 && vivino.rating < 3.5) {
                alerta = 'amarelo';
                mensagem = `⚡ Nota Vivino baixa (${vivino.rating}). Cliente pode questionar a qualidade.`;
            } else {
                alerta = 'verde';
                if (precoSA > 0)
                    mensagem = `✅ Ótimo! R$ ${vantagem.toFixed(2).replace('.', ',')} mais barato que a SuperAdega com R$ ${margem.toFixed(2).replace('.', ',')} de margem.`;
                else
                    mensagem = `✅ Produto analisado. SuperAdega não encontrada para comparação.`;
            }

            setAnalise({ produto, vivino, superadega: saItem, recomendado, vantagem, margem, alerta, mensagem });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (v: string) => {
        setBusca(v);
        if (v.length > 2) {
            const n = normalizar(v);
            setSugestoes(localSfRows.filter(r => {
                const n2 = normalizar(r.supplierName || r.nome || '');
                return n2.includes(n) || n.split(' ').some(w => w.length > 2 && n2.includes(w));
            }).slice(0, 6));
        } else {
            setSugestoes([]);
        }
    };

    const alertColors = {
        verde: { bg: '#0a2a0a', border: '#00ff88', text: '#00ff88' },
        amarelo: { bg: '#2a2200', border: '#ffd400', text: '#ffd400' },
        vermelho: { bg: '#2a0a0a', border: '#ff4444', text: '#ff6666' }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '24px', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>🧠 Painel Inteligente</h1>
                <p style={{ color: '#888', marginTop: '4px', fontSize: '14px' }}>Analise qualquer produto antes de postar no grupo</p>
            </div>

            {/* Busca */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                        <input
                            value={busca}
                            onChange={e => handleInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && busca.length > 2 && handleBusca(busca)}
                            placeholder="Digite o nome do vinho..."
                            style={{ width: '100%', padding: '12px 12px 12px 36px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button
                        onClick={() => { if (!busca.trim() || busca.trim().length < 3) { alert('Digite o nome do vinho primeiro!'); return; } handleBusca(busca); }}
                        disabled={loading}
                        style={{ padding: '12px 20px', background: loading ? '#333' : '#00ff88', color: '#000', fontWeight: 900, borderRadius: '10px', border: 'none', cursor: loading ? 'wait' : 'pointer', fontSize: '14px' }}
                    >
                        {loading ? '...' : 'ANALISAR'}
                    </button>
                </div>

                {/* Sugestões */}
                {sugestoes.length > 0 && (
                    <div style={{ position: 'absolute', top: '48px', left: 0, right: '90px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', zIndex: 50, overflow: 'hidden' }}>
                        {sugestoes.map((s, i) => (
                            <div key={i} onClick={() => { setBusca(s.supplierName || s.nome); setSugestoes([]); handleBusca(s.supplierName || s.nome); }}
                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: '13px' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div style={{ fontWeight: 700 }}>{s.supplierName || s.nome}</div>
                                <div style={{ color: '#888', fontSize: '11px' }}>Milão Por: R$ {Number(s.milaoPor || 0).toFixed(2).replace('.', ',')} · SF Final: R$ {Number(s.sfFinal || 0).toFixed(2).replace('.', ',')}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Card de Análise */}
            {analise && (
                <div style={{ marginTop: '24px' }}>
                    {/* Alerta principal */}
                    <div style={{ padding: '14px 16px', background: alertColors[analise.alerta].bg, border: `2px solid ${alertColors[analise.alerta].border}`, borderRadius: '12px', marginBottom: '20px', fontSize: '14px', color: alertColors[analise.alerta].text, fontWeight: 700 }}>
                        {analise.mensagem}
                    </div>

                    {/* Grid de cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>

                        {/* Vivino */}
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>⭐ VIVINO</div>
                            {analise.vivino && analise.vivino.rating > 0 ? (
                                <>
                                    <div style={{ fontSize: '32px', fontWeight: 900, color: analise.vivino.rating >= 4.0 ? '#00ff88' : analise.vivino.rating >= 3.5 ? '#ffd400' : '#ff6666' }}>
                                        {analise.vivino.rating.toFixed(1)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{analise.vivino.emoji} {analise.vivino.classificacao}</div>
                                    {analise.vivino.reviews > 0 && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{analise.vivino.reviews.toLocaleString('pt-BR')} avaliações</div>}
                                </>
                            ) : (
                                <div style={{ color: '#666', fontSize: '13px' }}>Não encontrado</div>
                            )}
                        </div>

                        {/* Milão Por */}
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>💰 SEU CUSTO</div>
                            <div style={{ fontSize: '26px', fontWeight: 900, color: '#fff' }}>
                                {analise.produto.milaoPor > 0 ? `R$ ${analise.produto.milaoPor.toFixed(2).replace('.', ',')}` : '--'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Milão Por</div>
                        </div>

                        {/* SuperAdega */}
                        <div style={{ background: '#1a1a1a', border: '1px solid #c0392b44', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ color: '#ff6666', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>🛒 SUPERADEGA</div>
                            {analise.superadega ? (
                                <>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#ff6666' }}>
                                        R$ {analise.superadega.preco.toFixed(2).replace('.', ',')}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{analise.superadega.nome.substring(0, 30)}...</div>
                                </>
                            ) : (
                                <div style={{ color: '#666', fontSize: '13px' }}>Não encontrado</div>
                            )}
                        </div>

                        {/* SF Recomendado */}
                        <div style={{ background: '#0a2a0a', border: '1px solid #00ff8866', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ color: '#00ff88', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>✅ VENDER A</div>
                            <div style={{ fontSize: '26px', fontWeight: 900, color: '#00ff88' }}>
                                R$ {analise.recomendado.toFixed(2).replace('.', ',')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#00ff8888', marginTop: '4px' }}>
                                +R$ {analise.margem.toFixed(2).replace('.', ',')} margem
                            </div>
                        </div>

                        {/* Vantagem */}
                        {analise.superadega && (
                            <div style={{ background: analise.vantagem >= 5 ? '#0a2a0a' : '#2a1a00', border: `1px solid ${analise.vantagem >= 5 ? '#00ff8866' : '#ffd40066'}`, borderRadius: '12px', padding: '16px' }}>
                                <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>🏆 VANTAGEM</div>
                                <div style={{ fontSize: '26px', fontWeight: 900, color: analise.vantagem >= 5 ? '#00ff88' : '#ffd400' }}>
                                    {analise.vantagem > 0 ? `-R$ ${analise.vantagem.toFixed(2).replace('.', ',')}` : `+R$ ${Math.abs(analise.vantagem).toFixed(2).replace('.', ',')}`}
                                </div>
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                                    {analise.vantagem >= 5 ? 'vs SuperAdega ✅' : analise.vantagem >= 0 ? 'margem estreita ⚡' : 'mais caro ❌'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão criar story */}
                    {onCriarStory && analise.alerta !== 'vermelho' && (
                        <button
                            onClick={() => onCriarStory({ ...analise.produto, recomendado: analise.recomendado })}
                            style={{ width: '100%', padding: '14px', background: '#00ff88', color: '#000', fontWeight: 900, fontSize: '15px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                        >
                            🚀 CRIAR STORY COM ESSE PRODUTO
                        </button>
                    )}
                    {analise.alerta === 'vermelho' && (
                        <div style={{ textAlign: 'center', padding: '12px', color: '#ff6666', fontSize: '13px' }}>
                            ⚠️ Revise o preço antes de criar o story
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
