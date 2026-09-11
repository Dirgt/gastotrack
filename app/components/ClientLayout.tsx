"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Session } from "@supabase/supabase-js";
import Auth from "./Auth";
import BottomNav from "./BottomNav";
import NumpadForm from "./NumpadForm";
import { usePathname, useRouter } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (window.location.hash.includes('access_token') || window.location.hash.includes('error_code')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const handleOpenModal = () => setShowForm(true);
    window.addEventListener("open_transaction_modal", handleOpenModal);
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => console.log('SW registered:', registration.scope))
        .catch((error) => console.log('SW registration failed:', error));
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("open_transaction_modal", handleOpenModal);
    };
  }, []);

  const handleTransactionAdded = () => {
    // Disparar evento para que cualquier pantalla (Dashboard, Analytics) se actualice
    window.dispatchEvent(new Event("transaction_added"));
    router.push('/');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>Cargando Gastotrack...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      {children}
      
      {/* Navegación Inferior Flotante Global */}
      <BottomNav onAddClick={() => setShowForm(true)} />

      {/* Formulario tipo Numpad Pantalla Completa Global */}
      {showForm && (
        <NumpadForm 
          onClose={() => setShowForm(false)} 
          onAdded={handleTransactionAdded} 
        />
      )}
    </>
  );
}
