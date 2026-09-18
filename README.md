# Gastotrack SaaS

Bienvenido a **Gastotrack**, una aplicación moderna para la gestión financiera personal y familiar, construida bajo un modelo SaaS multi-tenant.

## 🚀 Tecnologías Core
- **Framework:** Next.js 16 (App Router + Turbopack)
- **Base de Datos:** PostgreSQL (alojado en Supabase)
- **Autenticación & RLS:** Supabase Auth + Row Level Security
- **Estilos:** CSS Modules + Variables Nativas (CSS)

## 📁 Arquitectura Multitenant (Parejas/Familias)
El sistema está diseñado para que los usuarios puedan registrar transacciones en modo "Single" (individual) o en modo "Familia" compartiendo la misma cuenta.
- El aislamiento de datos se garantiza mediante un **`group_id`** en la base de datos (con políticas estrictas de RLS).
- **Auto-Fusión de Historias:** Si dos usuarios se enlazan mediante el panel de Administrador, la base de datos se encarga de reasignar y unificar sus historiales pasados (transacciones y metas) a su nuevo "Grupo Familiar" de manera automática.

## 🗺️ Mapa de la Aplicación (Rutas)

### Dashboard y Finanzas
- **`/` (Home):** Panel principal. Muestra resúmenes del mes, top categorías y el **Motor Inteligente de Alertas**.
- **`/cuentas`:** Cuentas por cobrar y pagar. Integra el control inteligente de **Fechas de Suspensión** para servicios públicos.
- **`/transactions`:** Historial unificado de todos tus movimientos financieros y los de tu familia, ordenados de forma cronológica.

### Ahorros y Estadísticas
- **`/goals`:** Sistema de metas de ahorro compartido. Crea un objetivo y deposita hasta alcanzar tu meta.
- **`/analytics`:** Gráficas en tiempo real de ingresos y gastos.
- **`/categorias`:** Gestor de categorías y subcategorías personalizables por el usuario.

### Ajustes y Administración
- **`/profile`:** Ajustes de cuenta y perfil del usuario.
- **`/admin-parejas-secreto`:** Panel interno de super-administrador para emparejar y vincular cuentas (`user_id` -> `group_id`).

## 🚨 Motor de Alertas de Servicios Públicos
La aplicación es capaz de prever futuros cortes de tus servicios (Agua, Luz, Internet).
Cuando añades un gasto con la categoría `Servicios`, se desbloquea el campo `Fecha de Suspensión`. La campana de alertas en el Dashboard evaluará este dato para arrojar advertencias:
1. **Preventiva (Amarillo):** Faltan 5 días para vencer.
2. **Normal (Rojo oscuro):** El pago atrasó.
3. **Urgente (Naranja):** Ya venció pero no lo han cortado (Aviso de riesgo de suspensión).
4. **Crítica (Rojo intenso):** ¡Servicio suspendido! Fecha de corte superada.

---

*Proyecto en desarrollo continuo para ser la solución SaaS financiera #1.*
