import { LucideIcon, LayoutDashboard, Receipt, PieChart, Settings, LogOut } from 'lucide-react';
import { Transaction, Category } from './types';

export const APP_NAME = "FinTrack AI";

// Used for initialization only now
export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Alimentação', color: '#f87171', budgetLimit: 800 },
  { id: '2', name: 'Transporte', color: '#60a5fa', budgetLimit: 400 },
  { id: '3', name: 'Compras', color: '#c084fc', budgetLimit: 500 },
  { id: '4', name: 'Contas', color: '#fbbf24', budgetLimit: 1200 },
  { id: '5', name: 'Salário', color: '#34d399' },
  { id: '6', name: 'Saúde', color: '#2dd4bf', budgetLimit: 300 },
  { id: '7', name: 'Lazer', color: '#f472b6', budgetLimit: 400 },
  { id: '8', name: 'Outros', color: '#94a3b8', budgetLimit: 200 }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2023-10-25',
    description: 'Salário Mensal',
    amount: 5200.00,
    type: 'INCOME',
    category: 'Salário',
    paymentMethod: 'PIX'
  },
  {
    id: '2',
    date: '2023-10-26',
    description: 'Supermercado Silva',
    amount: 142.50,
    type: 'EXPENSE',
    category: 'Alimentação',
    paymentMethod: 'DEBIT_CARD'
  },
  {
    id: '3',
    date: '2023-10-27',
    description: 'Uber Viagem',
    amount: 24.90,
    type: 'EXPENSE',
    category: 'Transporte',
    paymentMethod: 'CREDIT_CARD'
  },
  {
    id: '4',
    date: '2023-10-28',
    description: 'Smart TV 4K',
    amount: 250.00,
    type: 'EXPENSE',
    category: 'Compras',
    paymentMethod: 'CREDIT_CARD',
    installments: {
      current: 1,
      total: 10
    }
  },
  {
    id: '5',
    date: '2023-10-29',
    description: 'Conta de Luz',
    amount: 120.00,
    type: 'EXPENSE',
    category: 'Contas',
    paymentMethod: 'PIX'
  }
];

export interface NavItem {
  label: string;
  icon: LucideIcon;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Painel', icon: LayoutDashboard, id: 'dashboard' },
  { label: 'Transações', icon: Receipt, id: 'transactions' },
  { label: 'Relatórios', icon: PieChart, id: 'reports' },
];