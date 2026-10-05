import { ref, computed } from 'vue';
import type { User as UserType } from '../types';
import { hexclaveClientApp } from '../lib/hexclave';

export function useAuth(options?: { onSessionExpired?: () => void }) {
  const currentUser = ref<UserType | null>(null);
  const isAdminRole = computed(() => currentUser.value?.role === 'admin');
  const isMerchantRole = computed(() => currentUser.value?.role === 'merchant');
  const isDevMode = import.meta.env.DEV;

  const authToken = ref(typeof window !== 'undefined' ? localStorage.getItem('qris_admin_token') || '' : '');
  const isAuthenticated = ref(false);
  const authChecking = ref(true);

  const authFetch = async (url: string, fetchOptions: RequestInit = {}) => {
    const headers = new Headers(fetchOptions.headers || {});
    if (authToken.value) {
      headers.set('Authorization', `Bearer ${authToken.value}`);
    }
    const response = await fetch(url, { ...fetchOptions, headers });
    if (response.status === 401) {
      authToken.value = '';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('qris_admin_token');
      }
      isAuthenticated.value = false;
      options?.onSessionExpired?.();
    }
    return response;
  };

  const checkAuth = async (isCheckout = false): Promise<boolean> => {
    if (isCheckout) {
      authChecking.value = false;
      return false;
    }

    if (authToken.value) {
      try {
        const res = await fetch('/v1/auth/me', {
          headers: { Authorization: `Bearer ${authToken.value}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentUser.value = data.user;
          isAuthenticated.value = true;
          authChecking.value = false;
          return true;
        }
      } catch (err) {}
      authToken.value = '';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('qris_admin_token');
      }
    }

    try {
      const user = await hexclaveClientApp.getUser({ includeRestricted: true });
      if (user && !user.isRestricted) {
        const rawToken = await hexclaveClientApp.getAccessToken();
        if (rawToken) {
          const res = await fetch('/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: rawToken }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.token) {
            authToken.value = data.token;
            currentUser.value = data.user || { role: 'merchant' };
            if (typeof window !== 'undefined') {
              localStorage.setItem('qris_admin_token', data.token);
            }
            isAuthenticated.value = true;
            authChecking.value = false;
            return true;
          }
        }
      }
    } catch (err) {}

    isAuthenticated.value = false;
    authChecking.value = false;
    return false;
  };

  const handleLoginSuccess = async (token?: string) => {
    if (token) {
      authToken.value = token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('qris_admin_token', token);
      }
      try {
        const res = await fetch('/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentUser.value = data.user;
        }
      } catch (e) {}
    }

    isAuthenticated.value = true;
  };

  const navigateToSignIn = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const handleLogout = async () => {
    authToken.value = '';
    currentUser.value = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qris_admin_token');
    }
    isAuthenticated.value = false;
    try {
      await hexclaveClientApp.signOut();
    } catch (e) {}
  };

  return {
    currentUser,
    isAdminRole,
    isMerchantRole,
    isDevMode,
    authToken,
    isAuthenticated,
    authChecking,
    authFetch,
    checkAuth,
    handleLoginSuccess,
    navigateToSignIn,
    handleLogout,
  };
}
