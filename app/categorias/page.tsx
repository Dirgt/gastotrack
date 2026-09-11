"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./page.module.css";
import { ChevronLeft, ChevronDown, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  type: string;
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para nueva subcategoría
  const [creatingForParent, setCreatingForParent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🏷️");
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('categories')
      .select('id, name, icon, parent_id, type')
      .eq('user_id', user.id)
      .eq('type', 'expense') // Enfocados en gastos
      .order('name');
    
    if (data) setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setCreatingForParent(null);
    } else {
      setExpandedId(id);
      setCreatingForParent(null);
    }
  };

  const handleCreateSub = async (parentId: string) => {
    if (!newName.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        type: 'expense',
        icon: newIcon || '🏷️',
        color: 'var(--danger-color)',
        parent_id: parentId
      });

    if (!error) {
      setNewName("");
      setNewIcon("🏷️");
      setCreatingForParent(null);
      await fetchCategories();
    } else {
      alert("Error creando subcategoría");
    }
    setSaving(false);
  };

  const handleDeleteSub = async (subId: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta subcategoría?")) return;
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', subId);

    if (!error) {
      await fetchCategories();
    } else {
      alert("Error eliminando subcategoría. Asegúrate de que no tenga gastos asociados.");
    }
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <main className={`container ${styles.mainWrapper}`}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/profile" className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </Link>
          <span className={styles.title}>Mis Categorías</span>
          <div style={{ width: 24 }}></div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Toca una categoría para ver y administrar sus subcategorías.
        </p>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <Loader2 size={30} className="spinner" style={{ color: 'var(--primary-color)' }} />
          </div>
        ) : (
          parentCategories.map(parent => {
            const isExpanded = expandedId === parent.id;
            const subcategories = categories.filter(c => c.parent_id === parent.id);

            return (
              <div key={parent.id} className={styles.categoryCard}>
                <button 
                  className={`${styles.cardHeader} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => toggleExpand(parent.id)}
                >
                  <div className={styles.cardIcon}>{parent.icon}</div>
                  <span className={styles.cardTitle}>{parent.name}</span>
                  <ChevronDown size={20} className={styles.expandIcon} />
                </button>

                {isExpanded && (
                  <div className={styles.subcategoriesList}>
                    {subcategories.length > 0 ? (
                      subcategories.map(sub => (
                        <div key={sub.id} className={styles.subItem}>
                          <span className={styles.subIcon}>{sub.icon}</span>
                          <span className={styles.subName}>{sub.name}</span>
                          <button className={styles.deleteBtn} onClick={() => handleDeleteSub(sub.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No hay subcategorías aún.
                      </div>
                    )}

                    {creatingForParent === parent.id ? (
                      <div className={styles.createForm}>
                        <input 
                          type="text"
                          maxLength={2}
                          value={newIcon}
                          onChange={(e) => setNewIcon(e.target.value)}
                          className={styles.iconInput}
                          title="Emoji Icono"
                        />
                        <input 
                          type="text"
                          placeholder="Nombre (Ej: U Santi)"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className={styles.nameInput}
                          autoFocus
                        />
                        <button 
                          className={styles.saveBtn} 
                          onClick={() => handleCreateSub(parent.id)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 size={16} className="spinner" /> : "OK"}
                        </button>
                      </div>
                    ) : (
                      <button 
                        className={styles.addBtn}
                        onClick={() => {
                          setCreatingForParent(parent.id);
                          setNewName("");
                          setNewIcon("🏷️");
                        }}
                      >
                        <Plus size={16} /> Añadir subcategoría
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
