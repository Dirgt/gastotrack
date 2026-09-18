"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export type UserProfile = {
  id: string;
  group_id: string | null;
  display_name: string;
  gender: string;
  color_bg: string;
  color_text: string;
};

type UserContextType = {
  currentUserProfile: UserProfile | null;
  groupProfiles: UserProfile[];
  loadingProfile: boolean;
  getProfile: (userId: string | null | undefined) => UserProfile | null;
};

const UserContext = createContext<UserContextType>({
  currentUserProfile: null,
  groupProfiles: [],
  loadingProfile: true,
  getProfile: () => null,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [groupProfiles, setGroupProfiles] = useState<UserProfile[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setLoadingProfile(false);
        return;
      }

      // Load my profile
      const { data: myProfile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (myProfile && mounted) {
        setCurrentUserProfile(myProfile);
        
        // If I have a group, load everyone in my group
        if (myProfile.group_id) {
          const { data: groupData } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("group_id", myProfile.group_id);
          
          if (groupData) setGroupProfiles(groupData);
        } else {
          setGroupProfiles([myProfile]);
        }
      }
      if (mounted) setLoadingProfile(false);
    }

    loadProfile();
    
    // Listen to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserProfile(null);
        setGroupProfiles([]);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const getProfile = (userId: string | null | undefined) => {
    if (!userId) return null;
    return groupProfiles.find(p => p.id === userId) || null;
  };

  return (
    <UserContext.Provider value={{ currentUserProfile, groupProfiles, loadingProfile, getProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUserContext = () => useContext(UserContext);
