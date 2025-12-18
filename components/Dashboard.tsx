import React, { useState, useMemo } from 'react';
import { Transaction, DashboardStats, MonthlyData, Category, UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, ChevronLeft, ChevronRight, Calendar, MousePointer2, AlertTriangle, CheckCircle2, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  userProfile: UserProfile | null;
  isPrivacyMode: boolean; // Receive privacy state
}

// Utility to filter transactions by month with credit card logic
const filterTransactionsByMonth = (
    transactions: Transaction[], 
    date: Date, 
    userProfile: UserProfile | null
) => {
    return transactions.filter(t => {
      const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
      
      // Credit Card Smart Logic
      if (t.type === 'EXPENSE' && t.paymentMethod === 'CREDIT_CARD' && userProfile?.creditCardClosingDay) {
        const closingDay = userProfile.creditCardClosingDay;
        
        let billMonth = tMonth - 1; // 0-11
        let billYear = tYear;

        if (tDay >= closingDay) {
            billMonth++;
            if (billMonth > 11) {
                billMonth = 0;
                billYear++;
            }
        }
        return billYear === date.getFullYear() && billMonth === date.getMonth();
      }

      // Default Logic
      return tYear === date.getFullYear() && (tMonth - 1) === date.getMonth();
    });
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, userProfile, isPrivacyMode }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [activeIndex, setActiveIndex] = useState(-1); // For Pie Chart Interaction

  // Helper to format currency considering privacy mode
  const formatCurrency = (value: number) => {
      if (isPrivacyMode) return 'R$ ****';
      return `R$ ${value.toFixed(2)}`;
  };

  const getCategoryColor = (catName: string) => {
    return categories.find(c => c.name === catName)?.color || '#94a3b8';
  };
  
  const getCategoryLimit = (catName: string) => {
    return categories.find(c => c.name === catName)?.budgetLimit || 0;
  };

  const prevMonth = () => {
    setDirection('left');
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setDirection('right');
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const currentMonthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // 1. All-Time Balance
  const allTimeBalance = useMemo(() => {
    const totalCents = transactions.reduce((acc, curr) => {
      const amountCents = Math.round(Number(curr.amount) * 100);
      return curr.type === 'INCOME' ? acc + amountCents : acc - amountCents;
    }, 0);
    return totalCents / 100;
  }, [transactions]);

  // 2. Current Month Transactions
  const monthlyTransactions = useMemo(() => {
    return filterTransactionsByMonth(transactions, currentDate, userProfile);
  }, [transactions, currentDate, userProfile]);

  // 3. Previous Month Transactions (For Comparison)
  const prevMonthTransactions = useMemo(() => {
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return filterTransactionsByMonth(transactions, prevDate, userProfile);
  }, [transactions, currentDate, userProfile]);

  // 4. Calculate Stats & Comparisons
  const stats = useMemo(() => {
    // Current Month
    const current = monthlyTransactions.reduce(
      (acc, curr) => {
        const val = Math.round(Number(curr.amount) * 100);
        if (curr.type === 'INCOME') acc.income += val;
        else acc.expense += val;
        return acc;
      }, { income: 0, expense: 0 }
    );

    // Prev Month
    const prev = prevMonthTransactions.reduce(
        (acc, curr) => {
          const val = Math.round(Number(curr.amount) * 100);
          if (curr.type === 'INCOME') acc.income += val;
          else acc.expense += val;
          return acc;
        }, { income: 0, expense: 0 }
    );

    // Comparison Logic (Percent Change)
    const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    return {
        income: current.income / 100,
        expense: current.expense / 100,
        incomeChange: calculateChange(current.income, prev.income),
        expenseChange: calculateChange(current.expense, prev.expense)
    };
  }, [monthlyTransactions, prevMonthTransactions]);

  // 5. Chart Data
  const chartData = useMemo(() => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const data: MonthlyData[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayString = i.toString().padStart(2, '0');
      const dayTransactions = monthlyTransactions.filter(t => {
        const day = t.date.split('-')[2];
        return day === dayString;
      });

      const incomeCents = dayTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Math.round(Number(t.amount) * 100), 0);
        
      const expenseCents = dayTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Math.round(Number(t.amount) * 100), 0);

      data.push({
        name: dayString,
        income: incomeCents / 100,
        expense: expenseCents / 100
      });
    }
    return data;
  }, [monthlyTransactions, currentDate]);

  // 6. Category Data
  const categoryData = useMemo(() => {
    const categoryCents = monthlyTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, curr) => {
        const amountCents = Math.round(Number(curr.amount) * 100);
        if (acc[curr.category]) {
            acc[curr.category] += amountCents;
        } else {
            acc[curr.category] = amountCents;
        }
        return acc;
      }, {} as Record<string, number>);

    return Object.keys(categoryCents)
      .map(catName => ({
        name: catName,
        value: categoryCents[catName] / 100,
        color: getCategoryColor(catName),
        limit: getCategoryLimit(catName)
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyTransactions, categories]);

  const chartWidth = Math.max(600, chartData.length * 60);
  const hasCreditCardSettings = userProfile?.creditCardClosingDay;

  // Pie Chart Interaction Handlers
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  // Determine Center Text for Pie Chart
  const activeItem = activeIndex >= 0 ? categoryData[activeIndex] : null;
  const centerLabel = activeItem ? activeItem.name : 'Total';
  const centerValue = activeItem ? activeItem.value : stats.expense;
  const centerColor = activeItem ? activeItem.color : undefined;

  // Comparison Badge Component
  const ComparisonBadge = ({ change, inverse = false }: { change: number, inverse?: boolean }) => {
      if (change === 0) return <div className="flex items-center text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded gap-1"><Minus size={10} /> 0%</div>;
      
      const isPositive = change > 0;
      // Normal: Positive is Good (Green), Negative is Bad (Red) - e.g. Income
      // Inverse: Positive is Bad (Red), Negative is Good (Green) - e.g. Expense
      const isGood = inverse ? !isPositive : isPositive;
      
      const colorClass = isGood 
        ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' 
        : 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400';

      return (
          <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded gap-1 ${colorClass}`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(change).toFixed(0)}%
          </div>
      );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
      
      {/* Month Navigation Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors sticky top-0 z-20 md:static gap-3">
        <div className="flex items-center justify-between w-full md:w-auto">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-2 px-4">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-bold text-slate-900 dark:text-white capitalize">{currentMonthName}</span>
            </div>

            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronRight size={20} />
            </button>
        </div>

        {hasCreditCardSettings && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 self-center md:self-auto">
                <Info size={14} />
                <span>Visualizando por competência de Fatura (Fechamento dia {userProfile.creditCardClosingDay})</span>
            </div>
        )}
      </div>

      {/* Content Wrapper for Animation */}
      <div 
        key={currentDate.toISOString()}
        className={`space-y-4 md:space-y-6 animate-in fade-in duration-300 ${direction === 'right' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}`}
      >
        {/* Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {/* Balance Card */}
            <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Saldo Atual</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Wallet size={20} />
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(allTimeBalance)}</h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Acumulado total</p>
            </div>
            </div>

            {/* Income Card */}
            <div className="col-span-1 bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <ArrowUpRight size={18} />
                </div>
                <ComparisonBadge change={stats.incomeChange} />
            </div>
            <div>
                <h3 className="text-xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    {isPrivacyMode ? 'R$ ****' : `+R$ ${stats.income.toFixed(2)}`}
                </h3>
                <p className="hidden md:block text-slate-400 dark:text-slate-500 text-xs mt-1">Em {currentMonthName.split(' ')[0]}</p>
            </div>
            </div>

            {/* Expense Card */}
            <div className="col-span-1 bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 md:p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                <ArrowDownRight size={18} />
                </div>
                <ComparisonBadge change={stats.expenseChange} inverse />
            </div>
            <div>
                <h3 className="text-xl md:text-3xl font-bold text-rose-600 dark:text-rose-400 truncate">
                     {isPrivacyMode ? 'R$ ****' : `-R$ ${stats.expense.toFixed(2)}`}
                </h3>
                <p className="hidden md:block text-slate-400 dark:text-slate-500 text-xs mt-1">
                    {hasCreditCardSettings ? 'Inclui fatura estimada' : `Em ${currentMonthName.split(' ')[0]}`}
                </p>
            </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fluxo Diário</h3>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full">
                        <MousePointer2 size={10} />
                        Arraste para ver
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 capitalize">{currentMonthName}</span>
                </div>
            </div>
            
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                <div style={{ width: `${chartWidth}px` }} className="h-60 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={chartData} 
                        margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
                        barGap={4}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                        <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                        interval={0} 
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip 
                            contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: '#1e293b',
                            color: '#f8fafc'
                            }}
                            cursor={{ fill: '#334155', opacity: 0.1 }}
                            formatter={(value: number) => [isPrivacyMode ? '****' : `R$ ${value.toFixed(2)}`, '']}
                            labelFormatter={(label) => `Dia ${label}`}
                        />
                        <Bar 
                          name="Receita" 
                          dataKey="income" 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]} 
                          barSize={20}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                        <Bar 
                          name="Despesa" 
                          dataKey="expense" 
                          fill="#f43f5e" 
                          radius={[4, 4, 0, 0]} 
                          barSize={20}
                          animationDuration={1000}
                          animationBegin={200}
                          animationEasing="ease-out"
                        />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                {/* Categories */}
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors flex flex-col h-full max-h-[600px]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Gastos por Categoria</h3>
                
                {/* Chart Area with Overlay Center */}
                <div className="h-64 w-full flex items-center justify-center relative flex-shrink-0">
                    {categoryData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart onMouseLeave={onPieLeave}>
                                <Pie
                                    data={categoryData}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                    onMouseEnter={onPieEnter}
                                >
                                {categoryData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.color} 
                                        opacity={activeIndex === index || activeIndex === -1 ? 1 : 0.4}
                                        stroke={activeIndex === index ? 'white' : 'none'}
                                        strokeWidth={activeIndex === index ? 2 : 0}
                                        className="transition-all duration-300 cursor-pointer"
                                    />
                                ))}
                                </Pie>
                                <Tooltip 
                                    show={false} // Disable default tooltip to use custom center logic
                                />
                            </PieChart>
                            </ResponsiveContainer>
                            
                            {/* Center Info Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">
                                    {centerLabel}
                                </span>
                                <span 
                                    className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-300"
                                    style={{ color: centerColor }}
                                >
                                    {formatCurrency(centerValue)}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-700/50 mb-3 flex items-center justify-center">
                                <Wallet className="text-slate-300 dark:text-slate-500" size={32} />
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Sem gastos neste mês</p>
                        </div>
                    )}
                </div>
                
                {/* Enhanced List */}
                <div className="mt-4 space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {categoryData.map((cat, idx) => {
                        const percent = stats.expense > 0 ? (cat.value / stats.expense) * 100 : 0;
                        const isActive = activeIndex === idx;

                        return (
                        <div 
                            key={cat.name} 
                            className={`relative flex items-center justify-between p-2 rounded-xl transition-all duration-200 group cursor-default ${isActive ? 'bg-slate-50 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(-1)}
                        >
                            {/* Background Progress Bar (Subtle) */}
                            <div 
                                className="absolute left-0 top-0 bottom-0 bg-slate-100 dark:bg-slate-700/30 rounded-xl transition-all duration-500 -z-10"
                                style={{ width: `${percent}%`, opacity: 0.5 }}
                            />

                            <div className="flex items-center gap-3 z-10">
                                <div className={`w-3 h-3 rounded-full transition-transform duration-200 ${isActive ? 'scale-125' : ''}`} style={{ backgroundColor: cat.color }}></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[100px]">{cat.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{percent.toFixed(1)}%</span>
                                </div>
                            </div>
                            
                            <div className="z-10 flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    {isPrivacyMode ? '****' : `R$ ${cat.value.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                        );
                    })}
                </div>
                </div>

                {/* Budget (Compact) */}
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Orçamento Mensal</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {categoryData
                            .filter(cat => cat.limit > 0)
                            .map(cat => {
                                const percent = Math.min((cat.value / cat.limit) * 100, 100);
                                let statusColor = "bg-emerald-500";
                                if (percent > 75) statusColor = "bg-amber-500";
                                if (percent >= 100) statusColor = "bg-rose-500";

                                return (
                                    <div key={cat.name} className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                {percent >= 100 && <AlertTriangle size={12} className="text-rose-500" />}
                                                {cat.name}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                <span className={percent >= 100 ? "text-rose-500 font-bold" : ""}>
                                                    {isPrivacyMode ? '****' : `R$ ${cat.value.toFixed(0)}`}
                                                </span> 
                                                <span className="mx-1">/</span>
                                                {cat.limit.toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${statusColor} transition-all duration-500`} 
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                        {percent >= 100 && (
                                            <p className="text-[10px] text-rose-500 font-medium">Limite excedido!</p>
                                        )}
                                    </div>
                                );
                            })
                        }
                        {categoryData.filter(cat => cat.limit > 0).length === 0 && (
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                <CheckCircle2 size={24} className="text-slate-200 dark:text-slate-700 mb-2" />
                                <p className="text-xs text-slate-300 dark:text-slate-600">Sem limites definidos.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;