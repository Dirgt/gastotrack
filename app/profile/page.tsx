"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./page.module.css";
import { ChevronLeft, LogOut, Fingerprint, Moon, Sun, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [userName, setUserName] = useState("Usuario");
  const [email, setEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.email?.split('@')[0] || "Usuario");
        setEmail(user.email || "");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className={`container ${styles.mainWrapper}`}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </Link>
          <span className={styles.title}>Ajustes y Perfil</span>
          <div style={{ width: 24 }}></div>
        </div>
      </header>

      <section className={styles.profileSection}>
        <div className={styles.avatar}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <h2 className={styles.name}>{userName}</h2>
        <p className={styles.email}>{email}</p>
      </section>

      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Seguridad</h3>
        <div className={styles.settingCard}>
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <Fingerprint size={20} className={styles.settingIcon} />
              <span>Bloqueo con Huella</span>
            </div>
            <div className={styles.toggle}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Administración</h3>
        <Link href="/categorias" style={{ textDecoration: 'none' }}>
          <div className={styles.settingCard}>
            <div className={styles.settingRow}>
              <div className={styles.settingLeft}>
                <div className={styles.iconCircle} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                  <Globe size={18} />
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>Gestor de Categorías</span>
              </div>
              <ChevronLeft size={20} color="var(--text-muted)" style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>
        </Link>
      </div>

      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Apariencia</h3>
        <div className={styles.settingCard}>
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <Sun size={20} className={styles.settingIcon} />
              <span>Modo Claro</span>
            </div>
            <div className={`${styles.toggle} ${styles.toggleActive}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <Moon size={20} className={styles.settingIcon} />
              <span>Modo Oscuro</span>
            </div>
            <div className={styles.toggle}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Idioma Regional</h3>
        <div className={styles.settingCard}>
          <div className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <Globe size={20} className={styles.settingIcon} />
              <span>Idioma</span>
            </div>
            <span className={styles.settingValue}>Español</span>
          </div>
        </div>
      </div>

      <button onClick={handleLogout} className={styles.logoutBtn}>
        Cerrar Sesión
      </button>
    </main>
  );
}
