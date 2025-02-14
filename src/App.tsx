import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Ideas } from './pages/Ideas';
import { IdeaDetails } from './pages/IdeaDetails';
import { Settings } from './pages/Settings';
import { Insights } from './pages/Insights';
import { Dashboard } from './pages/Dashboard';
import { useStore } from './lib/store';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './components/ThemeProvider';
import { AccessibilityProvider } from './components/AccessibilityProvider';
import { VoiceCommandProvider } from './components/VoiceCommands/VoiceCommandProvider';
import { ModerationProvider } from './components/ContentModeration/ModerationProvider';

function App() {
  const { user, setUser, fetchUserData } = useStore();

  useEffect(() => {
    // Handle initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, fetchUserData]);

  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <VoiceCommandProvider>
          <ModerationProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="search" element={<Search />} />
                <Route path="ideas" element={<Ideas />} />
                <Route path="ideas/:id" element={<IdeaDetails />} />
                <Route 
                  path="dashboard" 
                  element={user ? <Dashboard /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="profile" 
                  element={user ? <Profile /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="settings" 
                  element={user ? <Settings /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="insights" 
                  element={user ? <Insights /> : <Navigate to="/login" />} 
                />
                <Route 
                  path="login" 
                  element={!user ? <Login /> : <Navigate to="/dashboard" />} 
                />
              </Route>
            </Routes>
          </ModerationProvider>
        </VoiceCommandProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

export default App;