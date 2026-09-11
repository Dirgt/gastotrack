"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./TransactionForm.module.css";

interface Category {
  id: string;
  name: string;
}

export default function TransactionForm({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('type', type);
      if (data) {
        setUserCategories(data);
      }
    };
    fetchCategories();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      let finalCategoryId;

      if (isNewCategory) {
        if (!categoryName.trim()) throw new Error("El nombre de la nueva categoría no puede estar vacío");
        // Crear categoría
        const { data: newCat, error: insertError } = await supabase
          .from('categories')
          .insert({ name: categoryName.trim(), type, user_id: user.id })
          .select()
          .single();
          
        if (insertError) throw insertError;
        finalCategoryId = newCat.id;
      } else {
        if (!selectedCategoryId || selectedCategoryId === 'new') throw new Error("Debes seleccionar una categoría");
        finalCategoryId = selectedCategoryId;
      }

      // 2. Insertar el movimiento
      // Combinar la fecha elegida con la hora actual para guardar el timestamp completo
      const currentDate = new Date();
      const [year, month, day] = date.split('-');
      currentDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));

      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          amount: parseFloat(amount),
          type,
          description,
          category_id: finalCategoryId,
          user_id: user.id,
          created_at: currentDate.toISOString()
        });

      if (insertError) throw insertError;

      onAdded();
      onClose();
    } catch (error: any) {
      alert("Error al agregar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Nuevo Movimiento</h3>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <div className={styles.typeSelector}>
          <button 
            type="button"
            className={`${styles.typeBtn} ${type === 'expense' ? styles.expenseActive : ''}`}
            onClick={() => { setType('expense'); setIsNewCategory(false); setSelectedCategoryId(''); }}
          >
            Gasto
          </button>
          <button 
            type="button"
            className={`${styles.typeBtn} ${type === 'income' ? styles.incomeActive : ''}`}
            onClick={() => { setType('income'); setIsNewCategory(false); setSelectedCategoryId(''); }}
          >
            Ingreso
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Fecha</label>
            <input 
              type="date" 
              required 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Monto</label>
            <input 
              type="number" 
              step="0.01" 
              required 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0.00" 
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Categoría</label>
            {!isNewCategory ? (
              <select 
                value={selectedCategoryId} 
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setIsNewCategory(true);
                    setSelectedCategoryId('new');
                  } else {
                    setSelectedCategoryId(e.target.value);
                  }
                }}
                className={styles.input}
                required
              >
                <option value="" disabled>Selecciona una categoría</option>
                {userCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="new" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  ➕ Crear nueva categoría...
                </option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)}
                  className={styles.input}
                  placeholder="Nombre de la nueva categoría"
                  autoFocus
                  required
                />
                <button 
                  type="button" 
                  onClick={() => {
                    setIsNewCategory(false);
                    setCategoryName('');
                    setSelectedCategoryId('');
                  }}
                  style={{ padding: '0 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label>Descripción (Opcional)</label>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ej. Cena en restaurante" 
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Guardando..." : "Guardar Movimiento"}
          </button>
        </form>
      </div>
    </div>
  );
}
