"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getUserName, getUserBadgeColor } from "../../lib/couple";
import styles from "./page.module.css";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
  due_date?: string | null;
  paid_at?: string | null;
  user_id?: string;
  created_by?: string | null;
  paid_by?: string | null;
  categories: {
    name: string;
    icon?: string;
    color: string;
  };
  is_installment?: boolean;
  installment_current?: number;
  installment_total?: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name, icon, color)')
      .eq('is_paid', true)
      .order('paid_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
    window.addEventListener("transaction_added", fetchTransactions);
    return () => window.removeEventListener("transaction_added", fetchTransactions);
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando movimientos...</div>;
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Link href="/">
          <button className={styles.backBtn}>
            <ChevronLeft size={24} />
          </button>
        </Link>
        <h1 className={styles.title}>Todos los Movimientos</h1>
      </header>

      {transactions.length === 0 ? (
        <div className={styles.emptyState}>No tienes movimientos registrados.</div>
      ) : (
        <ul className={styles.transactionList}>
          {transactions.map((t) => (
            <li key={t.id} className={styles.transactionItem}>
              <div className={styles.transactionLeft}>
                <div className={styles.iconCircle} style={{ background: t.type === 'income' ? 'rgba(121, 163, 135, 0.2)' : 'rgba(226, 123, 123, 0.2)', color: t.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {t.categories?.icon || t.categories?.name?.charAt(0).toUpperCase() || '✨'}
                </div>
                <div>
                  <p className={styles.transactionCategory}>
                    {t.categories?.name || 'General'}
                    {t.is_installment && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', background: 'var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>(Cuota {t.installment_current}/{t.installment_total})</span>}
                  </p>
                  <p className={styles.transactionDate}>
                    ✓ Pagado {new Date(t.paid_at || t.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {t.paid_by && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        marginLeft: '0.3rem',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        backgroundColor: getUserBadgeColor(t.paid_by).bg,
                        color: getUserBadgeColor(t.paid_by).text
                      }}>
                        ✓ Pagó {getUserName(t.paid_by)}
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      marginLeft: '0.4rem',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      backgroundColor: getUserBadgeColor(t.created_by || t.user_id).bg,
                      color: getUserBadgeColor(t.created_by || t.user_id).text
                    }}>
                      👤 {getUserName(t.created_by || t.user_id)}
                    </span>
                  </p>
                </div>
              </div>
              <div className={styles.transactionAmount} style={{ color: t.type === 'income' ? 'var(--success-color)' : 'var(--text-color)' }}>
                {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('es-CO')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
