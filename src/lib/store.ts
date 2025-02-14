import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

interface UserState {
  user: any | null;
  profile: any | null;
  dailyRoutines: any[];
  goals: any[];
  notifications: {
    items: any[];
    unread: number;
  };
  settings: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
    accessibility: {
      reduceMotion: boolean;
      highContrast: boolean;
    };
  };

  // Actions
  setUser: (user: any | null) => void;
  setProfile: (profile: any | null) => void;
  updateSettings: (settings: Partial<UserState['settings']>) => void;
  fetchUserData: () => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
  addNotification: (type: string, message: string) => void;
  markNotificationAsRead: (id: string) => void;
}

const initialState = {
  user: null,
  profile: null,
  dailyRoutines: [],
  goals: [],
  notifications: {
    items: [],
    unread: 0
  },
  settings: {
    theme: 'system' as const,
    fontSize: 'medium' as const,
    notifications: {
      email: true,
      push: true,
      inApp: true,
    },
    accessibility: {
      reduceMotion: false,
      highContrast: false,
    },
  }
};

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      
      setProfile: (profile) => set({ profile }),

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      fetchUserData: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          set({ profile });

          // Get user settings
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (settingsError && settingsError.code !== 'PGRST116') {
            throw settingsError;
          }

          // Update settings if they exist
          if (settings) {
            set((state) => ({
              settings: {
                theme: settings.theme || state.settings.theme,
                fontSize: settings.font_size || state.settings.fontSize,
                notifications: settings.notifications || state.settings.notifications,
                accessibility: settings.accessibility || state.settings.accessibility,
              }
            }));
          }

          // Get daily routines
          const { data: routines, error: routinesError } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('user_id', user.id);

          if (routinesError) throw routinesError;
          set({ dailyRoutines: routines || [] });

          // Get goals
          const { data: goals, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id);

          if (goalsError) throw goalsError;
          set({ goals: goals || [] });

        } catch (error) {
          console.error('Error fetching user data:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          get().reset();
        } catch (error) {
          console.error('Error logging out:', error);
          throw error;
        }
      },

      reset: () => {
        const currentTheme = get().settings.theme;
        set({
          ...initialState,
          settings: {
            ...initialState.settings,
            theme: currentTheme // Preserve theme preference
          }
        });
      },

      addNotification: (type, message) =>
        set((state) => ({
          notifications: {
            items: [
              {
                id: Date.now().toString(),
                type,
                message,
                read: false,
                createdAt: new Date(),
              },
              ...state.notifications.items,
            ],
            unread: state.notifications.unread + 1,
          },
        })),

      markNotificationAsRead: (id) =>
        set((state) => ({
          notifications: {
            items: state.notifications.items.map((item) =>
              item.id === id ? { ...item, read: true } : item
            ),
            unread: Math.max(0, state.notifications.unread - 1),
          },
        })),
    }),
    {
      name: 'goodaideas-storage',
      partialize: (state) => ({
        settings: state.settings
      }),
    }
  )
);