"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import styles from "./page.module.css";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string;
}

interface Contribution {
  id: string;
  goal_id: string;
  amount: number;
  contributor_name: string;
  created_at: string;
}

export default function GoalsGlobalAnalytics() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  
  const vibrantPalette = [
    'var(--primary-color)', 'var(--primary-color)', '#2ecc71', '#F49B90', 
    '#7E9C88', 'var(--primary-color)', '#8FA4B5', '#A58CB3',
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch goals and contributions IN PARALLEL
    const [goalsResult, contResult] = await Promise.all([
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id),
      
      supabase
        .from('goal_contributions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
    ]);

    if (goalsResult.data) setGoals(goalsResult.data);
    if (contResult.data) setContributions(contResult.data);
    setLoading(false);
  };

  // --- MEMOIZED CHARTS DATA ---
  
  // 1. Line Chart: Ritmo de Ahorro (Crecimiento en el tiempo)
  const lineChartData = useMemo(() => {
    let cumulative = 0;
    const labels = contributions.map(c => new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
    const data = contributions.map(c => {
      cumulative += c.amount;
      return cumulative;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Ahorro Total',
          data,
          borderColor: 'var(--primary-color)',
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(155, 108, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(155, 108, 255, 0.0)');
            return gradient;
          },
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#fff',
          pointBorderColor: 'var(--primary-color)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [contributions]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14, family: 'Inter' },
        bodyFont: { size: 14, family: 'Inter', weight: 'bold' as const },
        displayColors: false,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false }, ticks: { font: { family: 'Inter' } } }
    },
    interaction: { mode: 'index' as const, intersect: false },
  };

  // 2. Doughnut Chart: Aportes por Persona Global
  const doughnutChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    contributions.forEach(c => {
      const name = c.contributor_name || 'Anónimo';
      if (!totals[name]) totals[name] = 0;
      totals[name] += c.amount;
    });

    return {
      labels: Object.keys(totals),
      datasets: [
        {
          data: Object.values(totals),
          backgroundColor: vibrantPalette,
          borderWidth: 0,
          hoverOffset: 10,
        }
      ]
    };
  }, [contributions]);

  const totalGlobalSaved = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalGlobalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const globalPercentage = totalGlobalTarget > 0 ? (totalGlobalSaved / totalGlobalTarget) * 100 : 0;

  if (loading) {
    return <main className={`container ${styles.mainWrapper}`}><p className={styles.loading}>Cargando analíticas globales...</p></main>;
  }

  return (
    <main className={`container ${styles.mainWrapper}`}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/goals" className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </Link>
          <span className={styles.title}>Analíticas de Metas</span>
          <div style={{ width: 24 }}></div>
        </div>
      </header>

      {/* Hero Widget: Global Overview */}
      <section className={styles.heroWidget}>
        <div className={styles.heroGlow}></div>
        <div className={styles.heroContent}>
          <p className={styles.heroLabel}>Patrimonio de Ahorro</p>
          <h1 className={styles.heroAmount}>${totalGlobalSaved.toLocaleString('es-CO')}</h1>
          
          <div className={styles.heroProgressContainer}>
            <div className={styles.heroProgressBar}>
              <div className={styles.heroProgressFill} style={{ width: `${Math.min(globalPercentage, 100)}%` }}></div>
            </div>
            <div className={styles.heroProgressLabels}>
              <span>{globalPercentage.toFixed(1)}% completado</span>
              <span>Objetivo: ${totalGlobalTarget.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.chartsGrid}>
        {/* Spline Area Chart: Ritmo de Crecimiento */}
        <div className={styles.premiumCard}>
          <div className={styles.cardHeader}>
            <h3>Ritmo de Crecimiento</h3>
            <span className={styles.badge}>Histórico</span>
          </div>
          {contributions.length === 0 ? (
            <p className={styles.emptyState}>No hay aportes para graficar.</p>
          ) : (
            <div className={styles.chartWrapperLarge}>
              <Line data={lineChartData} options={lineOptions} />
            </div>
          )}
        </div>

        {/* Dos columnas en desktop para Dona y Estadísticas */}
        <div className={styles.twoColGrid}>
          {/* Doughnut Chart: Distribución Familiar */}
          <div className={styles.premiumCard}>
            <h3>Distribución de Esfuerzo</h3>
            {contributions.length === 0 ? (
              <p className={styles.emptyState}>Sin datos de aportes.</p>
            ) : (
              <div className={styles.doughnutWrapper}>
                <Doughnut 
                  data={doughnutChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    cutout: '75%',
                    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 13 } } } }
                  }} 
                />
                <div className={styles.doughnutCenterText}>
                  <span>Líder</span>
                  <strong>{Object.keys(doughnutChartData.datasets[0].data).length > 0 ? doughnutChartData.labels[doughnutChartData.datasets[0].data.indexOf(Math.max(...(doughnutChartData.datasets[0].data as number[])))] : '-'}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Estadísticas Rápidas */}
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statInfo}>
                <p>Metas Activas</p>
                <h4>{goals.length}</h4>
              </div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statIcon}>💸</div>
              <div className={styles.statInfo}>
                <p>Aporte Promedio</p>
                <h4>${contributions.length > 0 ? Math.round(totalGlobalSaved / contributions.length).toLocaleString('es-CO') : 0}</h4>
              </div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statIcon}>🏆</div>
              <div className={styles.statInfo}>
                <p>Meta más cercana</p>
                <h4>{goals.length > 0 ? goals.sort((a,b) => (b.current_amount/b.target_amount) - (a.current_amount/a.target_amount))[0].title : '-'}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Progreso Individual con Barras Premium (Reemplaza el viejo gráfico de barras) */}
        <div className={styles.premiumCard}>
          <h3>Desglose de Metas</h3>
          <div className={styles.goalsProgressList}>
            {goals.length === 0 ? (
              <p className={styles.emptyState}>No tienes metas activas.</p>
            ) : (
              goals.sort((a,b) => (b.current_amount/b.target_amount) - (a.current_amount/a.target_amount)).map(goal => {
                const perc = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                return (
                  <div key={goal.id} className={styles.modernGoalRow}>
                    <div className={styles.modernGoalIcon}>{goal.icon}</div>
                    <div className={styles.modernGoalDetails}>
                      <div className={styles.modernGoalTop}>
                        <span className={styles.modernGoalTitle}>{goal.title}</span>
                        <span className={styles.modernGoalPerc}>{perc.toFixed(1)}%</span>
                      </div>
                      <div className={styles.modernProgressBar}>
                        <div className={styles.modernProgressFill} style={{ width: `${perc}%`, background: `linear-gradient(135deg, var(--primary-color), var(--primary-hover))` }}>
                          <div className={styles.glowEffect}></div>
                        </div>
                      </div>
                      <div className={styles.modernGoalBottom}>
                        <span>${goal.current_amount.toLocaleString('es-CO')}</span>
                        <span className={styles.targetText}>${goal.target_amount.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
