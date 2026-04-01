import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userDept, setUserDept] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    // FAIL-SAFE: If auth hangs for more than 8 seconds, stop the loading screen
    const globalTimeout = setTimeout(() => {
      if (isAuthenticating) {
        console.warn("Auth check timed out. Defaulting to Login.");
        setIsAuthenticating(false);
      }
    }, 8000);

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          setUser(session.user);
          await fetchPermissions(session.user.id);
        }
      } catch (err) {
        console.error("Session recovery failed:", err);
      } finally {
        setIsAuthenticating(false);
        clearTimeout(globalTimeout);
      }
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

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(globalTimeout);
    };
  }, []);

  const fetchPermissions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, department')
        .eq('id', userId)
        .single();

      if (error || !data) {
        await supabase.auth.signOut();
        setUser(null);
      } else {
        setUserRole(data.role);
        setUserDept(data.department);
      }
    } catch (err) {
      console.error("Permission fetch error:", err);
    }
  };

  return { user, userRole, userDept, isAuthenticating };
}