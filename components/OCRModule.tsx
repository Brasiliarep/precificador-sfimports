import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Camera, Loader2, CheckCircle2, Save, Search, Trash2,
    AlertTriangle, XCircle, Plus, Check, X,
    Package, Sparkles, Store, ListFilter, LayoutGrid,
    Zap, Scan, Upload, Square, CheckSquare, Film
} from 'lucide-react';
import { getImagemLocalPrecificador } from '../utils/imageUtils';
import { buscarIntelProduto } from '../src/inteligenciaService';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface ProdutoOCR {
    loja: string;
    nome: string;
    de: number | null;
    por: number;
    status: 'verde' | 'amarelo' | 'vermelho';
    matchRating: number;
    produtoVinculado: any | null;
}
interface ProdutoAnalisado extends ProdutoOCR {
    salvo: boolean;
    _key: string;
}
interface QueueItem {
    id: number;
    file: File | null;
    preview: string | null;
    status: 'pendente' | 'lendo' | 'concluido' | 'erro';
    produtos: ProdutoAnalisado[];
}
interface ConsolidatedProduct {
    id: string;
    nome: string;
    votos: ProdutoAnalisado[];
    menorPreco: number;
    precoDe: number | null;
    status: 'verde' | 'amarelo' | 'vermelho';
    produtoVinculado: any | null;
    lojas: string[];
    salvo: boolean;
    manualMenorPreco?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZAR LOJA — mostra CE / GL / NS / EP corretamente
// ─────────────────────────────────────────────────────────────────────────────
function normalizeStore(s: string) {
    const up = (s || '').toUpperCase().trim();
    if (up === 'CE' || up === 'EP' || up.includes('CELINA') || up.includes('EMPORIO') || up.includes('EMPÓRIO') || up.includes('PRIME'))
        return { acro: 'CE', style: 'bg-blue-600/20 text-blue-400 border-blue-500/40' };
    if (up === 'GL' || up === 'AG' || up.includes('GLORIA') || up.includes('GLÓRIA') || up.includes('ALTO'))
        return { acro: 'GL', style: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' };
    if (up === 'NS' || up.includes('SUICA') || up.includes('SUÍÇA') || up.includes('NOVA SUI'))
        return { acro: 'NS', style: 'bg-purple-600/20 text-purple-400 border-purple-500/40' };
    if (up === 'OTOVAL' || up.includes('OTOVAL'))
        return { acro: 'OT', style: 'bg-orange-600/20 text-orange-400 border-orange-500/40' };

    // Fallback agressivo: se for IA ou qualquer coisa estranha, usa ML
    const fallback = (up === 'IA' || !up || up.length < 2) ? 'ML' : up.slice(0, 2);
    // Se ainda for IA após o slice (casos improváveis), força ML
    const finalAcro = fallback === 'IA' ? 'ML' : fallback;

    return { acro: finalAcro, style: 'bg-slate-700/50 text-slate-300 border-slate-600/50' };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL STORE MASTER
// ─────────────────────────────────────────────────────────────────────────────
const ModalStoreMasterOCR = ({ produto, onClose, onSaved }: {
    produto: ProdutoAnalisado | ConsolidatedProduct;
    onClose: () => void;
    onSaved: (p: any) => void;
}) => {
    const [prod, setProd] = useState({
        nome: produto.nome.toUpperCase(),
        idWooCommerce: '',
        milaoDe: String(('precoDe' in produto ? produto.precoDe : produto.de) || ('menorPreco' in produto ? produto.menorPreco : produto.por) || ''),
        milaoPor: String('menorPreco' in produto ? produto.menorPreco : produto.por),
        precoDe: '',
        precoPor: '',
        tipoUva: '', safra: '', pais: '', regiao: '',
        categoria: 'Vinho', imagem: null as string | null,
        descricao: '', ml: '750ml', teorAlcoolico: '', tipoVinho: 'Tinto'
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ✅ Efeito para calcular preços SF automaticamente (Fórmulas do Sérgio)
    useEffect(() => {
        const mDe = parseFloat(prod.milaoDe.replace(',', '.')) || 0;
        const mPor = parseFloat(prod.milaoPor.replace(',', '.')) || 0;

        if (mDe > 0) {
            const sfDeValue = mDe * 1.05; // Margem 5%
            const sfPorValue = sfDeValue * 1.20; // Sellout 20% sobre o SF De (conforme solicitado anteriormente)

            setProd(prev => ({
                ...prev,
                precoDe: sfDeValue.toFixed(2),
                precoPor: sfPorValue.toFixed(2)
            }));
        }
    }, [prod.milaoDe, prod.milaoPor]);

    const set = (field: string, value: string) => setProd(p => ({ ...p, [field]: value }));

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const b64 = ev.target?.result as string;
            try {
                const r = await fetch('/api/upload-image-base64', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: prod.nome.replace(/\s+/g, '-'), imageBase64: b64 })
                });
                const d = await r.json();
                set('imagem', d.success ? d.path : b64);
            } catch { set('imagem', b64); }
        };
        reader.readAsDataURL(file);
    };

    const handlePasteImage = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (!file) continue;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const b64 = ev.target?.result as string;
                    set('imagem', b64);
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    };

    const handleIA = async () => {
        if (!prod.nome) { alert('Digite o nome do produto primeiro!'); return; }
        setIsAnalyzing(true);
        try {
            const r = await fetch(`/api/identify-product?q=${encodeURIComponent(prod.nome)}`);
            const j = await r.json();
            if (j.success && j.data) {
                const d = j.data;
                setProd(p => ({
                    ...p,
                    nome: d.nome || p.nome,
                    milaoDe: d.preco_de ? String(d.preco_de) : p.milaoDe,
                    milaoPor: d.preco_por ? String(d.preco_por) : p.milaoPor,
                    pais: d.pais && d.pais !== 'N/A' ? d.pais : p.pais,
                    safra: d.safra && d.safra !== 'N/A' ? d.safra : p.safra,
                    tipoUva: d.uva && d.uva !== 'N/A' ? d.uva : p.tipoUva,
                    regiao: d.regiao && d.regiao !== 'N/A' ? d.regiao : p.regiao,
                    tipoVinho: d.tipo || p.tipoVinho,
                    descricao: d.descricao || p.descricao,
                    categoria: d.categoria || p.categoria,
                    imagem: d.imagem || p.imagem,
                }));



            } else { alert(j.message || 'Não foi possível identificar.'); }
        } catch (e: any) { alert('Erro IA: ' + e.message); }
        finally { setIsAnalyzing(false); }
    };

    const handleSave = async () => {
        if (!prod.nome || (!prod.precoDe && !prod.precoPor)) {
            alert('Preencha nome e pelo menos um preço!'); return;
        }
        setIsAnalyzing(true);
        try {
            const clean = (v: string) => {
                let s = v.replace('R$', '').trim();
                if (s.includes(',') && s.includes('.')) {
                    // Formato BR: 1.234,56 -> remove ponto, troca vírgula por ponto
                    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
                } else if (s.includes(',')) {
                    // Formato BR simples: 16,99 -> troca vírgula por ponto
                    return parseFloat(s.replace(',', '.'));
                } else {
                    // Formato US ou inteiro: 16.99 -> direto
                    return parseFloat(s);
                }
            };
            const pDe = clean(prod.precoDe) || 0;
            const pPor = clean(prod.precoPor) || pDe;
            const mDe = clean(prod.milaoDe) || 0;
            const mPor = clean(prod.milaoPor) || mDe;

            const r = await fetch('/api/persist-product', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: prod.nome,
                    preco_de: pDe || pPor,
                    preco_por: pPor,
                    milao_de: mDe,
                    milao_por: mPor,
                    imagem: prod.imagem, descricao: prod.descricao, tipo: prod.categoria,
                    metadata: { uva: prod.tipoUva, safra: prod.safra, pais: prod.pais, regiao: prod.regiao, wooId: prod.idWooCommerce, teor: prod.teorAlcoolico, tipoVinho: prod.tipoVinho }
                })
            });
            const data = await r.json();
            if (!data.success) throw new Error(data.error || 'Falha ao salvar');

            // ✅ Sincroniza rowId se necessário 
            const finalRowId = data.rowId || data.product?.rowId;

            // ✅ Aprende o vínculo se for um novo cadastro
            if (finalRowId && prod.nome) {
                fetch('/api/learn-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ocrName: prod.nome, rowId: finalRowId })
                }).catch(console.error);
            }

            // ✅ salva preço instagram com rowId real retornado pelo servidor
            if (finalRowId) {
                await fetch('/api/update-instagram-column', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: [{ rowId: finalRowId, novoPrecoInstagram: pPor }] })
                });
            }
            onSaved(data.product || { ...prod, rowId: finalRowId, sfDe: pDe, sfPor: pPor });
        } catch (e: any) { alert('Erro ao salvar: ' + e.message); }
        finally { setIsAnalyzing(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center z-[3000] p-4 sm:p-12 overflow-y-auto custom-scrollbar">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl my-auto rounded-3xl shadow-2xl relative flex flex-col overflow-hidden">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-xl transition z-10"><X size={24} /></button>
                <div className="p-8 pb-4 flex-shrink-0">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20"><Store className="text-white" size={24} /></div>
                        <div>
                            <h1 className="text-2xl font-black uppercase text-white">STORE <span className="text-blue-400 italic">MASTER</span></h1>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Novo Produto no Catálogo SF</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome *</label>
                                        <button onClick={handleIA} disabled={isAnalyzing} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg flex items-center gap-1.5 transition">
                                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {isAnalyzing ? 'IDENTIFICANDO...' : 'IA TRIPLA'}
                                        </button>
                                    </div>
                                    <input type="text" value={prod.nome} onChange={e => set('nome', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white font-bold uppercase text-sm transition" placeholder="NOME DO PRODUTO" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Custo Milão (DE)</label>
                                        <input type="text" value={prod.milaoDe} onChange={e => set('milaoDe', e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 outline-none text-white font-bold text-sm" placeholder="0.00" />
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Custo Milão (POR)</label>
                                        <input type="text" value={prod.milaoPor} onChange={e => set('milaoPor', e.target.value)} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 outline-none text-white font-bold text-sm" placeholder="0.00" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
                                        <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 block">SF Resultado (DE)</label>
                                        <div className="px-4 py-2 bg-slate-900/50 rounded-lg text-blue-400 font-black text-sm border border-blue-500/10">
                                            R$ {prod.precoDe || '0.00'}
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                                        <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 block">SF Resultado (POR)</label>
                                        <div className="px-4 py-2 bg-slate-900/50 rounded-lg text-emerald-400 font-black text-base border border-emerald-500/10">
                                            R$ {prod.precoPor || '0.00'}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tipo de Uva</label>
                                        <input type="text" value={prod.tipoUva} onChange={e => set('tipoUva', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm" placeholder="Ex: Malbec" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Safra</label>
                                        <input type="text" value={prod.safra} onChange={e => set('safra', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm" placeholder="Ex: 2022" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Teor</label>
                                        <input type="text" value={prod.teorAlcoolico} onChange={e => set('teorAlcoolico', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm" placeholder="Ex: 14%" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tipo</label>
                                        <select value={prod.tipoVinho} onChange={e => set('tipoVinho', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm">
                                            <option>Tinto</option><option>Branco</option><option>Rosé</option><option>Espumante</option><option>Sobremesa</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ID WooCommerce (Opcional)</label>
                                    <input type="text" value={prod.idWooCommerce} onChange={e => set('idWooCommerce', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none text-slate-500 text-xs" placeholder="ID WooCommerce" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">País</label>
                                        <input type="text" value={prod.pais} onChange={e => set('pais', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm" placeholder="Argentina" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Região</label>
                                        <input type="text" value={prod.regiao} onChange={e => set('regiao', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm" placeholder="Mendoza" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Volume</label>
                                        <select value={prod.ml} onChange={e => set('ml', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white text-sm">
                                            <option value="375ml">375ml</option><option value="750ml">750ml</option><option value="1500ml">1500ml</option><option value="3000ml">3000ml</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Categoria</label>
                                        <select value={prod.categoria} onChange={e => set('categoria', e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white text-sm">
                                            <option>Vinho</option><option>Espumante</option><option>Whisky</option><option>Outros</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Imagem</label>
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        <button onClick={() => document.getElementById('sm-upload-ocr')?.click()} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1"><Package size={12} /> DESKTOP</button>
                                        <button onClick={() => { const u = prompt('URL da imagem:'); if (u) { try { new URL(u); set('imagem', u); } catch { alert('URL inválida'); } } }} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1"><CheckCircle2 size={12} /> URL</button>
                                        <button onClick={() => { const n = prompt('Nome para buscar:', prod.nome); if (n) window.open(`https://www.google.com/search?q=${encodeURIComponent(n + ' vinho garrafa fundo branco')}&tbm=isch`, '_blank'); }} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1"><Search size={12} /> GOOGLE</button>
                                    </div>
                                    <input id="sm-upload-ocr" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    <div
                                        tabIndex={0}
                                        onPaste={handlePasteImage}
                                        className="h-36 bg-slate-900 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative group outline-none focus:border-blue-500/50 transition-colors"
                                    >
                                        {isAnalyzing && !prod.imagem && (
                                            <div className="flex flex-col items-center justify-center text-blue-400 gap-2">
                                                <Loader2 size={24} className="animate-spin" />
                                                <p className="text-[10px] font-black uppercase">🔍 Buscando imagem...</p>
                                            </div>
                                        )}

                                        {prod.imagem && !isAnalyzing && (
                                            <><img src={getImagemLocalPrecificador(prod.imagem, prod.nome)} className="w-full h-full object-contain p-2" alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /><button onClick={() => set('imagem', '')} className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center font-black text-xs">REMOVER</button></>
                                        )}

                                        {!prod.imagem && !isAnalyzing && (
                                            <div className="text-slate-600 text-center">
                                                <Package size={22} className="mx-auto mb-1" />
                                                <p className="text-[10px] font-black uppercase mb-1">Sem Imagem</p>
                                                <p className="text-[8px] opacity-70">💡 Ctrl+V PARA COLAR</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Descrição</label>
                                    <textarea value={prod.descricao} onChange={e => set('descricao', e.target.value)} rows={3} placeholder="Descrição gerada pela IA..." className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 outline-none text-white text-sm resize-none transition" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6">
                            <button onClick={handleSave} disabled={isAnalyzing} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl transition flex items-center justify-center gap-3 uppercase tracking-widest">
                                {isAnalyzing ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {isAnalyzing ? 'PROCESSANDO...' : 'CADASTRAR E VINCULAR AO SISTEMA'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ MODAL VINCULAR — carrega tabela UMA VEZ, filtra localmente (sem delay)
// ─────────────────────────────────────────────────────────────────────────────
const ModalVincularOCR = ({ produto, onClose, onLinked, onNovoModal }: {
    produto: any; onClose: () => void; onLinked: (v: any) => void; onNovoModal?: (p: any) => void;
}) => {
    // Normalização inicial
    const rawNome = (produto.nome || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/^['"‘“]+|['"’ ”]+$/g, '')
        .trim();

    // Agressividade aumentada: remove as duas primeiras palavras se forem termos genéricos conhecidos
    let nomeFinal = rawNome;
    const genericPrefixes = ['VINHO', 'TINTO', 'BRANCO', 'ROSE', 'ROSÉ', 'ESPUMANTE', 'CHAMPAGNE', 'SEC', 'SUAVE', 'DOC', 'DOCG', 'VNH', 'TNT', 'BNC'];

    let words = rawNome.split(' ');
    // Remove até as 2 primeiras palavras se forem genéricas
    for (let i = 0; i < 2; i++) {
        if (words.length > 2 && genericPrefixes.includes(words[0])) {
            words.shift();
        }
    }
    nomeFinal = words.join(' ');

    const [busca, setBusca] = useState(nomeFinal);
    const [tabela, setTabela] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLoading(true);
        fetch('/api/tabela-completa')
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setTabela(d); })
            .catch(e => {
                console.error('❌ [Vincular] Erro ao carregar tabela:', e);
                alert('Erro ao carregar catálogo. Verifique o servidor.');
            })
            .finally(() => {
                setLoading(false);
                setTimeout(() => inputRef.current?.focus(), 150);
            });
    }, []);

    const handleSearch = () => {
        // Força atualização ou apenas reforça para o usuário
        if (inputRef.current) inputRef.current.focus();
    };

    const resultados = useMemo(() => {
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const b = normalize(busca).trim();
        if (!b) return tabela.slice(0, 50);

        // Remove palavras ruído que atrapalham o match exato
        const stopWords = ['VINHO', 'TINTO', 'BRANCO', 'ROSE', 'ROSE', 'ROSÉ', 'ESPUMANTE', 'FRANCES', 'FRANCÊS', 'CHILENO', 'ARGENTINO', 'DOC', 'DOCG', 'RESERVA', 'GRAN'];
        const split = b.split(/\s+/).filter(p => p.length > 1);
        const palavrasFinais = split.filter(p => p.length > 2 && !stopWords.includes(p)).length > 0
            ? split.filter(p => p.length > 2 && !stopWords.includes(p))
            : split;

        const scored = tabela.map(item => {
            const sName = normalize(item.supplierName || '');
            const pName = normalize(item.productName || '');
            const stName = normalize(item.storeProduct?.name || '');
            const rId = normalize(item.rowId || '');
            const fullText = `${sName} ${pName} ${stName} ${rId}`;
            let matches = 0;
            palavrasFinais.forEach(p => { if (fullText.includes(p)) matches++; });
            return { item, matches };
        })
            .filter(x => x.matches > 0)
            .sort((a, b) => b.matches - a.matches || (a.item.productName?.length || 0) - (b.item.productName?.length || 0));

        return scored.map(x => x.item).slice(0, 50);
    }, [busca, tabela]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex flex-col items-center p-4 sm:p-12 overflow-y-auto custom-scrollbar">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg my-auto rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white italic uppercase">VINCULAR PRODUTO</h2>
                        {!loading && <p className="text-[10px] text-slate-500 mt-0.5">{tabela.length} produtos na Planilha Mãe</p>}
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition"><X size={20} /></button>
                </div>
                <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* CONTEXTO DO PRODUTO ATUAL (FIXO NO TOPO) */}
                    <div className="bg-blue-600/10 border-2 border-blue-500/50 p-4 rounded-2xl mb-4 shadow-xl shadow-blue-500/5 flex-shrink-0">
                        <p className="text-[10px] text-blue-400 font-black uppercase mb-1.5 tracking-widest">Produto Detectado no OCR:</p>
                        <div className="flex justify-between items-center gap-4">
                            <h3 className="text-white font-black text-sm italic leading-tight uppercase truncate drop-shadow-sm">{produto.nome}</h3>
                            <div className="text-right flex-shrink-0">
                                <p className="text-emerald-400 font-black text-base drop-shadow-sm">R$ {Number(produto.menorPreco || produto.por || 0).toFixed(2)}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{produto.loja}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSearch();
                                    if (e.key === 'Escape') onClose();
                                }}
                                placeholder="Digite para buscar..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white font-bold focus:border-blue-500 outline-none transition"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-500 px-6 rounded-2xl font-black text-white text-xs transition uppercase"
                        >
                            PROCURAR
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-0">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-bold text-sm">Carregando catálogo...</p>
                            </div>
                        ) : resultados.length > 0 ? (
                            resultados.map((item: any) => (
                                <button
                                    key={item.rowId}
                                    onClick={() => onLinked(item)}
                                    className="w-full bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 p-4 rounded-2xl text-left transition group"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <p className="text-white font-bold leading-tight group-hover:text-blue-400 transition italic">{item.supplierName || item.productName}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-black">{item.rowId}</span>
                                                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-black border border-slate-600/50">
                                                    Cost: R$ {item.finalCost?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Preço Atual</p>
                                            <p className="text-emerald-400 font-black">R$ {item.sfPor?.toFixed(2) || '0.00'}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic py-10">
                                <Search size={40} className="mb-4 opacity-20" />
                                <p>Nenhum produto encontrado na busca.</p>
                                <p className="text-[10px] mt-2 font-bold uppercase">Tente um termo mais simples</p>
                            </div>
                        )}
                    </div>
                    {onNovoModal && (
                        <div className="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-center flex-shrink-0">
                            <button
                                onClick={() => { onClose(); onNovoModal(produto); }}
                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-black text-xs uppercase transition py-2 px-4 rounded-xl hover:bg-blue-500/10"
                            >
                                <Plus size={16} /> Não encontrou? Cadastrar como Novo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CARD DE PRODUTO (visão FOTOS)
// ─────────────────────────────────────────────────────────────────────────────
const CardProduto = ({ prod, qId, onSalvar, onNovoModal, onLinkModal, onDelete }: any) => {
    const st = prod.status;
    const border = st === 'verde' ? 'border-emerald-500/40 bg-emerald-500/5' : st === 'amarelo' ? 'border-amber-400/40 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5';
    const scoreColor = st === 'verde' ? 'text-emerald-400' : st === 'amarelo' ? 'text-amber-400' : 'text-red-400';

    const rowId = prod.produtoVinculado?.rowId || '';
    const nomeBusca = prod.nome || '';
    // ✅ Pega o preço REAL sendo exibido no card no momento (prioriza OCR/Consolidado)
    const displayedPrice = Number(prod.por || prod.menorPreco || 0);

    // Dispara busca em background para este produto específico (sem await — não bloqueia UI)
    if (rowId && nomeBusca) {
        buscarIntelProduto(rowId, nomeBusca).then(intel => {
            if (intel && intel.vivino >= 4.0 && intel.saPreco > 0) {
                const sfFinal = displayedPrice || Number(prod.produtoVinculado?.sfFinal || 0);
                const vantagem = intel.saPreco - sfFinal;
                if (vantagem >= 10) {
                    console.log(`🔥 [Oportunidade] ${nomeBusca}: ⭐${intel.vivino} SA:R$${intel.saPreco} SF:R$${sfFinal} +R$${vantagem}`);
                }
            }
        });
    }
    const pct = Math.round(prod.matchRating * 100);
    const motivo = st === 'verde' ? `Match perfeito ${pct}%` : st === 'amarelo' ? `Match parcial ${pct}% - Verifique` : 'Produto novo no catálogo';
    const si = normalizeStore(prod.loja);

    return (
        <div className={`p-3 rounded-2xl border-2 transition-all flex gap-3 ${border} ${prod.salvo ? 'opacity-50' : ''}`}>
            {/* Imagem Recortada */}
            <div className="w-14 h-20 bg-black/60 rounded-xl overflow-hidden border border-slate-700/50 flex-shrink-0 relative group/img">
                <img
                    src={getImagemLocalPrecificador(prod.imagemDoPrint || prod.produtoVinculado?.image || prod.produtoVinculado?.productImage, prod.nome)}
                    className="w-full h-full object-contain"
                    alt=""
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                    <Scan size={13} className="text-white/70" />
                </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
                {/* Topo */}
                <div className="min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${si.style}`}>
                            <Store size={9} /> {si.acro}
                        </span>
                        <span className={`text-[10px] font-black flex items-center gap-1 ${scoreColor}`}>
                            {pct}%
                            {st === 'verde' && <CheckCircle2 size={12} />}
                            {st === 'amarelo' && <AlertTriangle size={12} />}
                            {st === 'vermelho' && <XCircle size={12} />}
                        </span>
                    </div>
                    <h3 className="font-black text-xs leading-tight uppercase text-white truncate">{prod.nome}</h3>
                    {prod.produtoVinculado && <p className="text-[9px] text-slate-500 truncate">📋 {prod.produtoVinculado.supplierName}</p>}
                    <p className={`text-[9px] font-medium mt-0.5 ${scoreColor}`}>{motivo}</p>
                </div>

                {/* Base: preço + botões */}
                <div className="flex items-center justify-between gap-2 mt-2">
                    <div>
                        {prod.de && <span className="text-[9px] font-bold text-slate-500 line-through block">R$ {prod.de}</span>}
                        <span className="text-sm font-black text-white">R$ {prod.por}</span>
                    </div>

                    {/* Badge inteligência competitiva */}
                    {(() => {
                        const cache = JSON.parse(localStorage.getItem('sf_inteligencia_cache') || '{}');
                        const id = prod.produtoVinculado?.rowId || '';
                        const intel = cache[id];
                        if (!intel) return null;

                        // ✅ PRIORIDADE: Usa o preço que o usuário está vendo no card (OCR ou Consolidado)
                        const sfFinal = displayedPrice || Number(prod.produtoVinculado?.sfFinal || 0);

                        const vantagem = intel.saPreco > 0 ? intel.saPreco - sfFinal : 0;
                        const isOp = intel.vivino >= 4.0 && vantagem >= 10;

                        // ✅ CORREÇÃO: Só é perigo se você REALMENTE estiver mais caro que a SA
                        const isPerigo = intel.saPreco > 0 && sfFinal > (intel.saPreco + 0.05); // Margem de 5 centavos para erro de float

                        if (!isOp && !isPerigo) return null;
                        return (
                            <div style={{ marginTop: '4px', padding: '4px 8px', borderRadius: '6px', background: isOp ? '#003a00' : '#2a0000', border: `1px solid ${isOp ? '#00ff88' : '#ff4444'}`, fontSize: '10px', fontWeight: 800, color: isOp ? '#00ff88' : '#ff6666' }}>
                                {isOp
                                    ? `🔥 ⭐${intel.vivino} · R$${vantagem.toFixed(0)} mais barato que SA → POSTE AGORA`
                                    : `⚠️ SA cobra R$${intel.saPreco.toFixed(2).replace('.', ',')} — você está mais caro!`
                                }
                            </div>
                        );
                    })()}

                    <div className="flex gap-1">
                        <button onClick={() => onLinkModal(prod)} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition" title="Vincular">
                            <Search size={11} />
                        </button>
                        {(st === 'verde' || st === 'amarelo') && (
                            <button onClick={() => onSalvar(prod)} disabled={prod.salvo} title="Salvar Instagram" className={`px-2 py-1 rounded-lg font-black flex items-center gap-1 text-[9px] transition ${prod.salvo ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : st === 'verde' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}>
                                {prod.salvo ? '✅' : <><Save size={10} /> INSTA</>}
                            </button>
                        )}
                        {st === 'vermelho' && (
                            <button onClick={() => onNovoModal(prod)} className="px-2 py-1 rounded-lg font-black flex items-center gap-1 text-[9px] bg-blue-600 hover:bg-blue-500 text-white transition">
                                <Plus size={10} /> NOVO
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={() => onDelete(prod)} className="p-1.5 rounded-lg text-[9px] bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white transition" title="Excluir">
                                <Trash2 size={10} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const OCRModule = () => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalProd, setModalProd] = useState<ProdutoAnalisado | ConsolidatedProduct | null>(null);
    const [modalVincular, setModalVincular] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'consolidated'>('cards');
    const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
    const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [novosQueue, setNovosQueue] = useState<any[]>([]); // fila de produtos p/ cadastrar como novo
    const novosQueueRef = useRef<any[]>([]); // ref sempre atualizada (evita stale closure)
    const [ocrProgress, setOcrProgress] = useState<{ atual: number; total: number; etaSec: number | null } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const askConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ title, message, onConfirm });
    };

    // Carregar estado inicial do backend (BD)
    useEffect(() => {
        fetch('/api/ocr-wip')
            .then(r => r.json())
            .then(data => {
                if (data.queue) setQueue(data.queue);
                if (data.manualPrices) setManualPrices(data.manualPrices);
                setIsLoaded(true);
            })
            .catch(e => {
                console.error('Erro ao carregar WIP state:', e);
                setIsLoaded(true);
            });
    }, []);

    // Sincroniza a ref de queue para evitar stale closures nos callbacks
    useEffect(() => { novosQueueRef.current = novosQueue; }, [novosQueue]);

    const saveTimer = useRef<NodeJS.Timeout | null>(null);

    // ✅ Função para sincronização IMEDIATA (para deleções ou ações criticas)
    const syncWipState = async (currentQueue: QueueItem[], currentPrices: Record<string, number>) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        try {
            const cleanQueue = currentQueue.map(q => ({
                ...q,
                file: null,
                preview: q.preview?.startsWith('blob:') ? '' : q.preview
            }));
            await fetch('/api/ocr-wip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queue: cleanQueue, manualPrices: currentPrices })
            });
            console.log('💾 [OCR] Sincronização IMEDIATA realizada');
        } catch (e) {
            console.error('Falha na sincronização imediata:', e);
        }
    };

    // Salvar estado no backend sempre que queue ou manualPrices mudarem (com debounce)
    useEffect(() => {
        if (!isLoaded) return;

        if (saveTimer.current) clearTimeout(saveTimer.current);

        saveTimer.current = setTimeout(async () => {
            try {
                // Preserva URLs do servidor, limpa apenas blobs temporários e arquivos
                const cleanQueue = queue.map(q => ({
                    ...q,
                    file: null,
                    preview: q.preview?.startsWith('blob:') ? '' : q.preview
                }));

                const r = await fetch('/api/ocr-wip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queue: cleanQueue, manualPrices })
                });
                if (r.ok) {
                    console.log('💾 [OCR] Estado sincronizado com o servidor');
                }
            } catch (e) {
                console.error('Falha ao auto-salvar WIP no backend:', e);
            }
        }, 1500); // 1.5s de debounce para evitar excesso de escrita no disco

        return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    }, [queue, manualPrices, isLoaded]);

    const handleFileUpload = async (file: File) => {
        const id = Date.now() + Math.random();
        const preview = URL.createObjectURL(file);

        // Adiciona imediatamente com preview local
        setQueue(p => [...p, { id, file, preview, status: 'pendente', produtos: [] }]);

        // Upload do print original para persistência
        const reader = new FileReader();
        reader.onload = async (e) => {
            const b64 = e.target?.result as string;
            try {
                const r = await fetch('/api/upload-print', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: b64, filename: file.name })
                });
                const d = await r.json();
                if (d.success && d.url) {
                    setQueue(p => p.map(q => q.id === id ? { ...q, preview: d.url } : q));
                }
            } catch (err) {
                console.error('Erro ao fazer upload do print:', err);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        (Array.from(e.target.files) as File[]).forEach(file => handleFileUpload(file));
        e.target.value = '';
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const filesRaw = Array.from((e as any).targetTransfer?.files || e.dataTransfer.files) as File[];
        filesRaw.filter(f => f.type.startsWith('image/')).forEach(f => handleFileUpload(f));
    };

    // Recorta a imagem da garrafa do print original usando Canvas
    const cropImageFromPrint = (
        printBase64: string,
        bbox: { x: number; y: number; w: number; h: number }
    ): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Margens e coordenadas de origem (baseadas no bbox percentual)
                const margin = 0.08;
                const sourceX = Math.max(0, (bbox.x / 100 - margin) * img.width);
                const sourceY = Math.max(0, (bbox.y / 100 - margin - 0.02) * img.height);
                const sourceW = Math.min(img.width - sourceX, (bbox.w / 100 + margin * 2) * img.width);
                const sourceH = Math.min(img.height - sourceY, (bbox.h / 100 + margin * 2 + 0.10) * img.height);

                // Dimensões de destino (mantendo a proporção exata do recorte de origem)
                let pw = sourceW;
                let ph = sourceH;

                // 🔥 OTIMIZAÇÃO: Reduz escala mantendo proporção 1:1 com a origem
                const MAX_H = 600;
                if (ph > MAX_H) {
                    const ratio = MAX_H / ph;
                    pw = pw * ratio;
                    ph = MAX_H;
                }

                canvas.width = pw;
                canvas.height = ph;
                const ctx = canvas.getContext('2d')!;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Desenha o recorte no canvas sem distorção (pw/ph escalam proporcionalmente a sourceW/sourceH)
                ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, pw, ph);

                // 🔥 JPEG 0.8 preserva bordas muito melhor para o rembg no backend
                const base64 = canvas.toDataURL('image/jpeg', 0.8);

                // ✅ NOVO: Faz upload para o servidor para não estourar o LocalStorage
                fetch('/api/upload-cropped-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64 })
                })
                    .then(r => r.json())
                    .then(res => {
                        if (res.success && res.url) {
                            resolve(res.url); // Retorna a URL do servidor (/uploads/crops/...)
                        } else {
                            resolve(base64); // Fallback: se o upload falhar, usa o Base64 (melhor que nada)
                        }
                    })
                    .catch(err => {
                        console.error('Erro no upload do recorte:', err);
                        resolve(base64); // Fallback
                    });
            };
            img.onerror = () => resolve('');
            img.src = printBase64;
        });
    };

    const processarLote = async () => {
        setLoading(true);
        try {
            const pendentes = queue.filter(q => q.status === 'pendente');
            const todosExtraidos: ProdutoAnalisado[] = [];
            const total = pendentes.length;
            setOcrProgress({ atual: 0, total, etaSec: null });
            const temposProcessamento: number[] = [];

            // Extrai o wait time exato da mensagem de erro do Groq ("try again in Xs")
            const parseRetryAfter = (errorBody: string): number => {
                const match = errorBody.match(/try again in ([\d.]+)s/i);
                if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500; // +500ms buffer
                return 12000; // fallback: 12s
            };

            for (let idx = 0; idx < pendentes.length; idx++) {
                const item = pendentes[idx];
                const tInicio = Date.now();
                setQueue(p => p.map(q => q.id === item.id ? { ...q, status: 'lendo' } : q));
                try {
                    let result: any = null;
                    let tentativa = 0;
                    while (tentativa < 10) { // até 10 retries para rate limit
                        const fd = new FormData();
                        fd.append('image', item.file);
                        const r = await fetch('/api/vision-ocr', { method: 'POST', body: fd });
                        const bodyText = await r.text();
                        if (r.status === 429 || r.status === 500) {
                            const waitMs = parseRetryAfter(bodyText);
                            console.warn(`⏳ [OCR ${idx + 1}/${total}] Rate limit — aguardando ${(waitMs / 1000).toFixed(1)}s...`);
                            setOcrProgress(p => p ? { ...p, etaSec: Math.round(waitMs / 1000) } : p);
                            await new Promise(res => setTimeout(res, waitMs));
                            tentativa++;
                            continue;
                        }
                        try { result = JSON.parse(bodyText); } catch { console.error('[OCR] JSON inválido:', bodyText.substring(0, 100)); }
                        break;
                    }

                    if (result?.success && Array.isArray(result.data)) {
                        const printBase64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            // @ts-ignore
                            reader.readAsDataURL(item.file);
                        });
                        const produtosComImagem = await Promise.all(
                            result.data.map(async (p: any) => {
                                if (p.bbox) {
                                    const bboxFinal = p.bbox;
                                    const imgCropada = await cropImageFromPrint(printBase64, bboxFinal);
                                    if (imgCropada) return { ...p, imagemDoPrint: imgCropada };
                                }
                                return { ...p, imagemDoPrint: p.produtoVinculado?.imagem || '' };
                            })
                        );
                        const analisados: ProdutoAnalisado[] = produtosComImagem.map((p: any, i: number) => ({
                            ...p, salvo: false, _key: `${item.id}-${i}-${Date.now()}`
                        }));
                        todosExtraidos.push(...analisados);
                        setQueue(p => p.map(q => q.id === item.id ? { ...q, status: 'concluido', produtos: analisados } : q));
                    } else {
                        setQueue(p => p.map(q => q.id === item.id ? { ...q, status: 'erro' } : q));
                    }
                } catch (err: any) {
                    console.error('[OCR] Erro inesperado no item:', err?.message);
                    setQueue(p => p.map(q => q.id === item.id ? { ...q, status: 'erro' } : q));
                }

                // Atualiza progresso e ETA
                const elapsed = Date.now() - tInicio;
                temposProcessamento.push(elapsed);
                const avgMs = temposProcessamento.reduce((a, b) => a + b, 0) / temposProcessamento.length;
                const restantes = total - (idx + 1);
                setOcrProgress({ atual: idx + 1, total, etaSec: restantes > 0 ? Math.round((restantes * avgMs) / 1000) : null });

                // Pausa entre prints (respeita o rate limit sem precisar esperar 429)
                if (idx < pendentes.length - 1) {
                    await new Promise(res => setTimeout(res, 2000));
                }
            }

            // ✅ Salva histórico diário com a data de hoje
            if (todosExtraidos.length > 0) {
                try {
                    await fetch('/api/salvar-historico-ocr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            data: new Date().toISOString().split('T')[0],
                            produtos: todosExtraidos.map(p => ({
                                loja: p.loja,
                                nome: p.nome,
                                de: p.de,
                                por: p.por,
                                status: p.status,
                                matchRating: p.matchRating,
                                vinculado: p.produtoVinculado ? { rowId: p.produtoVinculado.rowId, supplierName: p.produtoVinculado.supplierName } : null
                            }))
                        })
                    });
                } catch { /* histórico não bloqueia */ }
            }
        } catch (err: any) {
            console.error('[OCR] Falha crítica no lote:', err);
        } finally {
            setLoading(false);
            setOcrProgress(null);
            setViewMode('consolidated');
        }
    };

    const consolidatedData = useMemo(() => {
        const map = new Map<string, ConsolidatedProduct>();
        const todosProdutos = queue.flatMap(q => q.produtos);

        todosProdutos.forEach(p => {
            const id = p.produtoVinculado?.rowId || p.produtoVinculado?.id || p.nome;
            const precoPor = Number(p.por) || 0;
            const precoDe = Number(p.de) || precoPor;

            if (!map.has(id)) {
                map.set(id, {
                    id,
                    nome: p.nome,
                    votos: [p],
                    menorPreco: precoPor,
                    precoDe: precoDe,
                    status: p.status,
                    produtoVinculado: p.produtoVinculado,
                    lojas: [p.loja],
                    salvo: p.salvo
                });
            } else {
                const ex = map.get(id)!;
                ex.votos.push(p);

                // 🔥 LÓGICA DE CONSOLIDAÇÃO MELHORADA:
                if (precoPor < ex.menorPreco) ex.menorPreco = precoPor;
                if (precoDe > (ex.precoDe || 0)) ex.precoDe = precoDe;
                if (!ex.lojas.includes(p.loja)) ex.lojas.push(p.loja);
                if (p.salvo) ex.salvo = true;
            }
        });

        // Aplica preços manuais se existirem
        map.forEach((val, key) => {
            if (manualPrices[key] !== undefined) {
                val.menorPreco = manualPrices[key];
            }
        });

        return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [queue, manualPrices]);

    const vincularManualmente = async (ocrProd: any, vinculo: any) => {
        const keys = 'votos' in ocrProd ? ocrProd.votos.map((v: any) => v._key) : [ocrProd._key];
        const nomeOriginal = 'votos' in ocrProd ? ocrProd.nome : ocrProd.nome;

        setQueue(p => p.map(q => ({
            ...q,
            produtos: q.produtos.map(pr =>
                keys.includes(pr._key) ? { ...pr, produtoVinculado: vinculo, status: 'verde' as const, matchRating: 1 } : pr
            )
        })));

        // ✅ Notifica o servidor para "aprender" esse vínculo
        try {
            await fetch('/api/learn-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ocrName: nomeOriginal, rowId: vinculo.rowId })
            });
            console.log(`🧠 [Learn] Enviado: ${nomeOriginal} -> ${vinculo.rowId}`);
        } catch (e) {
            console.error('Erro ao salvar aprendizado:', e);
        }

        setModalVincular(null);
    };

    // ✅ FIX: usa produtoVinculado.rowId real, verifica antes de salvar
    const salvarInstagram = useCallback(async (rowId: string, valorPor: number, valorDe: number, keys: string[]) => {
        if (!rowId || rowId === '') {
            alert('⚠️ Produto não vinculado. Clique em VINCULAR primeiro.');
            return;
        }
        try {
            const r = await fetch('/api/update-instagram-column', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: [{ rowId, novoPrecoInstagram: valorPor, novoPrecoMilaoDe: valorDe }] })
            });
            if (!r.ok) throw new Error();
            const d = await r.json();
            if (d.atualizados === 0) {
                alert('⚠️ Nenhum produto atualizado. Verifique o vínculo.');
                return;
            }
            setQueue(p => p.map(q => ({ ...q, produtos: q.produtos.map(pr => keys.includes(pr._key) ? { ...pr, salvo: true } : pr) })));
        } catch {
            alert('Erro ao salvar. Verifique o servidor.');
        }
    }, []);

    // ✅ SALVAR TODOS OS VALIDADOS — com verificação de rowId
    const salvarTodos = async () => {
        const validos = consolidatedData.filter(c => !c.salvo && (c.status === 'verde' || c.status === 'amarelo') && c.produtoVinculado?.rowId);
        if (!validos.length) {
            const semVinculo = consolidatedData.filter(c => (c.status === 'verde' || c.status === 'amarelo') && !c.produtoVinculado?.rowId).length;
            if (semVinculo > 0) alert(`⚠️ ${semVinculo} produtos verdes/amarelos não estão vinculados. Vincule-os primeiro.`);
            else alert('⚠️ Nenhum produto pronto para salvar.');
            return;
        }

        askConfirm(
            'Confirmar Aprovação',
            `Deseja salvar ${validos.length} preços promocionais na coluna Instagram?`,
            async () => {
                setLoading(true);
                try {
                    const updates = validos.map(c => ({
                        rowId: c.produtoVinculado.rowId,
                        novoPrecoInstagram: c.menorPreco,
                        novoPrecoMilaoDe: c.precoDe
                    }));
                    const r = await fetch('/api/update-instagram-column', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ updates })
                    });
                    const d = await r.json();
                    if (r.ok && d.success) {
                        const keys = validos.flatMap(c => c.votos.map(v => v._key));
                        setQueue(p => p.map(q => ({ ...q, produtos: q.produtos.map(pr => keys.includes(pr._key) ? { ...pr, salvo: true } : pr) })));
                        alert(`✅ ${d.atualizados || validos.length} preços salvos com sucesso!`);
                    } else {
                        alert('Erro ao salvar: ' + (d.error || 'Erro desconhecido'));
                    }
                } catch (e: any) {
                    alert('Erro ao salvar em lote: ' + e.message);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    // ✅ CADASTRAR SELECIONADOS COMO NOVO — abre StoreMaster em sequência
    const cadastrarSelecionadosComoNovos = () => {
        const lista = consolidatedData.filter(c => selecionados.has(c.id));
        if (!lista.length) {
            alert('Selecione pelo menos 1 produto.');
            return;
        }
        askConfirm(
            'Cadastro em Lote',
            `Deseja abrir o Store Master para cadastrar ${lista.length} produto(s) um por um?`,
            () => {
                setNovosQueue(lista);
                setModalProd(lista[0]);
            }
        );
    };

    // ✅ CRIAR STORIES — abre o editor com os produtos selecionados
    const criarStories = () => {
        try {
            const lista = consolidatedData.filter(c => selecionados.has(c.id));
            if (!lista.length) {
                alert('Selecione pelo menos 1 produto.');
                return;
            }

            const payload = lista.map(c => {
                const si = normalizeStore(c.lojas[0] || '');
                const isOtoval = si.acro === 'OT';
                const bonus = isOtoval ? 10 : 0;

                return {
                    nome: c.nome.toUpperCase(),
                    milao_de: (c.precoDe || c.menorPreco) + bonus,
                    milao_por: c.menorPreco + bonus,
                    sf_de: (c.precoDe || c.menorPreco) + bonus,
                    sf_por: c.menorPreco + bonus,
                    imagem: c.votos[0]?.imagemDoPrint || c.produtoVinculado?.image || c.produtoVinculado?.productImage || '',
                    lojas: c.lojas.map(l => normalizeStore(l).acro).join(', '),
                    rowId: c.produtoVinculado?.rowId || '',
                    storeCode: si.acro
                };
            });

            // ✅ Tenta salvar no LocalStorage com tratamento de erro (QuotaExceeded)
            try {
                localStorage.setItem('ocr_stories_selecionados', JSON.stringify(payload));
                localStorage.removeItem('sf_organizer_groups'); // 🔥 Força o editor a usar os novos produtos e não o cache anterior
            } catch (storageErr: any) {
                console.error('❌ Erro de LocalStorage:', storageErr);
                if (storageErr.name === 'QuotaExceededError' || storageErr.code === 22) {
                    alert('⚠️ Limite de memória do navegador excedido!\n\nVocê selecionou muitos produtos com imagens recortadas. Tente selecionar menos produtos (ex: 10 por vez) ou vincule os produtos para usar links em vez de imagens pesadas.');
                } else {
                    alert('Erro ao preparar stories: ' + storageErr.message);
                }
                return;
            }

            const editorUrl = '/story/editor.html';
            const win = window.open(editorUrl, '_blank');
            if (!win) {
                alert('⚠️ Bloqueador de pop-ups detectado! Por favor, autorize pop-ups para abrir o Editor.');
            } else {
                console.log('🚀 Payload preparado para o Organizer:', payload.length, 'produtos');
            }
        } catch (err: any) {
            console.error('❌ Erro no criarStories:', err);
            alert('Falha crítica ao criar stories: ' + err.message);
        }
    };

    const toggleSel = (id: string) => setSelecionados(p => {
        const n = new Set(p);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const toggleTodos = () => setSelecionados(selecionados.size === consolidatedData.length ? new Set() : new Set(consolidatedData.map(c => c.id)));

    const verdes = consolidatedData.filter(p => p.status === 'verde');
    const amarelos = consolidatedData.filter(p => p.status === 'amarelo');
    const vermelhos = consolidatedData.filter(p => p.status === 'vermelho');
    const pendentesQ = queue.filter(q => q.status === 'pendente').length;

    const statusLabel: Record<string, string> = { pendente: '⏳ AGUARDANDO', lendo: '👁️ LENDO...', concluido: '✅ OK', erro: '❌ ERRO' };
    const statusBg: Record<string, string> = { pendente: 'bg-slate-700', lendo: 'bg-blue-600', concluido: 'bg-emerald-600', erro: 'bg-red-600' };

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-8 bg-[#0f172a] min-h-screen text-white font-sans selection:bg-blue-500/30">
            {/* ─── TOOLBAR ─── */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 mb-6 shadow-2xl sticky top-4 z-40">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20"><Sparkles className="text-white" size={24} /></div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none uppercase flex items-center gap-2">
                                SF <span className="text-blue-400 italic">IA</span>
                                <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/30">v3.5</span>
                            </h1>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Lente de Precificação SF</p>
                        </div>
                    </div>

                    {consolidatedData.length > 0 && (
                        <div className="flex gap-1 p-1 bg-black/40 rounded-2xl border border-slate-800">
                            <button onClick={() => setViewMode('cards')} className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                <LayoutGrid size={14} /> FOTOS
                            </button>
                            <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                <ListFilter size={14} /> CONSOLIDADO
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2 items-center flex-wrap">
                        <button
                            onClick={criarStories}
                            disabled={selecionados.size === 0}
                            className={`px-5 py-3 rounded-2xl font-black text-xs transition flex items-center gap-2 shadow-lg ${selecionados.size > 0 ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                        >
                            <Film size={16} /> CRIAR STORIES COM {selecionados.size} PRODUTOS
                        </button>
                        {selecionados.size > 0 && (
                            <button
                                onClick={cadastrarSelecionadosComoNovos}
                                className="px-5 py-3 rounded-2xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition"
                                title="Abre o Store Master para cada produto selecionado"
                            >
                                <Plus size={16} /> CADASTRAR {selecionados.size} COMO NOVO{selecionados.size > 1 ? 'S' : ''}
                            </button>
                        )}
                        {consolidatedData.length > 0 && (
                            <button
                                onClick={salvarTodos}
                                className="bg-emerald-600 hover:bg-emerald-500 px-5 py-3 rounded-2xl font-black text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <CheckCircle2 size={16} /> SALVAR TODOS NO INSTAGRAM ({consolidatedData.filter(c => !c.salvo && (c.status === 'verde' || c.status === 'amarelo') && c.produtoVinculado?.rowId).length})
                            </button>
                        )}
                        <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl font-black text-xs transition flex items-center gap-2 border border-slate-700">
                            <Plus size={16} /> PRINTS
                        </button>
                        <button onClick={processarLote} disabled={loading || pendentesQ === 0} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-5 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition shadow-lg shadow-blue-500/20">
                            {loading ? <><Loader2 size={16} className="animate-spin" /> ...</> : <><Camera size={16} /> INICIAR {pendentesQ > 0 ? `(${pendentesQ})` : ''}</>}
                        </button>
                        <button
                            onClick={() => askConfirm('Limpar Tudo', 'Deseja apagar todos os prints e resultados atuais?', () => {
                                const emptyQ: QueueItem[] = [];
                                const emptyP = {};
                                setQueue(emptyQ);
                                setManualPrices(emptyP);
                                setSelecionados(new Set());
                                setViewMode('cards');
                                syncWipState(emptyQ, emptyP);
                            })}
                            className="p-3 bg-red-900/20 text-red-400 hover:bg-red-900 hover:text-white rounded-2xl transition border border-red-900/20"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── BARRA DE PROGRESSO OCR ─── */}
            {ocrProgress && (
                <div style={{ padding: '8px 32px', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, background: '#1e293b', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.round((ocrProgress.atual / ocrProgress.total) * 100)}%`,
                                height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                                borderRadius: '999px', transition: 'width 0.4s ease'
                            }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {ocrProgress.atual}/{ocrProgress.total} prints
                            {ocrProgress.etaSec !== null && ocrProgress.etaSec > 0 && (
                                <> · ~{ocrProgress.etaSec >= 60
                                    ? `${Math.floor(ocrProgress.etaSec / 60)}min ${ocrProgress.etaSec % 60}s`
                                    : `${ocrProgress.etaSec}s`} restantes</>
                            )}
                        </span>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFiles} />

            {/* ─── CONTEÚDO ─── */}
            {queue.length === 0 ? (
                <div className="border-2 border-dashed border-slate-800 rounded-[40px] p-32 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group" onClick={() => fileInputRef.current?.click()} onDrop={onDrop} onDragOver={e => e.preventDefault()}>
                    <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition group-hover:bg-blue-600 group-hover:shadow-xl">
                        <Camera size={40} className="text-slate-700 group-hover:text-white" />
                    </div>
                    <p className="text-slate-400 font-black text-xl mb-2">Solte os prints das lojas aqui</p>
                    <p className="text-slate-600 text-sm font-medium">Glória • Celina • Nova Suíça • Empório Prime</p>
                </div>
            ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {queue.map(item => (
                        <div key={item.id} className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl flex flex-col group relative">
                            <div className="h-40 bg-black relative flex-shrink-0 overflow-hidden group/header">
                                <img src={item.preview} className="w-full h-full object-contain opacity-40 group-hover/header:scale-105 transition duration-700" alt="" />
                                <div className={`absolute top-4 right-4 ${statusBg[item.status]} p-2 rounded-2xl flex items-center justify-center shadow-lg`}>
                                    <span className="text-lg">{statusLabel[item.status]}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        askConfirm('Excluir Print', 'Deseja remover este print e todos os seus produtos?', () => {
                                            const newQueue = queue.filter(q => q.id !== item.id);
                                            setQueue(newQueue);
                                            syncWipState(newQueue, manualPrices);
                                        });
                                    }}
                                    className="absolute top-4 left-4 bg-red-600/80 hover:bg-red-500 text-white p-2 rounded-xl flex items-center justify-center shadow-lg transition opacity-0 group-hover/header:opacity-100"
                                    title="Excluir Print"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="p-5 flex flex-col gap-4">
                                {item.produtos.length === 0 && item.status === 'concluido' && <p className="text-center text-slate-500 text-xs font-bold py-4">Nenhum produto detectado</p>}
                                {item.produtos.map(prod => (
                                    <CardProduto key={prod._key} prod={prod}
                                        onSalvar={(p: any) => {
                                            const rId = p.produtoVinculado?.rowId;
                                            if (!rId) { alert('⚠️ Produto precisa estar vinculado.'); return; }
                                            salvarInstagram(rId, p.por, p.de || p.por, [p._key]);
                                        }}
                                        onNovoModal={setModalProd}
                                        onLinkModal={setModalVincular}
                                        onDelete={(p: any) => {
                                            askConfirm('Remover Item', 'Remover este item do resultado?', () => {
                                                const newQueue = queue.map(q => ({
                                                    ...q,
                                                    produtos: q.produtos.filter(x => x._key !== p._key)
                                                }));
                                                setQueue(newQueue);
                                                syncWipState(newQueue, manualPrices);
                                            });
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-3xl group hover:bg-emerald-600/20 transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verdes</span>
                                <CheckCircle2 className="text-emerald-500 group-hover:scale-110 transition-transform" size={16} />
                            </div>
                            <p className="text-3xl font-black text-white">{verdes.length}</p>
                            <p className="text-[11px] text-emerald-400/60 font-bold mt-1 uppercase">Prontos para aprovação</p>
                        </div>
                        <div className="bg-amber-600/10 border border-amber-500/20 p-6 rounded-3xl group hover:bg-amber-600/20 transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Dúvidas</span>
                                <AlertTriangle className="text-amber-500 group-hover:scale-110 transition-transform" size={16} />
                            </div>
                            <p className="text-3xl font-black text-white">{amarelos.length}</p>
                            <p className="text-[11px] text-amber-400/60 font-bold mt-1 uppercase">Requerem sua revisão</p>
                        </div>
                        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl group hover:bg-blue-600/20 transition-all">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Novos</span>
                                <Plus className="text-blue-500 group-hover:scale-110 transition-transform" size={16} />
                            </div>
                            <p className="text-3xl font-black text-white">{vermelhos.length}</p>
                            <p className="text-[11px] text-blue-400/60 font-bold mt-1 uppercase">Fora do catálogo</p>
                        </div>
                    </div>


                    {/* Tabela consolidada */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-black/20 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                    <tr>
                                        <th className="px-4 py-5 w-10">
                                            <button onClick={toggleTodos} className="text-slate-500 hover:text-purple-400 transition">
                                                {selecionados.size === consolidatedData.length && consolidatedData.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                        </th>
                                        <th className="px-4 py-5 w-16">FOTO</th>
                                        <th className="px-4 py-5">NOME DO PRODUTO</th>
                                        <th className="px-4 py-5 text-center">LOJAS</th>
                                        <th className="px-4 py-5 font-center">MENOR VALOR</th>
                                        <th className="px-6 py-5 text-right uppercase">AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {consolidatedData.map(c => (
                                        <tr key={c.id} className={`hover:bg-slate-800/40 transition group ${c.salvo ? 'opacity-40' : ''} ${selecionados.has(c.id) ? 'bg-purple-900/10' : ''}`}>
                                            <td className="px-4 py-4">
                                                <button onClick={() => toggleSel(c.id)} className={`transition ${selecionados.has(c.id) ? 'text-purple-400' : 'text-slate-600 hover:text-slate-400'}`}>
                                                    {selecionados.has(c.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="w-12 h-12 bg-black rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center group/tableimg relative">
                                                    <img
                                                        src={getImagemLocalPrecificador(c.votos[0]?.imagemDoPrint || c.produtoVinculado?.image || c.produtoVinculado?.productImage, c.nome)}
                                                        className="w-full h-full object-contain"
                                                        alt=""
                                                        onError={e => {
                                                            const target = e.currentTarget;
                                                            target.style.display = 'none';
                                                            const sib = target.nextElementSibling as HTMLElement;
                                                            if (sib) sib.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div style={{ display: 'none' }} className="text-slate-600 text-[10px] font-black uppercase text-center w-full h-full items-center justify-center">
                                                        SEM FOTO
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === 'verde' ? 'bg-emerald-500' : c.status === 'amarelo' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                        <span className="font-black text-sm uppercase text-white truncate max-w-xs">{c.nome}</span>
                                                    </div>
                                                    {c.produtoVinculado && <span className="text-[10px] text-slate-500 font-bold ml-4 uppercase">📋 {c.produtoVinculado.supplierName || 'Vínculo OK'}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="flex justify-center -space-x-1">
                                                    {c.lojas.map((l, i) => {
                                                        const si = normalizeStore(l);
                                                        return <div key={i} title={l} className={`w-7 h-7 rounded-lg border-2 border-slate-900 flex items-center justify-center text-[8px] font-black border ${si.style}`}>{si.acro}</div>;
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700 focus-within:border-blue-500 transition-all w-32">
                                                        <span className="text-slate-500 text-xs font-bold">R$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={c.menorPreco}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (!isNaN(val)) setManualPrices(prev => ({ ...prev, [c.id]: val }));
                                                            }}
                                                            className="bg-transparent border-none outline-none text-white font-black text-sm w-full p-0"
                                                        />
                                                    </div>
                                                    {c.precoDe && <span className="text-[10px] text-slate-600 line-through font-bold block ml-2">R$ {c.precoDe.toFixed(2)}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setModalVincular(c)} className="px-3 py-2 rounded-xl text-[10px] font-black border-2 border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 transition uppercase">
                                                        Vincular
                                                    </button>
                                                    {c.status === 'vermelho' ? (
                                                        <button onClick={() => setModalProd(c)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-[10px] font-black text-white flex items-center gap-2 uppercase"><Plus size={14} /> Cadastrar</button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                const rowId = c.produtoVinculado?.rowId;
                                                                if (!rowId) { alert('⚠️ Vincule o produto primeiro!'); return; }
                                                                salvarInstagram(rowId, c.menorPreco, c.precoDe || c.menorPreco, c.votos.map(v => v._key));
                                                            }}
                                                            disabled={c.salvo}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition uppercase ${c.salvo ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : c.status === 'verde' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}
                                                        >
                                                            {c.salvo ? '✅ Já Salvo' : <><Save size={14} /> Salvar Insta</>}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            askConfirm('Remover Item', 'Remover este produto consolidado?', () => {
                                                                const keysToRemove = c.votos.map(v => v._key);
                                                                const newQueue = queue.map(q => ({
                                                                    ...q,
                                                                    produtos: q.produtos.filter(x => !keysToRemove.includes(x._key))
                                                                }));
                                                                setQueue(newQueue);
                                                                setSelecionados(prev => {
                                                                    const n = new Set(prev);
                                                                    n.delete(c.id);
                                                                    return n;
                                                                });
                                                                syncWipState(newQueue, manualPrices);
                                                            });
                                                        }}
                                                        className="px-3 py-2 rounded-xl text-[10px] font-black border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white transition" title="Excluir"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {modalVincular && (
                <ModalVincularOCR
                    produto={modalVincular}
                    onClose={() => setModalVincular(null)}
                    onLinked={(v) => vincularManualmente(modalVincular, v)}
                    onNovoModal={setModalProd}
                />
            )}
            {modalProd && (
                <ModalStoreMasterOCR
                    produto={modalProd}
                    onClose={() => {
                        setModalProd(null);
                        setNovosQueue([]); // cancela fila se fechar manualmente
                    }}
                    onSaved={(novoVinculo) => {
                        // Vincula o produto atual na queue de prints
                        const keys = 'votos' in modalProd ? modalProd.votos.map((v: any) => v._key) : [modalProd._key];
                        setQueue(prev => prev.map(q => ({
                            ...q,
                            produtos: q.produtos.map(pr =>
                                keys.includes(pr._key) ? { ...pr, produtoVinculado: novoVinculo, status: 'verde' as const, matchRating: 1 } : pr
                            )
                        })));
                        setModalVincular(null);

                        // Lê a fila atual do ref (sem stale closure) e avança
                        const queue = novosQueueRef.current;
                        const currentIdx = queue.findIndex(
                            (p: any) => p.id === modalProd.id || p.nome === modalProd.nome
                        );
                        const next = queue[currentIdx + 1];

                        if (next) {
                            // Fecha o modal atual e abre o próximo após um tick
                            setModalProd(null);
                            setTimeout(() => setModalProd(next), 50);
                        } else {
                            // Fim da fila
                            const total = queue.length;
                            setNovosQueue([]);
                            setModalProd(null);
                            setTimeout(() => alert(`✅ Todos os ${total} produto(s) cadastrados com sucesso!`), 100);
                        }
                    }}
                />
            )}

            {/* MODAL DE CONFIRMAÇÃO PERSONALIZADO */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-amber-600/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/30">
                            <AlertTriangle className="text-amber-500" size={24} />
                        </div>
                        <h3 className="text-white font-black text-xl uppercase italic mb-2 tracking-tight">{confirmModal.title}</h3>
                        <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed">{confirmModal.message}</p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-black text-xs transition uppercase">Cancelar</button>
                            <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs transition shadow-lg shadow-red-500/20 uppercase">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { OCRModule };
