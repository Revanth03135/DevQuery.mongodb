import { createContext, useContext, useState, useEffect, useCallback } from 'react'; // 1. Import useCallback
import api from '../utils/api';

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      setUser(userData);
    }
    setLoading(false);
  }, []);

  // 2. Wrap your functions in useCallback
  const signup = useCallback(async (name, email, password) => {
    const response = await api.post('/api/auth/register', { name, email, password });
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      setUser(response.data);
    }
    return response.data;
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      setUser(response.data);
    }
    return response.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {!loading && children}
    </UserContext.Provider>
  );
}