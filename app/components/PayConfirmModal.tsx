import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./PayConfirmModal.module.css";
import { X, Upload, Check, Loader2, FileText } from "lucide-react";

interface PayConfirmModalProps {
  transaction: {
    id: string;
    amount: number;
    categories: { name: string; icon: string } | null;
    description: string | null;
    due_date?: string | null;
  };
  onConfirm: (txId: string, receiptUrl: string | null, customPaidDate?: string) => void;
  onCancel: () => void;
}

export default function PayConfirmModal({ transaction, onConfirm, onCancel }: PayConfirmModalProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type === "application/pdf") {
      setFile(selected);
      setPreview("PDF_PREVIEW"); // Magic string for PDF
      return;
    }

    // Comprimir imagen del lado del cliente si es imagen
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800; // Max dimension in pixels
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > MAX_SIZE) { h = h * (MAX_SIZE / w); w = MAX_SIZE; }
          } else {
            if (h > MAX_SIZE) { w = w * (MAX_SIZE / h); h = MAX_SIZE; }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], selected.name, { type: 'image/jpeg' });
              setFile(compressedFile);
              setPreview(canvas.toDataURL('image/jpeg', 0.7));
            }
          }, 'image/jpeg', 0.7); // Quality 70%
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    let receiptUrl: string | null = null;

    if (file) {
      setUploading(true);
      const isPdf = file.type === "application/pdf";
      const extension = isPdf ? "pdf" : "jpg";
      const fileName = `${transaction.id}_${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: file.type
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(data.path);
        receiptUrl = urlData.publicUrl;
      }
      setUploading(false);
    }

    onConfirm(transaction.id, receiptUrl, paymentDate);
    setConfirming(false);
  };

  const txName = transaction.categories?.icon 
    ? `${transaction.categories.icon} ${transaction.categories.name}` 
    : (transaction.description || 'Gasto');

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onCancel}>
          <X size={20} />
        </button>

        <div className={styles.iconCircle}>
          <Check size={32} />
        </div>

        <h3 className={styles.title}>Confirmar Pago</h3>
        <p className={styles.subtitle}>
          ¿Marcar <strong>{txName}</strong> como pagado?
        </p>

        <div className={styles.amountCard}>
          <span className={styles.amountLabel}>Monto a confirmar</span>
          <span className={styles.amountValue}>
            ${transaction.amount.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Payment Date Selection */}
        <div style={{ marginTop: '0.8rem', marginBottom: '1rem', textAlign: 'left' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>
            📅 Fecha en que se realizó el pago
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-color)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Receipt Upload */}
        <div className={styles.receiptSection}>
          <p className={styles.receiptLabel}>Comprobante de pago (opcional)</p>
          
          {preview ? (
            <div className={styles.previewContainer}>
              {preview === "PDF_PREVIEW" ? (
                <div className={styles.pdfPreview}>
                  <FileText size={48} color="var(--primary-color)" />
                  <span>Documento PDF listo</span>
                </div>
              ) : (
                <img src={preview} alt="Comprobante" className={styles.previewImage} />
              )}
              <button 
                className={styles.removePreview}
                onClick={() => { setPreview(null); setFile(null); }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button 
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} />
              <span>Subir foto o PDF</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <p className={styles.receiptHint}>
            📸 Imágenes se comprimen aut. | 📄 PDFs se suben directo
          </p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button 
            className={styles.confirmBtn} 
            onClick={handleConfirm}
            disabled={confirming || uploading}
          >
            {confirming || uploading ? (
              <><Loader2 size={18} className={styles.spinner} /> Guardando...</>
            ) : (
              <><Check size={18} /> Confirmar Pago</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
