import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Receipt, PieChart, Plus, UserCircle, LogOut, Sun, Moon, Settings, Tag, Eye, EyeOff, Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import UploadModal from './components/UploadModal';
import UserProfileModal from './components/UserProfileModal';
import CategoryManagerModal from './components/CategoryManagerModal'; 
import AIReport from './components/AIReport';
import SplashScreen from './components/SplashScreen';
import AuthScreen from './components/AuthScreen';
import { Transaction, UserProfile, Category, ChatMessage } from './types';
import { NAV_ITEMS, APP_NAME, DEFAULT_CATEGORIES } from './constants';
import { Chat } from "@google/genai";
import { supabase } from './supabase';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Data State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // UX State
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [greetingEmoji, setGreetingEmoji] = useState('👋');

  // Chat State
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      { id: 'welcome', role: 'model', text: `Olá! Sou o Fin, seu analista pessoal. 🤖\n\nPosso ver:\n• Imagens (Prints, Produtos)\n• PDFs e Docs (Faturas, Contratos)\n• Excel/CSV (Planilhas)\n• Áudios (Notas de voz)\n\nTambém posso gerenciar suas transações! Tente: "Adicione um gasto de R$ 50" ou "Mude o valor do almoço para 30".` }
  ]);

  // 1. INICIALIZAÇÃO E AUTH
  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchData(session.user.id);
      } else {
          setLoading(false);
      }
    });

    // Escutar mudanças de auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // Se acabou de logar e o loading estava false, ativa rapidinho para transição suave
        if (!loading) setLoading(true);
        fetchData(session.user.id);
      } else {
        setTransactions([]);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Theme check
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    }

    return () => subscription.unsubscribe();
  }, []);

  // 2. BUSCAR DADOS DO BANCO
  const fetchData = async (userId: string) => {
    try {
      // REMOVIDO: setLoading(true) -> Isso evitava o splash screen a cada save

      // Buscar Perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setUserProfile({
           name: profile.name,
           monthlySalary: profile.monthly_salary,
           financialGoals: profile.financial_goals,
           bio: profile.bio,
           avatar: profile.avatar_url,
           creditCardClosingDay: profile.credit_card_closing_day,
           creditCardDueDay: profile.credit_card_due_day
        });
      }

      // Buscar Categorias
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);
      
      if (cats && cats.length > 0) {
        setCategories(cats.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            budgetLimit: c.budget_limit
        })));
      } else {
        await initializeDefaultCategories(userId);
      }

      // Buscar Transações
      const { data: trans } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (trans) {
        setTransactions(trans.map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: t.date,
            category: t.category,
            paymentMethod: t.payment_method,
            installments: t.installments_total ? {
                current: t.installments_current,
                total: t.installments_total
            } : undefined
        })));
      }

    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      // Mantém o delay apenas se estivermos na tela de loading inicial
      // Se já estivermos navegando (loading=false), o setTimeout não atrapalha visualmente
      setTimeout(() => setLoading(false), 1500);
    }
  };

  const initializeDefaultCategories = async (userId: string) => {
    const catsToInsert = DEFAULT_CATEGORIES.map(c => ({
        user_id: userId,
        name: c.name,
        color: c.color,
        budget_limit: c.budgetLimit
    }));
    
    const { data } = await supabase.from('categories').insert(catsToInsert).select();
    if (data) {
        setCategories(data.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            budgetLimit: c.budget_limit
        })));
    }
  };

  // 3. ACTIONS (CRUD)

  const handleSaveTransaction = async (transactionData: Transaction | Transaction[]) => {
    if (!session) return;
    const userId = session.user.id;
    const dataArray = Array.isArray(transactionData) ? transactionData : [transactionData];

    for (const item of dataArray) {
        const dbItem = {
            user_id: userId,
            description: item.description,
            amount: item.amount,
            type: item.type,
            date: item.date,
            category: item.category,
            payment_method: item.paymentMethod,
            installments_current: item.installments?.current,
            installments_total: item.installments?.total
        };

        if (editingTransaction && item.id === editingTransaction.id) {
             await supabase
                .from('transactions')
                .update(dbItem)
                .eq('id', item.id);
        } else {
            await supabase.from('transactions').insert(dbItem);
        }
    }
    fetchData(userId);
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
      const dbUpdates: any = {};
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.amount) dbUpdates.amount = updates.amount;
      if (updates.category) dbUpdates.category = updates.category;
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.type) dbUpdates.type = updates.type;
      
      await supabase.from('transactions').update(dbUpdates).eq('id', id);
      fetchData(session.user.id);
  };

  const handleDeleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    // Atualiza localmente para ser instantâneo, sem precisar chamar o fetchData e arriscar loading
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveCategories = async (newCategories: Category[]) => {
      if (!session) return;
      // Para MVP, assumimos que o modal gerencia a lógica complexa ou apenas atualizamos local
      // Idealmente, sincronizar diffs com o banco.
      setCategories(newCategories);
  };

  const handleSaveProfile = async (profile: UserProfile) => {
    if (!session) return;
    
    const dbProfile = {
        name: profile.name,
        monthly_salary: profile.monthlySalary,
        financial_goals: profile.financialGoals,
        bio: profile.bio,
        avatar_url: profile.avatar,
        credit_card_closing_day: profile.creditCardClosingDay,
        credit_card_due_day: profile.creditCardDueDay
    };

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, ...dbProfile });

    if (!error) setUserProfile(profile);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setChatInstance(null);
  };

  // Utils
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('Bom dia');
      else if (hour >= 12 && hour < 18) setGreeting('Boa tarde');
      else setGreeting('Boa noite');

      const emojis = ['👋', '✌️', '✨', '🚀', '🌟', '😁', '🤙', '😎', '🤠', '⚡'];
      setGreetingEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // RENDER
  if (loading) return <SplashScreen />;

  if (!session) return <AuthScreen onLogin={() => {}} />;

  const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedDate = currentDate.charAt(0).toUpperCase() + currentDate.slice(1);
  const userName = userProfile?.name || 'Usuário';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans transition-colors duration-300 animate-in fade-in duration-700">
      
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col fixed h-full z-10 transition-colors">
        <div className="p-6">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-500 mb-8">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PieChart size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{APP_NAME}</h1>
          </div>
          
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 px-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">Configurações</p>
            <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-all"
            >
                <Tag size={18} />
                Categorias
            </button>
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all mt-1"
            >
                <LogOut size={18} />
                Sair
            </button>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
          <button onClick={toggleTheme} className="flex items-center gap-3 w-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors">
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             <span className="text-sm font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 w-full text-left group cursor-pointer">
            <div className="relative">
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800"/>
              ) : (
                <UserCircle size={40} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
              )}
              {!userProfile && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {userName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                 {userProfile ? `R$ ${userProfile.monthlySalary.toLocaleString('pt-BR')}` : 'Configurar Perfil'}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto min-h-screen pb-24 md:pb-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-start">
            <div>
                {activeTab === 'dashboard' ? (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wide">
                    {formattedDate}
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {greeting}, {userName.split(' ')[0]}! <span className="inline-block hover:animate-spin origin-bottom-right cursor-default transition-transform hover:scale-110">{greetingEmoji}</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aqui está o resumo das suas finanças hoje.</p>
                </div>
                ) : (
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                    {activeTab === 'transactions' && 'Transações'}
                    {activeTab === 'reports' && 'Relatórios Inteligentes'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1">
                      {activeTab === 'reports' ? 'Insights gerados por IA baseados no seu histórico.' : 'Gerencie seus dados detalhadamente.'}
                    </p>
                </div>
                )}
            </div>
            <div className="flex gap-2">
                 <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="p-2 md:p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg md:rounded-xl shadow-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title={isPrivacyMode ? "Mostrar valores" : "Ocultar valores"}>
                    {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <button onClick={toggleTheme} className="md:hidden p-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={() => setIsCategoryModalOpen(true)} className="md:hidden p-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <Tag size={20} />
                </button>
                <button onClick={() => setIsProfileModalOpen(true)} className="md:hidden p-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm relative overflow-hidden">
                    {userProfile?.avatar ? <img src={userProfile.avatar} alt="Profile" className="w-5 h-5 rounded-full object-cover"/> : <UserCircle size={20} />}
                </button>
            </div>
          </div>
          
          <button 
            onClick={() => { setEditingTransaction(null); setIsUploadModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 md:py-3 rounded-xl font-medium shadow-lg shadow-blue-200/50 dark:shadow-none transition-all active:scale-95 w-full md:w-auto"
          >
            <Plus size={20} strokeWidth={2.5} />
            Nova Transação
          </button>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard transactions={transactions} categories={categories} userProfile={userProfile} isPrivacyMode={isPrivacyMode} />
          )}
          {activeTab === 'transactions' && (
            <TransactionList 
              transactions={transactions} 
              categories={categories}
              onEdit={(t) => { setEditingTransaction(t); setIsUploadModalOpen(true); }}
              onDelete={handleDeleteTransaction} 
              isPrivacyMode={isPrivacyMode}
            />
          )}
           {activeTab === 'reports' && (
             <AIReport 
                transactions={transactions} 
                userProfile={userProfile}
                onOpenProfile={() => setIsProfileModalOpen(true)}
                onAddTransaction={handleSaveTransaction}
                onDeleteTransaction={handleDeleteTransaction} 
                onEditTransaction={handleUpdateTransaction}
                messages={chatMessages}
                setMessages={setChatMessages}
                chatInstance={chatInstance}
                setChatInstance={setChatInstance}
             />
          )}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors">
        {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${activeTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
            </button>
        ))}
      </nav>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => { setIsUploadModalOpen(false); setEditingTransaction(null); }}
        onSave={handleSaveTransaction}
        transactionToEdit={editingTransaction}
        categories={categories}
      />
      
      <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
        onLogout={handleLogout}
        currentProfile={userProfile}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onSave={handleSaveCategories}
      />
    </div>
  );
};

export default App;