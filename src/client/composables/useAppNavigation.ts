import { ref, computed, type Ref } from 'vue';
import { useClipboard } from './useClipboard';

export type ActiveTab = 'dashboard' | 'transactions' | 'qris' | 'apps' | 'listener' | 'playground' | 'docs' | 'settings' | 'webhooks';

interface NavigationOptions {
  isAdminRole: Ref<boolean>;
  authChecking: Ref<boolean>;
  showToast: (msg: string) => void;
}

export function useAppNavigation(options: NavigationOptions) {
  const { isAdminRole, authChecking, showToast } = options;
  const { copy } = useClipboard();

  // Route State
  const isPanelRoute = ref(
    typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/panel'))
  );

  const isMerchantMode = computed(() => {
    if (!isAdminRole.value) return true;
    return !isPanelRoute.value;
  });
  // Backward-compatibility alias
  const isMerchant = isMerchantMode;

  const isCheckoutRoute = ref(
    typeof window !== 'undefined' ? window.location.pathname.startsWith('/checkout/') : false
  );
  const checkoutChargeId = ref(
    (typeof window !== 'undefined' && isCheckoutRoute.value)
      ? window.location.pathname.split('/checkout/')[1] || ''
      : ''
  );

  const isSignUpRoute = ref(false);
  const isForgotPasswordRoute = ref(false);
  const isPasswordResetRoute = ref(false);
  const isEmailVerificationRoute = ref(false);
  const isAccountSettingsRoute = ref(false);
  const isErrorRoute = ref(false);
  const isMfaRoute = ref(false);

  const activeTab = ref<ActiveTab>('dashboard');
  const originUrl = ref(typeof window !== 'undefined' ? window.location.origin : '');
  const copiedRoute = ref(false);

  // Full Width Layout Mode State
  const isFullWidthMode = ref(
    typeof window !== 'undefined' ? localStorage.getItem('qris_full_width_mode') === 'true' : false
  );

  // Mobile Drawer State
  const isMobileDrawerOpen = ref(false);
  const toggleMobileDrawer = () => {
    isMobileDrawerOpen.value = !isMobileDrawerOpen.value;
  };
  const closeMobileDrawer = () => {
    isMobileDrawerOpen.value = false;
  };

  const toggleFullWidth = () => {
    isFullWidthMode.value = !isFullWidthMode.value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('qris_full_width_mode', String(isFullWidthMode.value));
    }
  };

  const currentRoutePath = computed(() => {
    const prefix = isPanelRoute.value
      ? (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? '/admin' : '/panel')
      : '/dashboard';
    if (activeTab.value === 'dashboard') return prefix;
    return `${prefix}/${activeTab.value}`;
  });

  const pageTitle = computed(() => {
    if (isMerchantMode.value) {
      switch (activeTab.value) {
        case 'dashboard':
          return 'Dashboard Toko';
        case 'transactions':
          return 'Transaksi Toko';
        case 'qris':
          return 'QRIS Toko Saya';
        case 'apps':
          return 'API Key & Webhook Toko';
        case 'listener':
          return 'Notifikasi HP Toko';
        case 'webhooks':
          return 'Riwayat Webhook Toko';
        case 'docs':
          return 'Panduan Integrasi Toko';
        case 'settings':
          return 'Pengaturan Akun Toko';
        default:
          return 'Dashboard Toko';
      }
    } else {
      switch (activeTab.value) {
        case 'dashboard':
          return 'Platform Control Panel';
        case 'transactions':
          return 'Transaksi Global';
        case 'apps':
          return 'SaaS Clients (Mitra Platform)';
        case 'webhooks':
          return 'Gateway Webhook Delivery Queue';
        case 'qris':
          return 'Master QRIS Platform (Gateway Default)';
        case 'listener':
          return 'Central HP Listeners';
        case 'playground':
          return 'Playground Simulator (Dev Tools)';
        case 'docs':
          return 'Spesifikasi REST API & Swagger';
        case 'settings':
          return 'Gateway Settings & Konfigurasi';
        default:
          return 'Platform Control Panel';
      }
    }
  });

  const syncTabFromUrl = () => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname.toLowerCase();

    // 1. Checkout route
    isCheckoutRoute.value = pathname.startsWith('/checkout/');
    if (isCheckoutRoute.value) {
      checkoutChargeId.value = window.location.pathname.split('/checkout/')[1] || '';
      return;
    }

    // 2. Custom Hexclave auth/system pages
    isSignUpRoute.value = pathname.startsWith('/sign-up') || pathname.startsWith('/signup');
    isForgotPasswordRoute.value = pathname.startsWith('/forgot-password');
    isPasswordResetRoute.value = pathname.startsWith('/password-reset') || pathname.startsWith('/reset-password');
    isEmailVerificationRoute.value = pathname.startsWith('/verify-email') || pathname.startsWith('/email-verification');
    isAccountSettingsRoute.value = pathname.startsWith('/account-settings') || pathname === '/settings' || pathname.startsWith('/settings/');
    isErrorRoute.value = pathname.startsWith('/error');
    isMfaRoute.value = pathname.startsWith('/mfa');

    if (isSignUpRoute.value || isForgotPasswordRoute.value || isPasswordResetRoute.value || isEmailVerificationRoute.value || isErrorRoute.value || isMfaRoute.value) {
      return;
    }

    if (isAccountSettingsRoute.value) {
      activeTab.value = 'settings';
      return;
    }

    // 3. Admin / Panel Route Alias (/admin, /admin/:tab, /panel, /panel/:tab)
    const isAdminOrPanelPath = pathname.startsWith('/admin') || pathname.startsWith('/panel');
    isPanelRoute.value = isAdminOrPanelPath;

    if (isAdminOrPanelPath) {
      if (!authChecking.value && !isAdminRole.value) {
        showToast('Akses ditolak: Hanya Administrator Platform yang dapat mengakses panel admin.');
        window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
        isPanelRoute.value = false;
        activeTab.value = 'dashboard';
        return;
      }

      let sub = '';
      if (pathname.startsWith('/admin/')) sub = pathname.replace('/admin/', '').split('/')[0];
      else if (pathname.startsWith('/panel/')) sub = pathname.replace('/panel/', '').split('/')[0];

      const validTabs: ActiveTab[] = [
        'dashboard', 'transactions', 'qris', 'apps', 'listener', 'playground', 'docs', 'settings', 'webhooks'
      ];
      if (validTabs.includes(sub as ActiveTab)) {
        activeTab.value = sub as ActiveTab;
        return;
      }
      activeTab.value = 'dashboard';
      return;
    }

    // 4. Sub-route under /dashboard/
    if (pathname.startsWith('/dashboard/')) {
      const sub = pathname.replace('/dashboard/', '').split('/')[0];
      if (sub === 'playground' && isMerchantMode.value) {
        showToast('Playground simulator hanya dapat diakses oleh Administrator Platform.');
        window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
        activeTab.value = 'dashboard';
        return;
      }
      const validTabs: ActiveTab[] = [
        'transactions', 'qris', 'apps', 'listener', 'playground', 'docs', 'settings', 'webhooks'
      ];
      if (validTabs.includes(sub as ActiveTab)) {
        activeTab.value = sub as ActiveTab;
        return;
      }
    }

    // 5. Exact /dashboard or /
    if (pathname === '/dashboard' || pathname === '/dashboard/' || pathname === '/' || !pathname) {
      activeTab.value = 'dashboard';
      if (pathname !== '/dashboard') {
        window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
      }
      return;
    }

    // 6. Legacy direct paths (/qris, /apps, /webhooks)
    const legacySub = pathname.replace(/^\//, '').split('/')[0];
    if (legacySub === 'playground' && isMerchantMode.value) {
      showToast('Playground simulator hanya dapat diakses oleh Administrator Platform.');
      window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
      activeTab.value = 'dashboard';
      return;
    }
    const validTabs: ActiveTab[] = [
      'transactions', 'qris', 'apps', 'listener', 'playground', 'docs', 'settings', 'webhooks'
    ];
    if (validTabs.includes(legacySub as ActiveTab)) {
      activeTab.value = legacySub as ActiveTab;
      window.history.replaceState({ tab: legacySub }, '', `/dashboard/${legacySub}`);
      return;
    }

    activeTab.value = 'dashboard';
  };

  const switchTab = (tab: ActiveTab | string) => {
    closeMobileDrawer();
    if (tab === 'playground' && isMerchantMode.value) {
      showToast('Playground simulator hanya dapat diakses oleh Administrator Platform.');
      return;
    }
    activeTab.value = tab as ActiveTab;
    const prefix = isPanelRoute.value
      ? (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? '/admin' : '/panel')
      : '/dashboard';
    let newPath = tab === 'dashboard' ? prefix : `${prefix}/${tab}`;
    if (tab === 'settings') {
      newPath = '/account-settings';
    }
    if (typeof window !== 'undefined' && window.location.pathname !== newPath) {
      window.history.pushState({ tab }, '', newPath);
    }
  };

  const switchContext = (target: 'merchant' | 'admin') => {
    if (typeof window === 'undefined') return;
    if (target === 'admin') {
      if (!isAdminRole.value) {
        showToast('Akses ditolak: Hanya Administrator Platform yang dapat membuka panel admin.');
        return;
      }
      isPanelRoute.value = true;
      const targetPath = activeTab.value === 'dashboard' ? '/panel' : `/panel/${activeTab.value}`;
      window.history.pushState({ tab: activeTab.value }, '', targetPath);
      syncTabFromUrl();
    } else {
      isPanelRoute.value = false;
      const targetPath = activeTab.value === 'dashboard' ? '/dashboard' : `/dashboard/${activeTab.value}`;
      window.history.pushState({ tab: activeTab.value }, '', targetPath);
      syncTabFromUrl();
    }
  };

  const copyRouteUrl = async () => {
    const fullUrl = `${originUrl.value}${currentRoutePath.value}`;
    const ok = await copy(fullUrl, 'route-url');
    if (ok) {
      copiedRoute.value = true;
      showToast(`URL Route disalin: ${currentRoutePath.value}`);
      setTimeout(() => (copiedRoute.value = false), 2000);
    }
  };

  return {
    isPanelRoute,
    isMerchantMode,
    isMerchant,
    isCheckoutRoute,
    checkoutChargeId,
    isSignUpRoute,
    isForgotPasswordRoute,
    isPasswordResetRoute,
    isEmailVerificationRoute,
    isAccountSettingsRoute,
    isErrorRoute,
    isMfaRoute,
    activeTab,
    originUrl,
    copiedRoute,
    isFullWidthMode,
    isMobileDrawerOpen,
    pageTitle,
    currentRoutePath,
    toggleMobileDrawer,
    closeMobileDrawer,
    toggleFullWidth,
    syncTabFromUrl,
    switchTab,
    switchContext,
    copyRouteUrl,
  };
}
