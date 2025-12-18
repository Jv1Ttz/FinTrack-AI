import React, { useState, useEffect } from 'react';
import { Upload, X, Loader2, FileText, ImageIcon, CreditCard, Banknote, QrCode, CalendarClock, Info } from 'lucide-react';
import { parseBankStatement } from '../services/geminiService';
import { Transaction, PaymentMethod, Category } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactions: Transaction | Transaction[]) => void;
  transactionToEdit: Transaction | null;
  categories: Category[]; // Receive categories
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSave, transactionToEdit, categories }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(''); // Init with empty, set in effect
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // New Fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DEBIT_CARD');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);

  // Initialize Category default
  useEffect(() => {
    if (categories.length > 0 && !category) {
        setCategory(categories[0].name);
    }
  }, [categories, category]);

  // Effect to populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setActiveTab('manual');
        setAmount(transactionToEdit.amount.toString());
        setDescription(transactionToEdit.description);
        setCategory(transactionToEdit.category);
        setType(transactionToEdit.type);
        setDate(transactionToEdit.date);
        setPaymentMethod(transactionToEdit.paymentMethod || 'OTHER');
        
        if (transactionToEdit.installments) {
            setIsInstallment(true);
            setInstallmentCount(transactionToEdit.installments.total);
        } else {
            setIsInstallment(false);
            setInstallmentCount(2);
        }

      } else {
        // Reset defaults
        setAmount('');
        setDescription('');
        if (categories.length > 0) setCategory(categories[0].name);
        setType('EXPENSE');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('DEBIT_CARD');
        setIsInstallment(false);
        setInstallmentCount(2);
      }
      setError(null);
    }
  }, [isOpen, transactionToEdit, categories]);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const transactions = await parseBankStatement(file);
      onSave(transactions);
      onClose();
    } catch (err) {
      setError("Falha ao processar arquivo. Verifique sua chave de API e se o arquivo está legível.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !date) return;

    const baseAmount = parseFloat(parseFloat(amount).toFixed(2));

    // Handle Installment Logic
    if (isInstallment && paymentMethod === 'CREDIT_CARD' && installmentCount > 1 && !transactionToEdit) {
        // Create multiple transactions for installments (Only for NEW transactions, not editing)
        // Note: For real editing of a series, we'd need a more complex ID linking system. 
        // For MVP, editing changes only the selected transaction.
        
        const monthlyAmount = baseAmount / installmentCount;
        const transactionsToCreate: Transaction[] = [];

        for (let i = 0; i < installmentCount; i++) {
            const installmentDate = new Date(date);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            
            transactionsToCreate.push({
                id: Math.random().toString(36).substr(2, 9),
                date: installmentDate.toISOString().split('T')[0],
                description: `${description} (${i + 1}/${installmentCount})`,
                amount: parseFloat(monthlyAmount.toFixed(2)),
                type: type,
                category: category,
                paymentMethod: paymentMethod,
                installments: {
                    current: i + 1,
                    total: installmentCount
                }
            });
        }
        onSave(transactionsToCreate);

    } else {
        // Single Transaction
        const newTransaction: Transaction = {
            id: transactionToEdit ? transactionToEdit.id : Math.random().toString(36).substr(2, 9),
            date: date,
            description: description,
            amount: baseAmount,
            type: type,
            category: category,
            paymentMethod: paymentMethod,
            installments: isInstallment && installmentCount > 1 ? {
                current: transactionToEdit?.installments?.current || 1, // Keep current if editing
                total: installmentCount
            } : undefined
        };
        onSave(newTransaction);
    }

    onClose();
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[90vh] flex flex-col transition-colors border border-slate-200 dark:border-slate-800">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
            {transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {!transactionToEdit && (
            <div className="flex border-b border-slate-100 dark:border-slate-800">
                <button 
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'manual' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Manual
                </button>
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'upload' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Extrato com IA
                </button>
            </div>
        )}

        <div className="p-6 md:p-8 overflow-y-auto">
          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-5">
                 {/* Type Toggle */}
                 <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setType('EXPENSE')}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'EXPENSE' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Despesa
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('INCOME')}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'INCOME' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Receita
                    </button>
                 </div>

                 {/* Amount */}
                 <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor {isInstallment && !transactionToEdit ? 'Total da Compra' : ''}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                        <input 
                            type="number" 
                            step="0.01" 
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="0,00"
                        />
                    </div>
                 </div>

                 {/* Payment Method */}
                 <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Método de Pagamento</label>
                    <div className="grid grid-cols-4 gap-2">
                         {[
                            { id: 'CREDIT_CARD', icon: CreditCard, label: 'Crédito' },
                            { id: 'DEBIT_CARD', icon: CreditCard, label: 'Débito' },
                            { id: 'PIX', icon: QrCode, label: 'Pix' },
                            { id: 'CASH', icon: Banknote, label: 'Dinheiro' }
                         ].map((method) => (
                             <button
                                key={method.id}
                                type="button"
                                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${
                                    paymentMethod === method.id 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                             >
                                <method.icon size={20} />
                                <span className="text-[10px] font-medium">{method.label}</span>
                             </button>
                         ))}
                    </div>
                 </div>

                 {/* Installments Option (Only for Credit Card and New Transactions) */}
                 {paymentMethod === 'CREDIT_CARD' && type === 'EXPENSE' && (
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                                <CalendarClock size={16} className="text-slate-500" />
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">É parcelado?</label>
                             </div>
                             <input 
                                type="checkbox"
                                checked={isInstallment}
                                onChange={(e) => setIsInstallment(e.target.checked)} 
                                className="w-4 h-4 rounded text-blue-600"
                             />
                        </div>
                        
                        {isInstallment && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs text-slate-500 mb-1">Número de Parcelas</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        min="2"
                                        max="48"
                                        value={installmentCount}
                                        onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                    />
                                    {!transactionToEdit && amount && (
                                        <span className="text-xs text-slate-500">
                                            {installmentCount}x de R$ {(parseFloat(amount) / installmentCount).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                {!transactionToEdit && (
                                    <p className="text-[10px] text-blue-500 mt-2">
                                        Isso criará automaticamente {installmentCount} transações futuras.
                                    </p>
                                )}
                            </div>
                        )}
                     </div>
                 )}

                 {/* Description */}
                 <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                    <input 
                        type="text" 
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        placeholder="Ex: Almoço, Uber, Salário..."
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     {/* Category */}
                     <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                     </div>
                     {/* Date */}
                     <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                             {paymentMethod === 'CREDIT_CARD' ? 'Data da Compra' : 'Data'}
                        </label>
                        <input 
                            type="date" 
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                        />
                     </div>
                 </div>

                 <button 
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 active:scale-95 transition-all mt-4"
                 >
                    {transactionToEdit ? 'Salvar Alterações' : 'Adicionar Transação'}
                 </button>
            </form>
          ) : (
             // Upload Tab (Existing content)
             <>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 size={48} className="text-blue-500 animate-spin" />
                    <div className="text-center">
                        <p className="text-lg font-medium text-slate-800 dark:text-white">Analisando...</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">A IA está lendo seu extrato.</p>
                    </div>
                    </div>
                ) : (
                    <div 
                    className={`border-2 border-dashed rounded-xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-colors ${
                        isDragging 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    >
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                        <Upload size={32} className="text-slate-600 dark:text-slate-300" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                        Enviar Extrato ou Fatura
                    </h4>
                    
                    {/* Info Tip for Nubank Users */}
                    <div className="mb-6 flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-blue-700 dark:text-blue-300 text-left max-w-xs mx-auto">
                        <Info size={16} className="flex-shrink-0 mt-0.5" />
                        <p>Dica: Você pode exportar tanto o <b>Extrato da Conta</b> quanto a <b>Fatura do Cartão</b> (PDF/Print) e enviar aqui. O sistema sabe diferenciar.</p>
                    </div>
                    
                    <label className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 px-8 rounded-xl cursor-pointer transition-colors shadow-sm shadow-blue-200 dark:shadow-none w-full md:w-auto flex justify-center">
                        Selecionar Arquivo
                        <input type="file" className="hidden" onChange={onInputChange} accept="image/*,.pdf" />
                    </label>
                    
                    {error && (
                        <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30 w-full text-left">
                        {error}
                        </div>
                    )}
                    </div>
                )}

                {!isLoading && (
                    <div className="mt-6 md:mt-8 grid grid-cols-2 gap-3 md:gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                        <ImageIcon className="text-slate-400" size={20} />
                        <div className="text-left">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Galeria</p>
                            <p className="text-[10px] text-slate-400">Prints / Fotos</p>
                        </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                        <FileText className="text-slate-400" size={20} />
                        <div className="text-left">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Arquivos</p>
                            <p className="text-[10px] text-slate-400">PDF / TXT</p>
                        </div>
                        </div>
                    </div>
                )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default UploadModal;