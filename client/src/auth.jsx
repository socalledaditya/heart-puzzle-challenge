import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, refreshToken } from './api';
import { closeSocket } from './socket';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

async function boot() {
  try {
    if (getToken()) {
      try {
        return (await api.get('/auth/me')).data.user;
      } catch { /* token expired -> try refresh cookie */ }
    }
    return (await refreshToken()).user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    boot().then((u) => { setUser(u); setLoading(false); });
    const onLogout = () => { closeSocket(); setUser(null); };
    window.addEventListener('hp:logout', onLogout);
    return () => window.removeEventListener('hp:logout', onLogout);
  }, []);

  const signIn = useCallback((data) => { setToken(data.accessToken); setUser(data.user); }, []);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setToken(null); closeSocket(); setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, signIn, logout }}>{children}</Ctx.Provider>;
}
