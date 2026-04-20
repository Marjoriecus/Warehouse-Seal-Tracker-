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

    // --- THE AUTO-HEAL PROTOCOL ---
    // If a poisoned cookie is detected, wipe everything automatically.
    const performNuclearReset = () => {
      console.warn("Stale session detected. Auto-wiping browser memory...");
      
      // Catch errors so the wipe continues even if the network is dead
      supabase.auth.signOut().catch(() => {}); 
      
      window.localStorage.clear();
      window.sessionStorage.clear();
      
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Force a fresh reload from the server, bypassing the cache
      window.location.href = window.location.origin; 
    };

    // FAIL-SAFE: If auth hangs for exactly 5 seconds, auto-wipe the cookies.
    const globalTimeout = setTimeout(() => {
      if (mounted && isAuthenticating) {
        performNuclearReset();
      }
    }, 5000);

    // Hoisted fetchPermissions to keep logic encapsulated
    const fetchPermissions = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', userId)
          .single();

        // Trigger Auto-Heal if permissions fail or return empty
        if (error || !data) {
          performNuclearReset();
        } else if (mounted) {
          setUserRole(data.role);
          setUserDept(data.department);
        }
      } catch (err) {
        console.error("Permission fetch error:", err);
        performNuclearReset();
      }
    };

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If Supabase flags an error, the cookie is poisoned. Throw it to the catch block.
        if (error) throw error; 

        if (session && !error) {
          if (mounted) setUser(session.user);
          await fetchPermissions(session.user.id);
        }
      } catch (err) {
        console.error("Session poisoned or recovery failed:", err);
        performNuclearReset(); // Trigger the auto-heal!
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