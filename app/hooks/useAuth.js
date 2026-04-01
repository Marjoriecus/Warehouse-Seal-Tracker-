import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userDept, setUserDept] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchPermissions(session.user.id);
      }
      setIsAuthenticating(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchPermissions(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
        setUserDept(null);
      }
      setIsAuthenticating(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchPermissions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, department')
        .eq('id', userId)
        .single();

      // --- SELF-CLEANING FAIL-SAFE ---
      // If we have a user but NO profile data, the session is corrupted/stale.
      if (error || !data) {
        console.warn("Stale session detected. Force clearing site data...");
        await supabase.auth.signOut();
        // We don't reload here to avoid infinite loops; 
        // resetting the state will kick the user back to the login screen.
        setUser(null);
        setUserRole(null);
        setUserDept(null);
      } else {
        setUserRole(data.role);
        setUserDept(data.department);
      }
    } catch (err) {
      console.error("Auth Hook Error:", err);
    }
  };

  return { user, userRole, userDept, isAuthenticating };
}