"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useUserContext } from "./context/UserContext";
import styles from "./page.module.css";
import { UserCircle2, Bell, EyeOff, Plus, Target, History, PieChart } from "lucide-react";

export default function Home() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const { currentUserProfile, getProfile, loadingProfile } = useUserContext();
  const userName = currentUserProfile?.display_name || "Usuario";
  const [topExpenseCategories, setTopExpenseCategories] = useState<{name: string, icon: string, color: string, total: number}[]>([]);
  const [topIncomeCategories, setTopIncomeCategories] = useState<{name: string, icon: string, color: string, total: number}[]>([]);
  const [topMode, setTopMode] = useState<'expense' | 'income'>('expense');
  const [showNotifs, setShowNotifs] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<any[]>([]);

  const fetchTransactions = async () => {
    setLoadingData(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!user) return;

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const in5Days = new Date(today);
    in5Days.setDate(today.getDate() + 5);
    const in5DaysStr = `${in5Days.getFullYear()}-${String(in5Days.getMonth() + 1).padStart(2, '0')}-${String(in5Days.getDate()).padStart(2, '0')}`;

    // Ejecutar todas las peticiones a la base de datos EN PARALELO (Presupuesto Compartido de Pareja)
    const [alertsResult, contributionsResult, txsResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, amount, description, created_at, due_date, suspension_date, categories(name, parent_id)')
        .eq('type', 'expense')
        .eq('is_paid', false)
        .lte('due_date', in5DaysStr),
      
      supabase
        .from('goal_contributions')
        .select('amount'),

      supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .order('created_at', { ascending: false })
    ]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
    return dateStr;
  };

  const processAlerts = (data: any[], today: Date) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((alert: any) => {
      let level = 'normal';
      let title = '';
      let message = '';
      let color = '';

      const dueDate = new Date(alert.due_date || alert.created_at);
      dueDate.setHours(0,0,0,0);
      
      const hasSuspension = !!alert.suspension_date;
      
      if (hasSuspension) {
         const suspDate = new Date(alert.suspension_date);
         suspDate.setHours(0,0,0,0);
         
         if (today > suspDate) {
           level = 'critical';
           title = '¡Servicio Suspendido!';
           message = 'Pasó la fecha de corte.';
           color = '#ef4444'; // red
         } else if (today > dueDate) {
           level = 'danger';
           title = '¡Riesgo de Suspensión!';
           message = `Paga antes del ${formatDate(alert.suspension_date)}.`;
           color = '#f97316'; // orange
         } else {
           level = 'warning';
           title = 'Próximo a Vencer';
           const diffTime = dueDate.getTime() - today.getTime();
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           message = `Vence en ${diffDays} día(s).`;
           color = '#eab308'; // yellow
         }
      } else {
         if (today > dueDate) {
           level = 'normal';
           title = 'Pago Atrasado';
           message = `Venció el ${formatDate(alert.due_date || alert.created_at)}`;
           color = '#ef4444';
         } else {
           level = 'warning';
           title = 'Próximo a Vencer';
           const diffTime = dueDate.getTime() - today.getTime();
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           message = `Vence en ${diffDays} día(s).`;
           color = '#eab308';
         }
      }

      return { ...alert, ui: { level, title, message, color } };
    }).sort((a, b) => {
      // Sort critical/danger first
      const valA = a.ui.level === 'critical' ? 4 : a.ui.level === 'danger' ? 3 : a.ui.level === 'normal' ? 2 : 1;
      const valB = b.ui.level === 'critical' ? 4 : b.ui.level === 'danger' ? 3 : b.ui.level === 'normal' ? 2 : 1;
      return valB - valA;
    });
  };

    // Asignar los resultados
    if (alertsResult.data) {
      setPendingAlerts(processAlerts(alertsResult.data, today));
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
        // Global calculations (only paid)
        if (curr.is_paid) {
          if (curr.type === 'income') allTimeInc += curr.amount;
          else allTimeExp += curr.amount;
          
          // Monthly calculations (only paid)
          const txDate = new Date(curr.paid_at || curr.created_at);
          if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (curr.type === 'income') currentMonthInc += curr.amount;
            else currentMonthExp += curr.amount;
          }
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
        if (txMonth === currentMonth && t.is_paid) {
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
    // eslint-disable-next-line
    fetchTransactions();
    
    // Escuchar cuando se agrega un nuevo movimiento desde ClientLayout
    const handleRefresh = () => fetchTransactions();
    window.addEventListener("transaction_added", handleRefresh);
    return () => window.removeEventListener("transaction_added", handleRefresh);
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
    return dateStr;
  };

  const recentMovements = useMemo(() => {
    return transactions
      .filter(t => t.is_paid) // Solo movimientos reales (pagados o ingresos efectivos)
      .sort((a, b) => {
        const timeA = new Date(a.paid_at || a.created_at).getTime();
        const timeB = new Date(b.paid_at || b.created_at).getTime();
        return timeB - timeA;
      })
      .slice(0, 8);
  }, [transactions]);

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
                        <li key={alert.id} className={styles.notifItem} style={{ borderLeft: `4px solid ${alert.ui?.color || '#ef4444'}`, paddingLeft: '0.8rem' }}>
                          <div>
                            <p className={styles.notifText} style={{ color: alert.ui?.color || '#ef4444' }}>
                              {alert.ui?.title}: <strong>{alert.categories?.name}</strong>
                            </p>
                            <p className={styles.notifDate}>{alert.ui?.message}</p>
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
          ) : recentMovements.length === 0 ? (
            <p className={styles.emptyState}>No hay movimientos reales aún. ¡Registra o paga el primero!</p>
          ) : (
            <ul className={styles.transactionList}>
              {recentMovements.map(t => (
                <li key={t.id} className={styles.transactionItem}>
                  <div className={styles.transactionLeft}>
                    <div className={styles.iconCircle} style={{ background: t.type === 'income' ? 'rgba(121, 163, 135, 0.2)' : 'rgba(226, 123, 123, 0.2)', color: t.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {t.categories?.icon || t.categories?.name?.charAt(0).toUpperCase() || '✨'}
                    </div>
                    <div>
                      <p className={styles.transactionCategory}>
                        {t.categories?.name || 'General'}
                        {t.is_installment && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', background: 'var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>(Cuota {t.installment_current}/{t.installment_total})</span>}
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 600, 
                          marginLeft: '0.4rem', 
                          padding: '0.1rem 0.35rem', 
                          borderRadius: '4px', 
                          backgroundColor: getProfile(t.paid_by || t.created_by || t.user_id)?.color_bg || 'rgba(107, 114, 128, 0.15)', 
                          color: getProfile(t.paid_by || t.created_by || t.user_id)?.color_text || 'var(--text-muted)'
                        }}>
                          👤 {getProfile(t.paid_by || t.created_by || t.user_id)?.display_name || 'Usuario'}
                        </span>
                      </p>
                      {t.description && <p className={styles.transactionDesc}>{t.description}</p>}
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t.type === 'income' 
                          ? `📅 Recibido ${formatDate(t.paid_at || t.created_at)}` 
                          : `✓ Pagado ${formatDate(t.paid_at || t.created_at)}`}
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
        </div>
      </section>
    </main>
  );
}
