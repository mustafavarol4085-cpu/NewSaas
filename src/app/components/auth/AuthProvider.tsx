import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../../services/supabase';

interface AuthContextType {
  user: any;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'rep' | 'manager' | 'admin') => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first (for demo user)
    const demoUserStr = localStorage.getItem('demoUser');
    if (demoUserStr) {
      try {
        const demoUser = JSON.parse(demoUserStr);
        setUser(demoUser);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('demoUser');
      }
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('Session check error:', err);
      setLoading(false);
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  const signUp = async (email: string, password: string, name: string, role: 'rep' | 'manager' | 'admin') => {
    try {
      // Sign up with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message || 'Sign up failed');
      }

      return { data: signUpData, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Demo login - Sarah Johnson
      if ((email === 'sarah@example.com' || email === 'Sarah Johnson') && password === 'demo123') {
        const demoRep = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'sarah@example.com',
          user_metadata: {
            name: 'Sarah Johnson',
            role: 'rep'
          }
        };
        
        localStorage.setItem('demoUser', JSON.stringify(demoRep));
        setUser(demoRep);
        return { data: { user: demoRep }, error: null };
      }

      // Demo login - Tom Martinez
      if ((email === 'tom@example.com' || email === 'Tom Martinez') && password === 'demo123') {
        const demoRep = {
          id: 'a0000000-0000-0000-0000-000000000002',
          email: 'tom@example.com',
          user_metadata: {
            name: 'Tom Martinez',
            role: 'rep'
          }
        };
        
        localStorage.setItem('demoUser', JSON.stringify(demoRep));
        setUser(demoRep);
        return { data: { user: demoRep }, error: null };
      }

      // Demo login - Emma Rodriguez
      if ((email === 'emma@example.com' || email === 'Emma Rodriguez') && password === 'demo123') {
        const demoRep = {
          id: 'a0000000-0000-0000-0000-000000000003',
          email: 'emma@example.com',
          user_metadata: {
            name: 'Emma Rodriguez',
            role: 'rep'
          }
        };
        
        localStorage.setItem('demoUser', JSON.stringify(demoRep));
        setUser(demoRep);
        return { data: { user: demoRep }, error: null };
      }

      // Demo login - Manager
      if ((email === 'manager@example.com' || email === 'John Manager') && password === 'demo123') {
        const demoManager = {
          id: 'b0000000-0000-0000-0000-000000000001',
          email: 'manager@example.com',
          user_metadata: {
            name: 'John Manager',
            role: 'manager'
          }
        };
        
        localStorage.setItem('demoUser', JSON.stringify(demoManager));
        setUser(demoManager);
        return { data: { user: demoManager }, error: null };
      }

      // Demo login - Admin
      if ((email === 'admin@example.com' || email === 'Admin User') && password === 'demo123') {
        const demoAdmin = {
          id: 'c0000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          user_metadata: {
            name: 'Admin User',
            role: 'admin'
          }
        };

        localStorage.setItem('demoUser', JSON.stringify(demoAdmin));
        setUser(demoAdmin);
        return { data: { user: demoAdmin }, error: null };
      }

      // Legacy support - Rep
      if (email === 'rep@example.com' && password === 'demo123') {
        const demoRep = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'rep@example.com',
          user_metadata: {
            name: 'Sarah Johnson',
            role: 'rep'
          }
        };
        
        localStorage.setItem('demoUser', JSON.stringify(demoRep));
        setUser(demoRep);
        return { data: { user: demoRep }, error: null };
      }

      // Gerçek Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        let friendlyMessage = error.message;
        if (error.message?.includes('Invalid login credentials')) {
          friendlyMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message?.includes('Email not confirmed')) {
          friendlyMessage = 'Please confirm your email address before signing in.';
        }
        return { data: null, error: { message: friendlyMessage } as any };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('demoUser');
    setUser(null);
    await supabase.auth.signOut().catch(() => {}); // Silent fail if not auth'd
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}