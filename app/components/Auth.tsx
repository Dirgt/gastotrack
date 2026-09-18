"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./Auth.module.css";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("mujer"); // default
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              gender: gender,
            }
          }
        });
        if (error) throw error;
        // La sesión se iniciará automáticamente si la confirmación de correo está desactivada.
      }
    } catch (error: any) {
      setError(error.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h1 className={styles.title}>Gastotrack</h1>
        <p className={styles.subtitle}>
          {isLogin ? "Inicia sesión para continuar" : "Crea tu cuenta gratis"}
        </p>

        <form onSubmit={handleAuth} className={styles.form}>
          {!isLogin && (
            <>
              <input
                className={styles.input}
                type="text"
                placeholder="Tu primer nombre (Ej. Juan)"
                value={firstName}
                required
                onChange={(e) => setFirstName(e.target.value)}
              />
              <select 
                className={styles.input} 
                value={gender} 
                onChange={(e) => setGender(e.target.value)}
                style={{ backgroundColor: '#fff', cursor: 'pointer' }}
              >
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="otro">Otro</option>
              </select>
            </>
          )}

          <input
            className={styles.input}
            type="email"
            placeholder="Tu correo"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Tu contraseña"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          
          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? "Cargando..." : isLogin ? "Entrar" : "Registrarse"}
          </button>
        </form>

        <button 
          className={styles.toggleBtn}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
        </button>
      </div>
    </div>
  );
}
