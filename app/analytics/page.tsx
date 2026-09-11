"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import styles from "./page.module.css";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface CategorySummary {
  name: string;
  icon: string;
  color: string;
  total: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const vibrantPalette = [
    'var(--primary-color)', '#8FA4B5', '#2C3042', '#F49B90', 
    '#7E9C88', 'var(--primary-color)', '#B5B8C4', '#A58CB3',
  ];

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, created_at, categories(name, icon, color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_paid', true)
      .order('created_at', { ascending: true });

    if (data) {
      setRawTransactions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
    const handleRefresh = () => fetchTransactions();
    window.addEventListener("transaction_added", handleRefresh);
    return () => window.removeEventListener("transaction_added", handleRefresh);
  }, []);

  // Compute Categories Summary (Always shows all categories)
  const { categoriesSummary, totalExpense } = useMemo(() => {
    const categoryTotals: Record<string, CategorySummary> = {};
    let total = 0;
    let paletteIndex = 0;

    rawTransactions.forEach(t => {
      const catName = t.categories?.name || 'General';
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = {
          name: catName,
          icon: t.categories?.icon || '✨',
          color: vibrantPalette[paletteIndex % vibrantPalette.length],
          total: 0
        };
        paletteIndex++;
      }
      categoryTotals[catName].total += t.amount;
      total += t.amount;
    });

    const sorted = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    return { categoriesSummary: sorted, totalExpense: total };
  }, [rawTransactions]);

  // Compute Line Data (Filtered by selectedCategory)
  const lineData = useMemo(() => {
    if (rawTransactions.length === 0) return null;

    const dailyTotals: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      dailyTotals[dateStr] = 0;
    }

    rawTransactions.forEach(t => {
      const catName = t.categories?.name || 'General';
      // Si hay una categoría seleccionada y esta transacción no pertenece a ella, la ignoramos
      if (selectedCategory && catName !== selectedCategory) return;

      const dateStr = new Date(t.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      if (dailyTotals[dateStr] !== undefined) {
        dailyTotals[dateStr] += t.amount;
      } else {
        dailyTotals[dateStr] = t.amount;
      }
    });

    const selectedColor = selectedCategory 
      ? categoriesSummary.find(c => c.name === selectedCategory)?.color || 'var(--primary-color)'
      : 'var(--primary-color)';

    return {
      labels: Object.keys(dailyTotals),
      datasets: [{
        label: 'Gastos',
        data: Object.values(dailyTotals),
        borderColor: selectedColor,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260); // Hardcoded height so it never fails on first tick
          
          let hex = selectedColor;
          if(hex.startsWith('#')) hex = hex.substring(1);
          
          let r = 155, g = 108, b = 255;
          if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
          }
          
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.7)`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
          return gradient;
        },
        borderWidth: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: selectedColor,
        pointBorderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        cubicInterpolationMode: 'monotone' as const, // Esto garantiza la curva incluso con valores en 0
        fill: true
      }]
    };
  }, [rawTransactions, selectedCategory, categoriesSummary]);

  // Compute Doughnut Data (Dimm unselected categories)
  const doughnutData = useMemo(() => {
    if (categoriesSummary.length === 0) return null;
    
    return {
      labels: categoriesSummary.map(c => c.name),
      datasets: [{
        data: categoriesSummary.map(c => c.total),
        backgroundColor: categoriesSummary.map(c => {
          if (!selectedCategory) return c.color;
          return c.name === selectedCategory ? c.color : '#e0e0e0'; // Dim si no está seleccionada
        }),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [categoriesSummary, selectedCategory]);

  const handleDoughnutClick = (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const clickedCategory = categoriesSummary[index].name;
      // Toggle selection
      setSelectedCategory(prev => prev === clickedCategory ? null : clickedCategory);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </Link>
          <span className={styles.title}>Analíticas</span>
          <div style={{ width: 24 }}></div>
        </div>
      </header>

      <section className={styles.mainContent}>
        <div className={styles.totalSection}>
          <p className={styles.totalLabel}>
            {selectedCategory ? `Gasto en ${selectedCategory}` : 'Total gastado (Mes)'}
          </p>
          <h2 className={styles.totalValue}>
            ${(selectedCategory 
                ? categoriesSummary.find(c => c.name === selectedCategory)?.total || 0 
                : totalExpense
              ).toLocaleString('es-CO')}
          </h2>
        </div>

        {/* Gráfico de Líneas */}
        <div className={styles.lineChartContainer}>
          {loading ? (
            <p className={styles.loading}>Cargando tendencia...</p>
          ) : lineData ? (
            <Line 
              data={lineData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                  line: {
                    tension: 0.5 // Forzar curva en todas las líneas
                  }
                },
                scales: {
                  x: { 
                    grid: { display: false }, 
                    ticks: { font: { family: 'Inter', size: 12 }, color: '#888' },
                    border: { display: false }
                  },
                  y: { display: false, min: 0 }
                },
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    padding: 16,
                    titleFont: { size: 14, family: 'Inter', weight: 'normal' },
                    bodyFont: { size: 16, family: 'Inter', weight: 'bold' },
                    displayColors: false,
                    cornerRadius: 12,
                    caretSize: 8,
                  }
                },
                interaction: { mode: 'index' as const, intersect: false },
                animation: { duration: 600, easing: 'easeOutQuart' }
              }}
            />
          ) : (
            <p className={styles.emptyState}>No hay datos recientes.</p>
          )}
        </div>

        {/* Barra Segmentada Puramente Visual */}
        {categoriesSummary.length > 0 && (
          <div className={styles.segmentedBarCard}>
            <h3 className={styles.sectionTitle}>Distribución Mensual</h3>
            <div className={styles.segmentedBar}>
              {categoriesSummary.map((cat, i) => {
                const percent = (cat.total / totalExpense) * 100;
                const isDimmed = selectedCategory && selectedCategory !== cat.name;
                
                return (
                  <div 
                    key={i} 
                    className={styles.segmentWrapper} 
                    style={{ width: `${percent}%`, cursor: 'pointer', opacity: isDimmed ? 0.3 : 1 }}
                    onClick={() => setSelectedCategory(prev => prev === cat.name ? null : cat.name)}
                    title={`${cat.name}: ${Math.round(percent)}%`}
                  >
                    <div 
                      className={styles.segment} 
                      style={{ backgroundColor: cat.color }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gráfico de Dona y Cuadrícula (Premium Layout) */}
        <div className={styles.analysisSection}>
          <div className={styles.doughnutCard}>
            {doughnutData && (
              <div className={styles.doughnutWrapper}>
                <Doughnut 
                  data={doughnutData} 
                  options={{
                    maintainAspectRatio: false,
                    cutout: '80%',
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    layout: { padding: 10 },
                    onClick: handleDoughnutClick,
                    animation: { duration: 600, easing: 'easeOutQuart' as const },
                    elements: { arc: { borderJoinStyle: 'round' as const } }
                  }} 
                />
                <div className={styles.doughnutCenterText}>
                  <span className={styles.doughnutCenterLabel}>
                    {selectedCategory ? 'Filtro' : 'Total'}
                  </span>
                  <strong className={styles.doughnutCenterValue}>
                    {selectedCategory ? `${Math.round((categoriesSummary.find(c => c.name === selectedCategory)?.total || 0) / totalExpense * 100)}%` : '100%'}
                  </strong>
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.categoriesGrid}>
            {categoriesSummary.map((cat, index) => {
              const isDimmed = selectedCategory && selectedCategory !== cat.name;
              const percent = (cat.total / totalExpense) * 100;
              return (
                <div 
                  key={index} 
                  className={styles.premiumCategoryCard}
                  style={{ 
                    opacity: isDimmed ? 0.4 : 1, 
                    borderColor: selectedCategory === cat.name ? cat.color : 'rgba(0,0,0,0.04)',
                    boxShadow: selectedCategory === cat.name ? `0 4px 20px ${cat.color}30` : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedCategory(prev => prev === cat.name ? null : cat.name)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIcon} style={{ color: cat.color, backgroundColor: `${cat.color}20` }}>
                      {cat.icon}
                    </div>
                    <div className={styles.cardTitleGroup}>
                      <span className={styles.cardName}>{cat.name}</span>
                      <span className={styles.cardPercent} style={{ color: cat.color }}>
                        {Math.round(percent)}%
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardAmount}>${cat.total.toLocaleString('es-CO')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
