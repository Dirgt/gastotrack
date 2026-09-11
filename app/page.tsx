"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import styles from "./page.module.css";
import { UserCircle2, Bell, EyeOff, Plus, Target, History, PieChart } from "lucide-react";

export default function Home() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [userName, setUserName] = useState("Usuario");
  const [topExpenseCategories, setTopExpenseCategories] = useState<{name: string, icon: string, color: string, total: number}[]>([]);
  const [topIncomeCategories, setTopIncomeCategories] = useState<{name: string, icon: string, color: string, total: number}[]>([]);
  const [topMode, setTopMode] = useState<'expense' | 'income'>('expense');
  const [showNotifs, setShowNotifs] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<any[]>([]);

  const fetchTransactions = async () => {
    setLoadingData(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserName(user.email?.split('@')[0] || "Usuario");

    const today = new Date();
    today.setHours(0,0,0,0);

    // Ejecutar todas las peticiones a la base de datos EN PARALELO
    const [alertsResult, contributionsResult, txsResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, amount, description, created_at, categories(name)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('is_paid', false)
        .lt('created_at', today.toISOString()),
      
      supabase
        .from('goal_contributions')
        .select('amount')
        .eq('user_id', user.id),

      supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', user.id)
        .eq('is_paid', true)
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false })
    ]);

    // Asignar los resultados
    if (alertsResult.data) {
      setPendingAlerts(alertsResult.data);
    }

    const totalGoalsContributions = contributionsResult.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const { data, error } = txsResult;

    if (error) {
      console.error(error);
    } else if (data) {
      setTransactions(data);
      
      let allTimeInc = 0;
      let allTimeExp = 0;
      let currentMonthInc = 0;
      let currentMonthExp = 0;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      data.forEach(curr => {
        // Global calculations
        if (curr.type === 'income') allTimeInc += curr.amount;
        else allTimeExp += curr.amount;
        
        // Monthly calculations
        const txDate = new Date(curr.paid_at || curr.created_at);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          if (curr.type === 'income') currentMonthInc += curr.amount;
          else currentMonthExp += curr.amount;
        }
      });
      
      setIncome(currentMonthInc);
      setExpense(currentMonthExp);
      
      // El saldo global real = Todo el ingreso pagado - Todo el gasto pagado - Lo que metiste a metas
      setBalance(allTimeInc - allTimeExp - totalGoalsContributions);

      // Calcular Top Categorías (Mes actual) para Gastos e Ingresos
      const expenseTotals: Record<string, any> = {};
      const incomeTotals: Record<string, any> = {};
      
      data.forEach(t => {
        const txMonth = new Date(t.created_at).getMonth();
        if (txMonth === currentMonth) {
          const catName = t.categories?.name || 'General';
          const catPayload = {
            name: catName,
            icon: t.categories?.icon || '✨',
            color: t.categories?.color || (t.type === 'income' ? 'var(--success-color)' : 'var(--primary-color)'),
            total: 0
          };
          
          if (t.type === 'expense') {
            if (!expenseTotals[catName]) expenseTotals[catName] = { ...catPayload };
            expenseTotals[catName].total += t.amount;
          } else {
            if (!incomeTotals[catName]) incomeTotals[catName] = { ...catPayload };
            incomeTotals[catName].total += t.amount;
          }
        }
      });

      setTopExpenseCategories(Object.values(expenseTotals).sort((a: any, b: any) => b.total - a.total).slice(0, 4));
      setTopIncomeCategories(Object.values(incomeTotals).sort((a: any, b: any) => b.total - a.total).slice(0, 4));
    }
    setLoadingData(false);
  };

  useEffect(() => {
    fetchTransactions();
    
    // Escuchar cuando se agrega un nuevo movimiento desde ClientLayout
    const handleRefresh = () => fetchTransactions();
    window.addEventListener("transaction_added", handleRefresh);
    return () => window.removeEventListener("transaction_added", handleRefresh);
  }, []);

  return (
    <main className={`container ${styles.mainWrapper}`}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <div className={styles.userProfile}>
            <UserCircle2 size={32} />
            <div className={styles.userInfo}>
              <span className={styles.greeting}>Hola,</span>
              <span className={styles.name}>{userName}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn}>
              <EyeOff size={20} />
            </button>
            <div style={{ position: 'relative' }}>
              <button className={styles.iconBtn} onClick={() => setShowNotifs(!showNotifs)}>
                <Bell size={20} />
                {pendingAlerts.length > 0 && <span className={styles.notificationBadge}>{pendingAlerts.length}</span>}
              </button>
              
              {showNotifs && (
                <div className={styles.notificationDropdown}>
                  <h4 className={styles.notifTitle}>Alertas ({pendingAlerts.length})</h4>
                  {pendingAlerts.length === 0 ? (
                    <p className={styles.notifEmpty}>Todo al día 🎉</p>
                  ) : (
                    <ul className={styles.notifList}>
                      {pendingAlerts.map(alert => (
                        <li key={alert.id} className={styles.notifItem}>
                          <span className={styles.notifDotBg}></span>
                          <div>
                            <p className={styles.notifText}>Pago atrasado: <strong>{alert.categories?.name}</strong></p>
                            <p className={styles.notifDate}>Venció el {new Date(alert.created_at).toLocaleDateString('es-CO')}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pendingAlerts.length > 0 && (
                    <Link href="/cuentas" className={styles.notifActionBtn}>
                      Ir a pagar
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.balanceSection}>
          <p className={styles.balanceLabel}>Balance Total</p>
          <div className={styles.balanceRow}>
            <h1 className={styles.balanceValue}>
              <span className={styles.currency}>$</span>
              {balance.toLocaleString('es-CO')}
            </h1>
            <button className={styles.eyeBtn}>
              <EyeOff size={20} color="var(--text-muted)" />
            </button>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button 
            className={styles.actionBtn} 
            onClick={() => window.dispatchEvent(new Event("open_transaction_modal"))}
          >
            <div className={styles.actionIcon}><Plus size={20}/></div>
            <span>Añadir</span>
          </button>
          <Link href="/goals" className={styles.actionBtn}>
            <div className={styles.actionIcon}><Target size={20}/></div>
            <span>Metas</span>
          </Link>
          <Link href="/transactions" className={styles.actionBtn}>
            <div className={styles.actionIcon}><History size={20}/></div>
            <span>Historial</span>
          </Link>
          <Link href="/analytics" className={styles.actionBtn}>
            <div className={styles.actionIcon}><PieChart size={20}/></div>
            <span>Análisis</span>
          </Link>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryTitle}>Ingresos</span>
              <span className={styles.summaryAmountIncome}>${income.toLocaleString('es-CO')}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFillIncome} style={{ width: income === 0 && expense === 0 ? '0%' : `${(income / (income + expense)) * 100}%` }}></div>
            </div>
          </div>
          <div className={styles.summaryDivider}></div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryTitle}>Gastos</span>
              <span className={styles.summaryAmountExpense}>${expense.toLocaleString('es-CO')}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFillExpense} style={{ width: income === 0 && expense === 0 ? '0%' : `${(expense / (income + expense)) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      {(topExpenseCategories.length > 0 || topIncomeCategories.length > 0) && (
        <section className={styles.quickActions}>
          <div className={styles.recentHeader}>
            <h3 className={styles.recentTitle}>Top Categorías</h3>
            <div className={styles.topTabs}>
              <button 
                className={`${styles.topTabBtn} ${topMode === 'expense' ? styles.topTabActive : ''}`}
                onClick={() => setTopMode('expense')}
              >
                Gastos
              </button>
              <button 
                className={`${styles.topTabBtn} ${topMode === 'income' ? styles.topTabActive : ''}`}
                onClick={() => setTopMode('income')}
              >
                Ingresos
              </button>
            </div>
          </div>
          <div className={styles.quickGrid}>
            {(topMode === 'expense' ? topExpenseCategories : topIncomeCategories).length === 0 ? (
              <p className={styles.emptyState}>No hay datos este mes.</p>
            ) : (
              (topMode === 'expense' ? topExpenseCategories : topIncomeCategories).map((cat, i) => (
                <div key={i} className={styles.quickCard} style={{ backgroundColor: cat.color }}>
                  <div className={styles.quickCardTop}>
                    <div className={styles.quickIconBg}>
                      {cat.icon}
                    </div>
                  </div>
                  <div className={styles.quickCardBottom}>
                    <p className={styles.quickCatName}>{cat.name}</p>
                    <p className={styles.quickCatTotal}>${cat.total.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className={styles.recent}>
        <div className={styles.recentHeader}>
          <h3 className={styles.recentTitle}>Movimientos Recientes</h3>
          <Link href="/transactions" className={styles.seeAll}>Ver todos</Link>
        </div>

        <div className={styles.listContainer}>
          {loadingData ? (
            <p className={styles.emptyState}>Cargando...</p>
          ) : transactions.length === 0 ? (
            <p className={styles.emptyState}>No hay movimientos aún. ¡Registra el primero!</p>
          ) : (
            <ul className={styles.transactionList}>
              {transactions.slice(0, 8).map(t => (
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
                      {t.description && <p className={styles.transactionDesc}>{t.description}</p>}
                    </div>
                  </div>
                  <div className={styles.transactionAmount} style={{ color: t.type === 'income' ? 'var(--success-color)' : 'var(--text-color)' }}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('es-CO')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
