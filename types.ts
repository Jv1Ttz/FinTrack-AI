export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'PIX' | 'OTHER';

export interface Category {
  id: string;
  name: string;
  color: string;
  budgetLimit?: number; // New field for budgeting
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  installments?: {
    current: number;
    total: number;
  };
}

export interface UserProfile {
  name: string;
  monthlySalary: number;
  financialGoals: string;
  bio: string;
  avatar: string | null; // Base64 string for the image
  creditCardClosingDay?: number;
  creditCardDueDay?: number;
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

export interface MonthlyData {
  name: string;
  income: number;
  expense: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

// Chat Types
export interface Source {
    title: string;
    uri: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    sources?: Source[];
    attachment?: {
        type: 'image' | 'file' | 'audio' | 'doc' | 'sheet';
        name: string;
        url: string; // Object URL for preview/render (for supported types) or placeholder
    };
}