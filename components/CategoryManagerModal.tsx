import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Pencil, Save, Tag, DollarSign } from 'lucide-react';
import { Category } from '../types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (categories: Category[]) => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, categories, onSave }) => {
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatLimit, setNewCatLimit] = useState(''); // New Limit State
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalCategories([...categories]);
      setEditingId(null);
      setIsAdding(false);
      setNewCatName('');
      setNewCatLimit('');
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCatName.trim(),
      color: newCatColor,
      budgetLimit: newCatLimit ? parseFloat(newCatLimit) : undefined
    };

    const updated = [...localCategories, newCategory];
    setLocalCategories(updated);
    onSave(updated); // Sync immediately
    setNewCatName('');
    setNewCatLimit('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza? Transações antigas manterão o nome da categoria, mas perderão a cor associada.')) {
      const updated = localCategories.filter(c => c.id !== id);
      setLocalCategories(updated);
      onSave(updated);
    }
  };

  const handleEditSave = (id: string, newName: string, newColor: string, newLimit?: number) => {
    const updated = localCategories.map(c => 
      c.id === id ? { ...c, name: newName, color: newColor, budgetLimit: newLimit } : c
    );
    setLocalCategories(updated);
    onSave(updated);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 mx-4 max-h-[85vh] flex flex-col">
        
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Tag className="text-blue-600 dark:text-blue-400" size={24} />
            Gerenciar Categorias
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* List */}
            <div className="space-y-3">
                {localCategories.map((cat) => (
                    <CategoryItem 
                        key={cat.id} 
                        category={cat} 
                        isEditing={editingId === cat.id}
                        onEditStart={() => setEditingId(cat.id)}
                        onEditCancel={() => setEditingId(null)}
                        onEditSave={handleEditSave}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Add New Section */}
            {isAdding ? (
                <form onSubmit={handleAddCategory} className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Nova Categoria</h4>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <div className="h-10 w-10 relative flex-shrink-0 overflow-hidden rounded-full border border-slate-300 dark:border-slate-600">
                                <input 
                                    type="color" 
                                    value={newCatColor}
                                    onChange={(e) => setNewCatColor(e.target.value)}
                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                />
                            </div>
                            <input 
                                type="text"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="Nome da categoria"
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <DollarSign size={16} className="text-slate-400" />
                             <input 
                                type="number"
                                value={newCatLimit}
                                onChange={(e) => setNewCatLimit(e.target.value)}
                                placeholder="Limite Mensal (Opcional)"
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <button 
                            type="button" 
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Criar
                        </button>
                    </div>
                </form>
            ) : (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors font-medium text-sm"
                >
                    <Plus size={18} />
                    Adicionar Categoria
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

// Helper Subcomponent for individual items
const CategoryItem: React.FC<{
    category: Category;
    isEditing: boolean;
    onEditStart: () => void;
    onEditCancel: () => void;
    onEditSave: (id: string, name: string, color: string, limit?: number) => void;
    onDelete: (id: string) => void;
}> = ({ category, isEditing, onEditStart, onEditCancel, onEditSave, onDelete }) => {
    const [name, setName] = useState(category.name);
    const [color, setColor] = useState(category.color);
    const [limit, setLimit] = useState(category.budgetLimit?.toString() || '');

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 border border-blue-500 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 relative flex-shrink-0 overflow-hidden rounded-full border border-slate-300 dark:border-slate-600">
                            <input 
                            type="color" 
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer"
                            />
                    </div>
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 pl-11">
                    <span className="text-xs text-slate-400">Limite: R$</span>
                    <input 
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        placeholder="Sem limite"
                        className="w-24 px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex-1 flex justify-end gap-1">
                        <button onClick={() => onEditSave(category.id, name, color, limit ? parseFloat(limit) : undefined)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Save size={16} />
                        </button>
                        <button onClick={onEditCancel} className="p-1.5 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl group hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: category.color }}></div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{category.name}</span>
                    {category.budgetLimit ? (
                         <span className="text-[10px] text-slate-400">Limite: R$ {category.budgetLimit.toFixed(2)}</span>
                    ) : (
                         <span className="text-[10px] text-slate-300 dark:text-slate-600">Sem limite definido</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={onEditStart}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                    <Pencil size={14} />
                </button>
                <button 
                    onClick={() => onDelete(category.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

export default CategoryManagerModal;