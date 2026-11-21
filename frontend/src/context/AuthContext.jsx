import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('notealert_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('notealert_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await api.get('/api/auth/me');
          if (res.ok && res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('notealert_user', JSON.stringify(res.data.user));
          } else {
            logout();
          }
        } catch (e) {
          // If offline, keep cached user
          console.warn('Could not verify token online, using cached session.');
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (username, password, rememberMe = true) => {
    const res = await api.post('/api/auth/login', { username, password, rememberMe });
    if (res.ok && res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('notealert_token', res.data.token);
      localStorage.setItem('notealert_user', JSON.stringify(res.data.user));
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Login failed.' };
  };

  const register = async (data) => {
    const res = await api.post('/api/auth/register', data);
    if (res.ok && res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('notealert_token', res.data.token);
      localStorage.setItem('notealert_user', JSON.stringify(res.data.user));
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.data?.message || 'Registration failed.' };
  };

  const forgotPasswordQuestion = async (username) => {
    const res = await api.post('/api/auth/forgot-password/question', { username });
    if (res.ok && res.data.success) {
      return { success: true, securityQuestion: res.data.securityQuestion };
    }
    return { success: false, message: res.data?.message || 'User not found.' };
  };

  const forgotPasswordReset = async (data) => {
    const res = await api.post('/api/auth/forgot-password/reset', data);
    if (res.ok && res.data.success) {
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.data?.message || 'Password reset failed.' };
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const res = await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return res.data;
  };

  const updateProfile = async (data) => {
    const res = await api.put('/api/auth/profile', data);
    if (res.ok && res.data.success) {
      setUser((prev) => ({ ...prev, ...res.data.user }));
      localStorage.setItem('notealert_user', JSON.stringify({ ...user, ...res.data.user }));
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.data?.message || 'Profile update failed.' };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('notealert_token');
    localStorage.removeItem('notealert_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        forgotPasswordQuestion,
        forgotPasswordReset,
        changePassword,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
