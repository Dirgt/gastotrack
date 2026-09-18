"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminParejas() {
  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUser1, setSelectedUser1] = useState<string>("");
  const [selectedUser2, setSelectedUser2] = useState<string>("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    // Fetch unassigned users via our custom Postgres RPC
    const { data, error } = await supabase.rpc('admin_get_unassigned_users');
    if (error) {
      console.error(error);
      setMessage("Error cargando usuarios: " + error.message);
    } else {
      setUnassignedUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    
    setLoading(true);
    setMessage("Creando...");

    const { data, error } = await supabase.rpc('admin_link_users_to_group', {
      p_group_name: newGroupName,
      p_user_id_1: selectedUser1 || null,
      p_user_id_2: selectedUser2 || null
    });

    if (error) {
      console.error(error);
      setMessage("Error creando grupo: " + error.message);
    } else {
      setMessage(`¡Grupo ${newGroupName} creado con éxito!`);
      setNewGroupName("");
      setSelectedUser1("");
      setSelectedUser2("");
      loadData();
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem", color: "#333" }}>Gestión de Parejas - Gastotrack (Admin Secreto)</h1>
      
      {message && <div style={{ padding: "1rem", backgroundColor: "#e2e8f0", marginBottom: "1rem", borderRadius: "8px" }}>{message}</div>}

      <div style={{ backgroundColor: "#f8fafc", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", color: "#334155" }}>1. Crear y Vincular Pareja</h2>
        <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Nombre de la Familia/Pareja (Ej. Los Pérez)</label>
            <input 
              type="text" 
              value={newGroupName} 
              onChange={(e) => setNewGroupName(e.target.value)} 
              required 
              style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Persona 1</label>
            <select 
              value={selectedUser1} 
              onChange={(e) => setSelectedUser1(e.target.value)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
            >
              <option value="">-- Seleccionar Persona 1 --</option>
              {unassignedUsers.map(u => (
                <option key={u.id} value={u.id}>{u.display_name} ({u.gender}) - {u.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Persona 2 (Opcional)</label>
            <select 
              value={selectedUser2} 
              onChange={(e) => setSelectedUser2(e.target.value)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
            >
              <option value="">-- Seleccionar Persona 2 --</option>
              {unassignedUsers.map(u => (
                <option key={u.id} value={u.id}>{u.display_name} ({u.gender}) - {u.email}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: "1rem", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
          >
            {loading ? "Procesando..." : "Crear y Vincular"}
          </button>
        </form>
      </div>

      <div>
        <h2 style={{ marginBottom: "1rem", color: "#334155" }}>Usuarios Registrados sin Pareja</h2>
        {loading && <p>Cargando...</p>}
        {!loading && unassignedUsers.length === 0 && <p>No hay usuarios pendientes.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {unassignedUsers.map(u => (
            <li key={u.id} style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
              <span><strong>{u.display_name}</strong> ({u.gender})</span>
              <span style={{ color: "#64748b" }}>{u.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
