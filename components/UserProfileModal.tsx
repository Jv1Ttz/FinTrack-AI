import React, { useState, useEffect, useRef } from 'react';
import { X, Target, Save, Camera, User, CreditCard, Calendar, LogOut, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  onLogout: () => void; // New prop
  currentProfile: UserProfile | null;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onSave, onLogout, currentProfile }) => {
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [goals, setGoals] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Credit Card Settings
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  
  // Logout Confirmation State
  const [confirmLogout, setConfirmLogout] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentProfile) {
      setName(currentProfile.name || '');
      setSalary(currentProfile.monthlySalary.toString());
      setGoals(currentProfile.financialGoals);
      setBio(currentProfile.bio || '');
      setAvatar(currentProfile.avatar || null);
      setClosingDay(currentProfile.creditCardClosingDay?.toString() || '');
      setDueDay(currentProfile.creditCardDueDay?.toString() || '');
    } else if (isOpen && !currentProfile) {
        setName('');
        setSalary('');
        setGoals('');
        setBio('');
        setAvatar(null);
        setClosingDay('');
        setDueDay('');
    }
    // Reset logout confirmation when modal opens
    if (isOpen) {
        setConfirmLogout(false);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name || 'Usuário',
      monthlySalary: parseFloat(salary) || 0,
      financialGoals: goals,
      bio: bio,
      avatar: avatar,
      creditCardClosingDay: closingDay ? parseInt(closingDay) : undefined,
      creditCardDueDay: dueDay ? parseInt(dueDay) : undefined
    });
    onClose();
  };

  const handleLogoutClick = () => {
    if (confirmLogout) {
        // Second click: actually logout
        onLogout();
        onClose();
    } else {
        // First click: ask for confirmation
        setConfirmLogout(true);
        // Reset after 4 seconds if user doesn't confirm
        setTimeout(() => setConfirmLogout(false), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 mx-4 max-h-[90vh] flex flex-col">
        {/* Header - Fixed Top */}
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <User className="text-blue-600 dark:text-blue-400" size={24} />
            Editar Perfil
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 pb-2">
            <form id="profile-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center justify-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center shadow-lg">
                    {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                    <User size={40} className="text-slate-400" />
                    )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                </div>
                </div>
                <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                />
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                Alterar Foto
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Seu Nome
                    </label>
                    <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="Como quer ser chamado?"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Salário Mensal
                    </label>
                    <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        required
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        placeholder="0,00"
                    />
                    </div>
                </div>
            </div>

            {/* Credit Card Configuration Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-white font-medium">
                    <CreditCard size={18} className="text-blue-500" />
                    <h4>Configuração do Cartão</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Dia do Fechamento
                        </label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="number" 
                                min="1" max="31"
                                value={closingDay}
                                onChange={(e) => setClosingDay(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: 25"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Compras após esse dia caem no próximo mês.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Dia do Vencimento
                        </label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="number" 
                                min="1" max="31"
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: 5"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Bio / Sobre Você
                </label>
                <textarea 
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                placeholder="Ex: Estudante, moro sozinho e gosto de tecnologia. Quero investir."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Metas Financeiras
                </label>
                <textarea 
                rows={3}
                required
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                placeholder="Ex: Quero juntar R$ 10.000 para viajar em Dezembro."
                />
            </div>
            </form>
        </div>

        {/* Footer Actions - Fixed Bottom with Safe Area for Mobile */}
        <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button 
                type="submit"
                form="profile-form"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Save size={20} />
                Salvar Perfil
            </button>

            <button 
                type="button" 
                onClick={handleLogoutClick}
                className={`w-full py-3.5 border rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    confirmLogout 
                    ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 animate-pulse'
                    : 'border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20'
                }`}
            >
                {confirmLogout ? (
                    <>
                        <AlertCircle size={18} />
                        Toque novamente para confirmar
                    </>
                ) : (
                    <>
                        <LogOut size={18} />
                        Sair da Conta
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;