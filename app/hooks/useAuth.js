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
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchPermissions = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, department')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setUserRole(data.role);
      setUserDept(data.department);
    }
  };

  return { user, userRole, userDept, isAuthenticating };
}