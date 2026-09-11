"use client";

import styles from "./BottomNav.module.css";
import { Home, PieChart, Goal, User, Plus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav({ onAddClick }: { onAddClick: () => void }) {
  const pathname = usePathname();

  return (
    <div className={styles.navContainer}>
      <nav className={styles.navBar}>
        <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
          <Home size={22} />
        </Link>
        <Link href="/cuentas" className={`${styles.navItem} ${pathname === '/cuentas' ? styles.active : ''}`}>
          <ClipboardList size={22} />
        </Link>
        
        {/* Placeholder para centrar el FAB */}
        <div className={styles.fabSpacer}></div>

        <Link href="/goals" className={`${styles.navItem} ${pathname === '/goals' ? styles.active : ''}`}>
          <Goal size={22} />
        </Link>
        <Link href="/profile" className={`${styles.navItem} ${pathname === '/profile' ? styles.active : ''}`}>
          <User size={22} />
        </Link>
      </nav>

      {/* FAB Floating Action Button */}
      <button className={styles.fab} onClick={onAddClick}>
        <Plus size={28} color="white" />
      </button>
    </div>
  );
}
