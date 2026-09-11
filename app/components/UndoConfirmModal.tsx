"use client";

import styles from "./PayConfirmModal.module.css";
import { X, AlertTriangle, Check, Loader2 } from "lucide-react";

interface UndoConfirmModalProps {
  transaction: {
    id: string;
    amount: number;
    categories: { name: string; icon: string } | null;
    description: string | null;
  };
  onConfirm: (txId: string) => void;
  onCancel: () => void;
  isUpdating: boolean;
}

export default function UndoConfirmModal({ transaction, onConfirm, onCancel, isUpdating }: UndoConfirmModalProps) {
  const txName = transaction.categories?.icon 
    ? `${transaction.categories.icon} ${transaction.categories.name}` 
    : (transaction.description || 'Gasto');

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onCancel}>
          <X size={20} />
        </button>

        <div className={styles.iconCircle} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
          <AlertTriangle size={32} />
        </div>

        <h3 className={styles.title}>Revertir Pago</h3>
        <p className={styles.subtitle}>
          ¿Mover <strong>{txName}</strong> a pendientes?
        </p>

        <div className={styles.amountCard}>
          <span className={styles.amountLabel}>Monto</span>
          <span className={styles.amountValue}>
            ${transaction.amount.toLocaleString('es-CO')}
          </span>
        </div>

        <p className={styles.receiptHint} style={{ marginBottom: '1.5rem' }}>
          ⚠️ Esto lo marcará como no pagado nuevamente.
        </p>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button 
            className={styles.confirmBtn} 
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
            onClick={() => onConfirm(transaction.id)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <><Loader2 size={18} className={styles.spinner} /> Revirtiendo...</>
            ) : (
              <><Check size={18} /> Sí, revertir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
