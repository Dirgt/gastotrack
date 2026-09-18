-- 1. Añadir columnas a la tabla 'goals' existente
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'mensual',
ADD COLUMN IF NOT EXISTS installment_amount numeric DEFAULT 0;

-- 2. Crear la tabla de aportes a metas (goal_contributions)
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount numeric NOT NULL,
  contributor_name text, -- Para identificar si fue "Santi" u otro en pareja
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS (Seguridad a nivel de fila) para la nueva tabla
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- 4. Crear política de seguridad: el usuario solo puede ver y editar sus propios aportes
CREATE POLICY "Users can manage their own goal contributions." 
ON public.goal_contributions 
FOR ALL USING (auth.uid() = user_id);
