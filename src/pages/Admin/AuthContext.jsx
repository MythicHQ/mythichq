import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);
const DEFAULT_APP_URL = 'https://mythichq.vercel.app';
const getSelectedViewerProfileKey = (userId) => `mythichq:selected-viewer-profile:${userId}`;

const getAuthRedirectUrl = () => {
  const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const appUrl = isLocalDevelopment ? window.location.origin : DEFAULT_APP_URL;

  return new URL(window.location.pathname, appUrl).toString();
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedViewerProfile, setSelectedViewerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!user?.id) return;
    const storedSelection = sessionStorage.getItem(getSelectedViewerProfileKey(user.id));
    if (!storedSelection) {
      setSelectedViewerProfile(null);
      return;
    }

    try {
      const selection = JSON.parse(storedSelection);
      setSelectedViewerProfile(selection?.user_id === user.id ? selection : null);
    } catch (error) {
      console.error('Saved viewing profile could not be restored:', error);
      sessionStorage.removeItem(getSelectedViewerProfileKey(user.id));
      setSelectedViewerProfile(null);
    }
  }, [user?.id]);

  const loadProfile = async (userId, currentUser = user) => {
    if (!supabase || !userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Profile load failed:', error);
    }

    const nextProfile = data || {
      id: userId,
      email: currentUser?.email || '',
      username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || '',
      full_name: currentUser?.user_metadata?.full_name || '',
      bio: currentUser?.user_metadata?.bio || '',
      avatar_url: currentUser?.user_metadata?.avatar_url || null,
      youtube_url: currentUser?.user_metadata?.youtube_url || '',
      instagram_url: currentUser?.user_metadata?.instagram_url || '',
      x_url: currentUser?.user_metadata?.x_url || '',
      website_url: currentUser?.user_metadata?.website_url || '',
      favorite_genres: currentUser?.user_metadata?.favorite_genres || '',
      role: 'user',
    };

    profileRef.current = nextProfile;
    setProfile(nextProfile);
    return nextProfile;
  };

  const refreshUser = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session fetch failed:', sessionError);
    }

    const currentSession = sessionData?.session ?? null;
    const currentUser = currentSession?.user ?? null;

    setSession(currentSession);
    setUser(currentUser);

    if (currentUser) {
      if (profileRef.current?.id === currentUser.id) {
        setLoading(false);
        return;
      }
      await loadProfile(currentUser.id, currentUser);
    } else {
      profileRef.current = null;
      setProfile(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let profileLoadGeneration = 0;
    let profileLoadTimeout;
    let profileUserId = null;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;

      if (event === 'PASSWORD_RECOVERY' && nextSession?.user) {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT' || !nextSession) {
        setIsPasswordRecovery(false);
      }

      if (!nextUser) {
        const previousUserId = profileRef.current?.id;
        if (previousUserId) sessionStorage.removeItem(getSelectedViewerProfileKey(previousUserId));
        setSelectedViewerProfile(null);
        profileLoadGeneration += 1;
        window.clearTimeout(profileLoadTimeout);
        profileUserId = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (profileRef.current && profileRef.current.id !== nextUser.id) {
        profileRef.current = null;
        setProfile(null);
        setSelectedViewerProfile(null);
      }

      setUser((currentUser) => (
        event === 'TOKEN_REFRESHED' && currentUser?.id === nextUser.id
          ? currentUser
          : nextUser
      ));

      if (event === 'TOKEN_REFRESHED' && profileUserId === nextUser.id) return;
      if (profileRef.current?.id === nextUser.id) {
        profileUserId = nextUser.id;
        setLoading(false);
        return;
      }

      const generation = ++profileLoadGeneration;
      window.clearTimeout(profileLoadTimeout);
      profileUserId = nextUser.id;
      setLoading(true);
      profileLoadTimeout = window.setTimeout(() => {
        void loadProfile(nextUser.id, nextUser)
          .catch((error) => {
            console.error('Profile load failed after authentication:', error);
          })
          .finally(() => {
            if (generation === profileLoadGeneration) {
              setLoading(false);
            }
          });
      }, 0);
    });

    return () => {
      profileLoadGeneration += 1;
      window.clearTimeout(profileLoadTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ email, password, fullName }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName || '',
        },
      },
    });

    if (error) throw error;

    return data;
  };

  const sendWelcomeNotification = async (userId) => {
    if (!supabase || !userId) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: 'Welcome to MythicHQ',
          message: 'Welcome to MythicHQ — discover hand-picked movie recommendations, build your watchlist, and find your next favorite film.',
          body: 'Welcome to MythicHQ — discover hand-picked movie recommendations, build your watchlist, and find your next favorite film.',
          type: 'announcement',
          priority: 'normal',
          recipient_scope: 'specific_users',
          recipient_ids: [userId],
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivery_status: 'sent',
          created_by: userId,
        });

      if (error) {
        console.error('Welcome notification creation failed:', error);
      }
    } catch (error) {
      console.error('Unexpected welcome notification error:', error);
    }
  };

  const signIn = async ({ email, password }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user?.id) {
      await sendWelcomeNotification(data.user.id);
    }

    return data;
  };

  const requestPhoneOtp = async (phone) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    return data;
  };

  const verifyPhoneOtp = async ({ phone, token }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;

    if (data?.user?.id) {
      await sendWelcomeNotification(data.user.id);
    }

    return data;
  };

  const signInWithProvider = async (provider) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    if (user?.id) sessionStorage.removeItem(getSelectedViewerProfileKey(user.id));
    setSelectedViewerProfile(null);
  };

  const selectViewerProfile = (viewerProfile) => {
    if (!user?.id) throw new Error('Sign in again to select a viewing profile.');
    if (!viewerProfile) {
      sessionStorage.removeItem(getSelectedViewerProfileKey(user.id));
      setSelectedViewerProfile(null);
      return;
    }
    if (viewerProfile.user_id !== user.id) {
      throw new Error('This viewing profile does not belong to your account.');
    }
    sessionStorage.setItem(getSelectedViewerProfileKey(user.id), JSON.stringify(viewerProfile));
    setSelectedViewerProfile(viewerProfile);
  };

  const requireAuth = () => {
    setAuthPromptOpen(true);
  };

  const resetPassword = async (email) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  const updatePassword = useCallback(async (password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    if (!isPasswordRecovery || !session?.user) {
      throw new Error('This password reset link is invalid or has expired. Request a new reset link.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user || sessionData.session.user.id !== session.user.id) {
      setIsPasswordRecovery(false);
      throw new Error('This password reset link is invalid or has expired. Request a new reset link.');
    }

    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    setIsPasswordRecovery(false);
    return data;
  }, [isPasswordRecovery, session]);

  const updateProfile = async (updates) => {
    if (!supabase || !user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select();

    if (error) throw error;

    const nextProfile = Array.isArray(data) ? data[0] : data;
    if (!nextProfile) {
      return null;
    }

    setProfile(nextProfile);
    return nextProfile;
  };

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      selectedViewerProfile,
      loading,
      signUp,
      signIn,
      requestPhoneOtp,
      verifyPhoneOtp,
      signInWithProvider,
      signOut,
      resetPassword,
      updatePassword,
      isPasswordRecovery,
      updateProfile,
      selectViewerProfile,
      refreshUser,
      requireAuth,
      authPromptOpen,
      closeAuthPrompt: () => setAuthPromptOpen(false),
    }),
    [session, user, profile, selectedViewerProfile, loading, authPromptOpen, isPasswordRecovery, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
