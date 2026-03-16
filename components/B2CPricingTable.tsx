import React, { useState } from 'react';
import { Download, Printer, Search, Trash2, Unlink, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

// Mock data para teste
const mockProducts = [
  {
    id: '1',
    milaoName: "QUEIJO GRANA PADANO 1KG",
    sfName: "Grana Padano Premium 1kg",
    milaoDe: 149.90,
    milaoPor: 123.90,
    instagram: 136.29,
    sfDe: 164.89,
    sfPor: 159.57,
    suggested: 165.00,
    lucroReal: 12.34,
    vinculado: false
  },
  {
    id: '2',
    milaoName: "VINHO CHAC CHAC TANNAT",
    sfName: "Chac Chac Reserva Tannat",
    milaoDe: 69.90,
    milaoPor: 59.90,
    instagram: 65.89,
    sfDe: 76.89,
    sfPor: 73.52,
    suggested: 75.00,
    lucroReal: 8.50, // Vermelho < 10
    vinculado: true
  },
  {
    id: '3',
    milaoName: "PROVOLONE AURORA 500G",
    sfName: "Provolone Aurora Curado 500g",
    milaoDe: 89.90,
    milaoPor: 79.90,
    instagram: 84.89,
    sfDe: 95.89,
    sfPor: 92.52,
    suggested: 95.00,
    lucroReal: 15.67,
    vinculado: true
  }
];

// Helper para formatar moeda
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const B2CPricingTable: React.FC = () => {
  const [products, setProducts] = useState(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter produtos
  const filteredProducts = products.filter(p =>
    p.milaoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sfName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProduct = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleToggleLink = (id: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, vinculado: !p.vinculado } : p
    ));
  };

  const handleExport = () => {
    const exportData = products.map(p => ({
      'Produto Milão': p.milaoName,
      'Produto SF': p.sfName,
      'Milão De': p.milaoDe.toFixed(2).replace('.', ','),
      'Milão Por': p.milaoPor.toFixed(2).replace('.', ','),
      'Instagram': p.instagram.toFixed(2).replace('.', ','),
      'SF De': p.sfDe.toFixed(2).replace('.', ','),
      'SF Por': p.sfPor.toFixed(2).replace('.', ','),
      'Sugerido': p.suggested.toFixed(2).replace('.', ','),
      'Lucro Real': p.lucroReal.toFixed(2).replace('.', ','),
      'Status': p.vinculado ? 'Vinculado' : 'Sem Vínculo'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "B2C_Pricing");
    const fileName = "tabela_b2c_precificacao.csv";
    const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
    const blob = new Blob([wbout], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4 print:hidden">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
          >
            <Download className="w-5 h-5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabela B2C */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-gray-200 print:border-none print:shadow-none">
        <style>{`
          @media print {
            @page { size: landscape; margin: 5mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .print-hidden { display: none !important; }
            table { font-size: 9px; width: 100%; border-collapse: collapse; }
            th, td { padding: 4px !important; border-bottom: 1px solid #ddd; }
            .no-break { page-break-inside: avoid; }
          }
          .lucro-verde { color: #16a34a; font-weight: 700; background: #dcfce9; }
          .lucro-vermelho { color: #dc2626; font-weight: 700; background: #fee2e2; }
          .produto-cell .top { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
          .produto-cell .sf-name { color: #2563eb; font-size: 0.75rem; font-weight: 500; margin-left: 24px; margin-bottom: 4px; }
          .produto-cell .link-status { display: flex; align-items: center; gap: 4px; margin-left: 24px; }
        `}</style>

        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase w-80">Produto (Milão / SF Imports)</th>
              <th className="px-2 py-3 text-right font-bold text-gray-500 border-l uppercase w-20">Milão 'De'</th>
              <th className="px-2 py-3 text-right font-bold text-indigo-700 bg-indigo-50 border-l uppercase w-20">Milão 'Por'</th>
              <th className="px-2 py-3 text-center font-bold text-purple-700 bg-purple-50 border-l uppercase w-20">Instagram</th>
              <th className="px-2 py-3 text-right font-bold text-gray-500 border-l uppercase w-20">SF 'De'</th>
              <th className="px-2 py-3 text-right font-bold text-green-700 bg-green-50 border-l uppercase w-20">SF 'Por'</th>
              <th className="px-2 py-3 text-right font-bold text-blue-700 bg-blue-50 border-l uppercase w-20">Sugerido</th>
              <th className="px-2 py-3 text-center font-bold text-slate-700 bg-slate-200 border-l uppercase w-24">Lucro Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 no-break">
                {/* COLUNA PRODUTO */}
                <td className="px-3 py-2 align-top">
                  <div className="produto-cell">
                    {/* Top: Botão excluir + Nome Milão */}
                    <div className="top">
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-400 hover:text-red-600 print:hidden"
                        title="Excluir Milão"
                      >
                        🗑️
                      </button>
                      <strong className="text-slate-800 text-sm leading-tight">
                        {product.milaoName}
                      </strong>
                    </div>

                    {/* Middle: Nome SF Imports (azul) */}
                    <div className="sf-name">
                      {product.sfName}
                    </div>

                    {/* Bottom: Link + Status */}
                    <div className="link-status">
                      <button
                        onClick={() => handleToggleLink(product.id)}
                        className="text-blue-500 hover:text-blue-700 print:hidden"
                        title={product.vinculado ? "Desvincular" : "Vincular"}
                      >
                        🔗
                      </button>
                      {product.vinculado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                          Vinculado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-yellow-600 font-bold bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                          Sem Vínculo
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* COLUNAS DE PREÇOS */}
                <td className="px-2 py-2 text-right text-gray-400 line-through border-l border-gray-100 align-middle">
                  {formatCurrency(product.milaoDe)}
                </td>

                <td className="px-2 py-2 text-right font-bold text-indigo-700 bg-indigo-50 border-l border-indigo-100 align-middle">
                  {formatCurrency(product.milaoPor)}
                </td>

                <td className="px-2 py-2 text-center border-l border-gray-100 align-middle">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold text-purple-700">{formatCurrency(product.instagram)}</span>
                    <ExternalLink className="w-3 h-3 text-purple-500 print:hidden" />
                  </div>
                </td>

                <td className="px-2 py-2 text-right text-gray-400 line-through border-l border-gray-100 align-middle">
                  {formatCurrency(product.sfDe)}
                </td>

                <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-50 border-l border-green-100 align-middle">
                  {formatCurrency(product.sfPor)}
                </td>

                <td className="px-2 py-2 text-right font-bold text-blue-700 bg-blue-50 border-l border-blue-100 align-middle">
                  {formatCurrency(product.suggested)}
                </td>

                {/* LUCRO REAL COLORIDO */}
                <td className={`px-2 py-2 text-center border-l border-gray-200 align-middle font-bold ${product.lucroReal >= 10 ? 'lucro-verde' : 'lucro-vermelho'}`}>
                  {formatCurrency(product.lucroReal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
