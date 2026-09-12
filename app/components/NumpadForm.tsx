"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./NumpadForm.module.css";
import { ChevronLeft, Delete, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  icon?: string;
  parent_id?: string | null;
}

export default function NumpadForm({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("0");
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Installment states
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCurrent, setInstallmentCurrent] = useState("1");
  const [installmentTotal, setInstallmentTotal] = useState("12");
  const [isPaid, setIsPaid] = useState(true);

  const fetchCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Traer categorías compartidas
    let { data } = await supabase
      .from('categories')
      .select('id, name, icon, parent_id')
      .eq('type', type)
      .order('name');
    
    // Verificar si faltan las categorías por defecto (ej. Vivienda)
    const hasDefault = data?.some(c => c.name === 'Vivienda' || c.name === 'Salario');

    if (!hasDefault) {
      // Auto-sembrar categorías colombianas si faltan
      if (type === 'expense') {
        const defaultCategories = [
          { name: 'Vivienda', icon: '🏠' },
          { name: 'Servicios', icon: '💡' },
          { name: 'Bancos/Créditos', icon: '🏦' },
          { name: 'Alimentación', icon: '🛒' },
          { name: 'Transporte', icon: '🚗' },
          { name: 'Educación', icon: '🎓' },
          { name: 'Salud', icon: '🏥' },
          { name: 'Entretenimiento', icon: '🍔' },
          { name: 'Imprevistos', icon: '🔧' },
          { name: 'Ahorro', icon: '🐷' },
          { name: 'Inversiones', icon: '📈' },
          { name: 'Préstamos', icon: '🤝' },
          { name: 'Otros', icon: '📦' }
        ].map(c => ({ ...c, user_id: user.id, type: 'expense', color: 'var(--danger-color)' }));

        await supabase.from('categories').insert(defaultCategories);
      } else {
        const defaultIncomeCategories = [
          { name: 'Salario', icon: '💼' },
          { name: 'Negocio', icon: '🏢' },
          { name: 'Préstamos', icon: '🤝' },
          { name: 'Otros', icon: '💰' }
        ].map(c => ({ ...c, user_id: user.id, type: 'income', color: 'var(--success-color)' }));

        await supabase.from('categories').insert(defaultIncomeCategories);
      }
      
      // Volver a traer la data después de insertar
      const { data: newData } = await supabase
        .from('categories')
        .select('id, name, icon, parent_id')
        .eq('type', type)
        .order('name');
      data = newData;
    }

    if (data && data.length > 0) {
      setUserCategories(data);
      if (!selectedCategoryId) setSelectedCategoryId(data[0].id);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [type]);

  const handleKeyPress = (key: string) => {
    setAmountStr(prev => {
      if (key === 'backspace') {
        return prev.length > 1 ? prev.slice(0, -1) : "0";
      } else if (key === '.') {
        return !prev.includes('.') ? prev + '.' : prev;
      } else {
        return prev === "0" ? key : prev + key;
      }
    });
  };




  const handleSubmit = async () => {
    if (loading) return;
    
    const amount = parseFloat(amountStr);
    if (amount <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }
    if (!selectedCategoryId) {
      alert("Selecciona o crea una categoría");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const [year, month, day] = date.split('-');
      
      const transactionsToInsert = [];
      
      const nowIso = new Date().toISOString();

      if (type === 'expense' && isInstallment) {
        const curr = parseInt(installmentCurrent);
        const total = parseInt(installmentTotal);
        
        if (curr > total || curr < 1) {
          throw new Error("Cuota actual inválida.");
        }
        
        for (let i = 1; i <= total; i++) {
          const dueDateObj = new Date(parseInt(year), parseInt(month) - 1 + (i - curr), parseInt(day));
          const dueYear = dueDateObj.getFullYear();
          const dueMonth = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const dueDay = String(dueDateObj.getDate()).padStart(2, '0');
          const dueDateStr = `${dueYear}-${dueMonth}-${dueDay}`;
          
          const isAlreadyPaid = i < curr;

          transactionsToInsert.push({
            amount,
            type,
            description: null,
            category_id: selectedCategoryId,
            user_id: user.id,
            created_by: user.id,
            created_at: nowIso,
            due_date: dueDateStr,
            is_installment: true,
            installment_current: i,
            installment_total: total,
            is_paid: isAlreadyPaid,
            paid_at: isAlreadyPaid ? dueDateObj.toISOString() : null,
            paid_by: isAlreadyPaid ? user.id : null
          });
        }
      } else {
        transactionsToInsert.push({
          amount,
          type,
          description: null,
          category_id: selectedCategoryId,
          user_id: user.id,
          created_by: user.id,
          created_at: nowIso,
          due_date: date,
          is_paid: type === 'income' ? true : isPaid,
          paid_at: (type === 'income' || isPaid) ? nowIso : null,
          paid_by: (type === 'income' || isPaid) ? user.id : null
        });
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (insertError) throw insertError;
      onAdded();
      onClose();
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Evitar que enviar pulsaciones repetidas si se deja presionada la tecla
      // Ignorar si se está escribiendo en un input
      if (document.activeElement?.tagName === 'INPUT') return;
      
      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        handleKeyPress(key);
      } else if (key === '.' || key === ',') {
        handleKeyPress('.');
      } else if (key === 'Backspace') {
        handleKeyPress('backspace');
      } else if (key === 'Enter') {
        e.preventDefault(); // Evitar click en botones enfocados
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSubmit]);

  return (
    <div className={styles.fullscreen}>
      <header className={styles.header}>
        <button onClick={onClose} className={styles.iconBtn}>
          <ChevronLeft size={24} />
        </button>
        <span className={styles.title}>📝 Nuevo Movimiento</span>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className={styles.datePicker}
        />
      </header>

      <div className={styles.amountSection}>
        <span className={styles.amountLabel}>Monto</span>
        <h1 className={styles.amountValue} style={{ color: type === 'expense' ? 'var(--danger-color)' : 'var(--success-color)' }}>
          <span className={styles.currency}>$</span>
          {amountStr === "0" ? "0" : (
            amountStr.includes('.') 
              ? parseInt(amountStr.split('.')[0]).toLocaleString('es-CO') + ',' + amountStr.split('.')[1]
              : parseInt(amountStr).toLocaleString('es-CO')
          )}
        </h1>
        <div className={styles.amountDivider}></div>
      </div>

      <div className={styles.typeToggle}>
        <button 
          className={`${styles.typeBtn} ${type === 'expense' ? styles.activeExpense : ''}`}
          onClick={() => { setType('expense'); setSelectedParentId(null); setSelectedCategoryId(''); }}
        >
          Gasto
        </button>
        <button 
          className={`${styles.typeBtn} ${type === 'income' ? styles.activeIncome : ''}`}
          onClick={() => { setType('income'); setSelectedParentId(null); setSelectedCategoryId(''); }}
        >
          Ingreso
        </button>
      </div>

      <div className={styles.numpad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handleKeyPress(num.toString())} className={styles.numBtn}>
            {num}
          </button>
        ))}
        <button onClick={() => handleKeyPress('.')} className={styles.numBtn}>.</button>
        <button onClick={() => handleKeyPress('0')} className={styles.numBtn}>0</button>
        <button onClick={() => handleKeyPress('backspace')} className={styles.numBtn}>
          <Delete size={24} />
        </button>
      </div>

      <div className={styles.categoriesContainer}>
        <div className={styles.categoryGrid}>
          {!selectedParentId ? (
            // PASO 1: Categorías Principales
            userCategories
              .filter(cat => !cat.parent_id)
              .map(cat => {
                const hasSub = userCategories.some(c => c.parent_id === cat.id);
                return (
                  <button 
                    key={cat.id} 
                    className={`${styles.chip} ${selectedCategoryId === cat.id ? styles.chipActive : ''}`}
                    onClick={() => {
                      if (hasSub) {
                        setSelectedParentId(cat.id);
                        setSelectedCategoryId(cat.id);
                      } else {
                        setSelectedCategoryId(cat.id);
                      }
                    }}
                  >
                    <div className={styles.chipIcon}>{cat.icon || (type === 'income' ? '💰' : '🏷️')}</div>
                    <span>{cat.name}</span>
                  </button>
                );
              })
          ) : (
            // PASO 2: Subcategorías
            <>
              <button 
                className={styles.chip}
                onClick={() => { setSelectedParentId(null); setSelectedCategoryId(""); }}
                style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
              >
                <div className={styles.chipIcon}>⬅️</div>
                <span>Volver</span>
              </button>
              
              {userCategories
                .filter(cat => cat.parent_id === selectedParentId)
                .map(cat => (
                  <button 
                    key={cat.id} 
                    className={`${styles.chip} ${selectedCategoryId === cat.id ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <div className={styles.chipIcon}>{cat.icon || '🏷️'}</div>
                    <span>{cat.name}</span>
                  </button>
                ))}
                
              {userCategories.filter(cat => cat.parent_id === selectedParentId).length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  No tienes subcategorías aquí.<br/>
                  <button 
                    onClick={() => {
                      onClose();
                      router.push('/categorias');
                    }}
                    style={{ 
                      color: 'var(--primary-color)', 
                      textDecoration: 'underline', 
                      fontWeight: 600, 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      font: 'inherit',
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    Toca aquí para ir al Gestor de Categorías
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div style={{ width: '100%', marginBottom: '1rem', background: 'var(--surface-color)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            📅 {type === 'expense' ? 'Fecha que se debe pagar (Vencimiento)' : 'Fecha del ingreso'}
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', background: 'var(--bg-color)', color: 'var(--text-color)' }}
          />
        </div>

        {type === 'expense' && (
          <div style={{ width: '100%', marginBottom: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color)', cursor: 'pointer' }}>
              Habilitar Cuotas Automáticas
              <input 
                type="checkbox" 
                checked={isInstallment} 
                onChange={(e) => setIsInstallment(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
              />
            </label>
            
            {isInstallment && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuota actual</label>
                  <input 
                    type="number" 
                    value={installmentCurrent} 
                    onChange={(e) => setInstallmentCurrent(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.3rem', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total de cuotas</label>
                  <input 
                    type="number" 
                    value={installmentTotal} 
                    onChange={(e) => setInstallmentTotal(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.3rem', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {type === 'expense' && !isInstallment && (
          <div style={{ width: '100%', marginBottom: '1rem', background: 'var(--surface-color)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)', cursor: 'pointer' }}>
              <span>✓ Marcar como pagado de una vez</span>
              <input 
                type="checkbox" 
                checked={isPaid} 
                onChange={(e) => setIsPaid(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--success-color)' }}
              />
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              {isPaid 
                ? "Se descontará del balance y aparecerá en movimientos recientes." 
                : "Quedará como factura pendiente por pagar en la sección Cuentas."}
            </span>
          </div>
        )}
        
        <button onClick={handleSubmit} disabled={loading} className={styles.submitBtn}>
          {loading ? "Guardando..." : "Listo"}
        </button>
      </div>
    </div>
  );
}
