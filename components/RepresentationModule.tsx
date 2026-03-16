import React, { useState, useEffect, useRef } from 'react';
import { Users, ShoppingBag, ClipboardList, Plus, Minus, FileSpreadsheet, ArrowLeft, Trash2, Check, Copy, Printer, Grid, List, Save, RotateCw, Download, Upload, History, Filter, AlertTriangle, Package, Flame, Zap, Box, ExternalLink, FileWarning, Home, Menu, X, UserPlus, Phone, Mail, MapPin, Clock, Repeat, Settings, FileText, Share2, LogOut, Search, Eye, Wine, Globe, Calculator, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RepClient, RepProduct, SupplierType, CartItem, RepOrder, PriceTier, SupplierConfig, CondicoesComerciais, CondicoesColumn } from '../types';

interface RepresentationModuleProps {
    onBack: () => void;
}

const SUPPLIERS: SupplierType[] = ['RAVIN', 'DON_CAVES', 'TOTAL_QUIMICA', 'SANTE', 'OUTROS'];
type ContextType = 'OVERVIEW' | SupplierType;
type ViewType = 'DASHBOARD' | 'CLIENTS' | 'CATALOG' | 'NEW_ORDER' | 'SETTINGS' | 'CHECKOUT' | 'SUCCESS' | 'SPECS' | 'CADASTRO' | 'CONDICOES';

// Helper: CNPJ Mask
const maskCNPJ = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 18);
};

// Helper: Parse Currency strictly
const parseCurrency = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const str = String(value).trim();
    // Remove R$, spaces, convert . to nothing and , to .
    const clean = str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

// Extracted ProductCard Component
interface ProductCardProps {
    product: RepProduct;
    mode: 'GRID' | 'LIST';
    isCatalogMode: boolean;
    onAdd: (product: RepProduct) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, mode, isCatalogMode, onAdd }) => {
    const hasAction = !!product.commercialAction;
    const isDonCaves = product.supplier === 'DON_CAVES';
    const isRavin = product.supplier === 'RAVIN';

    // --- LAYOUT ESPECÍFICO RAVIN (3 COLUNAS) ---
    if (isRavin && mode === 'LIST') {
        const refPrice = product.sitePrice && product.sitePrice > product.price
            ? product.sitePrice
            : null;

        const packSize = product.commercialAction?.includes('12') ? 12 : 6;
        const refBoxPrice = refPrice ? refPrice * packSize : null;

        return (
            <div className="flex items-stretch bg-white border-b border-gray-100 hover:bg-slate-50 transition-colors shadow-sm mb-2 rounded-lg overflow-hidden min-h-[5rem]">

                {/* COLUNA 1: IDENTIFICAÇÃO (Esq) */}
                <div className="flex-1 p-3 flex flex-col justify-center min-w-0 border-r border-gray-50">
                    <div className="font-bold text-slate-800 text-sm leading-tight truncate" title={product.name}>
                        {product.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded">
                            Cód: {product.code}
                        </span>
                        <span className={`text-[10px] ${product.stock && product.stock > 0 ? 'text-gray-400' : 'text-red-300'}`}>
                            Est: {product.stock || 0}
                        </span>
                    </div>
                    {product.sitePrice && product.sitePrice > 0 && (
                        <div className="text-xs font-semibold text-cyan-700 mt-2">
                            Site: R$ {product.sitePrice.toFixed(2)}
                        </div>
                    )}
                </div>

                {/* COLUNA 2: AÇÃO COMERCIAL (Centro) */}
                <div className="w-32 p-2 flex flex-col items-center justify-center bg-gray-50/50 border-r border-gray-50">
                    {hasAction ? (
                        <div className="bg-yellow-300 text-yellow-900 text-[9px] font-bold px-2 py-0.5 rounded mb-1 text-center w-full truncate shadow-sm">
                            <Zap size={8} className="inline mr-0.5" />
                            {product.commercialAction}
                        </div>
                    ) : (
                        <div className="h-4"></div> /* Spacer */
                    )}

                    {refPrice && (
                        <>
                            <div className="text-[10px] text-gray-400 line-through">
                                Ref. Unit: R$ {refPrice.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-gray-300">
                                Ref. Cx: R$ {refBoxPrice?.toFixed(2)}
                            </div>
                        </>
                    )}
                </div>

                {/* COLUNA 3: PREÇO & AÇÃO (Direita) */}
                <div className="w-32 p-3 flex flex-col items-end justify-center bg-white relative">
                    <div className="text-emerald-700 font-bold text-lg leading-none">
                        R$ {product.price.toFixed(2)}
                    </div>

                    {product.boxPrice && (
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                            Cx Promo: R$ {product.boxPrice.toFixed(2)}
                        </div>
                    )}

                    {!isCatalogMode && (
                        <button
                            onClick={() => onAdd(product)}
                            className="absolute bottom-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // --- LAYOUT PADRÃO (OUTROS FORNECEDORES) ---
    if (mode === 'LIST') {
        const isTotalQuimica = product.supplier === 'TOTAL_QUIMICA';
        return (
            <div className="flex justify-between items-start p-4 bg-white border-b border-gray-100 hover:bg-slate-50 transition-colors shadow-sm mb-2 rounded-lg relative overflow-hidden">
                {hasAction && (
                    <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10 flex items-center gap-1">
                        <Zap size={10} fill="black" /> {product.commercialAction}
                    </div>
                )}
                <div className="flex flex-col gap-1 flex-1 pr-4">
                    <div className="font-bold text-slate-800 text-base leading-tight mt-1">{product.name}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                        <span className="font-mono bg-gray-100 px-1 rounded border border-gray-200">{product.code}</span>
                        {!isDonCaves && <span className={product.stock && product.stock > 0 ? 'text-gray-600' : 'text-red-400'}>Est: {product.stock || 0}</span>}

                        {/* DETALHES TÉCNICOS COMPLETOS (TOTAL QUÍMICA) */}
                        {isTotalQuimica && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 w-full shadow-inner">
                                {product.ncm && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">NCM: <span className="text-gray-700 font-mono">{product.ncm}</span></div>}
                                {product.ean && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">EAN: <span className="text-gray-700 font-mono">{product.ean}</span></div>}
                                {product.dun && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">DUN: <span className="text-gray-700 font-mono">{product.dun}</span></div>}
                                {product.weight && <div className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">PESO: <span className="text-blue-700 font-bold">{product.weight}</span></div>}
                                {product.size && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">MED. UNIT: <span className="text-gray-700">{product.size}</span></div>}
                                {product.boxSize && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">MED. CX: <span className="text-gray-700">{product.boxSize}</span></div>}
                                {product.validity && <div className="text-[10px] text-green-400 font-bold uppercase tracking-tighter">VALIDADE: <span className="text-green-700">{product.validity}</span></div>}
                                {product.palletizing && <div className="text-[10px] text-purple-400 font-bold uppercase tracking-tighter">L X A: <span className="text-purple-700">{product.palletizing}</span></div>}
                            </div>
                        )}
                        {isDonCaves && product.suggestedRetail && (
                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-tighter">Sug. Varejo: R$ {product.suggestedRetail.toFixed(2)}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-col items-end">
                            <div className="font-bold text-xl leading-none text-emerald-700">R$ {product.price.toFixed(2)}</div>
                        </div>
                    </div>
                    {!isCatalogMode && (
                        <button onClick={() => onAdd(product)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center z-20 self-center">
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

// --- FIX: ISOLATED COMPONENT FOR PAYMENT SETTINGS TO PREVENT HOOK LOOPS ---
interface PaymentSettingsProps {
    activeContext: SupplierType;
    supplierConfig: SupplierConfig;
    setSupplierConfig: React.Dispatch<React.SetStateAction<SupplierConfig>>;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ activeContext, supplierConfig, setSupplierConfig }) => {
    const [newMethod, setNewMethod] = useState('');
    const [genFirst, setGenFirst] = useState(14);
    const [genInterval, setGenInterval] = useState(7);
    const [genCount, setGenCount] = useState(4);

    const config = supplierConfig[activeContext] || { paymentMethods: [] };
    const methods = config.paymentMethods || [];

    const addPaymentMethod = (method: string) => {
        if (!method) return;
        setSupplierConfig(prev => {
            const current = prev[activeContext] || { paymentMethods: [] };
            const currentMethods = Array.isArray(current.paymentMethods) ? current.paymentMethods : [];
            if (currentMethods.includes(method)) return prev;
            return {
                ...prev,
                [activeContext]: {
                    ...current,
                    paymentMethods: [...currentMethods, method]
                }
            };
        });
    };

    const removePaymentMethod = (method: string) => {
        setSupplierConfig(prev => {
            const current = prev[activeContext];
            if (!current) return prev;
            const currentMethods = Array.isArray(current.paymentMethods) ? current.paymentMethods : [];
            return {
                ...prev,
                [activeContext]: {
                    ...current,
                    paymentMethods: currentMethods.filter(m => m !== method)
                }
            };
        });
    };

    const handleGenerateInstallments = () => {
        if (genCount < 1) {
            alert("Quantidade de parcelas deve ser maior que 0.");
            return;
        }
        const days = [];
        for (let i = 0; i < genCount; i++) {
            days.push(genFirst + (i * genInterval));
        }
        const methodString = `${days.join('/')} dias`;
        addPaymentMethod(methodString);
        setNewMethod('');
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                <Settings className="text-slate-600" /> Formas de Pagamento: {activeContext}
            </h2>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2 mb-4">
                    <Calculator size={16} /> GERADOR DE PARCELAS AUTOMÁTICO
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">1ª Parcela (Dias)</label>
                        <input type="number" className="w-full p-2 border rounded font-mono text-center" value={genFirst} onChange={e => setGenFirst(parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Intervalo (Dias)</label>
                        <input type="number" className="w-full p-2 border rounded font-mono text-center" value={genInterval} onChange={e => setGenInterval(parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Qtd Parcelas</label>
                        <input type="number" className="w-full p-2 border rounded font-mono text-center" value={genCount} onChange={e => setGenCount(parseInt(e.target.value) || 0)} />
                    </div>
                </div>
                <button
                    onClick={handleGenerateInstallments}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm"
                >
                    <Calendar size={16} /> GERAR PARCELAMENTO
                </button>
                <p className="text-xs text-center text-gray-400 mt-2">Ex: 14, 7, 4x = "14/21/28/35 dias"</p>
            </div>

            <hr className="border-gray-200 mb-8" />

            <div className="mb-6">
                <h3 className="font-bold text-sm text-gray-500 uppercase mb-3">Cadastro Manual</h3>
                <div className="flex gap-2 mb-4">
                    <input
                        className="flex-1 border p-2 rounded"
                        placeholder="Ex: À Vista 3% Desc, Boleto 30 Dias..."
                        value={newMethod}
                        onChange={e => setNewMethod(e.target.value)}
                    />
                    <button
                        onClick={() => { addPaymentMethod(newMethod); setNewMethod(''); }}
                        className="bg-green-600 text-white px-4 rounded font-bold"
                    >
                        ADICIONAR
                    </button>
                </div>

                <div className="space-y-2 bg-gray-50 p-2 rounded border max-h-[300px] overflow-y-auto">
                    {methods.length === 0 && <p className="text-gray-400 text-sm italic p-2">Nenhuma forma cadastrada.</p>}
                    {methods.map((m, idx) => (
                        <div key={`${m}-${idx}`} className="flex justify-between items-center bg-white p-3 rounded border shadow-sm">
                            <span className="font-medium text-slate-700">{m}</span>
                            <button onClick={() => removePaymentMethod(m)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- SALES STATEMENT (EXTRATO DE VENDA) COMPONENT ---
interface SalesStatementProps {
    order: RepOrder;
    onClose: () => void;
}

const SalesStatement: React.FC<SalesStatementProps> = ({ order, onClose }) => {
    const [printClientName, setPrintClientName] = useState(order.clientName || "Consumidor Final");

    // Format helpers
    const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR');

    const handlePrint = () => window.print();

    const handleWhatsapp = () => {
        let msg = `*PEDIDO SF IMPORTS*\n`;
        msg += `Data: ${fmtDate(order.date)}\n`;
        msg += `Cliente: ${printClientName}\n\n`;
        order.items.forEach(item => {
            msg += `${item.quantity}x ${item.name} | ${fmtMoney(item.finalPrice)}\n`;
        });
        msg += `\n*TOTAL: ${fmtMoney(order.totalNet)}*\n`;
        msg += `Pagamento: ${order.paymentMethod || 'A combinar'}`;

        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleEmail = () => {
        const subject = `Pedido SF Imports #${order.id.slice(-6)}`;
        let body = `PEDIDO SF IMPORTS\n\n`;
        body += `Data: ${fmtDate(order.date)}\n`;
        body += `Cliente: ${printClientName}\n\n`;
        order.items.forEach(item => {
            body += `${item.quantity}x ${item.name} | ${fmtMoney(item.finalPrice)}\n`;
        });
        body += `\nTOTAL: ${fmtMoney(order.totalNet)}\n`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-[60] overflow-y-auto flex items-center justify-center p-4">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #invoice-modal, #invoice-modal * { visibility: visible; }
                    #invoice-modal { position: absolute; left: 0; top: 0; width: 100%; min-height: 100%; background: white; padding: 0; margin: 0; overflow: visible; box-shadow: none; border-radius: 0; }
                    .no-print { display: none !important; }
                    .print-scroll-fix { overflow: visible !important; height: auto !important; max-height: none !important; }
                }
            `}</style>

            <div id="invoice-modal" className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print-scroll-fix animate-scale-in">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">SF IMPORTS</h2>
                        <p className="text-slate-400 text-sm">Extrato de Venda</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold">#{order.id.slice(-6)}</div>
                        <div className="text-xs text-slate-400">{fmtDate(order.date)}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="p-6 border-b bg-gray-50">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cliente</label>
                    <input
                        value={printClientName}
                        onChange={(e) => setPrintClientName(e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 focus:border-slate-900 outline-none text-lg font-bold text-slate-800 pb-1"
                    />
                </div>

                {/* Items Table */}
                <div className="flex-1 overflow-y-auto p-6 print-scroll-fix">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-slate-100 text-left text-gray-500 uppercase text-xs">
                                <th className="pb-2 pl-1">Produto</th>
                                <th className="pb-2 text-center w-16">Qtd</th>
                                <th className="pb-2 text-right w-24">Unit</th>
                                <th className="pb-2 text-right w-24 pr-1">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {order.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-3 pr-2 pl-1">
                                        <div className="font-bold text-slate-700">{item.name}</div>
                                        <div className="text-xs text-gray-400">{item.code}</div>
                                    </td>
                                    <td className="py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                                    <td className="py-3 text-right text-gray-600">{fmtMoney(item.finalPrice)}</td>
                                    <td className="py-3 text-right font-bold text-slate-800 pr-1">{fmtMoney(item.quantity * item.finalPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="bg-slate-50 p-6 border-t space-y-2 print:bg-white print:border-t-2 print:border-slate-900">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium">{fmtMoney(order.totalList)}</span>
                    </div>
                    {/* Discount display if relevant, but totalNet covers it */}
                    <div className="flex justify-between items-center text-xl font-bold text-slate-900 border-t border-gray-200 pt-2 mt-2">
                        <span>TOTAL GERAL</span>
                        <span>{fmtMoney(order.totalNet)}</span>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-center text-sm font-medium text-yellow-800 print:bg-transparent print:border-slate-200 print:text-slate-800">
                        Forma de Pagamento: {order.paymentMethod || "A combinar"}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-white border-t flex gap-3 no-print">
                    <button onClick={handlePrint} className="flex-1 flex flex-col items-center justify-center p-3 hover:bg-gray-100 rounded-lg transition text-slate-700 border border-transparent hover:border-gray-200">
                        <Printer size={20} className="mb-1" />
                        <span className="text-xs font-bold">IMPRIMIR</span>
                    </button>
                    <button onClick={handleWhatsapp} className="flex-1 flex flex-col items-center justify-center p-3 hover:bg-green-50 rounded-lg transition text-green-700 border border-transparent hover:border-green-200">
                        <Share2 size={20} className="mb-1" />
                        <span className="text-xs font-bold">WHATSAPP</span>
                    </button>
                    <button onClick={handleEmail} className="flex-1 flex flex-col items-center justify-center p-3 hover:bg-blue-50 rounded-lg transition text-blue-700 border border-transparent hover:border-blue-200">
                        <Mail size={20} className="mb-1" />
                        <span className="text-xs font-bold">EMAIL</span>
                    </button>
                    <button onClick={onClose} className="flex-1 flex flex-col items-center justify-center p-3 bg-red-50 hover:bg-red-100 rounded-lg transition text-red-700 border border-red-100 hover:border-red-200">
                        <X size={20} className="mb-1" />
                        <span className="text-xs font-bold">FECHAR</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RepresentationModule: React.FC<RepresentationModuleProps> = ({ onBack }) => {
    // --- STATE ---
    const [view, setView] = useState<ViewType>('DASHBOARD');
    const [activeContext, setActiveContext] = useState<ContextType>('OVERVIEW');

    // Data
    const [clients, setClients] = useState<RepClient[]>([]);
    const [products, setProducts] = useState<RepProduct[]>([]);
    const [orders, setOrders] = useState<RepOrder[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [supplierConfig, setSupplierConfig] = useState<SupplierConfig>({});

    // Session
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [catalogViewMode, setCatalogViewMode] = useState<'LIST' | 'GRID'>('LIST');

    // Draft Logic
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);

    // Checkout Logic
    const [checkoutObs, setCheckoutObs] = useState('');
    const [checkoutPayment, setCheckoutPayment] = useState('');
    const [successData, setSuccessData] = useState<{ pdfUrl: string | URL, order: RepOrder } | null>(null);

    // Modal State
    const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
    const [productToAdd, setProductToAdd] = useState<RepProduct | null>(null);
    const [qtyUnits, setQtyUnits] = useState<number>(0);
    const [qtyBoxes, setQtyBoxes] = useState<number>(0);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    // Client History Modal
    const [viewClientHistory, setViewClientHistory] = useState<RepClient | null>(null);

    // Forms State
    const [newClient, setNewClient] = useState<Partial<RepClient>>({});
    const [importSupplier, setImportSupplier] = useState<SupplierType>('RAVIN');
    const [importTableName, setImportTableName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [specFiles, setSpecFiles] = useState<string[]>([]);
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');

    // Cadastro Form State
    const [isCadastroProductModalOpen, setIsCadastroProductModalOpen] = useState(false);
    const [showCadastroSuggestions, setShowCadastroSuggestions] = useState(false);

    // Condicoes State
    const [condicoes, setCondicoes] = useState<CondicoesComerciais | null>(null);
    const [isCondicoesSaving, setIsCondicoesSaving] = useState(false);

    const [cadastroData, setCadastroData] = useState({
        fornecedor: '', cnpj: '', inscricaoEstadual: '', regimeTributario: '', ramoAtividade: '',
        regimeApuracaoIcms: '', produtorRural: false, responsavelFiscal: '', foneContato: '',
        descricaoFiscal: '', ncm: '', cest: '', codBeneficioFiscal: '', origem: '',
        importacaoDireta: '', sitTribSimples: '', simplesCreditoIcms: '', faixaCredito: '',
        sitTribIcms: '', aliquotaIcms: '', percReducaoBase: '', substTribPautaMva: '',
        percMva: '', valorPauta: '', fundoCombate: '', aliquotaFcp: '', sitTribPis: '',
        aliquotaPis: '', sitTribCofins: '', aliquotaCofins: '', sitTribIpi: '', aliquotaIpi: '',
        descricaoProduto: '', marca: '', gramatura: '', ean: '', embalagemCx: '',
        codReferencia: '', precoCusto: '', precoVenda: '', lojasGrpA: '', lojasGrpB: '',
        comIndenizacao: '', semIndenizacao: '', categoria: '', observacoes: '',
        comprador: '', data: new Date().toLocaleDateString('pt-BR')
    });

    // --- INITIALIZATION & EFFECTS ---

    // Load Data on Mount & Seed Client
    useEffect(() => {
        if (activeContext === 'OVERVIEW') return;

        // Fetch from API
        const loadFromAPI = async () => {
            try {
                const [pRes, cRes, oRes, sRes, condRes] = await Promise.all([
                    fetch(`/api/brasilia/produtos?supplier=${activeContext}`),
                    fetch(`/api/brasilia/clientes?supplier=${activeContext}`),
                    fetch(`/api/brasilia/pedidos?supplier=${activeContext}`),
                    fetch(`/api/brasilia/specs?supplier=${activeContext}`),
                    fetch(`/api/brasilia/condicoes?supplier=${activeContext}`)
                ]);

                const pData = await pRes.json();
                const cData = await cRes.json();
                const oData = await oRes.json();
                const sData = await sRes.json();
                const condData = await condRes.json();

                if (Array.isArray(pData)) setProducts(pData);
                if (Array.isArray(cData)) {
                    if (cData.length === 0) seedClient();
                    else setClients(cData);
                }
                if (Array.isArray(oData)) setOrders(oData);
                if (Array.isArray(sData)) setSpecFiles(sData);
                if (condData) setCondicoes(condData); else setCondicoes(null);

            } catch (e) {
                console.error("Erro ao carregar dados da API:", e);
            }
        };

        loadFromAPI();
    }, [activeContext]);

    // Initial Config Load
    useEffect(() => {
        const storedConfig = localStorage.getItem('rep_supplier_config');
        if (storedConfig) {
            try { setSupplierConfig(JSON.parse(storedConfig)); } catch (e) { setSupplierConfig({}); }
        }
    }, []);

    const seedClient = () => {
        const seed: RepClient = {
            id: '1',
            razaoSocial: "Empório Modelo Ltda",
            fantasia: "Empório Modelo",
            cnpj: "12.345.678/0001-90",
            whatsapp: "(61) 99999-9999",
            email: "compras@emporiomodelo.com.br",
            endereco: "Brasília, DF"
        };
        setClients([seed]);
    };

    // DRAFT SYSTEM: AUTO-SAVE (Per Supplier)
    useEffect(() => {
        if (draftLoaded && activeContext !== 'OVERVIEW') {
            const draftKey = `rep_draft_${activeContext}`;
            if (cart.length > 0 || selectedClient) {
                const draftData = {
                    client: selectedClient,
                    cart: cart,
                    timestamp: Date.now()
                };
                localStorage.setItem(draftKey, JSON.stringify(draftData));
            } else if (cart.length === 0 && !selectedClient) {
                localStorage.removeItem(draftKey);
            }
        }
    }, [cart, selectedClient, draftLoaded, activeContext]);

    // DRAFT SYSTEM: CHECK ON ENTER NEW ORDER
    useEffect(() => {
        if (view === 'NEW_ORDER' && !draftLoaded && activeContext !== 'OVERVIEW') {
            const draftKey = `rep_draft_${activeContext}`;
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                if ((draft.cart.length > 0 || draft.client) && cart.length === 0) {
                    setShowDraftModal(true);
                } else {
                    setDraftLoaded(true);
                }
            } else {
                setDraftLoaded(true);
            }
        }
    }, [view, activeContext]);

    const handleLoadDraft = () => {
        const draftKey = `rep_draft_${activeContext}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            setSelectedClient(draft.client || '');
            setCart(draft.cart || []);
        }
        setShowDraftModal(false);
        setDraftLoaded(true);
    };

    const handleDiscardDraft = () => {
        const draftKey = `rep_draft_${activeContext}`;
        localStorage.removeItem(draftKey);
        setCart([]);
        setSelectedClient('');
        setShowDraftModal(false);
        setDraftLoaded(true);
    };

    const enterContext = (supplier: SupplierType) => {
        setActiveContext(supplier);
        setView('DASHBOARD');
        setCart([]); // Clear memory cart when switching contexts
        setSelectedClient('');
        setDraftLoaded(false); // Reset draft check
        setSearchTerm('');
        setCadastroData(prev => ({ ...prev, fornecedor: supplier, marca: supplier }));
    };

    const exitContext = () => {
        setActiveContext('OVERVIEW');
        setView('DASHBOARD');
        setCart([]);
    };

    // --- HELPER FUNCTIONS ---

    // Cadastro Automation Helpers
    const loadCadastroDataForSupplier = async () => {
        if (!activeContext || activeContext === 'OVERVIEW') return;
        try {
            const res = await fetch(`/api/brasilia/cadastros?supplier=${activeContext}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.cnpj) {
                    setCadastroData(data);
                } else {
                    // Reset to empty but keep supplier name
                    setCadastroData(prev => ({
                        fornecedor: activeContext, cnpj: '', inscricaoEstadual: '', regimeTributario: '', ramoAtividade: '',
                        regimeApuracaoIcms: '', produtorRural: false, responsavelFiscal: '', foneContato: '',
                        descricaoFiscal: '', ncm: '', cest: '', codBeneficioFiscal: '', origem: '',
                        importacaoDireta: '', sitTribSimples: '', simplesCreditoIcms: '', faixaCredito: '',
                        sitTribIcms: '', aliquotaIcms: '', percReducaoBase: '', substTribPautaMva: '',
                        percMva: '', valorPauta: '', fundoCombate: '', aliquotaFcp: '', sitTribPis: '',
                        aliquotaPis: '', sitTribCofins: '', aliquotaCofins: '', sitTribIpi: '', aliquotaIpi: '',
                        descricaoProduto: '', marca: activeContext, gramatura: '', ean: '', embalagemCx: '',
                        codReferencia: '', precoCusto: '', precoVenda: '', lojasGrpA: '', lojasGrpB: '',
                        comIndenizacao: '', semIndenizacao: '', categoria: '', observacoes: '',
                        comprador: '', data: new Date().toLocaleDateString('pt-BR')
                    }));
                }
            }
        } catch (e) { console.error("Erro ao carregar Cadastro da API:", e); }
    };

    const handleNewCadastro = () => {
        setCadastroData({
            fornecedor: cadastroData.fornecedor, // Keep supplier name
            cnpj: cadastroData.cnpj, // Keep CNPJ
            inscricaoEstadual: cadastroData.inscricaoEstadual,
            regimeTributario: cadastroData.regimeTributario,
            ramoAtividade: cadastroData.ramoAtividade,
            regimeApuracaoIcms: cadastroData.regimeApuracaoIcms,
            produtorRural: cadastroData.produtorRural,
            responsavelFiscal: cadastroData.responsavelFiscal,
            foneContato: cadastroData.foneContato,
            descricaoFiscal: '', ncm: '', cest: '', codBeneficioFiscal: '', origem: '',
            importacaoDireta: '', sitTribSimples: '', simplesCreditoIcms: '', faixaCredito: '',
            sitTribIcms: '', aliquotaIcms: '', percReducaoBase: '', substTribPautaMva: '',
            percMva: '', valorPauta: '', fundoCombate: '', aliquotaFcp: '', sitTribPis: '',
            aliquotaPis: '', sitTribCofins: '', aliquotaCofins: '', sitTribIpi: '', aliquotaIpi: '',
            descricaoProduto: '', marca: '', gramatura: '', ean: '', embalagemCx: '',
            codReferencia: '', precoCusto: '', precoVenda: '', lojasGrpA: '', lojasGrpB: '',
            comIndenizacao: '', semIndenizacao: '', categoria: '', observacoes: '',
            comprador: cadastroData.comprador,
            data: new Date().toLocaleDateString('pt-BR')
        });
        setSearchTerm('');
    };

    const saveCadastroDataToSupplier = async () => {
        if (!activeContext || activeContext === 'OVERVIEW') return;
        try {
            const res = await fetch(`/api/brasilia/cadastros?supplier=${activeContext}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cadastroData)
            });
            if (res.ok) {
                alert("Ficha Cadastral salva com sucesso!");
                if (window.confirm("Deseja limpar a ficha para cadastrar outro produto?")) {
                    handleNewCadastro();
                }
            }
            else alert("Erro ao salvar Ficha Cadastral no servidor.");
        } catch (e) {
            console.error(e);
            alert("Erro de conexão ao salvar Ficha.");
        }
    };

    // Fetch existing Cadastro data when viewing the tab
    useEffect(() => {
        if (view === 'CADASTRO') loadCadastroDataForSupplier();
    }, [view, activeContext]);


    const fetchCnpjDataForCadastro = async () => {
        const cleanCnpj = cadastroData.cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
            alert("CNPJ Incompleto");
            return;
        }
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            if (res.ok) {
                const data = await res.json();
                setCadastroData(prev => ({
                    ...prev,
                    fornecedor: data.razao_social || data.nome_fantasia || prev.fornecedor,
                    ramoAtividade: data.cnae_fiscal_descricao || prev.ramoAtividade,
                    foneContato: data.ddd_telefone_1 || prev.foneContato,
                    cnpj: maskCNPJ(cleanCnpj)
                }));
            } else {
                alert("CNPJ não encontrado na base da Receita Federal.");
            }
        } catch (e) {
            console.error("Erro ao buscar CNPJ:", e);
        }
    };

    const fetchCnpjDataForClient = async () => {
        const cleanCnpj = newClient.cnpj?.replace(/\D/g, '');
        if (!cleanCnpj || cleanCnpj.length !== 14) {
            return;
        }
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            if (res.ok) {
                const data = await res.json();
                setNewClient(prev => ({
                    ...prev,
                    razaoSocial: data.razao_social || prev.razaoSocial || '',
                    fantasia: data.nome_fantasia || prev.fantasia || '',
                    whatsapp: data.ddd_telefone_1 || prev.whatsapp || '',
                    email: data.email || prev.email || '',
                    cep: data.cep || prev.cep || '',
                    logradouro: data.logradouro || prev.logradouro || '',
                    numero: data.numero || prev.numero || '',
                    bairro: data.bairro || prev.bairro || '',
                    municipio: data.municipio || prev.municipio || '',
                    uf: data.uf || prev.uf || '',
                    endereco: `${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}, ${data.municipio || ''} - ${data.uf || ''} - CEP: ${data.cep || ''}`.replace(/^[\s,-]+|[\s,-]+$/g, '').trim() || prev.endereco || '',
                    // Mapping cnae loosely to ramoAtividade
                    ramoAtividade: data.cnae_fiscal_descricao || prev.ramoAtividade || ''
                }));
            }
        } catch (e) {
            console.error("Erro ao buscar CNPJ:", e);
        }
    };

    const handleSelectProductForCadastro = (product: RepProduct) => {
        // Find matching spec to get more details (NCM, CEST, Weight, etc.)
        const spec = products.find(p => p.supplier === activeContext && p.code === product.code && (p.ncm || p.weight || p.ean)) as any;
        const pAny = product as any;

        setCadastroData(prev => ({
            ...prev,
            // Fiscal autofill
            descricaoFiscal: product.name,
            ncm: product.ncm || spec?.ncm || '',
            cest: product.cest || spec?.cest || '',
            sitTribIpi: product.ipi || spec?.ipi ? `ALÍQUOTA ${(product.ipi || spec?.ipi)}%` : '0%',
            aliquotaIpi: (product.ipi || spec?.ipi || 0).toString(),
            sitTribIcms: product.st || spec?.st ? `COM ST ${(product.st || spec?.st)}%` : 'CONSULTAR',
            origem: '0 - NACIONAL',

            // Product / Logistics autofill
            descricaoProduto: product.name,
            marca: pAny.brand || spec?.brand || 'TOTAL QUÍMICA',
            ean: product.ean || spec?.ean || product.dun || spec?.dun || '',
            embalagemCx: product.packSize || spec?.packSize || product.masterCase || spec?.masterCase || '',
            codReferencia: product.code,
            precoCusto: product.price ? product.price.toFixed(2) : (product.boxPrice ? (product.boxPrice / (parseInt(product.packSize || '1') || 1)).toFixed(2) : ''),
            gramatura: product.weight || spec?.weight || product.netWeight || spec?.netWeight || product.size || spec?.size || '',
            categoria: pAny.category || spec?.category || ''
        }));
        setIsCadastroProductModalOpen(false);
        setSearchTerm(''); // clear search string
    };

    const getFilteredProducts = () => {
        if (activeContext === 'OVERVIEW') return [];
        return products.filter(p => {
            const matchesContext = p.supplier === activeContext;
            const matchesSearch = searchTerm
                ? (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
                : true;
            return matchesContext && matchesSearch;
        });
    };

    const handleImportCatalog = (e: React.ChangeEvent<HTMLInputElement>, type: 'PRICES' | 'SPECS' = 'PRICES') => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                    if (data.length === 0) {
                        alert("Planilha vazia ou formato inválido.");
                        return;
                    }

                    let newProducts: RepProduct[] = [];
                    const existingProductsMap = new Map(products.filter(p => p.supplier === activeContext).map(p => [String(p.code), p]));

                    // --- TOTAL_QUIMICA PARSER ---
                    if (activeContext === 'TOTAL_QUIMICA') {
                        if (type === 'PRICES') {
                            // SKIP 5 ROWS for Prices
                            for (let i = 5; i < data.length; i++) {
                                const row: any = data[i];
                                if (!row || !row[0]) continue;
                                const code = String(row[0] || '').trim();
                                if (!code || code.toLowerCase().includes('código')) continue;

                                const name = String(row[1] || '');
                                const packSize = String(row[2] || '');
                                const boxPrice = parseCurrency(row[3]);
                                const unitPrice = parseCurrency(row[4]);
                                const ipi = row[5] ? (typeof row[5] === 'number' ? row[5] * 100 : parseFloat(String(row[5]).replace('%', '').replace(',', '.'))) : 0;
                                const st = row[6] ? (typeof row[6] === 'number' ? row[6] * 100 : parseFloat(String(row[6]).replace('%', '').replace(',', '.'))) : 0;

                                const existing = existingProductsMap.get(code) as RepProduct | undefined;

                                newProducts.push({
                                    ...(existing || {
                                        id: `TOTAL_QUIMICA-${code}`,
                                        supplier: 'TOTAL_QUIMICA' as SupplierType,
                                        stock: 999
                                    }),
                                    code,
                                    name: name || existing?.name || '',
                                    price: unitPrice || existing?.price || 0,
                                    priceTiers: unitPrice > 0 ? [
                                        { name: 'Unitário', price: unitPrice },
                                        { name: 'Varejo (-5%)', price: unitPrice * 0.95 },
                                        { name: 'Atacado (-10%)', price: unitPrice * 0.90 },
                                        { name: 'Distribuidor (-17%)', price: unitPrice * 0.83 }
                                    ] : (existing?.priceTiers || []),
                                    packSize: packSize || existing?.packSize || '',
                                    boxPrice: boxPrice || existing?.boxPrice || 0,
                                    ipi: ipi || existing?.ipi || 0,
                                    st: st || existing?.st || 0
                                });
                                existingProductsMap.delete(code);
                            }
                            existingProductsMap.forEach(p => newProducts.push(p as RepProduct));
                        } else {
                            // SKIP 3 ROWS for Technical Specs
                            for (let i = 3; i < data.length; i++) {
                                const row: any = data[i];
                                if (!row || row.length < 5) continue;
                                const code = String(row[0] || '').trim();
                                if (!code || code.toLowerCase().includes('código')) continue;

                                // MAPPING Specs (Screenshot 1 of last message):
                                // [0] A: CÓDIGO
                                // [1] B: DESCRIÇÃO DOS PRODUTOS
                                // [2] C: Caixa master
                                // [3] D: Emb alag em
                                // [4] E: Classificação Fiscal (NCM)
                                // [5] F: Ean13
                                // [6] G: Dun14
                                // [7] H: Dimensão da unidade
                                // [8] I: Peso líquido (So líquido)
                                // [9] J: Peso bruto uni
                                // [10] K: Dimensão da caixa
                                // [11] L: Paletização (Qtd Total)
                                // [12] M: Lastro x Altura
                                // [13] N: Validade
                                // [14] O: CEST

                                const name = String(row[1] || '');
                                const masterCase = String(row[2] || '');
                                const unitType = String(row[3] || '');
                                const ncm = String(row[4] || '');
                                const ean = String(row[5] || '');
                                const dun = String(row[6] || '');
                                const size = String(row[7] || '');
                                const netWeight = String(row[8] || '');
                                const weight = String(row[9] || '');
                                const boxSize = String(row[10] || '');
                                const palletization = String(row[11] || '');
                                const palletizing = String(row[12] || '');
                                const validity = String(row[13] || '');
                                const cest = String(row[14] || '');

                                const existing = existingProductsMap.get(code) as RepProduct | undefined;
                                if (existing) {
                                    newProducts.push({
                                        ...existing,
                                        masterCase, unitType, ncm, ean, dun, size, netWeight, weight, boxSize, palletization, palletizing, validity, cest
                                    });
                                    existingProductsMap.delete(code);
                                } else if (name) {
                                    newProducts.push({
                                        id: `TOTAL_QUIMICA-${code}`,
                                        code,
                                        name,
                                        price: 0,
                                        supplier: 'TOTAL_QUIMICA',
                                        priceTiers: [{ name: 'Aguardando Preço', price: 0 }],
                                        stock: 0,
                                        masterCase, unitType, ncm, ean, dun, size, netWeight, weight, boxSize, palletization, palletizing, validity, cest
                                    } as RepProduct);
                                }
                            }
                            // Add remaining existing products that weren't in the spec sheet
                            existingProductsMap.forEach(p => newProducts.push(p as RepProduct));
                        }
                    }
                    // --- RAVIN PARSER (FIXED MAPPING) ---
                    else if (activeContext === 'RAVIN') {
                        // ... (keeping existing Ravin logic but making sure it respects the new argument)
                        for (let i = 1; i < data.length; i++) {
                            const row: any = data[i];
                            if (!row || row.length === 0) continue;
                            const code = row[0];
                            const name = row[1];
                            const sitePrice = parseCurrency(row[2]);
                            const stock = parseInt(row[3] || '0');
                            const unitPrice = parseCurrency(row[10]);
                            const boxPrice = parseCurrency(row[6]);
                            const action = row[11] ? String(row[11]).trim() : '';

                            if (code && name) {
                                let finalPrice = unitPrice;
                                if (finalPrice === 0 && boxPrice > 0) {
                                    finalPrice = boxPrice / (action.includes('12') ? 12 : 6);
                                }
                                if (finalPrice > 0) {
                                    newProducts.push({
                                        id: `RAVIN-${code}`,
                                        code: String(code),
                                        name: String(name),
                                        price: finalPrice,
                                        supplier: 'RAVIN',
                                        priceTiers: [{ name: 'Promo', price: finalPrice }],
                                        stock: isNaN(stock) ? 0 : stock,
                                        commercialAction: action,
                                        boxPrice: boxPrice,
                                        sitePrice: sitePrice
                                    });
                                }
                            }
                        }
                    }
                    // --- GENERIC PARSER ---
                    else {
                        const headers = (data[0] as string[]).map(h => String(h).toLowerCase());
                        const idxCode = headers.findIndex(h => h.includes('cod') || h.includes('sku'));
                        const idxName = headers.findIndex(h => h.includes('nom') || h.includes('prod') || h.includes('desc'));
                        const idxPrice = headers.findIndex(h => h.includes('prec') || h.includes('val') || h.includes('price'));

                        for (let i = 1; i < data.length; i++) {
                            const row: any = data[i];
                            if (!row) continue;
                            const code = idxCode > -1 ? row[idxCode] : row[0];
                            const name = idxName > -1 ? row[idxName] : row[1];
                            const rawPrice = idxPrice > -1 ? row[idxPrice] : (row[2] || row[3]);
                            const price = parseCurrency(rawPrice);

                            if (price > 0 && name) {
                                newProducts.push({
                                    id: `${activeContext}-${code}`,
                                    code: String(code),
                                    name: String(name),
                                    price: price,
                                    supplier: activeContext as SupplierType,
                                    priceTiers: [{ name: 'Base', price: price }],
                                    stock: 999
                                });
                            }
                        }
                    }

                    if (newProducts.length === 0) {
                        alert("Nenhum produto válido encontrado. Verifique as colunas da planilha.");
                        return;
                    }

                    const finalProducts = products.filter(p => p.supplier !== activeContext).concat(newProducts);
                    setProducts(finalProducts);

                    try {
                        await fetch(`/api/brasilia/produtos?supplier=${activeContext}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(finalProducts.filter(p => p.supplier === activeContext))
                        });
                    } catch (e) { console.error("Erro ao sincronizar produtos:", e); }

                    alert(`${newProducts.length} produtos atualizados para ${activeContext}!`);
                } catch (error) {
                    console.error("Erro importação:", error);
                    alert("Erro ao processar planilha.");
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleUploadSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/brasilia/specs?supplier=${activeContext}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setSpecFiles(prev => [...prev, data.filename]);
                alert("Especificação enviada!");
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteSpec = async (filename: string) => {
        if (!confirm("Excluir esta especificação?")) return;
        try {
            const res = await fetch(`/api/brasilia/specs/${filename}?supplier=${activeContext}`, {
                method: 'DELETE'
            });
            if ((await res.json()).success) {
                setSpecFiles(prev => prev.filter(f => f !== filename));
            }
        } catch (e) { console.error(e); }
    };

    // --- PDF GENERATION (BLOB URL) ---
    const generateOrderPDF = (order: RepOrder): string | URL => {
        try {
            const doc = new jsPDF();
            const client = clients.find(c => c.id === order.clientId);

            // Header
            doc.setFillColor(30, 41, 59); // Slate 800
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text("BRASÍLIA REPRESENTAÇÕES", 14, 18);
            doc.setFontSize(10);
            doc.text("Pedido de Venda", 14, 25);

            doc.setFontSize(16);
            doc.text(order.supplier, 195, 20, { align: 'right' });

            // Info Section
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            let y = 40;

            doc.text(`Cliente: ${client?.razaoSocial || order.clientName}`, 14, y);
            doc.text(`CNPJ: ${client?.cnpj || '-'}`, 14, y + 5);
            doc.text(`Data: ${new Date(order.date).toLocaleDateString()} ${new Date(order.date).toLocaleTimeString()}`, 14, y + 10);

            doc.text(`Pedido ID: #${order.id.slice(-6)}`, 140, y);
            doc.text(`Status: ${order.status}`, 140, y + 5);

            // Table
            const tableBody = order.items.map(item => [
                item.code,
                item.name + (item.weight ? ` (${item.weight})` : ''),
                item.ean || '-',
                item.quantity,
                `R$ ${item.finalPrice.toFixed(2)}`,
                `R$ ${(item.quantity * item.finalPrice).toFixed(2)}`
            ]);

            (doc as any).autoTable({
                startY: y + 20,
                head: [['Cód', 'Produto', 'EAN', 'Qtd', 'Unitário', 'Total']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [30, 41, 59] },
                styles: { fontSize: 7 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 12, halign: 'center' },
                    4: { cellWidth: 22, halign: 'right' },
                    5: { cellWidth: 25, halign: 'right' }
                }
            });

            // Footer Totals
            const finalY = (doc as any).lastAutoTable.finalY + 10;

            doc.setFontSize(10);
            doc.text(`Subtotal: R$ ${order.totalList.toFixed(2)}`, 140, finalY);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Final: R$ ${order.totalNet.toFixed(2)}`, 140, finalY + 7);

            // Payment & Obs
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Forma de Pagamento:", 14, finalY + 15);
            doc.setFont("helvetica", "bold");
            doc.text(order.paymentMethod || "Não informado", 14, finalY + 20);

            if (order.observation) {
                doc.setFont("helvetica", "normal");
                doc.text("Observações:", 14, finalY + 30);
                doc.setFontSize(9);
                const splitObs = doc.splitTextToSize(order.observation, 180);
                doc.text(splitObs, 14, finalY + 35);
            }

            // Signature Line
            doc.setDrawColor(0, 0, 0);
            doc.line(14, 280, 100, 280);
            doc.setFontSize(8);
            doc.text("Assinatura do Responsável", 14, 285);

            return doc.output('bloburl');
        } catch (e) {
            console.error("PDF Generation Error", e);
            alert("Erro ao gerar PDF. Tente novamente.");
            return "";
        }
    };

    // --- ACTIONS: CLIENTS & CART ---
    const handleAddClient = async () => {
        if (!newClient.razaoSocial) return alert("Razão Social é obrigatória");
        const client: RepClient = {
            id: Date.now().toString(),
            razaoSocial: newClient.razaoSocial || '',
            fantasia: newClient.fantasia || newClient.razaoSocial || '',
            cnpj: newClient.cnpj || '',
            ie: newClient.ie || '',
            regimeTributario: newClient.regimeTributario || '',
            whatsapp: newClient.whatsapp || '',
            email: newClient.email || '',
            endereco: newClient.endereco || '',
            cep: newClient.cep || '',
            logradouro: newClient.logradouro || '',
            numero: newClient.numero || '',
            bairro: newClient.bairro || '',
            municipio: newClient.municipio || '',
            uf: newClient.uf || '',
            contato: newClient.contato || '',
            ncmPadrao: newClient.ncmPadrao || '',
            beneficioFiscal: newClient.beneficioFiscal || '',
            isProdutorRural: newClient.isProdutorRural || false
        };
        const updatedClients = [...clients, client];
        setClients(updatedClients);
        setNewClient({});
        setIsClientModalOpen(false);

        // Sync to API
        try {
            await fetch(`/api/brasilia/clientes?supplier=${activeContext}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedClients)
            });
        } catch (e) { console.error("Erro ao sincronizar cliente:", e); }

        alert("Cliente cadastrado com sucesso!");
    };

    const startOrderForClient = (clientId: string) => {
        if (activeContext === 'OVERVIEW') {
            alert("Por favor, selecione uma representada primeiro.");
            return;
        }
        setSelectedClient(clientId);
        setDraftLoaded(true);
        setView('NEW_ORDER');
    };

    const deleteClient = async (id: string) => {
        if (confirm("Excluir este cliente?")) {
            const updatedClients = clients.filter(c => c.id !== id);
            setClients(updatedClients);
            if (selectedClient === id) setSelectedClient('');

            // Sync to API
            try {
                await fetch(`/api/brasilia/clientes?supplier=${activeContext}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedClients)
                });
            } catch (e) { console.error("Erro ao sincronizar exclusão:", e); }
        }
    };

    const repeatOrder = (order: RepOrder) => {
        if (!order) return;
        if (activeContext !== order.supplier) {
            alert(`Você precisa entrar no menu da ${order.supplier} para repetir este pedido.`);
            return;
        }
        setCart(order.items.map(item => ({ ...item }))); // Clone items
        setSelectedClient(order.clientId);
        setDraftLoaded(true);
        setView('NEW_ORDER');
        setViewClientHistory(null);
    };

    // --- CART CALCULATIONS ---
    const calculateCartTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;

        const processedItems = cart.map(item => {
            let payableQty = item.quantity;
            let bonusQty = 0;
            let discountAmount = 0;

            const action = item.commercialAction ? item.commercialAction.toUpperCase() : '';
            if (item.supplier === 'RAVIN' && (action.includes('12') || action.includes('11'))) {
                if (item.quantity >= 12) {
                    const sets = Math.floor(item.quantity / 12);
                    bonusQty = sets;
                    payableQty = item.quantity - bonusQty;
                    discountAmount = bonusQty * item.price;
                }
            }

            const itemSubtotal = item.quantity * item.price;
            subtotal += itemSubtotal;
            totalDiscount += discountAmount;

            return {
                ...item,
                payableQty,
                bonusQty,
                itemSubtotal,
                itemTotalNet: itemSubtotal - discountAmount
            };
        });

        return { subtotal, totalDiscount, finalTotal: subtotal - totalDiscount, processedItems };
    };

    const finalizeOrder = async () => {
        if (!selectedClient) return alert("Selecione um cliente.");
        if (cart.length === 0) return alert("Carrinho vazio.");
        if (!checkoutPayment) return alert("Selecione uma forma de pagamento.");

        const { finalTotal, subtotal } = calculateCartTotals();
        const client = clients.find(c => c.id === selectedClient);
        const newOrder: RepOrder = {
            id: Date.now().toString(),
            clientId: selectedClient,
            clientName: client?.razaoSocial || 'Desconhecido',
            supplier: activeContext as SupplierType,
            date: new Date().toISOString(),
            items: [...cart],
            status: 'CLOSED',
            totalList: subtotal,
            totalNet: finalTotal,
            paymentMethod: checkoutPayment,
            observation: checkoutObs
        };

        const updatedOrders = [newOrder, ...orders];
        setOrders(updatedOrders);

        // Sync to API
        try {
            await fetch(`/api/brasilia/pedidos?supplier=${activeContext}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOrders)
            });
        } catch (e) { console.error("Erro ao sincronizar pedidos:", e); }

        // GEN PDF URL
        const pdfUrl = generateOrderPDF(newOrder);
        setSuccessData({ pdfUrl, order: newOrder });

        // Cleanup
        setCart([]);
        setCheckoutObs('');
        setCheckoutPayment('');
        const draftKey = `rep_draft_${activeContext}`;
        localStorage.removeItem(draftKey);

        setView('SUCCESS');
    };

    // --- CART ACTIONS ---
    const openAddModal = (product: RepProduct) => {
        setProductToAdd(product);
        setQtyUnits(0);
        setQtyBoxes(0);
        setIsQtyModalOpen(true);
    };

    const confirmAddToCart = () => {
        if (!productToAdd) return;
        let totalQty = qtyUnits;
        let unitPrice = productToAdd.price;
        let selectedTierName = 'Unidade';

        if (productToAdd.supplier === 'DON_CAVES') {
            const unitsInBox = parseInt(productToAdd.packSize?.replace(/\D/g, '') || '1');
            const boxTier = productToAdd.priceTiers.find(t => t.name.includes('Caixa'));
            if (qtyBoxes > 0) {
                totalQty += (qtyBoxes * unitsInBox);
                if (boxTier) {
                    unitPrice = boxTier.price / unitsInBox;
                    selectedTierName = `Cx Fechada (${unitsInBox}un)`;
                }
            }
        } else {
            totalQty = qtyUnits + (qtyBoxes * 6);
        }

        if (totalQty === 0) { alert("Selecione uma quantidade."); return; }

        setCart(prev => {
            const existing = prev.find(item => item.id === productToAdd.id);
            if (existing) {
                return prev.map(item => item.id === productToAdd.id ? { ...item, quantity: item.quantity + totalQty } : item);
            }
            return [...prev, {
                ...productToAdd,
                quantity: totalQty,
                discountPercent: 0,
                finalPrice: unitPrice,
                selectedTierName: selectedTierName,
                price: unitPrice
            }];
        });
        setIsQtyModalOpen(false);
    };

    const updateCartQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeFromCart = (id: string, tierName: string) => {
        setCart(prev => prev.filter(item => !(item.id === id && item.selectedTierName === tierName)));
    };

    // --- RENDERERS ---

    const renderHomeSelector = () => (
        <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in pb-20">
            <h2 className="text-3xl font-bold text-slate-800 mb-8">Selecione a Representada</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4">
                {SUPPLIERS.filter(s => s !== 'OUTROS').map(s => (
                    <button
                        key={s}
                        onClick={() => enterContext(s)}
                        className="group relative bg-white border-2 border-slate-200 hover:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all hover:shadow-xl h-64"
                    >
                        <div className="w-20 h-20 rounded-full bg-slate-50 group-hover:bg-slate-900 flex items-center justify-center transition-colors">
                            {s === 'RAVIN' ? <Wine size={40} className="text-slate-900 group-hover:text-white" /> :
                                s === 'DON_CAVES' ? <Globe size={40} className="text-slate-900 group-hover:text-white" /> :
                                    <Package size={40} className="text-slate-900 group-hover:text-white" />}
                        </div>
                        <span className="font-bold text-lg text-slate-800">{s.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Entrar no Sistema</span>
                    </button>
                ))}
            </div>
            <button onClick={() => setView('CLIENTS')} className="mt-12 flex items-center gap-2 text-slate-500 hover:text-slate-900">
                <Users /> Gerenciar Carteira de Clientes Global
            </button>
        </div>
    );

    const renderSupplierHeader = () => (
        <div className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={exitContext} className="hover:bg-slate-800 p-2 rounded flex items-center gap-2 text-gray-300">
                        <ArrowLeft size={18} /> <span className="hidden md:inline text-xs">Voltar</span>
                    </button>
                    <div className="h-8 w-px bg-slate-700 mx-2"></div>
                    <h1 className="font-bold text-lg tracking-wide">{activeContext.replace('_', ' ')}</h1>
                </div>

                <nav className="hidden md:flex gap-1 bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setView('DASHBOARD')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'DASHBOARD' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Painel</button>
                    <button onClick={() => setView('NEW_ORDER')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'NEW_ORDER' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Novo Pedido</button>
                    <button onClick={() => setView('CATALOG')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'CATALOG' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Tabela</button>
                    <button onClick={() => setView('SPECS')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'SPECS' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Especificações</button>
                    <button onClick={() => setView('CADASTRO')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'CADASTRO' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Cadastro Fornec.</button>
                    <button onClick={() => setView('CONDICOES')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'CONDICOES' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Condições Com.</button>
                    <button onClick={() => setView('SETTINGS')} className={`px-4 py-2 rounded font-bold text-sm ${view === 'SETTINGS' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}>Pagamento</button>
                </nav>

                <div className="flex items-center gap-4">
                    <div className="text-xs text-right hidden sm:block">
                        <div className="text-gray-400">Cliente Selecionado</div>
                        <div className="font-bold text-green-400 truncate max-w-[100px]">
                            {selectedClient ? clients.find(c => c.id === selectedClient)?.razaoSocial : '---'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCheckout = () => {
        const { finalTotal, subtotal, totalDiscount, processedItems } = calculateCartTotals();
        const client = clients.find(c => c.id === selectedClient);
        const config = supplierConfig[activeContext] || { paymentMethods: [] };
        // Ensure array
        const methods = Array.isArray(config.paymentMethods) ? config.paymentMethods : [];

        return (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row h-full md:h-[80vh]">
                {/* Review Section */}
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                    <h3 className="font-bold text-xl mb-4 text-slate-800">Revisão do Pedido</h3>
                    <div className="bg-white p-4 rounded border mb-4">
                        <div className="text-sm text-gray-500">Cliente</div>
                        <div className="font-bold text-lg">{client?.razaoSocial}</div>
                        <div className="text-xs text-gray-400">{client?.cnpj}</div>
                    </div>
                    <div className="space-y-2">
                        {processedItems.map(item => (
                            <div key={item.id} className="flex justify-between text-sm border-b pb-2">
                                <div>
                                    <div className="font-bold">{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.quantity} un x R$ {item.finalPrice.toFixed(2)}</div>
                                </div>
                                <div className="font-bold">R$ {item.itemTotalNet.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t">
                        <div className="flex justify-between mb-1"><span>Subtotal:</span> <span>R$ {subtotal.toFixed(2)}</span></div>
                        {totalDiscount > 0 && <div className="flex justify-between mb-1 text-green-600"><span>Descontos:</span> <span>- R$ {totalDiscount.toFixed(2)}</span></div>}
                        <div className="flex justify-between text-xl font-bold mt-2"><span>Total:</span> <span>R$ {finalTotal.toFixed(2)}</span></div>
                    </div>
                </div>

                {/* Finalize Section */}
                <div className="w-full md:w-96 bg-slate-900 text-white p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Check /> Finalizar</h3>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Forma de Pagamento</label>
                        <select
                            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-green-500"
                            value={checkoutPayment}
                            onChange={e => setCheckoutPayment(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {methods.map((m, idx) => <option key={`${m}-${idx}`} value={m}>{m}</option>)}
                        </select>
                        {methods.length === 0 && <p className="text-xs text-red-400 mt-1">Cadastre formas de pagamento no menu PAGAMENTO.</p>}
                    </div>

                    <div className="mb-auto">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Observações</label>
                        <textarea
                            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white h-32 resize-none"
                            placeholder="Ex: Entregar somente parte da manhã..."
                            value={checkoutObs}
                            onChange={e => setCheckoutObs(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setView('NEW_ORDER')} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded font-bold">Voltar</button>
                        <button onClick={finalizeOrder} className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded font-bold flex justify-center items-center gap-2">
                            <FileText size={18} /> FINALIZAR
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderNewOrder = () => {
        const { subtotal, totalDiscount, finalTotal, processedItems } = calculateCartTotals();

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-20">
                <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-[700px]">
                    <div className="p-4 border-b bg-gray-50 rounded-t-lg space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">Adicionar Produtos</h3>
                            <div className="w-64">
                                <button
                                    onClick={() => setIsClientSearchOpen(true)}
                                    className="w-full p-2 border rounded text-sm font-bold bg-white text-left flex justify-between items-center"
                                >
                                    <span className="truncate">
                                        {selectedClient ? clients.find(c => c.id === selectedClient)?.razaoSocial : 'Selecionar Cliente...'}
                                    </span>
                                    <Search size={14} className="text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por nome ou código..."
                            className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto bg-gray-100">
                        {getFilteredProducts().slice(0, 50).map(p => <ProductCard key={p.id} product={p} mode="LIST" isCatalogMode={false} onAdd={openAddModal} />)}
                        {getFilteredProducts().length === 0 && <div className="text-center text-gray-500 mt-10">Nenhum produto encontrado.</div>}
                    </div>
                </div>

                <div className="bg-slate-900 border-l rounded-lg shadow flex flex-col h-[700px] text-white">
                    <div className="p-4 bg-black bg-opacity-30 rounded-t-lg">
                        <h3 className="font-bold flex items-center gap-2"><ShoppingBag size={18} /> Carrinho ({activeContext})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {processedItems.map(item => (
                            <div key={`${item.id}-${item.selectedTierName}`} className="bg-slate-800 p-2 rounded border border-slate-700 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="text-sm font-bold leading-tight">{item.name}</div>
                                    <button onClick={() => removeFromCart(item.id, item.selectedTierName)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <div className="flex items-center bg-slate-700 rounded overflow-hidden">
                                        <button onClick={() => updateCartQuantity(item.id, -1)} className="px-3 py-1 hover:bg-slate-600 font-bold"><Minus size={12} /></button>
                                        <span className="px-2 text-sm font-mono font-bold min-w-[2rem] text-center">{item.quantity}</span>
                                        <button onClick={() => updateCartQuantity(item.id, 1)} className="px-3 py-1 hover:bg-slate-600 font-bold"><Plus size={12} /></button>
                                    </div>
                                    <div className="text-right font-bold text-green-400">R$ {item.itemTotalNet.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                        {processedItems.length === 0 && (
                            <div className="text-center text-gray-500 mt-10 italic text-sm p-4">Carrinho vazio</div>
                        )}
                    </div>
                    <div className="p-4 bg-black bg-opacity-50 space-y-2">
                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-700">
                            <span>TOTAL</span>
                            <span>R$ {finalTotal.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={() => setView('CHECKOUT')}
                            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold flex justify-center items-center gap-2 mt-2"
                        >
                            <Check size={18} /> AVANÇAR PAGAMENTO
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCatalog = () => (
        <div className="space-y-4 pb-20">
            <div className="bg-white p-6 rounded-lg shadow flex flex-col items-start gap-4 mb-6">
                <div className="flex justify-between items-center w-full">
                    <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2"><FileSpreadsheet /> Importar Tabela de Preços ({activeContext})</h3>
                    <div className="flex gap-2">
                        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                            <Upload size={14} /> Excel Preços
                        </div>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleImportCatalog(e, 'PRICES')} />
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <input
                    type="text"
                    placeholder="🔍 Buscar no catálogo..."
                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {activeContext === 'TOTAL_QUIMICA' ? (
                <div className="bg-white rounded-lg shadow overflow-x-auto text-xs animate-fade-in">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-[#002f6c] text-[#ffff66]">
                            <tr>
                                <th className="p-3 font-black border-r border-[#003f8c]">CÓDIGO</th>
                                <th className="p-3 font-bold border-r border-[#003f8c]">DESCRIÇÃO DOS PRODUTOS</th>
                                <th className="p-3 font-bold text-center border-r border-[#003f8c]">EMBAL.</th>
                                <th className="p-3 font-bold text-right border-r border-[#003f8c]">PREÇO/CX</th>
                                <th className="p-3 font-black text-right text-white border-r border-[#003f8c]">PREÇO UNIT.</th>
                                <th className="p-3 font-bold text-center border-r border-[#003f8c]">IPI</th>
                                <th className="p-3 font-bold text-center border-r border-[#003f8c]">S.T.</th>
                                <th className="p-3 font-bold text-right border-r border-[#003f8c]">DESC. VAREJO</th>
                                <th className="p-3 font-bold text-right border-r border-[#003f8c]">DESC. ATAC</th>
                                <th className="p-3 font-bold text-right">DESC. DIST</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {getFilteredProducts().map(p => (
                                <tr key={p.id} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                                    <td className="p-3 font-mono text-slate-600 bg-[#ffffcc] border-r border-gray-200">{p.code}</td>
                                    <td className="p-3 font-bold text-slate-800 bg-[#ffffcc] border-r border-gray-200">{p.name}</td>
                                    <td className="p-3 text-center font-bold text-slate-700 bg-[#ffffcc] border-r border-gray-200">{p.packSize || '-'}</td>
                                    <td className="p-3 text-right font-bold text-slate-700 bg-[#ffffcc] border-r border-gray-200">
                                        {p.boxPrice ? p.boxPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                    </td>
                                    <td className="p-3 text-right font-black text-[#002f6c] bg-[#ffffcc] border-r border-gray-200">
                                        {p.price ? p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-600 bg-[#ffffcc] border-r border-gray-200">{p.ipi ? `${p.ipi}%` : '-'}</td>
                                    <td className="p-3 text-center font-bold text-slate-600 bg-[#ffffcc] border-r border-gray-200">{p.st ? `${p.st}%` : '-'}</td>
                                    <td className="p-3 text-right font-bold text-slate-700 bg-[#ffffcc] border-r border-gray-200">
                                        {p.priceTiers?.find(t => t.name.includes('Varejo'))?.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '-'}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-700 bg-[#ffffcc] border-r border-gray-200">
                                        {p.priceTiers?.find(t => t.name.includes('Atacado'))?.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '-'}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-700 bg-[#ffffcc]">
                                        {p.priceTiers?.find(t => t.name.includes('Distribuidor'))?.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-2">
                    {getFilteredProducts().slice(0, 100).map(p => <ProductCard key={p.id} product={p} mode="LIST" isCatalogMode={true} onAdd={openAddModal} />)}
                </div>
            )}
            {getFilteredProducts().length === 0 && <div className="text-center text-gray-500 p-8 bg-white rounded-lg shadow mt-4">Nenhum produto encontrado no catálogo.</div>}

        </div>
    );

    const renderSpecs = () => (
        <div className="space-y-4 pb-20 animate-fade-in">
            <div className="bg-slate-900 p-6 rounded-lg shadow-xl mb-6">
                <div className="flex justify-between items-center w-full">
                    <div>
                        <h3 className="font-black text-2xl text-white flex items-center gap-3 italic uppercase tracking-tighter">
                            <ClipboardList className="text-yellow-400" /> Especificações Técnicas
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">DADOS LOGÍSTICOS E TÉCNICOS DOS PRODUTOS ({activeContext})</p>
                    </div>
                    <div className="flex gap-2">
                        <div onClick={() => (document.getElementById('spec-import-input') as HTMLInputElement)?.click()} className="cursor-pointer bg-yellow-400 text-slate-900 hover:bg-yellow-500 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all">
                            <Plus size={16} /> Importar Especificações (Técnico)
                        </div>
                        <label className="cursor-pointer bg-slate-700 text-white hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all border border-slate-600">
                            <Upload size={16} /> Subir PDF
                            <input type="file" className="hidden" onChange={handleUploadSpec} />
                        </label>
                    </div>
                </div>
                <input id="spec-import-input" type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleImportCatalog(e, 'SPECS')} />

                {specFiles.length > 0 && (
                    <div className="w-full mt-4 pt-4 border-t border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Tabelas de Especificações Salvas (PDF)</h4>
                        <div className="flex flex-wrap gap-2">
                            {specFiles.map(file => (
                                <div key={file} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-[10px]">
                                    <a href={`/brasilia_specs/${activeContext}/especificacoes/${file}`} target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline flex items-center gap-1 font-bold">
                                        <FileText size={10} /> {file.split('-').slice(1).join('-')}
                                    </a>
                                    <button onClick={() => handleDeleteSpec(file)} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <input
                    type="text"
                    placeholder="🔍 Filtrar especificações..."
                    className="w-full p-3 border-2 border-slate-100 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-gray-200">
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Código</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Produto</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">NCM</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">EAN13</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">DUN14</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Emb.</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic bg-slate-100">Dim. Un.</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic bg-slate-100">Dim. Cx.</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Cx. Master</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Peso Bruto</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Peso Liq.</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">VLD.</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Paletização (Cx)</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">Lastro x Alt.</th>
                            <th className="p-3 text-[10px] font-black uppercase text-slate-500 italic">CEST</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {getFilteredProducts().map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-xs font-mono font-bold text-slate-700">{p.code}</td>
                                <td className="p-3 text-xs font-bold text-slate-900">{p.name}</td>
                                <td className="p-3 text-xs font-mono text-gray-500">{p.ncm || '-'}</td>
                                <td className="p-3 text-xs font-mono text-gray-500">{p.ean || '-'}</td>
                                <td className="p-3 text-xs font-mono text-gray-500">{p.dun || '-'}</td>
                                <td className="p-3 text-xs text-gray-600">{p.unitType || '-'}</td>
                                <td className="p-3 text-xs font-mono text-gray-500 bg-slate-50">{p.size || '-'}</td>
                                <td className="p-3 text-xs font-mono text-gray-500 bg-slate-50">{p.boxSize || '-'}</td>
                                <td className="p-3 text-xs text-gray-600">{p.masterCase || '-'}</td>
                                <td className="p-3 text-xs font-bold text-blue-600">{p.weight || '-'}</td>
                                <td className="p-3 text-xs text-blue-400">{p.netWeight || '-'}</td>
                                <td className="p-3 text-xs font-bold text-green-600">{p.validity || '-'}</td>
                                <td className="p-3 text-xs text-purple-600">{p.palletization || '-'}</td>
                                <td className="p-3 text-xs text-purple-700 font-bold">{p.palletizing || '-'}</td>
                                <td className="p-3 text-xs font-mono text-gray-400">{p.cest || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {getFilteredProducts().length === 0 && (
                    <div className="text-center py-20 text-gray-400 font-medium italic">Nenhuma especificação encontrada.</div>
                )}
            </div>
        </div>
    );

    const renderCadastro = () => (
        <div className="space-y-4 pb-20 animate-fade-in max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-xl mb-6 border-t-4 border-yellow-400">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                    <div>
                        <h3 className="font-black text-2xl text-[#002f6c] flex items-center gap-3 uppercase tracking-tighter mb-1">
                            <FileText className="text-[#84c148]" /> Ficha para Cadastro de Produto
                        </h3>
                        <p className="text-slate-500 text-sm">Preencha os dados ou busque um produto para auto-preenchimento.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleNewCadastro}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2 border border-slate-300"
                        >
                            <Plus size={16} /> Novo Cadastro
                        </button>
                        <button
                            onClick={saveCadastroDataToSupplier}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2"
                        >
                            <Save size={16} /> Salvar Ficha Permanente
                        </button>
                        <button
                            onClick={() => setIsCadastroProductModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2"
                        >
                            <Search size={16} /> Buscar Produto
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded font-bold shadow-md flex items-center gap-2"
                        >
                            <Printer size={16} /> Imprimir / PDF
                        </button>
                    </div>
                </div>

                <div className="space-y-8 bg-white" id="cadastro-print-area">
                    {/* DADOS DO FORNECEDOR */}
                    <section className="border-2 border-slate-800 rounded-md overflow-hidden">
                        <div className="bg-yellow-300 font-bold text-slate-900 p-2 text-sm uppercase border-b-2 border-slate-800">
                            Dados do Fornecedor
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cnpj (Busca Auto)</label>
                                <div className="flex">
                                    <input
                                        className="w-full p-2 border border-gray-300 rounded-l focus:ring-2 outline-none font-mono"
                                        value={cadastroData.cnpj}
                                        onChange={e => setCadastroData({ ...cadastroData, cnpj: maskCNPJ(e.target.value) })}
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <button onClick={fetchCnpjDataForCadastro} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-r font-bold">Buscar</button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fornecedor / Razão Social</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.fornecedor} onChange={e => setCadastroData({ ...cadastroData, fornecedor: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Inscrição Estadual</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.inscricaoEstadual} onChange={e => setCadastroData({ ...cadastroData, inscricaoEstadual: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Regime Tributário</label>
                                <select className="w-full p-2 border border-gray-300 rounded outline-none bg-white" value={cadastroData.regimeTributario} onChange={e => setCadastroData({ ...cadastroData, regimeTributario: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    <option value="LUCRO REAL">Lucro Real</option>
                                    <option value="LUCRO PRESUMIDO">Lucro Presumido</option>
                                    <option value="SIMPLES NACIONAL">Simples Nacional</option>
                                    <option value="EIRELI">EIRELI</option>
                                    <option value="MEI">MEI</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ramo de Atividade</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.ramoAtividade} onChange={e => setCadastroData({ ...cadastroData, ramoAtividade: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Regime de Apuração do ICMS</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.regimeApuracaoIcms} onChange={e => setCadastroData({ ...cadastroData, regimeApuracaoIcms: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer mt-6 select-none bg-white p-2 border rounded">
                                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300" checked={cadastroData.produtorRural} onChange={e => setCadastroData({ ...cadastroData, produtorRural: e.target.checked })} />
                                    <span className="text-xs font-bold text-gray-700 uppercase">Produtor Rural: Sujeito a retenção FUNRURAL?</span>
                                </label>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Responsável Setor Fiscal</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.responsavelFiscal} onChange={e => setCadastroData({ ...cadastroData, responsavelFiscal: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fone de Contato</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.foneContato} onChange={e => setCadastroData({ ...cadastroData, foneContato: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    {/* INFORMAÇÕES FISCAIS */}
                    <section className="border-2 border-slate-800 rounded-md overflow-hidden">
                        <div className="bg-yellow-300 font-bold text-slate-900 p-2 text-sm uppercase border-b-2 border-slate-800">
                            Informações Fiscais
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white relative">
                            <div className="md:col-span-4 relative">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição do Produto (Fiscal)</label>
                                <input
                                    className="w-full p-2 border border-gray-300 rounded outline-none bg-blue-50 font-bold focus:ring-2 focus:ring-blue-500"
                                    value={cadastroData.descricaoFiscal}
                                    onChange={e => {
                                        setCadastroData({ ...cadastroData, descricaoFiscal: e.target.value });
                                        setShowCadastroSuggestions(e.target.value.length > 2);
                                    }}
                                    onFocus={() => {
                                        if (cadastroData.descricaoFiscal.length > 2) setShowCadastroSuggestions(true);
                                    }}
                                    onBlur={() => setTimeout(() => setShowCadastroSuggestions(false), 200)}
                                    placeholder="Digite para auto-completar buscando nas tabelas..."
                                    autoComplete="off"
                                />
                                {showCadastroSuggestions && (
                                    <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 shadow-2xl rounded-lg max-h-64 overflow-y-auto z-50 divide-y divide-gray-100">
                                        {products
                                            .filter(p => p.supplier === activeContext && (p.name.toLowerCase().includes(cadastroData.descricaoFiscal.toLowerCase()) || p.code.includes(cadastroData.descricaoFiscal)))
                                            .slice(0, 15)
                                            .map(p => (
                                                <div
                                                    key={p.id}
                                                    onMouseDown={() => {
                                                        handleSelectProductForCadastro(p);
                                                        setShowCadastroSuggestions(false);
                                                    }}
                                                    className="p-3 hover:bg-blue-50 cursor-pointer text-sm group transition-colors"
                                                >
                                                    <div className="font-bold text-slate-800 group-hover:text-blue-800">{p.name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        <span className="font-mono bg-gray-100 px-1 rounded">Cód: {p.code}</span> |
                                                        NCM: {p.ncm || '-'} |
                                                        EAN: {p.ean || '-'} |
                                                        Preço: <span className="text-green-600 font-bold">{p.price ? `R$ ${p.price.toFixed(2)}` : '-'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        {products.filter(p => p.supplier === activeContext && (p.name.toLowerCase().includes(cadastroData.descricaoFiscal.toLowerCase()) || p.code.includes(cadastroData.descricaoFiscal))).length === 0 && (
                                            <div className="p-4 text-center text-gray-400 text-sm italic">Nenhum produto encontrado nas tabelas importadas.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código NCM</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none font-mono font-bold bg-blue-50" value={cadastroData.ncm} onChange={e => setCadastroData({ ...cadastroData, ncm: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código CEST</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none font-mono font-bold bg-blue-50" value={cadastroData.cest} onChange={e => setCadastroData({ ...cadastroData, cest: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código Benefício Fiscal</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.codBeneficioFiscal} onChange={e => setCadastroData({ ...cadastroData, codBeneficioFiscal: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Origem do Produto</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.origem} onChange={e => setCadastroData({ ...cadastroData, origem: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Importação (Direta ou Indireta)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.importacaoDireta} onChange={e => setCadastroData({ ...cadastroData, importacaoDireta: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Situação Tributária do Simples Nac.</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.sitTribSimples} onChange={e => setCadastroData({ ...cadastroData, sitTribSimples: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Simples Nac: Permite Crédito ICMS?</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.simplesCreditoIcms} onChange={e => setCadastroData({ ...cadastroData, simplesCreditoIcms: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Faixa % de Crédito</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.faixaCredito} onChange={e => setCadastroData({ ...cadastroData, faixaCredito: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Situação Tributária do ICMS</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.sitTribIcms} onChange={e => setCadastroData({ ...cadastroData, sitTribIcms: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alíquota ICMS (%)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.aliquotaIcms} onChange={e => setCadastroData({ ...cadastroData, aliquotaIcms: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">% Redução de Base</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.percReducaoBase} onChange={e => setCadastroData({ ...cadastroData, percReducaoBase: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subst. Tributária: Pauta ou MVA?</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.substTribPautaMva} onChange={e => setCadastroData({ ...cadastroData, substTribPautaMva: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Percentual MVA (%)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.percMva} onChange={e => setCadastroData({ ...cadastroData, percMva: e.target.value })} />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor Preço de Pauta</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.valorPauta} onChange={e => setCadastroData({ ...cadastroData, valorPauta: e.target.value })} />
                            </div>

                            {/* PIS / COFINS / IPI */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Incidência Fundo Combate a Pobreza?</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.fundoCombate} onChange={e => setCadastroData({ ...cadastroData, fundoCombate: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alíquota FCP (%)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.aliquotaFcp} onChange={e => setCadastroData({ ...cadastroData, aliquotaFcp: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Situação Tributária PIS</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.sitTribPis} onChange={e => setCadastroData({ ...cadastroData, sitTribPis: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alíquota PIS (%)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.aliquotaPis} onChange={e => setCadastroData({ ...cadastroData, aliquotaPis: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Situação Tributária COFINS</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.sitTribCofins} onChange={e => setCadastroData({ ...cadastroData, sitTribCofins: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alíquota COFINS (%)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.aliquotaCofins} onChange={e => setCadastroData({ ...cadastroData, aliquotaCofins: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Situação Tributária IPI</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.sitTribIpi} onChange={e => setCadastroData({ ...cadastroData, sitTribIpi: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alíquota IPI (%)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.aliquotaIpi} onChange={e => setCadastroData({ ...cadastroData, aliquotaIpi: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    {/* DESCRIÇÃO DO PRODUTO (Log/Prec) */}
                    <section className="border-2 border-slate-800 rounded-md overflow-hidden">
                        <div className="bg-yellow-300 font-bold text-slate-900 p-2 text-sm uppercase border-b-2 border-slate-800">
                            Descrição do Produto / Logística e Preço
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição Comercial</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none font-bold bg-blue-50" value={cadastroData.descricaoProduto} onChange={e => setCadastroData({ ...cadastroData, descricaoProduto: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Marca</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none font-bold" value={cadastroData.marca} onChange={e => setCadastroData({ ...cadastroData, marca: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gramatura / Peso</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none bg-blue-50" value={cadastroData.gramatura} onChange={e => setCadastroData({ ...cadastroData, gramatura: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">EAN</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none font-mono tracking-widest bg-blue-50" value={cadastroData.ean} onChange={e => setCadastroData({ ...cadastroData, ean: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Embalagem Cx</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none bg-blue-50 font-bold" value={cadastroData.embalagemCx} onChange={e => setCadastroData({ ...cadastroData, embalagemCx: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fornecedor</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.fornecedor} readOnly />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cód. Referência do Produto</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none bg-blue-50" value={cadastroData.codReferencia} onChange={e => setCadastroData({ ...cadastroData, codReferencia: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Preço de Custo (R$)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none bg-green-50 text-green-700 font-bold text-lg" value={cadastroData.precoCusto} onChange={e => setCadastroData({ ...cadastroData, precoCusto: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Preço de Venda Sugerido (R$)</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.precoVenda} onChange={e => setCadastroData({ ...cadastroData, precoVenda: e.target.value })} />
                            </div>

                            <div className="md:col-span-4 border-t pt-4 mt-2">
                                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Preenchimento Supermercado (Uso Interno Lojas)</div>
                                <div className="grid grid-cols-4 gap-2">
                                    <input placeholder='Grupo A' className="w-full p-2 border border-gray-300 rounded outline-none text-xs" value={cadastroData.lojasGrpA} onChange={e => setCadastroData({ ...cadastroData, lojasGrpA: e.target.value })} />
                                    <input placeholder='Grupo B' className="w-full p-2 border border-gray-300 rounded outline-none text-xs" value={cadastroData.lojasGrpB} onChange={e => setCadastroData({ ...cadastroData, lojasGrpB: e.target.value })} />
                                    <input placeholder='C/Indenização' className="w-full p-2 border border-gray-300 rounded outline-none text-xs" value={cadastroData.comIndenizacao} onChange={e => setCadastroData({ ...cadastroData, comIndenizacao: e.target.value })} />
                                    <input placeholder='S/Indenização' className="w-full p-2 border border-gray-300 rounded outline-none text-xs" value={cadastroData.semIndenizacao} onChange={e => setCadastroData({ ...cadastroData, semIndenizacao: e.target.value })} />
                                </div>
                            </div>

                            <div className="md:col-span-2 mt-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoria</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.categoria} onChange={e => setCadastroData({ ...cadastroData, categoria: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 mt-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observações</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.observacoes} onChange={e => setCadastroData({ ...cadastroData, observacoes: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Comprador</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none" value={cadastroData.comprador} onChange={e => setCadastroData({ ...cadastroData, comprador: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data</label>
                                <input className="w-full p-2 border border-gray-300 rounded outline-none font-mono" value={cadastroData.data} onChange={e => setCadastroData({ ...cadastroData, data: e.target.value })} />
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* MODAL BUSCA PRODUTO CADASTRO */}
            {isCadastroProductModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
                        <div className="bg-[#002f6c] p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2"><Search size={20} /> Buscar Produto para Cadastro ({activeContext})</h3>
                            <button onClick={() => setIsCadastroProductModalOpen(false)}><X size={20} className="hover:text-red-400" /></button>
                        </div>
                        <div className="p-4 bg-gray-50 border-b">
                            <input
                                autoFocus
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                                placeholder="🔍 Buscar por nome, código ou EAN..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100">
                            {getFilteredProducts().slice(0, 50).map(p => (
                                <div key={p.id} className="bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between hover:border-indigo-500 transition-colors">
                                    <div>
                                        <div className="font-bold text-slate-800">{p.name}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-1">
                                            Cód: {p.code} | EAN: {p.ean || '-'} | NCM: {p.ncm || '-'} | Cx: {p.packSize || p.masterCase || '-'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSelectProductForCadastro(p)}
                                        className="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded font-bold text-sm transition-colors"
                                    >
                                        Selecionar
                                    </button>
                                </div>
                            ))}
                            {getFilteredProducts().length === 0 && (
                                <div className="text-center py-10 text-gray-500">Nenhum produto encontrado. Verifique se as Tabelas e Especificações foram importadas.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const handleSaveCondicoes = async () => {
        setIsCondicoesSaving(true);
        try {
            await fetch('/api/brasilia/condicoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplier: activeContext, data: condicoes })
            });
            alert('Condições Comerciais salvas com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar condições comerciais.');
        } finally {
            setIsCondicoesSaving(false);
        }
    };

    const handleCondicoesChange = (row: keyof CondicoesComerciais, col: keyof CondicoesColumn | 'pagamentoVista', value: string) => {
        setCondicoes(prev => {
            const safePrev: CondicoesComerciais = prev || {
                desconto: { distribuidor: '', atacado: '', varejo: '' },
                bonificacaoAbertura: { distribuidor: '', atacado: '', varejo: '' },
                bonificacaoPontual: { distribuidor: '', atacado: '', varejo: '' },
                prazos: { distribuidor: '', atacado: '', varejo: '' },
                pedidoMinimoDemais: { distribuidor: '', atacado: '', varejo: '' },
                pedidoMinimoPet: { distribuidor: '', atacado: '', varejo: '' },
                pagamentoVista: ''
            };

            if (row === 'pagamentoVista') {
                return { ...safePrev, pagamentoVista: value };
            }

            return {
                ...safePrev,
                [row]: { ...(safePrev[row] as CondicoesColumn), [col]: value }
            };
        });
    };

    const handleImportClients = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const data = evt.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (json.length < 2) {
                alert("Planilha vazia ou sem cabeçalhos.");
                return;
            }

            const confirmImport = window.confirm(`Foram encontradas ${json.length - 1} linhas. Deseja importar os clientes para a carteira de ${activeContext}?`);
            if (!confirmImport) return;

            const headers = json[0].map(h => String(h).toLowerCase());

            const findColIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

            const cnpjIdx = findColIndex(['cnpj']);
            const razaoIdx = findColIndex(['razao', 'razão', 'nome']);
            const fantasiaIdx = findColIndex(['fantasia']);
            const emailIdx = findColIndex(['email', 'e-mail']);
            const telIdx = findColIndex(['tel', 'fone', 'celular', 'whatsapp']);

            const newClients: RepClient[] = [];

            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length === 0) continue;

                const cnpjRaw = cnpjIdx !== -1 && row[cnpjIdx] ? String(row[cnpjIdx]).replace(/\D/g, '') : '';
                const razaoText = razaoIdx !== -1 && row[razaoIdx] ? String(row[razaoIdx]) : '';

                if (razaoText) {
                    const mappedClient: RepClient = {
                        id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        fantasia: fantasiaIdx !== -1 && row[fantasiaIdx] ? String(row[fantasiaIdx]) : razaoText.split(' ')[0],
                        razaoSocial: razaoText,
                        cnpj: cnpjRaw,
                        email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]) : '',
                        whatsapp: telIdx !== -1 && row[telIdx] ? String(row[telIdx]) : '',
                        endereco: '', cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: ''
                    };

                    try {
                        await fetch(`/api/brasilia/cliente?supplier=${activeContext}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(mappedClient)
                        });
                    } catch (e) { console.error("Falha ao salvar cliente", e); }

                    newClients.push(mappedClient);
                }
            }

            if (newClients.length > 0) {
                setClients(prev => [...prev, ...newClients]);
                alert(`${newClients.length} clientes importados e salvos no fornecedor ${activeContext}.`);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const renderCondicoes = () => {
        const defaultCond = {
            desconto: { distribuidor: '25%', atacado: '15%', varejo: '5%', retiraFob: '15%' },
            bonificacaoAbertura: { distribuidor: 'ATÉ 5%', atacado: 'ATÉ 20%', varejo: 'ATÉ 20%' },
            bonificacaoPontual: { distribuidor: 'ATÉ 5%', atacado: 'ATÉ 5%', varejo: 'ATÉ 5%' },
            prazos: { distribuidor: '45', atacado: '42', varejo: '1 LOJA 35 DDL\nREDE 42 DDL' },
            pedidoMinimoDemais: { distribuidor: 'R$ 15.000,01', atacado: 'R$ 5.000,00', varejo: 'R$ 2.000,00' },
            pedidoMinimoPet: { distribuidor: '15% - R$ 5.000,01\n20% - R$ 10.000,01\n25% - R$ 20.000,01', atacado: '', varejo: '' },
            pagamentoVista: '3%'
        };

        const safeCond = condicoes || defaultCond;

        return (
            <div className="space-y-6 pb-20 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-lg shadow-xl">
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <h3 className="font-black text-2xl text-white flex items-center gap-3 italic uppercase tracking-tighter">
                                <FileSpreadsheet className="text-blue-400" /> Condições Comerciais
                            </h3>
                            <p className="text-slate-400 text-xs mt-1">POLÍTICA COMERCIAL E TRIBUTOS ({activeContext})</p>
                        </div>
                        <button
                            onClick={handleSaveCondicoes}
                            disabled={isCondicoesSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isCondicoesSaving ? <RotateCw className="animate-spin" size={16} /> : <Save size={16} />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>

                <div className="bg-white shadow-xl overflow-x-auto p-4 border border-x-gray-200">
                    <table className="w-full min-w-[1000px] text-center border-collapse border border-black font-sans text-sm table-fixed">
                        <colgroup>
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '17%' }} />
                            <col style={{ width: '17%' }} />
                            <col style={{ width: '17%' }} />
                            <col style={{ width: '11%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th colSpan={6} className="bg-[#002f6c] text-white p-4 text-xl border border-black uppercase tracking-wider font-black">POLÍTICA COMERCIAL - ANO 2025</th>
                            </tr>
                            <tr>
                                <th colSpan={6} className="bg-white text-black p-2 text-md border border-black font-bold uppercase tracking-wider">DESCONTOS COMERCIAIS</th>
                            </tr>
                            <tr>
                                <th className="bg-[#330099] text-white p-3 border border-black font-black uppercase text-sm" rowSpan={2}>CENTRO OESTE</th>
                                <th className="bg-[#330099] text-white p-3 border border-black font-black uppercase text-sm" rowSpan={2}>LINHA</th>
                                <th className="bg-[#330099] text-white p-2 border border-black font-black uppercase text-sm" colSpan={3}>CANAL</th>
                                <th className="bg-[#330099] text-white p-3 border border-black font-black uppercase text-sm" rowSpan={2}>RETIRA FOB</th>
                            </tr>
                            <tr>
                                <th className="bg-[#330099] text-white p-2 border border-black font-black uppercase text-sm">DISTRIBUIDOR</th>
                                <th className="bg-[#330099] text-white p-2 border border-black font-black uppercase text-sm">ATACADO</th>
                                <th className="bg-[#330099] text-white p-2 border border-black font-black uppercase text-sm">VAREJO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* DESCONTO */}
                            <tr>
                                <td className="bg-[#99ccff] font-black p-2 border border-black text-left uppercase text-xs">DESCONTO</td>
                                <td className="bg-[#99ccff] font-bold p-2 border border-black uppercase text-[11px]">PET / COSMÉTICO / LIMPEZA</td>
                                <td className="p-0 border border-black bg-white">
                                    <textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold" value={safeCond.desconto?.distribuidor || ''} onChange={(e) => handleCondicoesChange('desconto', 'distribuidor', e.target.value)} />
                                </td>
                                <td className="p-0 border border-black bg-white">
                                    <textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold" value={safeCond.desconto?.atacado || ''} onChange={(e) => handleCondicoesChange('desconto', 'atacado', e.target.value)} />
                                </td>
                                <td className="p-0 border border-black bg-white">
                                    <textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold" value={safeCond.desconto?.varejo || ''} onChange={(e) => handleCondicoesChange('desconto', 'varejo', e.target.value)} />
                                </td>
                                <td className="p-0 border border-black bg-white" rowSpan={7}>
                                    <textarea className="w-full h-full min-h-[250px] p-3 text-center resize-none outline-none font-bold flex items-center align-middle pt-[40%]" value={safeCond.desconto?.retiraFob || ''} onChange={(e) => handleCondicoesChange('desconto', 'retiraFob', e.target.value)} />
                                </td>
                            </tr>

                            {/* BONIFICAÇÃO */}
                            <tr>
                                <td className="bg-[#00cc66] font-black p-2 border border-black text-left uppercase text-xs" rowSpan={2}>BONIFICAÇÃO</td>
                                <td className="bg-[#00cc66] font-bold p-2 border border-black uppercase text-xs">ABERTURA</td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold text-xs" value={safeCond.bonificacaoAbertura?.distribuidor || ''} onChange={(e) => handleCondicoesChange('bonificacaoAbertura', 'distribuidor', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold text-xs" value={safeCond.bonificacaoAbertura?.atacado || ''} onChange={(e) => handleCondicoesChange('bonificacaoAbertura', 'atacado', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold text-xs" value={safeCond.bonificacaoAbertura?.varejo || ''} onChange={(e) => handleCondicoesChange('bonificacaoAbertura', 'varejo', e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="bg-[#00cc66] font-bold p-2 border border-black uppercase text-xs">PONTUAL</td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold text-xs" value={safeCond.bonificacaoPontual?.distribuidor || ''} onChange={(e) => handleCondicoesChange('bonificacaoPontual', 'distribuidor', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold text-xs" value={safeCond.bonificacaoPontual?.atacado || ''} onChange={(e) => handleCondicoesChange('bonificacaoPontual', 'atacado', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold text-xs" value={safeCond.bonificacaoPontual?.varejo || ''} onChange={(e) => handleCondicoesChange('bonificacaoPontual', 'varejo', e.target.value)} /></td>
                            </tr>

                            {/* PRAZOS */}
                            <tr>
                                <td className="bg-[#99cc66] font-black p-2 border border-black text-left uppercase text-xs" rowSpan={2}>PRAZOS</td>
                                <td className="bg-[#99cc66] font-bold p-2 border border-black text-center">-</td>
                                <td className="p-2 border border-black font-bold text-center uppercase text-xs bg-white" colSpan={3}>CONDIÇÃO DE PAGAMENTO</td>
                            </tr>
                            <tr>
                                <td className="bg-[#99cc66] font-bold p-2 border border-black text-center">-</td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold" value={safeCond.prazos?.distribuidor || ''} onChange={(e) => handleCondicoesChange('prazos', 'distribuidor', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-bold" value={safeCond.prazos?.atacado || ''} onChange={(e) => handleCondicoesChange('prazos', 'atacado', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-2 pt-[10px] text-center resize-none outline-none font-bold text-xs whitespace-pre-wrap leading-tight" value={safeCond.prazos?.varejo || ''} onChange={(e) => handleCondicoesChange('prazos', 'varejo', e.target.value)} /></td>
                            </tr>

                            {/* PEDIDO MINIMO */}
                            <tr>
                                <td className="bg-[#ffcc00] font-black p-2 border border-black text-left uppercase text-xs" rowSpan={2}>PEDIDO MINIMO</td>
                                <td className="bg-[#ffcc00] font-bold p-2 border border-black uppercase text-xs">DEMAIS LINHAS</td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[50px] p-3 text-center resize-none outline-none font-black text-sm" value={safeCond.pedidoMinimoDemais?.distribuidor || ''} onChange={(e) => handleCondicoesChange('pedidoMinimoDemais', 'distribuidor', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white" rowSpan={2}><textarea className="w-full h-full min-h-[140px] pt-14 text-center resize-none outline-none font-black text-sm" value={safeCond.pedidoMinimoDemais?.atacado || ''} onChange={(e) => handleCondicoesChange('pedidoMinimoDemais', 'atacado', e.target.value)} /></td>
                                <td className="p-0 border border-black bg-white" rowSpan={2}><textarea className="w-full h-full min-h-[140px] pt-14 text-center resize-none outline-none font-black text-sm" value={safeCond.pedidoMinimoDemais?.varejo || ''} onChange={(e) => handleCondicoesChange('pedidoMinimoDemais', 'varejo', e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="bg-[#ffcc00] font-bold p-2 border border-black uppercase text-xs">LINHA PET</td>
                                <td className="p-0 border border-black bg-white"><textarea className="w-full h-full min-h-[80px] p-1 text-center resize-none outline-none font-black text-[11px] leading-loose whitespace-pre-wrap" value={safeCond.pedidoMinimoPet?.distribuidor || ''} onChange={(e) => handleCondicoesChange('pedidoMinimoPet', 'distribuidor', e.target.value)} /></td>
                            </tr>

                            {/* PAGAMENTO A VISTA */}
                            <tr>
                                <td className="bg-white font-black p-3 border border-black text-left uppercase text-xs text-black" colSpan={2}>PAGAMENTO À VISTA</td>
                                <td className="p-0 border border-black bg-white" colSpan={4}>
                                    <textarea className="w-full min-h-[40px] p-2 text-center resize-none outline-none font-black text-black" value={safeCond.pagamentoVista || ''} onChange={(e) => handleCondicoesChange('pagamentoVista', 'distribuidor', e.target.value)} />
                                </td>
                            </tr>

                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-900 p-6 rounded-lg shadow-xl mt-8 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-white flex items-center gap-2"><Users className="text-green-400" /> Importar Clientes ({activeContext})</h4>
                        <p className="text-xs text-slate-400 mt-1">Carregue uma planilha Excel com a carteira de clientes deste fornecedor.</p>
                    </div>
                    <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded font-bold flex items-center gap-2 transition-all">
                        <Upload size={18} /> Selecionar Planilha (XLSX)
                        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportClients} />
                    </label>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">

            {/* GLOBAL HEADER (If in OVERVIEW) or SUPPLIER HEADER */}
            {activeContext === 'OVERVIEW' ? (
                <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="hover:bg-slate-800 p-2 rounded"><ArrowLeft /></button>
                            <h1 className="font-bold text-lg tracking-wide">BRASÍLIA SFA <span className="text-gray-500 font-light">| Representações</span></h1>
                        </div>
                    </div>
                </header>
            ) : renderSupplierHeader()}

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
                <div className="max-w-7xl mx-auto">
                    {/* LEVEL 1 VIEWS */}
                    {activeContext === 'OVERVIEW' && view === 'DASHBOARD' && renderHomeSelector()}
                    {view === 'CLIENTS' && (
                        <div className="space-y-6 pb-20">
                            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
                                <h3 className="font-bold text-lg flex items-center gap-2"><Users /> Carteira Global ({clients.length})</h3>
                                <button onClick={() => setIsClientModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2">
                                    <UserPlus size={18} /> Novo Cliente
                                </button>
                                {activeContext !== 'OVERVIEW' && (
                                    <button onClick={() => setView('DASHBOARD')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-bold ml-2">Voltar</button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {clients.map(client => (
                                    <div key={client.id} className="bg-white p-4 rounded shadow border border-gray-100">
                                        <div className="flex justify-between"><h4 className="font-bold">{client.fantasia}</h4> <button onClick={() => deleteClient(client.id)}><Trash2 size={16} className="text-gray-300" /></button></div>
                                        <div className="text-xs text-gray-500">{client.cnpj}</div>
                                        {activeContext !== 'OVERVIEW' && (
                                            <button onClick={() => startOrderForClient(client.id)} className="w-full mt-2 bg-slate-800 text-white py-1 rounded text-sm">Iniciar Pedido</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LEVEL 2 VIEWS (STRICT CONTEXT) */}
                    {activeContext !== 'OVERVIEW' && (
                        <>
                            {view === 'DASHBOARD' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                                        <h3 className="text-gray-500 text-sm font-bold uppercase">Pedidos do Mês</h3>
                                        <div className="text-3xl font-bold mt-2">{orders.filter(o => o.supplier === activeContext).length}</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                                        <h3 className="text-gray-500 text-sm font-bold uppercase">Vendas Totais</h3>
                                        <div className="text-3xl font-bold mt-2">R$ {orders.filter(o => o.supplier === activeContext).reduce((acc, o) => acc + o.totalNet, 0).toFixed(2)}</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                                        <h3 className="text-gray-500 text-sm font-bold uppercase">Produtos Ativos</h3>
                                        <div className="text-3xl font-bold mt-2">{getFilteredProducts().length}</div>
                                    </div>
                                </div>
                            )}
                            {view === 'NEW_ORDER' && renderNewOrder()}
                            {view === 'CATALOG' && renderCatalog()}
                            {view === 'SPECS' && renderSpecs()}
                            {view === 'CADASTRO' && renderCadastro()}
                            {view === 'CONDICOES' && renderCondicoes()}
                            {/* FIX: Using Standalone Component for Payment Settings */}
                            {view === 'SETTINGS' && (
                                <PaymentSettings
                                    activeContext={activeContext}
                                    supplierConfig={supplierConfig}
                                    setSupplierConfig={setSupplierConfig}
                                />
                            )}
                            {view === 'CHECKOUT' && renderCheckout()}
                            {view === 'SUCCESS' && successData && (
                                <SalesStatement
                                    order={successData.order}
                                    onClose={() => { setSuccessData(null); setView('NEW_ORDER'); }}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* MOBILE NAV (CONTEXT SPECIFIC) */}
            {activeContext !== 'OVERVIEW' && (
                <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 flex justify-around p-2 pb-safe">
                    <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center p-2 ${view === 'DASHBOARD' ? 'text-indigo-600' : 'text-gray-400'}`}><Home size={20} /></button>
                    <button onClick={() => setView('NEW_ORDER')} className={`flex flex-col items-center p-2 ${view === 'NEW_ORDER' ? 'text-indigo-600' : 'text-gray-400'}`}><ShoppingBag size={20} /></button>
                    <button onClick={() => setView('CATALOG')} className={`flex flex-col items-center p-2 ${view === 'CATALOG' ? 'text-indigo-600' : 'text-gray-400'}`}><ClipboardList size={20} /></button>
                    <button onClick={() => setView('SPECS')} className={`flex flex-col items-center p-2 ${view === 'SPECS' ? 'text-indigo-600' : 'text-gray-400'}`}><FileText size={20} /></button>
                    <button onClick={() => setView('CADASTRO')} className={`flex flex-col items-center p-2 ${view === 'CADASTRO' ? 'text-indigo-600' : 'text-gray-400'}`}><UserPlus size={20} /></button>
                    <button onClick={() => setView('CONDICOES')} className={`flex flex-col items-center p-2 ${view === 'CONDICOES' ? 'text-indigo-600' : 'text-gray-400'}`}><FileSpreadsheet size={20} /></button>
                    <button onClick={() => setView('SETTINGS')} className={`flex flex-col items-center p-2 ${view === 'SETTINGS' ? 'text-indigo-600' : 'text-gray-400'}`}><Settings size={20} /></button>
                </div>
            )}

            {/* MODALS (Client, Qty, Draft) - Keeping existing implementations */}
            {isClientModalOpen && (
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 animate-fade-in overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <div>
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <UserPlus className="text-indigo-600" />
                                {activeContext === 'DON_CAVES' || activeContext === 'TOTAL_QUIMICA' ? 'FICHA PARA CADASTRO DE CLIENTE' : 'Novo Cliente'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">{activeContext}</p>
                        </div>
                        <button onClick={() => setIsClientModalOpen(false)}><X size={24} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
                    </div>

                    <div className="space-y-8 overflow-x-hidden">
                        {/* SEÇÃO 1: DADOS DO FORNECEDOR / CLIENTE */}
                        <section>
                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 bg-yellow-400 px-3 py-2 rounded mb-4 shadow-sm uppercase italic">
                                Dados Cadastrais
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">FORNECEDOR / REPRESENTADA</label>
                                    <input className="w-full p-2 border rounded bg-gray-50 font-bold" value={activeContext} readOnly />
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razão Social *</label>
                                    <input className="w-full p-2 border-2 border-slate-100 focus:border-indigo-500 rounded outline-none transition-all" value={newClient.razaoSocial || ''} onChange={e => setNewClient({ ...newClient, razaoSocial: e.target.value })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Fantasia</label>
                                    <input className="w-full p-2 border rounded outline-none" value={newClient.fantasia || ''} onChange={e => setNewClient({ ...newClient, fantasia: e.target.value })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                                    <div className="flex">
                                        <input
                                            className="w-full p-2 border rounded-l font-mono outline-none focus:border-indigo-500"
                                            placeholder="00.000.000/0000-00"
                                            maxLength={18}
                                            value={newClient.cnpj || ''}
                                            onChange={e => setNewClient({ ...newClient, cnpj: maskCNPJ(e.target.value) })}
                                        />
                                        <button onClick={fetchCnpjDataForClient} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-r font-bold shrink-0">Buscar</button>
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inscrição Estadual (IE)</label>
                                    <input className="w-full p-2 border rounded font-mono outline-none" value={newClient.ie || ''} onChange={e => setNewClient({ ...newClient, ie: e.target.value })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Regime Tributário</label>
                                    <select className="w-full p-2 border rounded outline-none bg-white" value={newClient.regimeTributario || ''} onChange={e => setNewClient({ ...newClient, regimeTributario: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        <option value="LUCRO REAL">LUCRO REAL</option>
                                        <option value="LUCRO PRESUMIDO">LUCRO PRESUMIDO</option>
                                        <option value="SIMPLES NACIONAL">SIMPLES NACIONAL</option>
                                        <option value="EIRELI">EIRELI</option>
                                        <option value="MEI">MEI</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* SEÇÃO 2: INFORMAÇÕES FISCAIS */}
                        <section>
                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 bg-yellow-400 px-3 py-2 rounded mb-4 shadow-sm uppercase italic">
                                Informações Fiscais
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código NCM Padrão</label>
                                    <input className="w-full p-2 border rounded outline-none font-mono" value={newClient.ncmPadrao || ''} onChange={e => setNewClient({ ...newClient, ncmPadrao: e.target.value })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Benefício Fiscal</label>
                                    <input className="w-full p-2 border rounded outline-none" value={newClient.beneficioFiscal || ''} onChange={e => setNewClient({ ...newClient, beneficioFiscal: e.target.value })} />
                                </div>
                                <div className="md:col-span-1 flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={!!newClient.isProdutorRural} onChange={e => setNewClient({ ...newClient, isProdutorRural: e.target.checked })} />
                                        <span className="text-xs font-bold text-gray-600 uppercase">Produtor Rural?</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* SEÇÃO 3: CONTATO E LOCALIZAÇÃO */}
                        <section className="pb-6">
                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 bg-yellow-400 px-3 py-2 rounded mb-4 shadow-sm uppercase italic">
                                Contato e Localização
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável / Comprador</label><input className="w-full p-2 border rounded outline-none" value={newClient.contato || ''} onChange={e => setNewClient({ ...newClient, contato: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / Whats</label><input className="w-full p-2 border rounded outline-none" value={newClient.whatsapp || ''} onChange={e => setNewClient({ ...newClient, whatsapp: e.target.value })} /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail para NFE</label><input className="w-full p-2 border rounded outline-none" value={newClient.email || ''} onChange={e => setNewClient({ ...newClient, email: e.target.value })} /></div>

                                <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label><input className="w-full p-2 border rounded outline-none" value={newClient.cep || ''} onChange={e => setNewClient({ ...newClient, cep: e.target.value })} /></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logradouro / Endereço</label><input className="w-full p-2 border rounded outline-none" value={newClient.logradouro || newClient.endereco || ''} onChange={e => setNewClient({ ...newClient, logradouro: e.target.value, endereco: e.target.value })} /></div>

                                <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label><input className="w-full p-2 border rounded outline-none" value={newClient.numero || ''} onChange={e => setNewClient({ ...newClient, numero: e.target.value })} /></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label><input className="w-full p-2 border rounded outline-none" value={newClient.bairro || ''} onChange={e => setNewClient({ ...newClient, bairro: e.target.value })} /></div>

                                <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Município</label><input className="w-full p-2 border rounded outline-none" value={newClient.municipio || ''} onChange={e => setNewClient({ ...newClient, municipio: e.target.value })} /></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">UF</label><input className="w-full p-2 border rounded outline-none" value={newClient.uf || ''} onChange={e => setNewClient({ ...newClient, uf: e.target.value })} /></div>
                            </div>
                        </section>

                        <button
                            onClick={handleAddClient}
                            className="w-full bg-slate-900 border-2 border-slate-900 hover:bg-white hover:text-slate-900 text-white py-4 rounded-xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-tighter italic"
                        >
                            <Save size={24} /> SALVAR FICHA CADASTRAL
                        </button>
                    </div>
                </div>
            )}
            {isQtyModalOpen && productToAdd && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold truncate pr-4">{productToAdd.name}</h3>
                            <button onClick={() => setIsQtyModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-gray-50 p-4 rounded-lg border text-center"><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Unidades</label><input type="number" className="w-full text-center text-2xl font-bold bg-white border rounded p-2" value={qtyUnits} onChange={(e) => setQtyUnits(parseInt(e.target.value) || 0)} /></div>
                                <div className="flex-1 bg-gray-50 p-4 rounded-lg border text-center"><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Caixas</label><input type="number" className="w-full text-center text-2xl font-bold bg-white border rounded p-2" value={qtyBoxes} onChange={(e) => setQtyBoxes(parseInt(e.target.value) || 0)} /></div>
                            </div>
                            <button onClick={confirmAddToCart} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center gap-2"><Check size={20} /> CONFIRMAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SELECIONAR CLIENTE */}
            {isClientSearchOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
                        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2 tracking-tight"><Users size={20} /> Selecionar Cliente</h3>
                            <button onClick={() => setIsClientSearchOpen(false)} className="hover:rotate-90 transition-transform"><X size={20} /></button>
                        </div>

                        <div className="p-4 border-b bg-gray-50 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-800 outline-none transition-all font-medium"
                                    placeholder="Buscar por Razão Social ou CNPJ..."
                                    value={clientSearchTerm}
                                    onChange={e => setClientSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => { setIsClientSearchOpen(false); setIsClientModalOpen(true); }}
                                className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-200"
                            >
                                <UserPlus size={18} /> CADASTRAR NOVO CLIENTE
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-100">
                            {clients
                                .filter(c =>
                                    c.razaoSocial.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                    (c.cnpj && c.cnpj.includes(clientSearchTerm)) ||
                                    (c.fantasia && c.fantasia.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                )
                                .map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => { setSelectedClient(client.id); setIsClientSearchOpen(false); setClientSearchTerm(''); }}
                                        className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group
                                            ${selectedClient === client.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-[1.02]' : 'bg-white border-transparent hover:border-slate-300 hover:shadow-md'}
                                        `}
                                    >
                                        <div>
                                            <div className="font-bold group-hover:text-indigo-600 transition-colors">{client.razaoSocial}</div>
                                            <div className={`text-xs ${selectedClient === client.id ? 'text-slate-400' : 'text-gray-400'}`}>
                                                {client.cnpj} {client.fantasia ? `| ${client.fantasia}` : ''}
                                            </div>
                                        </div>
                                        {selectedClient === client.id && <Check size={20} className="text-green-400" />}
                                    </button>
                                ))
                            }
                            {clients.length === 0 && (
                                <div className="text-center py-10 text-gray-500">Nenhum cliente cadastrado.</div>
                            )}
                        </div>

                        {selectedClient && (
                            <div className="p-4 bg-white border-t flex gap-2">
                                <button
                                    onClick={() => setSelectedClient('')}
                                    className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-red-500"
                                >
                                    LIMPAR SELEÇÃO
                                </button>
                                <button
                                    onClick={() => setIsClientSearchOpen(false)}
                                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold"
                                >
                                    CONFIRMAR
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showDraftModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><RotateCw size={32} className="text-blue-600" /></div>
                            <h3 className="font-bold text-xl text-slate-800">Pedido em Aberto ({activeContext})</h3>
                            <p className="text-sm text-gray-500 mt-2">Deseja continuar o rascunho salvo?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleDiscardDraft} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-bold">DESCARTAR</button>
                            <button onClick={handleLoadDraft} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">CONTINUAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};