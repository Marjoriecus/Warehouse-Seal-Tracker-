import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userDept, setUserDept] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    // To prevent memory leaks and state updates on unmounted components
    let mounted = true; 

    // FAIL-SAFE: If auth hangs for more than 8 seconds, force stop loading
    const globalTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("Auth check timed out. Defaulting to Login.");
        setIsAuthenticating(false);
      }
    }, 8000);

    // Hoisted fetchPermissions to keep logic encapsulated
    const fetchPermissions = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', userId)
          .single();

        if (error || !data) {
          await supabase.auth.signOut();
          if (mounted) setUser(null);
        } else if (mounted) {
          setUserRole(data.role);
          setUserDept(data.department);
        }
      } catch (err) {
        console.error("Permission fetch error:", err);
      }
    };

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          if (mounted) setUser(session.user);
          await fetchPermissions(session.user.id);
        }
      } catch (err) {
        console.error("Session recovery failed:", err);
      } finally {
        if (mounted) {
          setIsAuthenticating(false);
          clearTimeout(globalTimeout);
        }
      }
    };
    
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (mounted) setUser(session.user);
        await fetchPermissions(session.user.id);
      } else {
        if (mounted) {
          setUser(null);
          setUserRole(null);
          setUserDept(null);
        }
      }
      if (mounted) setIsAuthenticating(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(globalTimeout);
    };
  }, []);

  return { user, userRole, userDept, isAuthenticating };
}