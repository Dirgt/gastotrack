"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useUserContext } from "../context/UserContext";
import styles from "./page.module.css";
import { ChevronLeft, ChevronRight, Check, ImageIcon, Edit2, Copy, Loader2 } from "lucide-react";
import PayConfirmModal from "../components/PayConfirmModal";
import UndoConfirmModal from "../components/UndoConfirmModal";
import EditTransactionModal from "../components/EditTransactionModal";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  created_at: string;
  due_date?: string | null;
  suspension_date?: string | null;
  is_paid: boolean;
  paid_at: string | null;
  receipt_url: string | null;
  category_id?: string;
  user_id?: string;
  created_by?: string | null;
  updated_by?: string | null;
  paid_by?: string | null;
  categories: {
    name: string;
    icon: string;
    parent?: {
      name: string;
      icon: string;
    };
  } | null;
  is_installment?: boolean;
  installment_current?: number;
  installment_total?: number;
}

export default function CuentasPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { getProfile } = useUserContext();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [payModalTx, setPayModalTx] = useState<Transaction | null>(null);
  const [undoModalTx, setUndoModalTx] = useState<Transaction | null>(null);
  const [editModalTx, setEditModalTx] = useState<Transaction | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [importingLastMonth, setImportingLastMonth] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'incomes'>('pending');
  const fetchIdRef = useRef(0);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  const goMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  };

  const fetchTransactions = async () => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, type, description, created_at, due_date, suspension_date, is_paid, paid_at, receipt_url, is_installment, installment_current, installment_total, user_id, created_by, updated_by, paid_by, categories(name, icon, parent:parent_id(name, icon))')
      .gte('due_date', startStr)
      .lte('due_date', endStr)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true });

    // Si hubo otra petición después de esta, ignoramos los datos
    if (fetchIdRef.current !== currentFetchId) {
      return;
    }

    if (error) {
      console.error(error);
      setAlertMessage(`Error cargando cuentas: ${error.message || JSON.stringify(error)}`);
    } else if (data) {
      setTransactions(data as unknown as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentMonth]);

  // Listen for new transactions
  useEffect(() => {
    const handler = () => fetchTransactions();
    window.addEventListener("transaction_added", handler);
    return () => window.removeEventListener("transaction_added", handler);
  }, [currentMonth]);

  // Confirm payment with optional receipt and custom payment date
  const handleConfirmPay = async (txId: string, receiptUrl: string | null, customPaidDate?: string) => {
    setUpdatingId(txId);
    const { data: { user } } = await supabase.auth.getUser();
    const paidAtStr = customPaidDate ? new Date(`${customPaidDate}T12:00:00`).toISOString() : new Date().toISOString();
    const updateData: any = { 
      is_paid: true, 
      paid_at: paidAtStr,
      paid_by: user?.id || null
    };
    if (receiptUrl) updateData.receipt_url = receiptUrl;

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', txId);

    if (!error) {
      setTransactions(prev => prev.map(t => 
        t.id === txId ? { ...t, ...updateData, receipt_url: receiptUrl || t.receipt_url } : t
      ));
    }
    setPayModalTx(null);
    setUpdatingId(null);
  };

  // Undo paid (back to pending)
  const undoPaid = async (txId: string) => {
    setUpdatingId(txId);
    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: false, paid_at: null, paid_by: null })
      .eq('id', txId);

    if (!error) {
      setTransactions(prev => prev.map(t => 
        t.id === txId ? { ...t, is_paid: false, paid_at: null, paid_by: null } : t
      ));
    }
    setUndoModalTx(null);
    setUpdatingId(null);
  };

  const handleEditSave = (txId: string, newAmount: number, newDescription: string, newCategoryId?: string, newDueDate?: string) => {
    // Si cambió la categoría o la fecha de vencimiento (que podría moverlo a otro mes), recargamos
    if (newCategoryId || newDueDate) {
      fetchTransactions();
    } else {
      setTransactions(prev => prev.map(t => 
        t.id === txId ? { ...t, amount: newAmount, description: newDescription } : t
      ));
    }
    setEditModalTx(null);
  };

  const handleEditDelete = (txId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
    setEditModalTx(null);
  };

  const handleImportLastMonth = () => {
    setShowImportConfirm(true);
  };

  const executeImportLastMonth = async () => {
    setShowImportConfirm(false);
    setImportingLastMonth(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    const prevStartStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const prevEndStr = `${endOfPrevMonth.getFullYear()}-${String(endOfPrevMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfPrevMonth.getDate()).padStart(2, '0')}`;

    // Buscar gastos del mes anterior por due_date
    const { data: oldTxs, error: fetchErr } = await supabase
      .from('transactions')
      .select('amount, type, description, category_id, is_installment, due_date')
      .eq('type', 'expense')
      .gte('due_date', prevStartStr)
      .lte('due_date', prevEndStr);

    if (fetchErr || !oldTxs || oldTxs.length === 0) {
      setAlertMessage("No se encontraron gastos en el mes anterior.");
      setImportingLastMonth(false);
      return;
    }

    // Filtrar las cuotas (installments) porque esas ya se proyectaron a futuro,
    // solo traemos los gastos fijos o manuales normales.
    const validTxs = oldTxs.filter(t => t.is_installment !== true);

    if (validTxs.length === 0) {
      setAlertMessage("No hay gastos regulares que importar (las cuotas se autogestionan).");
      setImportingLastMonth(false);
      return;
    }

    // Prevenir duplicados comparando con las transacciones actuales
    const existingThisMonth = transactions.filter(t => !t.is_installment);
    
    const uniqueTxsToImport = validTxs.filter(oldTx => {
      const isDuplicate = existingThisMonth.some(currentTx => 
        currentTx.category_id === oldTx.category_id &&
        currentTx.amount === oldTx.amount
      );
      return !isDuplicate;
    });

    if (uniqueTxsToImport.length === 0) {
      setAlertMessage("Todos los gastos fijos del mes anterior ya están registrados en este mes.");
      setImportingLastMonth(false);
      return;
    }

    // Insertarlos en el mes actual como pendientes, conservando el día de vencimiento pactado
    const nowIso = new Date().toISOString();
    const newTxs = uniqueTxsToImport.map(t => {
      let day = 5;
      if (t.due_date) {
        const parts = t.due_date.split('-');
        if (parts.length === 3) {
          day = parseInt(parts[2], 10) || 5;
        }
      }
      const targetDueDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      return {
        amount: t.amount,
        type: t.type,
        description: t.description,
        category_id: t.category_id,
        user_id: user.id,
        created_by: user.id,
        created_at: nowIso,
        due_date: targetDueDate,
        is_paid: false,
        paid_at: null,
        paid_by: null,
        receipt_url: null
      };
    });

    const { error: insertErr } = await supabase
      .from('transactions')
      .insert(newTxs);

    if (!insertErr) {
      fetchTransactions(); // Recargar
    } else {
      alert("Error clonando gastos");
    }
    setImportingLastMonth(false);
  };

  // Computed values
  const incomes = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions]);
  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);
  
  const totalIncome = useMemo(() => incomes.reduce((sum, t) => sum + t.amount, 0), [incomes]);
  const totalExpense = useMemo(() => expenses.reduce((sum, t) => sum + t.amount, 0), [expenses]);
  const balance = totalIncome - totalExpense;
  
  const pendingExpenses = useMemo(() => 
    expenses
      .filter(t => !t.is_paid)
      .sort((a, b) => new Date(a.due_date || a.created_at).getTime() - new Date(b.due_date || b.created_at).getTime()), 
    [expenses]
  );
  
  const paidExpenses = useMemo(() => 
    expenses
      .filter(t => t.is_paid)
      .sort((a, b) => {
        const timeA = new Date(a.paid_at || a.created_at).getTime();
        const timeB = new Date(b.paid_at || b.created_at).getTime();
        return timeB - timeA;
      }), 
    [expenses]
  );

  const groupByCategory = (txs: Transaction[]) => {
    return txs.reduce((acc, tx) => {
      // Use parent category if it exists, otherwise use the category itself
      const catName = tx.categories?.parent?.name || tx.categories?.name || 'Otros';
      const catIcon = tx.categories?.parent?.icon || tx.categories?.icon || '🏷️';
      
      const key = `${catIcon} ${catName}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  };

  const pendingGrouped = useMemo(() => groupByCategory(pendingExpenses), [pendingExpenses]);
  const paidGrouped = useMemo(() => groupByCategory(paidExpenses), [paidExpenses]);

  const totalPaid = useMemo(() => paidExpenses.reduce((sum, t) => sum + t.amount, 0), [paidExpenses]);
  const totalPending = useMemo(() => pendingExpenses.reduce((sum, t) => sum + t.amount, 0), [pendingExpenses]);
  const paidPercent = totalExpense > 0 ? Math.round((totalPaid / totalExpense) * 100) : 0;

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

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </Link>
          <span className={styles.title}>Cuentas</span>
          <div style={{ width: 40 }}></div>
        </div>
      </header>

      {/* Month Selector */}
      <div className={styles.monthSelector}>
        <button className={styles.monthBtn} onClick={() => goMonth(-1)}>
          <ChevronLeft size={20} />
        </button>
        <span className={styles.monthText}>{monthLabel}</span>
        <button className={styles.monthBtn} onClick={() => goMonth(1)}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.summaryCardIncome}`}>
          <p className={styles.summaryLabel}>Ingresos</p>
          <p className={`${styles.summaryValue} ${styles.summaryValuePositive}`}>
            ${totalIncome.toLocaleString('es-CO')}
          </p>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardBalance}`}>
          <p className={styles.summaryLabel}>Saldo</p>
          <p className={`${styles.summaryValue} ${balance >= 0 ? styles.summaryValuePositive : styles.summaryValueNegative}`}>
            {balance < 0 ? '-' : ''}${Math.abs(balance).toLocaleString('es-CO')}
          </p>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardExpense}`}>
          <p className={styles.summaryLabel}>Gastos</p>
          <p className={`${styles.summaryValue} ${styles.summaryValueNegative}`}>
            ${totalExpense.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando cuentas...</p>
      ) : transactions.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyText}>No hay movimientos en este mes</p>
          <p className={styles.emptySubtext}>Puedes importar los gastos del mes pasado para no escribirlos de nuevo.</p>
          
          <button 
            onClick={handleImportLastMonth}
            disabled={importingLastMonth}
            className={styles.importBtn}
          >
            {importingLastMonth ? <Loader2 size={18} className={styles.spinner} /> : <Copy size={18} />}
            {importingLastMonth ? "Importando..." : "Traer gastos mes anterior"}
          </button>
        </div>
      ) : (
        <>
          {/* Progress Card */}
          {expenses.length > 0 && (
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span className={styles.progressTitle}>Progreso de Pagos</span>
                <span className={styles.progressPercent}>{paidPercent}%</span>
              </div>
              <div className={styles.progressBarBg}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className={styles.progressStats}>
                <div className={styles.progressStat}>
                  <span className={styles.progressStatLabel}>Pagado</span>
                  <span className={`${styles.progressStatValue} ${styles.paid}`}>
                    ${totalPaid.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className={styles.progressStat}>
                  <span className={styles.progressStatLabel}>Falta</span>
                  <span className={`${styles.progressStatValue} ${styles.pending}`}>
                    ${totalPending.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className={styles.progressStat}>
                  <span className={styles.progressStatLabel}>{balance >= 0 ? 'Sobra' : 'Faltante'}</span>
                  <span className={`${styles.progressStatValue} ${balance >= 0 ? styles.paid : styles.pending}`}>
                    {balance < 0 ? '-' : ''}${Math.abs(balance).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tabs Control */}
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pendientes
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'paid' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('paid')}
            >
              Pagados
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'incomes' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('incomes')}
            >
              Ingresos
            </button>
          </div>

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div className={styles.tabContent}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button 
                  onClick={handleImportLastMonth}
                  disabled={importingLastMonth}
                  className={styles.importBtn}
                  style={{ marginTop: 0, padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--surface-color)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
                >
                  {importingLastMonth ? <Loader2 size={14} className={styles.spinner} /> : <Copy size={14} />}
                  {importingLastMonth ? "Importando..." : "Importar gastos fijos"}
                </button>
              </div>

              {pendingExpenses.length === 0 ? (
                <div className={styles.emptyState}>No tienes pagos pendientes. ¡Todo al día! 🎉</div>
              ) : (
                <>
                  {/* Pending Expenses */}
                  {Object.entries(pendingGrouped).map(([categoryName, txs]) => (
                    <div key={categoryName} className={styles.categoryGroup}>
                      <h4 className={styles.categoryHeader}>{categoryName}</h4>
                      {txs.map(tx => (
                        <div key={tx.id} className={styles.transactionItem}>
                          <button 
                            className={styles.checkbox}
                            onClick={() => setPayModalTx(tx)}
                            disabled={updatingId === tx.id}
                          >
                            {updatingId === tx.id && <Loader2 size={16} className={styles.spinner} />}
                          </button>
                          <div className={styles.txInfo}>
                            <div className={styles.txName}>
                              {tx.categories?.parent && (
                                <span className={styles.parentCategoryBadge}>{tx.categories.parent.name} &gt; </span>
                              )}
                              {tx.categories?.name || tx.description || 'Gasto'}
                              {tx.is_installment && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', background: 'var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>(Cuota {tx.installment_current}/{tx.installment_total})</span>}
                            </div>
                            {tx.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.description}</div>}
                            <div className={styles.txDate}>
                              <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                                📅 Vence: {formatDate(tx.due_date || tx.created_at)}
                              </span>
                              {tx.suspension_date && (
                                <span style={{ fontWeight: 700, color: '#ef4444', marginLeft: '0.4rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.4rem' }}>
                                  ✂️ Corte: {formatDate(tx.suspension_date)}
                                </span>
                              )}
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem', borderLeft: tx.suspension_date ? 'none' : '1px solid var(--border-color)', paddingLeft: tx.suspension_date ? '0' : '0.4rem' }}>
                                · Creado {formatDate(tx.created_at)}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                marginLeft: '0.4rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                backgroundColor: getProfile(tx.created_by || tx.user_id)?.color_bg || 'rgba(107, 114, 128, 0.15)',
                                color: getProfile(tx.created_by || tx.user_id)?.color_text || 'var(--text-muted)'
                              }}>
                                👤 {getProfile(tx.created_by || tx.user_id)?.display_name || 'Usuario'}
                              </span>
                              {tx.updated_by && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                                  (editado por {getProfile(tx.updated_by)?.display_name || 'Usuario'})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`${styles.txAmount} ${styles.txAmountExpense}`}>
                            ${tx.amount.toLocaleString('es-CO')}
                          </span>
                          <button className={styles.editBtn} onClick={() => setEditModalTx(tx)}>
                            <Edit2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Paid Tab */}
          {activeTab === 'paid' && (
            <div className={styles.tabContent}>
              {paidExpenses.length === 0 ? (
                <div className={styles.emptyState}>No tienes pagos realizados aún.</div>
              ) : (
                <>
                  {/* Paid Expenses */}
                  {Object.entries(paidGrouped).map(([categoryName, txs]) => (
                    <div key={categoryName} className={styles.categoryGroup}>
                      <h4 className={styles.categoryHeader}>{categoryName}</h4>
                      {txs.map(tx => (
                        <div key={tx.id} className={`${styles.transactionItem} ${styles.transactionItemPaid}`}>
                          <button 
                            className={`${styles.checkbox} ${styles.checkboxChecked}`}
                            onClick={() => setUndoModalTx(tx)}
                            disabled={updatingId === tx.id}
                          >
                            <Check size={16} className={styles.checkIcon} />
                          </button>
                          <div className={styles.txInfo}>
                            <div className={styles.txName}>
                              {tx.categories?.parent && (
                                <span className={styles.parentCategoryBadge}>{tx.categories.parent.name} &gt; </span>
                              )}
                              {tx.categories?.name || tx.description || 'Gasto'}
                              {tx.is_installment && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', background: 'var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>(Cuota {tx.installment_current}/{tx.installment_total})</span>}
                            </div>
                            {tx.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.description}</div>}
                            <div className={styles.txDate}>
                              <span style={{ fontWeight: 700, color: 'var(--success-color)' }}>
                                ✓ Pagado: {formatDate(tx.paid_at || tx.created_at)}
                              </span>
                              {tx.paid_by ? (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  marginLeft: '0.4rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  backgroundColor: getProfile(tx.paid_by)?.color_bg || 'rgba(107, 114, 128, 0.15)',
                                  color: getProfile(tx.paid_by)?.color_text || 'var(--text-muted)'
                                }}>
                                  ✓ Pagó {getProfile(tx.paid_by)?.display_name || 'Usuario'}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  marginLeft: '0.4rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  backgroundColor: getProfile(tx.created_by || tx.user_id)?.color_bg || 'rgba(107, 114, 128, 0.15)',
                                  color: getProfile(tx.created_by || tx.user_id)?.color_text || 'var(--text-muted)'
                                }}>
                                  👤 {getProfile(tx.created_by || tx.user_id)?.display_name || 'Usuario'}
                                </span>
                              )}
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                · Vencía {formatDate(tx.due_date || tx.created_at)}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                marginLeft: '0.3rem',
                                color: 'var(--text-muted)'
                              }}>
                                (creado {formatDate(tx.created_at)})
                              </span>
                            </div>
                          </div>
                          
                          {tx.receipt_url && (
                            <button 
                              className={styles.receiptBtn} 
                              onClick={() => setViewingReceipt(tx.receipt_url)}
                              title="Ver comprobante"
                            >
                              <ImageIcon size={16} />
                            </button>
                          )}

                          <span className={`${styles.txAmount} ${styles.txAmountExpense}`} style={{ opacity: 0.6 }}>
                            ${tx.amount.toLocaleString('es-CO')}
                          </span>
                          <button className={styles.editBtn} onClick={() => setEditModalTx(tx)}>
                            <Edit2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Incomes Tab */}
          {activeTab === 'incomes' && (
            <div className={styles.tabContent}>
              {incomes.length === 0 ? (
                <div className={styles.emptyState}>No tienes ingresos registrados en este mes.</div>
              ) : (
                <div className={styles.categoryGroup}>
                  <h4 className={styles.categoryHeader}>Tus Ingresos</h4>
                  {incomes.map(tx => (
                    <div key={tx.id} className={styles.transactionItem}>
                      <div className={styles.incomeDot} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success-color)', marginRight: '1rem', flexShrink: 0 }}></div>
                      <div className={styles.txInfo}>
                        <div className={styles.txName}>
                          {tx.categories?.parent && (
                            <span className={styles.parentCategoryBadge}>{tx.categories.parent.name} &gt; </span>
                          )}
                          {tx.categories?.name || tx.description || 'Ingreso'}
                        </div>
                        <div className={styles.txDate}>
                          <span>📅 {formatDate(tx.due_date || tx.created_at)}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            marginLeft: '0.4rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: getProfile(tx.created_by || tx.user_id)?.color_bg || 'rgba(107, 114, 128, 0.15)',
                            color: getProfile(tx.created_by || tx.user_id)?.color_text || 'var(--text-muted)'
                          }}>
                            👤 {getProfile(tx.created_by || tx.user_id)?.display_name || 'Usuario'}
                          </span>
                        </div>
                      </div>
                      <span className={`${styles.txAmount} ${styles.txAmountIncome}`}>
                        +${tx.amount.toLocaleString('es-CO')}
                      </span>
                      <button className={styles.editBtn} onClick={() => setEditModalTx(tx)}>
                        <Edit2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmación de Pago */}
      {payModalTx && (
        <PayConfirmModal
          transaction={payModalTx}
          onConfirm={handleConfirmPay}
          onCancel={() => setPayModalTx(null)}
        />
      )}

      {/* Modal de Reversión de Pago */}
      {undoModalTx && (
        <UndoConfirmModal
          transaction={undoModalTx}
          onConfirm={undoPaid}
          onCancel={() => setUndoModalTx(null)}
          isUpdating={updatingId === undoModalTx.id}
        />
      )}

      {/* Modal de Edición */}
      {editModalTx && (
        <EditTransactionModal
          transaction={editModalTx}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onCancel={() => setEditModalTx(null)}
        />
      )}

      {/* Visor de Comprobante */}
      {viewingReceipt && (
        <div className={styles.receiptOverlay} onClick={() => setViewingReceipt(null)}>
          <div className={styles.receiptViewer} onClick={e => e.stopPropagation()}>
            {viewingReceipt.toLowerCase().includes('.pdf') ? (
              <iframe 
                src={viewingReceipt} 
                className={styles.receiptFullImage}
                style={{ backgroundColor: 'white' }}
                title="Comprobante PDF"
              />
            ) : (
              <img src={viewingReceipt} alt="Comprobante de pago" className={styles.receiptFullImage} />
            )}
            <button className={styles.receiptCloseBtn} onClick={() => setViewingReceipt(null)}>✕ Cerrar</button>
          </div>
        </div>
      )}
      {/* Import Confirm Modal */}
      {showImportConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowImportConfirm(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Importar Gastos</h3>
              <button className={styles.closeBtn} onClick={() => setShowImportConfirm(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--text-color)', marginBottom: '1.5rem', lineHeight: '1.5', textAlign: 'center' }}>
                ¿Traer gastos fijos del mes anterior?
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className={styles.modalCancelBtn} 
                  onClick={() => setShowImportConfirm(false)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  className={styles.modalConfirmBtn} 
                  onClick={executeImportLastMonth}
                  style={{ flex: 1 }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Generic Alert Modal */}
      {alertMessage && (
        <div className={styles.modalOverlay} onClick={() => setAlertMessage(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Aviso</h3>
              <button className={styles.closeBtn} onClick={() => setAlertMessage(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--text-color)', marginBottom: '1.5rem', lineHeight: '1.5', textAlign: 'center' }}>
                {alertMessage}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className={styles.modalConfirmBtn} 
                  onClick={() => setAlertMessage(null)}
                  style={{ padding: '0.8rem 2.5rem' }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
