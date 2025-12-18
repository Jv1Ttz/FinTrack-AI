import React, { useState } from 'react';
import { Transaction, PaymentMethod, Category } from '../types';
import { Search, Filter, TrendingUp, TrendingDown, Calendar, Tag, Trash2, Pencil, CreditCard, QrCode, Banknote, Layers, Download, X, ChevronDown } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[]; // Add categories prop for dropdown
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  isPrivacyMode: boolean;
}

const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
        case 'CREDIT_CARD': return <CreditCard size={14} />;
        case 'DEBIT_CARD': return <CreditCard size={14} className="opacity-70" />;
        case 'PIX': return <QrCode size={14} />;
        case 'CASH': return <Banknote size={14} />;
        default: return <CreditCard size={14} />;
    }
};

const getPaymentLabel = (method: PaymentMethod) => {
    switch (method) {
        case 'CREDIT_CARD': return 'Crédito';
        case 'DEBIT_CARD': return 'Débito';
        case 'PIX': return 'Pix';
        case 'CASH': return 'Dinheiro';
        default: return 'Outro';
    }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, onDelete, onEdit, isPrivacyMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Filtering Logic
  const filteredTransactions = transactions.filter(t => {
    // 1. Text Search
    const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Type Filter
    const matchesType = filterType === 'ALL' || t.type === filterType;

    // 3. Category Filter
    const matchesCategory = filterCategory === '' || t.category === filterCategory;

    // 4. Payment Method Filter
    const matchesPayment = filterPayment === '' || t.paymentMethod === filterPayment;

    // 5. Date Range Filter
    const matchesStartDate = !filterStartDate || t.date >= filterStartDate;
    const matchesEndDate = !filterEndDate || t.date <= filterEndDate;

    return matchesSearch && matchesType && matchesCategory && matchesPayment && matchesStartDate && matchesEndDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterCategory('');
    setFilterPayment('');
    setFilterStartDate('');
    setFilterEndDate('');
    setIsFilterOpen(false);
  };

  const activeFiltersCount = [
      filterType !== 'ALL',
      filterCategory !== '',
      filterPayment !== '',
      filterStartDate !== '',
      filterEndDate !== ''
  ].filter(Boolean).length;

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    // Define CSV Headers
    const headers = ["Data", "Descrição", "Tipo", "Categoria", "Valor", "Método", "Parcelas"];
    
    // Map rows
    const rows = filteredTransactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
        t.type,
        t.category,
        t.amount.toFixed(2),
        t.paymentMethod || 'OTHER',
        t.installments ? `${t.installments.current}/${t.installments.total}` : ''
    ]);

    // Construct CSV String
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fin_track_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3 transition-colors">
         {/* Top Row: Search and Actions */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white hidden sm:block">Transações</h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="pl-10 pr-4 py-3 md:py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 bg-slate-50 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-3 md:p-2 border rounded-xl transition-colors relative ${isFilterOpen || activeFiltersCount > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    title="Filtros Avançados"
                >
                    <Filter size={18} />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                <button 
                    onClick={handleExportCSV}
                    className="p-3 md:p-2 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    title="Exportar para CSV"
                >
                    <Download size={18} />
                </button>
            </div>
         </div>

         {/* Advanced Filter Panel */}
         {isFilterOpen && (
             <div className="pt-3 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     
                     {/* Date Range */}
                     <div className="space-y-1">
                         <label className="text-xs font-medium text-slate-500 dark:text-slate-400">De</label>
                         <input 
                            type="date" 
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                         />
                     </div>
                     <div className="space-y-1">
                         <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Até</label>
                         <input 
                            type="date" 
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                         />
                     </div>

                     {/* Type */}
                     <div className="space-y-1">
                         <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</label>
                         <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                             <button 
                                onClick={() => setFilterType('ALL')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                             >
                                Todos
                             </button>
                             <button 
                                onClick={() => setFilterType('INCOME')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'INCOME' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                             >
                                Ent
                             </button>
                             <button 
                                onClick={() => setFilterType('EXPENSE')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'EXPENSE' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                             >
                                Sai
                             </button>
                         </div>
                     </div>

                     {/* Category & Payment */}
                     <div className="space-y-1">
                         <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtros Extras</label>
                         <div className="flex gap-2">
                             <div className="relative flex-1">
                                 <select 
                                     value={filterCategory}
                                     onChange={(e) => setFilterCategory(e.target.value)}
                                     className="w-full pl-2 pr-6 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                 >
                                     <option value="">Categoria: Todas</option>
                                     {categories.map(c => (
                                         <option key={c.id} value={c.name}>{c.name}</option>
                                     ))}
                                 </select>
                                 <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                             </div>
                             
                             <div className="relative flex-1">
                                 <select 
                                     value={filterPayment}
                                     onChange={(e) => setFilterPayment(e.target.value)}
                                     className="w-full pl-2 pr-6 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                 >
                                     <option value="">Pgto: Todos</option>
                                     <option value="CREDIT_CARD">Crédito</option>
                                     <option value="DEBIT_CARD">Débito</option>
                                     <option value="PIX">Pix</option>
                                     <option value="CASH">Dinheiro</option>
                                 </select>
                                 <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex justify-end mt-4">
                     <button 
                        onClick={clearFilters}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
                     >
                         <X size={14} /> Limpar Filtros
                     </button>
                 </div>
             </div>
         )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold tracking-wider">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => {
                  const isLastInstallment = t.installments && t.installments.current === t.installments.total;
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                    {t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{t.description}</span>
                                  {t.installments && (
                                      <span className={`text-[10px] flex items-center gap-1 font-medium px-1.5 py-0.5 rounded w-fit mt-0.5 ${
                                        isLastInstallment 
                                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800' 
                                        : 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                      }`}>
                                          <Layers size={10} />
                                          {t.installments.current}/{t.installments.total}
                                      </span>
                                  )}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg w-fit">
                                {getPaymentIcon(t.paymentMethod || 'OTHER')}
                                <span>{getPaymentLabel(t.paymentMethod || 'OTHER')}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {t.category}
                            </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-semibold text-sm ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                            {isPrivacyMode ? '****' : `${t.type === 'INCOME' ? '+' : '-'}R$ ${Number(t.amount).toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                  onClick={() => onEdit(t)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
                                  title="Editar"
                              >
                                  <Pencil size={16} />
                              </button>
                              <button 
                                  onClick={() => onDelete(t.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" 
                                  title="Excluir"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                        </td>
                    </tr>
                  );
                  })
              ) : (
                  <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                          Nenhuma transação encontrada para os filtros selecionados
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View: Card List */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => {
            const isLastInstallment = t.installments && t.installments.current === t.installments.total;

            return (
              <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`flex-shrink-0 p-3 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                          {t.type === 'INCOME' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div className="min-w-0">
                          <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">{t.description}</p>
                              {t.installments && (
                                  <span className={`text-[9px] flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded border ${
                                    isLastInstallment 
                                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800' 
                                    : 'text-blue-500 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-900/50'
                                  }`}>
                                      {t.installments.current}/{t.installments.total}
                                  </span>
                              )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{t.category}</span>
                              <span>•</span>
                              <span>{new Date(t.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <div className={`text-right font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {isPrivacyMode ? '****' : `${t.type === 'INCOME' ? '+' : '-'}R$ ${Number(t.amount).toFixed(2)}`}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                          {getPaymentIcon(t.paymentMethod || 'OTHER')}
                          <span>{getPaymentLabel(t.paymentMethod || 'OTHER')}</span>
                      </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                  <button 
                      onClick={() => onEdit(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                      <Pencil size={14} /> Editar
                  </button>
                  <button 
                      onClick={() => onDelete(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg"
                  >
                      <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            );
          })
        ) : (
           <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              Nenhuma transação encontrada para os filtros selecionados
           </div>
        )}
      </div>

    </div>
  );
};

export default TransactionList;