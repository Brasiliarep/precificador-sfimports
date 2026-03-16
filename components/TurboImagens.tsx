import React, { useState, useEffect } from 'react';
import { Search, Loader2, Save, FastForward, PlayCircle, X, ExternalLink, RefreshCw, CheckCircle, Info, Image as ImageIcon } from 'lucide-react';
import { getImagemLocalPrecificador } from '../utils/imageUtils';

interface Produto { 
    id: string; 
    nome?: string; 
    name?: string;
    supplierName?: string;
    imagem?: string; 
    [key: string]: any; 
}

export default function TurboImagens({ onClose }: { onClose: () => void }) {
    const [todosProdutos, setTodosProdutos] = useState<Produto[]>([]);
    const [filtroSomenteSemImagem, setFiltroSomenteSemImagem] = useState(true);
    const [resultados, setResultados] = useState<Record<string, string[]>>({});
    const [aprovados, setAprovados] = useState<Record<string, string>>({});
    const [imagensSugeridas, setImagensSugeridas] = useState<Record<string, string>>({});
    const [processando, setProcessando] = useState(false);
    const [progressoManual, setProgressoManual] = useState({ atual: 0, total: 0 });
    const [log, setLog] = useState<string[]>([]);
    
    // Estados para alteração manual
    const [modalManual, setModalManual] = useState<{ id: string, nome: string } | null>(null);
    const [urlManual, setUrlManual] = useState('');

    // 🏎️ MODO ESTEIRA (V8)
    const [viewMode, setViewMode] = useState<'grid' | 'esteira'>('grid');
    const [currentIndex, setCurrentIndex] = useState(0);

    // Initial load with safety
    useEffect(() => {
        const carregarDados = async () => {
            try {
                // Tenta localStorage primeiro
                const raw = localStorage.getItem('sfRows_full') || localStorage.getItem('storeMasterProducts');
                let dados: Produto[] = [];
                
                if (raw) {
                    try {
                        dados = JSON.parse(raw);
                    } catch (e) {
                        console.warn("Local storage corrompido, tentando servidor...");
                    }
                }

                // Se não deu certo ou está vazio, tenta servidor
                if (!dados || dados.length === 0) {
                    const res = await fetch('/api/produtos'); // Alias que criamos
                    if (res.ok) {
                        dados = await res.json();
                    }
                }

                setTodosProdutos(Array.isArray(dados) ? dados : []);
            } catch (err) {
                console.error("Erro crítico ao carregar dados do Turbo:", err);
                setLog(l => ["❌ Erro ao carregar catálogo. Tente atualizar a página.", ...l]);
            }
        };
        carregarDados();
    }, []);

    const produtosExibidos = (todosProdutos || []).filter(p => {
        if (!p) return false;
        if (!filtroSomenteSemImagem) return true;
        const img = p.imagem;
        return !img || img.trim() === '';
    });

    const buscarTudo = async () => {
        const alvos = produtosExibidos.filter(p => {
            if (!p) return false;
            const temImg = p.imagem && p.imagem.trim() !== '';
            return !temImg && !aprovados[p.id];
        });

        if (alvos.length === 0) {
            alert('Nenhum produto sem imagem para buscar!');
            return;
        }

        setProcessando(true);
        setProgressoManual({ atual: 0, total: alvos.length });
        
        // Cópia profunda segura
        const novosResultados: Record<string, string[]> = { ...resultados };
        const novasSugestoes: Record<string, string> = { ...imagensSugeridas };
        
        for (let i = 0; i < alvos.length; i++) {
            const p = alvos[i];
            if (!p) continue;
            const nome = p.supplierName || p.nome || p.name || `ID: ${p.id}`;

            setLog(l => [`🔍 (${i + 1}/${alvos.length}) ${nome}`, ...l.slice(0, 30)]);
            try {
                const res = await fetch(`/api/buscar-imagem?nome=${encodeURIComponent(nome)}`);
                const urls = await res.json();
                
                if (Array.isArray(urls) && urls.length > 0) {
                    novosResultados[p.id] = urls;
                    novasSugestoes[p.id] = urls[0];
                    setLog(l => [`✅ ${nome} — ${urls.length} opções`, ...l.slice(0, 30)]);
                } else {
                    setLog(l => [`❌ ${nome} — não encontrou`, ...l.slice(0, 30)]);
                }
            } catch (err) {
                setLog(l => [`⚠️ ${nome} — erro na busca`, ...l.slice(0, 30)]);
            }

            // Updates progressivos
            setResultados({ ...novosResultados });
            setImagensSugeridas({ ...novasSugestoes });
            setProgressoManual(prev => ({ ...prev, atual: i + 1 }));
            
            // Pequeno delay para evitar rate limit
            await new Promise(r => setTimeout(r, 400)); 
        }
        setProcessando(false);
    };

    const salvarImagemNoServidor = async (prodId: string, url: string, silent: boolean = false) => {
        try {
            const p = todosProdutos.find(x => x && x.id === prodId);
            const nome = p?.supplierName || p?.nome || p?.name || `produto-${prodId}`;
            
            const res = await fetch('/api/salvar-imagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, nome, produtoId: prodId })
            });
            const data = await res.json();
            
            if (data.success && data.path) {
                setAprovados(prev => ({ ...prev, [prodId]: data.path }));
                setImagensSugeridas(prev => {
                    const n = { ...prev };
                    delete n[prodId];
                    return n;
                });

                setLog(l => [`💾 ${nome} — Salvo no servidor`, ...l.slice(0, 30)]);
                if (!silent) alert("Imagem salva com sucesso!");
                
                // Persistência local atômica
                if (!silent) {
                    const chave = localStorage.getItem('sfRows_full') ? 'sfRows_full' : 'storeMasterProducts';
                    const raw = localStorage.getItem(chave);
                    if (raw) {
                        const todos: Produto[] = JSON.parse(raw);
                        const atualizados = todos.map(item => item.id === prodId ? { ...item, imagem: data.path } : item);
                        localStorage.setItem(chave, JSON.stringify(atualizados));
                        setTodosProdutos(atualizados);
                    }
                }
                return { success: true, path: data.path };
            }
        } catch (err) {
            console.error('Erro ao salvar no servidor:', err);
            if (!silent) alert("Erro ao salvar imagem.");
        }
        return { success: false };
    };

    const salvarTodas = async () => {
        const ids = Object.keys(imagensSugeridas);
        if (ids.length === 0) return;

        if (!window.confirm(`Salvar ${ids.length} imagens sugeridas?`)) return;

        setProcessando(true);
        let salvos = 0;
        const novosDadosMap: Record<string, string> = {};

        for (const id of ids) {
            const url = imagensSugeridas[id];
            const result = await salvarImagemNoServidor(id, url, true);
            if (result.success && result.path) {
                salvos++;
                novosDadosMap[id] = result.path;
            }
        }

        if (salvos > 0) {
            const chave = localStorage.getItem('sfRows_full') ? 'sfRows_full' : 'storeMasterProducts';
            const raw = localStorage.getItem(chave);
            if (raw) {
                const todos: Produto[] = JSON.parse(raw);
                const atualizados = todos.map(item => {
                    const novoPath = novosDadosMap[item.id];
                    return novoPath ? { ...item, imagem: novoPath } : item;
                });
                localStorage.setItem(chave, JSON.stringify(atualizados));
                setTodosProdutos(atualizados);
                setLog(l => [`🏆 Batch: ${salvos} imagens sincronizadas`, ...l.slice(0, 30)]);
            }
        }

        setProcessando(false);
        alert(`Sucesso! ${salvos} imagens incorporadas.`);
    };

    const totalArquivados = (todosProdutos || []).filter(p => p && p.imagem && p.imagem.trim() !== '').length;
    const progressPercent = todosProdutos.length > 0 ? (totalArquivados / todosProdutos.length) * 100 : 0;
    const searchPercent = progressoManual.total > 0 ? (progressoManual.atual / progressoManual.total) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center overflow-auto p-4 md:p-10 animate-in fade-in duration-500 backdrop-blur-md">
            
            <div className="bg-[#111111] rounded-[3rem] w-full max-w-7xl p-10 text-white border border-white/5 shadow-2xl relative">
                
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-5xl font-black italic tracking-tighter text-yellow-500 leading-none">TURBO IMAGENS <span className="text-sm not-italic font-bold text-white/20 ml-4 tracking-normal uppercase">V8 Robust</span></h2>
                            <p className="text-gray-500 text-[10px] mt-4 font-black uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={14} className="text-yellow-500" />
                                Single Source of Images — Professional Cataloging
                            </p>
                        </div>
                        <div className="text-right">
                             <span className="text-4xl font-black text-white leading-none">
                                {totalArquivados} <span className="text-lg text-white/20">/ {todosProdutos.length}</span>
                             </span>
                             <p className="text-[10px] font-black text-gray-600 uppercase mt-1 tracking-tighter">Imagens Prontas</p>
                        </div>
                    </div>
                    
                    <div className="w-full bg-white/5 rounded-full h-3 p-1 border border-white/5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-yellow-600 via-orange-500 to-red-600 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${progressPercent}%` }} 
                        />
                    </div>
                    
                    {processando && (
                        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                            <span className="flex items-center gap-3">
                                <Loader2 className="animate-spin" size={14} />
                                Buscando: {progressoManual.atual} de {progressoManual.total}
                            </span>
                            <div className="w-32 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full transition-all" style={{ width: `${searchPercent}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Manual */}
                {modalManual && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl">
                            <h3 className="text-2xl font-black text-yellow-500 mb-2 italic tracking-tighter uppercase">Painel Manual</h3>
                            <p className="text-gray-500 text-[10px] font-black mb-8 uppercase tracking-widest pb-4 border-b border-white/5">{modalManual.nome}</p>
                            
                            <div className="space-y-6">
                                <button 
                                    onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(modalManual.nome + " wine bottle")}`, '_blank')}
                                    className="w-full py-5 bg-blue-700 hover:bg-blue-600 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-3 text-white uppercase tracking-widest"
                                >
                                    <Search size={16} /> Buscar Google Externo
                                </button>
                                
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Colar URL da Imagem</label>
                                    <input 
                                        autoFocus
                                        value={urlManual}
                                        onChange={e => setUrlManual(e.target.value)}
                                        placeholder="https://exemplo.com/imagem.png"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-yellow-500 outline-none transition-all font-mono"
                                    />
                                </div>

                                {urlManual && (
                                    <div className="bg-white rounded-2xl p-4 flex justify-center h-[250px] overflow-hidden border-2 border-yellow-500/50">
                                        <img src={urlManual} className="h-full object-contain" alt="preview" onError={(e) => e.currentTarget.src = 'https://placehold.co/400x600?text=Error'} />
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setModalManual(null)} className="flex-1 py-4 text-gray-500 text-[10px] font-black hover:text-white uppercase tracking-widest">Cancelar</button>
                                    <button 
                                        disabled={!urlManual}
                                        onClick={() => { salvarImagemNoServidor(modalManual.id, urlManual); setModalManual(null); }}
                                        className="flex-[2] py-4 bg-yellow-500 text-black rounded-xl text-[10px] font-black disabled:opacity-20 uppercase tracking-widest"
                                    >
                                        <Save size={14} className="inline mr-2" /> Salvar Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex justify-between items-center mb-10 pb-8 border-b border-white/5">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button onClick={() => setFiltroSomenteSemImagem(true)}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${filtroSomenteSemImagem ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}>Sem Foto</button>
                        <button onClick={() => setFiltroSomenteSemImagem(false)}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${!filtroSomenteSemImagem ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Todos</button>
                    </div>

                    <div className="flex gap-4">
                         <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                            <button onClick={() => setViewMode('grid')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Grid</button>
                            <button onClick={() => { setViewMode('esteira'); setCurrentIndex(0); }}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${viewMode === 'esteira' ? 'bg-orange-600 text-white' : 'text-gray-600'}`}>Esteira</button>
                         </div>

                         {Object.keys(imagensSugeridas).length > 0 && !processando && (
                            <button onClick={salvarTodas}
                                className="px-8 py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2">
                                <Save size={14} /> Salvar Lote ({Object.keys(imagensSugeridas).length})
                            </button>
                         )}

                         <button onClick={buscarTudo} disabled={processando}
                             className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 uppercase tracking-widest flex items-center gap-2">
                             {processando ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />} Iniciar Turbo
                         </button>

                         <button onClick={onClose} className="bg-white/5 text-gray-500 hover:text-white px-5 rounded-2xl transition-all"><X size={20} /></button>
                    </div>
                </div>

                {/* MODO ESTEIRA */}
                {viewMode === 'esteira' && produtosExibidos.length > 0 && (
                    <div className="flex flex-col items-center py-10">
                        {(() => {
                            const p = produtosExibidos[currentIndex];
                            if (!p) return <p>Nenhum produto selecionado</p>;
                            const nome = p.supplierName || p.nome || p.name || '?';
                            const urls = resultados[p.id] || [];
                            const foiAprovado = aprovados[p.id];
                            const temImagem = p.imagem && p.imagem.trim() !== '';

                            return (
                                <div className="w-full max-w-4xl flex flex-col items-center">
                                    <div className="text-center mb-10">
                                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Revisão {currentIndex + 1} de {produtosExibidos.length}</p>
                                        <h3 className="text-5xl font-black italic tracking-tighter text-white">{nome}</h3>
                                    </div>

                                    <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-8 border-white/5 flex items-center justify-center min-h-[500px] w-full relative">
                                        {foiAprovado || temImagem ? (
                                            <div className="flex flex-col items-center">
                                                <img 
                                                    src={(foiAprovado || p.imagem)!.startsWith('http') || (foiAprovado || p.imagem)!.startsWith('data:') ? (foiAprovado || p.imagem) : getImagemLocalPrecificador((foiAprovado || p.imagem)!, nome)} 
                                                    className="max-h-[400px] object-contain drop-shadow-3xl" 
                                                    alt={nome} 
                                                />
                                                <div className="mt-8 bg-green-600 text-white px-10 py-4 rounded-full font-black text-xl flex items-center gap-3">
                                                    <CheckCircle /> CONCLUÍDO
                                                </div>
                                            </div>
                                        ) : urls.length > 0 ? (
                                            <div className="flex flex-wrap gap-10 justify-center">
                                                {urls.slice(0, 3).map((url, i) => (
                                                    <div key={i} className="flex flex-col items-center gap-6">
                                                        <img 
                                                            src={url} 
                                                            className="max-h-[380px] object-contain cursor-pointer hover:scale-110 transition-all p-4 rounded-3xl bg-gray-50 border-4 border-transparent hover:border-yellow-500"
                                                            onClick={async () => {
                                                                const s = await salvarImagemNoServidor(p.id, url, true);
                                                                if (s.success && currentIndex < produtosExibidos.length - 1) setCurrentIndex(i => i + 1);
                                                            }}
                                                            alt={`op${i}`}
                                                            onError={e => e.currentTarget.style.display = 'none'}
                                                        />
                                                        <button onClick={() => salvarImagemNoServidor(p.id, url)} className="text-[9px] font-black bg-green-600 px-6 py-3 rounded-xl uppercase tracking-widest text-white">Escolher Esta</button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center opacity-20 py-20">
                                                <Search size={80} className="mx-auto mb-6" />
                                                <p className="text-xl font-black">{processando ? 'BUSCANDO...' : 'AGUARDANDO AÇÃO'}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-14 flex gap-6 w-full max-w-2xl">
                                        <button onClick={() => currentIndex < produtosExibidos.length - 1 && setCurrentIndex(i => i + 1)} className="flex-1 py-6 bg-white/5 hover:bg-white/10 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                                            <FastForward size={16} /> Pular Produto
                                        </button>
                                        <button onClick={() => setModalManual({ id: p.id, nome })} className="flex-1 py-6 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                                            <RefreshCw size={16} /> Ajuste Manual
                                        </button>
                                        <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)} className="px-10 bg-white/5 hover:bg-white/10 rounded-3xl font-black disabled:opacity-0">⬅</button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* MODO GRID */}
                {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                    {(produtosExibidos || []).map((p, pIdx) => {
                        if (!p) return null;
                        const nome = p.supplierName || p.nome || p.name || `ID: ${p.id}`;
                        const urls = resultados[p.id] || [];
                        const temImagem = p.imagem && p.imagem.trim() !== '';
                        const foiAprovado = aprovados[p.id];

                        return (
                            <div key={p.id} className={`group flex flex-col bg-white/[0.02] rounded-[2.5rem] p-6 border transition-all duration-500 ${foiAprovado ? 'border-green-500/40 bg-green-500/5' : 'border-white/5 hover:bg-white/[0.05]'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="max-w-[75%]">
                                        <p className="text-[9px] font-black uppercase text-gray-500 mb-1 tracking-tighter truncate" title={nome}>{nome}</p>
                                        <p className="text-[8px] font-bold text-gray-800">#{p.id}</p>
                                    </div>
                                    <button onClick={() => setModalManual({ id: p.id, nome })} className="text-gray-600 hover:text-yellow-500 transition-colors"><RefreshCw size={14} /></button>
                                </div>

                                <div className="relative w-full h-[240px] bg-white rounded-[2rem] flex items-center justify-center p-6 shadow-xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                                    {foiAprovado || temImagem ? (
                                        <img 
                                            src={(foiAprovado || p.imagem)!.startsWith('http') || (foiAprovado || p.imagem)!.startsWith('data:') ? (foiAprovado || p.imagem) : getImagemLocalPrecificador((foiAprovado || p.imagem)!, nome)} 
                                            className="h-full w-full object-contain drop-shadow-2xl animate-in zoom-in duration-300" 
                                            alt={nome} 
                                        />
                                    ) : urls.length > 0 ? (
                                        <div className="flex gap-4 h-full w-full justify-center items-center overflow-x-auto p-2 no-scrollbar">
                                            {urls.slice(0, 3).map((url, i) => (
                                                <img key={i} src={url} alt={`op${i}`}
                                                    onClick={() => salvarImagemNoServidor(p.id, url)}
                                                    className="h-[180px] min-w-[100px] object-contain cursor-pointer hover:scale-110 active:scale-90 transition-all bg-white p-2 border-2 border-transparent hover:border-green-500 rounded-2xl"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-5">
                                            <ImageIcon size={48} />
                                            <span className="text-[10px] font-black uppercase tracking-widest mt-2">{processando ? '...' : 'Sem Foto'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex gap-2">
                                    {foiAprovado || temImagem ? (
                                        <div className="w-full bg-blue-500/10 border border-blue-500/20 py-2.5 rounded-xl text-center">
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Imagem Verificada</span>
                                        </div>
                                    ) : (
                                        <button onClick={() => setModalManual({ id: p.id, nome })} className="w-full bg-white/5 hover:bg-white/10 py-2.5 rounded-xl border border-white/5 text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Info size={12} /> Ajuste Manual
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}

                {/* Log Atividade */}
                {log.length > 0 && (
                    <div className="mt-16 bg-black/40 border border-white/5 rounded-[2.5rem] p-8 max-h-40 overflow-y-auto custom-scrollbar">
                        <div className="space-y-1">
                             {log.map((l, i) => <p key={i} className="text-[9px] text-gray-600 font-mono pl-4 border-l border-white/10 uppercase tracking-tighter">{l}</p>)}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
