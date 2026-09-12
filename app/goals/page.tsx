"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./page.module.css";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  frequency: string;
  installment_amount: number;
}

export default function Goals() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTab, setActiveTab] = useState<"progress" | "new">("progress");
  
  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [newFrequency, setNewFrequency] = useState("mensual");
  const [newInstallment, setNewInstallment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Deposit Modal State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositName, setDepositName] = useState("Santi");

  const fetchGoals = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else if (data) {
      setGoals(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newTarget) return;

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        title: newTitle,
        target_amount: parseFloat(newTarget),
        current_amount: 0,
        icon: newIcon,
        frequency: newFrequency,
        installment_amount: newInstallment ? parseFloat(newInstallment) : 0
      });

    if (!error) {
      setNewTitle("");
      setNewTarget("");
      setNewIcon("🎯");
      setNewFrequency("mensual");
      setNewInstallment("");
      setActiveTab("progress");
      fetchGoals();
    } else {
      alert("Error al crear la meta.");
    }
    setIsSaving(false);
  };

  const createDemoGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('goals').insert([
      { user_id: user.id, title: 'Viaje a Japón', target_amount: 5000000, current_amount: 1500000, icon: '✈️' },
      { user_id: user.id, title: 'Fondo de Emergencia', target_amount: 10000000, current_amount: 4500000, icon: '🏦' },
      { user_id: user.id, title: 'MacBook Pro', target_amount: 8500000, current_amount: 3500000, icon: '💻' }
    ]);
    fetchGoals();
  };

  return (
    <main className={`container ${styles.mainWrapper}`}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </Link>
          <span className={styles.title}>Metas de Ahorro</span>
          <div style={{ width: 24 }}></div>
        </div>
      </header>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'progress' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progreso
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'new' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('new')}
        >
          Nueva Meta
        </button>
        <Link href="/goals/analytics" className={styles.tab} style={{ textDecoration: 'none', textAlign: 'center' }}>
          Analíticas
        </Link>
      </div>

      {activeTab === 'progress' ? (
        <section className={styles.goalsList}>
          {loading ? (
            <p className={styles.emptyState}>Cargando metas...</p>
          ) : goals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No tienes metas configuradas.</p>
              <button onClick={createDemoGoals} className={styles.demoBtn}>Crear Metas de Ejemplo</button>
            </div>
          ) : (
            goals.map(goal => {
              const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              const freqText = goal.frequency !== 'libre' ? ` - ${goal.frequency === 'diario' ? 'Diario' : goal.frequency === 'semanal' ? 'Semanal' : 'Mensual'}` : '';
              
              return (
                <div key={goal.id} className={styles.goalCard}>
                  <div className={styles.goalHeader}>
                    <div className={styles.goalIcon}>{goal.icon}</div>
                    <div className={styles.goalInfo}>
                      <h3 className={styles.goalTitle}>{goal.title}</h3>
                      <p className={styles.goalAmounts}>
                        <span className={styles.current}>${goal.current_amount.toLocaleString('es-CO')}</span> 
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}> / ${goal.target_amount.toLocaleString('es-CO')}{freqText}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className={styles.progressLabels}>
                      <span>0%</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className={styles.goalActions}>
                    <button 
                      className={styles.depositBtn}
                      onClick={() => { setSelectedGoal(goal); setShowDepositModal(true); }}
                    >
                      Hacer Aporte
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : (
        <section className={styles.newGoalForm}>
          <form onSubmit={handleCreateGoal} className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <label>Icono (Emoji)</label>
              <div className={styles.emojiPicker}>
                <input 
                  type="text" 
                  value={newIcon} 
                  onChange={(e) => setNewIcon(e.target.value)} 
                  maxLength={2}
                  className={`${styles.input} ${styles.emojiInput}`}
                  required
                />
                <div className={styles.presetEmojis}>
                  {['🎯', '✈️', '🚗', '🏡', '📱', '🎓', '🏥', '🎮', '💍', '🎁'].map(emoji => (
                    <button 
                      key={emoji} 
                      type="button" 
                      className={styles.presetEmojiBtn}
                      onClick={() => setNewIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Nombre de la Meta</label>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                placeholder="Ej. Comprar Auto"
                className={styles.input}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Monto Objetivo ($)</label>
              <input 
                type="number" 
                value={newTarget} 
                onChange={(e) => setNewTarget(e.target.value)} 
                placeholder="Ej. 150000"
                className={styles.input}
                required
                min="1"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Frecuencia de Ahorro</label>
              <select 
                value={newFrequency} 
                onChange={(e) => setNewFrequency(e.target.value)}
                className={styles.input}
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
                <option value="libre">Aporte Libre (Sin alertas)</option>
              </select>
            </div>
            {newFrequency !== 'libre' && (
              <div className={styles.inputGroup}>
                <label>Monto de Cuota Sugerida ($)</label>
                <input 
                  type="number" 
                  value={newInstallment} 
                  onChange={(e) => setNewInstallment(e.target.value)} 
                  placeholder="Ej. 50000"
                  className={styles.input}
                  min="1"
                />
              </div>
            )}
            <button type="submit" disabled={isSaving} className={styles.submitBtn}>
              {isSaving ? "Guardando..." : "Crear Meta Avanzada"}
            </button>
          </form>
        </section>
      )}

      {/* Modal de Aportes */}
      {showDepositModal && selectedGoal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowDepositModal(false) }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Aporte a {selectedGoal.icon} {selectedGoal.title}</h3>
              <button onClick={() => setShowDepositModal(false)} className={styles.closeBtn}>✕</button>
            </div>
            <form className={styles.formContainer} onSubmit={async (e) => {
              e.preventDefault();
              if(!depositAmount) return;
              setIsSaving(true);
              const { data: { user } } = await supabase.auth.getUser();
              if(!user) return;
              
              const val = parseFloat(depositAmount);
              
              // 1. Insert into goal_contributions
              await supabase.from('goal_contributions').insert({
                goal_id: selectedGoal.id,
                user_id: user.id,
                amount: val,
                contributor_name: depositName
              });
              
              // 2. Update goal current_amount
              await supabase.from('goals').update({
                current_amount: selectedGoal.current_amount + val
              }).eq('id', selectedGoal.id);
              
              setShowDepositModal(false);
              setDepositAmount("");
              setIsSaving(false);
              fetchGoals();
            }}>
              <div className={styles.inputGroup}>
                <label>¿Quién está aportando?</label>
                <select className={styles.input} value={depositName} onChange={(e) => setDepositName(e.target.value)}>
                  <option value="Santi">Santi</option>
                  <option value="Pareja">Pareja</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Monto a aportar ($)</label>
                <input 
                  type="number" 
                  value={depositAmount} 
                  onChange={(e) => setDepositAmount(e.target.value)} 
                  placeholder={selectedGoal.installment_amount ? `Cuota: $${selectedGoal.installment_amount}` : "0"}
                  className={styles.input}
                  required
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                {isSaving ? "Registrando..." : "Confirmar Aporte"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
