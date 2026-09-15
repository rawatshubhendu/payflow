'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  UserSummary,
  BusinessSummary,
  AuthResult,
  LoginRequest,
  RegisterRequest,
  RegisterResult,
  VerifyEmailRequest,
  ResendOtpRequest,
  ResendOtpResult,
} from '@payflow/types';
import { api, ApiError } from './api-client';

type AuthContextType = {
  user: UserSummary | null;
  business: BusinessSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<AuthResult>;
  register: (data: RegisterRequest) => Promise<RegisterResult>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<AuthResult>;
  resendOtp: (data: ResendOtpRequest) => Promise<ResendOtpResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<AuthResult>('/api/auth/me');
      setUser(data.user);
      setBusiness(data.business);
    } catch {
      setUser(null);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (data: LoginRequest): Promise<AuthResult> => {
    const result = await api.post<AuthResult>('/api/auth/login', data);
    setUser(result.user);
    setBusiness(result.business);
    return result;
  };

  const register = async (data: RegisterRequest): Promise<RegisterResult> => {
    return await api.post<RegisterResult>('/api/auth/register', data);
  };

  const verifyEmail = async (data: VerifyEmailRequest): Promise<AuthResult> => {
    const result = await api.post<AuthResult>('/api/auth/verify-email', data);
    setUser(result.user);
    setBusiness(result.business);
    return result;
  };

  const resendOtp = async (data: ResendOtpRequest): Promise<ResendOtpResult> => {
    return await api.post<ResendOtpResult>('/api/auth/resend-otp', data);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post<{ success: boolean }>('/api/auth/logout');
    } finally {
      setUser(null);
      setBusiness(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmail,
        resendOtp,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { ApiError };
