"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./PayConfirmModal.module.css";
import { X, Save, Trash2, Loader2, Edit3 } from "lucide-react";

interface EditTransactionModalProps {
  transaction: {
    id: string;
    amount: number;
    description: string | null;
    categories: { name: string; icon: string } | null;
    category_id?: string;
    due_date?: string | null;
  };
  onSave: (txId: string, newAmount: number, newDescription: string, newCategoryId?: string, newDueDate?: string) => void;
  onDelete: (txId: string) => void;
  onCancel: () => void;
}

export default function EditTransactionModal({ transaction, onSave, onDelete, onCancel }: EditTransactionModalProps) {
  const [amountStr, setAmountStr] = useState(transaction.amount.toString());
  const [description, setDescription] = useState(transaction.description || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.category_id || "");
  const [dueDate, setDueDate] = useState(transaction.due_date || "");
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch categories to allow changing
  useState(() => {
    const fetchCats = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, parent_id, icon')
        .order('name');
      if (data) setCategories(data);
    };
    fetchCats();
  });

  const parentCategories = categories.filter(c => !c.parent_id);

  const txName = transaction.categories?.name || 'Transacción';
  const txIcon = transaction.categories?.icon || '📝';

  const handleSave = async () => {
    const newAmount = parseFloat(amountStr);
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Ingresa un monto válido");
      return;
    }
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const updatePayload: any = { 
      amount: newAmount, 
      description: description,
      updated_by: user?.id || null
    };
    if (selectedCategoryId) {
      updatePayload.category_id = selectedCategoryId;
    }
    if (dueDate) {
      updatePayload.due_date = dueDate;
    }

    const { error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', transaction.id);

    if (!error) {
      onSave(transaction.id, newAmount, description, selectedCategoryId, dueDate);
    } else {
      alert("Error guardando cambios");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transaction.id);

    if (!error) {
      onDelete(transaction.id);
    } else {
      alert("Error eliminando");
    }
    setDeleting(false);
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onCancel}>
          <X size={20} />
        </button>

        <div className={styles.iconCircle} style={{ background: 'var(--surface-color)', border: '2px solid var(--border-color)', color: 'var(--text-color)' }}>
          <Edit3 size={30} />
        </div>

        <h3 className={styles.title}>Editar Movimiento</h3>
        <p className={styles.subtitle}>
          {txIcon} {txName}
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nuevo Monto ($)</label>
          <input 
            type="number" 
            value={amountStr} 
            onChange={(e) => setAmountStr(e.target.value)}
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '14px', 
              border: '1px solid var(--border-color)', background: 'var(--bg-color)', 
              fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-color)' 
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Categoría</label>
          <select 
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '14px', 
              border: '1px solid var(--border-color)', background: 'var(--bg-color)', 
              fontSize: '1rem', color: 'var(--text-color)' 
            }}
          >
            <option value="">Mantener actual ({txName})</option>
            {parentCategories.map(parent => (
              <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
                <option value={parent.id}>{parent.icon} {parent.name} (General)</option>
                {categories.filter(c => c.parent_id === parent.id).map(child => (
                  <option key={child.id} value={child.id}>
                    &nbsp;&nbsp;&nbsp;↳ {child.icon} {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>📅 Fecha que se debe pagar (Vencimiento)</label>
          <input 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)}
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '14px', 
              border: '1px solid var(--border-color)', background: 'var(--bg-color)', 
              fontSize: '1rem', color: 'var(--text-color)' 
            }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nota (Opcional)</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Cuota final..."
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '14px', 
              border: '1px solid var(--border-color)', background: 'var(--bg-color)', 
              fontSize: '1rem', color: 'var(--text-color)' 
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleDelete}
            disabled={deleting || saving}
            style={{
              flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid var(--danger-color)',
              background: 'transparent', color: 'var(--danger-color)', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}
          >
            {deleting ? <Loader2 size={18} className={styles.spinner} /> : <><Trash2 size={18} /> Eliminar</>}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={saving || deleting}
            style={{
              flex: 2, padding: '1rem', borderRadius: '14px', border: 'none',
              background: 'var(--primary-color)', color: 'white', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}
          >
            {saving ? <Loader2 size={18} className={styles.spinner} /> : <><Save size={18} /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
