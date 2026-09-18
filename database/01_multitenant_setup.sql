-- ==========================================
-- GASTOTRACK SAAS - MULTITENANT MIGRATION
-- ==========================================

-- 1. Create the `groups` table (Couples/Families)
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 2. Create the `user_profiles` table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
    display_name text NOT NULL,
    gender text,
    color_bg text,
    color_text text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Add `group_id` to `transactions` and `goals`
-- Since we are migrating, we add the column as nullable first.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Function to handle new user signups and assign random colors based on gender
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_gender text;
    new_name text;
    bg_color text;
    text_color text;
    random_num integer;
BEGIN
    -- Extract metadata from the signup request
    new_name := new.raw_user_meta_data->>'first_name';
    new_gender := new.raw_user_meta_data->>'gender';
    
    -- Fallbacks
    IF new_name IS NULL THEN new_name := 'Usuario'; END IF;
    IF new_gender IS NULL THEN new_gender := 'otro'; END IF;

    -- Generate random color variations
    random_num := floor(random() * 5); -- 0 to 4

    IF lower(new_gender) = 'hombre' THEN
        -- Blue / Green / Slate tones for men
        IF random_num = 0 THEN bg_color := 'rgba(59, 130, 246, 0.15)'; text_color := '#3b82f6'; -- Blue
        ELSIF random_num = 1 THEN bg_color := 'rgba(16, 185, 129, 0.15)'; text_color := '#10b981'; -- Emerald
        ELSIF random_num = 2 THEN bg_color := 'rgba(99, 102, 241, 0.15)'; text_color := '#6366f1'; -- Indigo
        ELSIF random_num = 3 THEN bg_color := 'rgba(14, 165, 233, 0.15)'; text_color := '#0ea5e9'; -- Sky
        ELSE bg_color := 'rgba(71, 85, 105, 0.15)'; text_color := '#475569'; -- Slate
        END IF;
    ELSIF lower(new_gender) = 'mujer' THEN
        -- Pink / Purple / Rose tones for women
        IF random_num = 0 THEN bg_color := 'rgba(236, 72, 153, 0.15)'; text_color := '#ec4899'; -- Pink
        ELSIF random_num = 1 THEN bg_color := 'rgba(168, 85, 247, 0.15)'; text_color := '#a855f7'; -- Purple
        ELSIF random_num = 2 THEN bg_color := 'rgba(244, 63, 94, 0.15)'; text_color := '#f43f5e'; -- Rose
        ELSIF random_num = 3 THEN bg_color := 'rgba(217, 70, 239, 0.15)'; text_color := '#d946ef'; -- Fuchsia
        ELSE bg_color := 'rgba(249, 115, 22, 0.15)'; text_color := '#f97316'; -- Orange
        END IF;
    ELSE
        -- Neutral tones
        bg_color := 'rgba(107, 114, 128, 0.15)'; text_color := 'var(--text-muted)';
    END IF;

    -- Insert the profile
    INSERT INTO public.user_profiles (id, display_name, gender, color_bg, color_text)
    VALUES (new.id, new_name, new_gender, bg_color, text_color);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- ROW LEVEL SECURITY POLICIES (MULTITENANT)
-- ==========================================

-- 1. user_profiles
-- Users can see their own profile, and the profiles of users in their group.
CREATE POLICY "Users can view profiles in their group" ON public.user_profiles
FOR SELECT USING (
    id = auth.uid() 
    OR group_id = (SELECT group_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (id = auth.uid());

-- 2. groups
CREATE POLICY "Users can view their group" ON public.groups
FOR SELECT USING (
    id = (SELECT group_id FROM public.user_profiles WHERE id = auth.uid())
);

-- 3. transactions
-- Allow users to insert if they assign their own user_id and their correct group_id
CREATE POLICY "Users can insert transactions for their group" ON public.transactions
FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND group_id = (SELECT group_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Allow users to select transactions that belong to their group
CREATE POLICY "Users can view transactions in their group" ON public.transactions
FOR SELECT USING (
    group_id = (SELECT group_id FROM public.user_profiles WHERE id = auth.uid())
    -- Fallback for legacy transactions that don't have a group_id yet (Santi & Kate)
    OR user_id = auth.uid()
);

-- Allow updates/deletes only if they own the transaction OR it belongs to their group
CREATE POLICY "Users can update group transactions" ON public.transactions
FOR UPDATE USING (
    group_id = (SELECT group_id FROM public.user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can delete group transactions" ON public.transactions
FOR DELETE USING (
    group_id = (SELECT group_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Note: You can create an admin role/function bypass later for the Secret Admin route, 
-- but for simplicity the Admin route will use the Anon Key but we will write a Postgres Function 
-- to safely link users to groups without exposing the whole user table to everyone.

-- RPC Function for the Secret Admin Panel to link users
CREATE OR REPLACE FUNCTION admin_link_users_to_group(
    p_group_name text,
    p_user_id_1 uuid,
    p_user_id_2 uuid
)
RETURNS uuid AS $$
DECLARE
    new_group_id uuid;
BEGIN
    -- Create the new group
    INSERT INTO public.groups (name) VALUES (p_group_name) RETURNING id INTO new_group_id;
    
    -- Link user 1
    IF p_user_id_1 IS NOT NULL THEN
        UPDATE public.user_profiles SET group_id = new_group_id WHERE id = p_user_id_1;
    END IF;
    
    -- Link user 2
    IF p_user_id_2 IS NOT NULL THEN
        UPDATE public.user_profiles SET group_id = new_group_id WHERE id = p_user_id_2;
    END IF;
    
    RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function to get unassigned users (Security Definer so the admin route can see them)
CREATE OR REPLACE FUNCTION admin_get_unassigned_users()
RETURNS TABLE (
    id uuid,
    display_name text,
    gender text,
    email text,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY 
    SELECT p.id, p.display_name, p.gender, u.email::text, p.created_at
    FROM public.user_profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.group_id IS NULL
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
