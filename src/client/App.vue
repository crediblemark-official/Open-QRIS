<script setup lang="ts">
import { onMounted } from 'vue';
import { CheckCircle2 } from 'lucide-vue-next';
import { useClipboard } from './composables/useClipboard';
import { useToast } from './composables/useToast';
import { useAuth } from './composables/useAuth';
import { useAppNavigation } from './composables/useAppNavigation';
import { useGatewayData } from './composables/useGatewayData';

// Modular Views & Shell Components
import AppSidebar from './components/AppSidebar.vue';
import AppHeader from './components/AppHeader.vue';
import MobileBottomNav from './components/MobileBottomNav.vue';
import CreateAppModal from './components/saas/CreateAppModal.vue';

import DashboardView from './views/DashboardView.vue';
import TenantDashboardView from './views/TenantDashboardView.vue';
import MasterQrisView from './views/MasterQrisView.vue';
import SaaSAppsView from './views/SaaSAppsView.vue';
import ListenerView from './views/ListenerView.vue';
import PlaygroundView from './views/PlaygroundView.vue';
import DocsView from './views/DocsView.vue';
import TransactionsView from './views/TransactionsView.vue';
import WebhookLogsView from './views/WebhookLogsView.vue';
import HostedCheckoutView from './views/HostedCheckoutView.vue';
import LoginView from './views/LoginView.vue';
import SignUpView from './views/SignUpView.vue';
import ForgotPasswordView from './views/ForgotPasswordView.vue';
import PasswordResetView from './views/PasswordResetView.vue';
import EmailVerificationView from './views/EmailVerificationView.vue';
import AccountSettingsView from './views/AccountSettingsView.vue';
import ErrorView from './views/ErrorView.vue';
import MfaView from './views/MfaView.vue';

// 1. Toast & Clipboard
const { toastMessage, showToast } = useToast();
const { copy } = useClipboard();

// 2. Authentication State & Methods
const {
  currentUser,
  isAdminRole,
  isMerchantRole,
  isDevMode,
  authToken,
  isAuthenticated,
  authChecking,
  authFetch,
  checkAuth,
  handleLoginSuccess: onLoginSuccess,
  navigateToSignIn,
  handleLogout,
} = useAuth({
  onSessionExpired: () => {
    showToast('Sesi telah kadaluarsa. Silakan login kembali.');
  },
});

// 3. Routing & Layout Navigation
const {
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
  isFullWidthMode,
  isMobileDrawerOpen,
  pageTitle,
  toggleMobileDrawer,
  closeMobileDrawer,
  toggleFullWidth,
  syncTabFromUrl,
  switchTab,
  switchContext,
} = useAppNavigation({
  isAdminRole,
  authChecking,
  showToast,
});

// 4. Gateway Data Management
const {
  settings,
  tenants,
  transactions,
  masterQRISInfo,
  rawQRISInput,
  showNewAppModal,
  listenerUrl,
  decodeQRIS,
  loadData,
  saveMasterQRIS,
  createSaaSApp,
  deleteSaaSApp,
  simulatePaid,
} = useGatewayData({
  authFetch,
  currentUser,
  isAuthenticated,
  showToast,
});

// Bridge Login Success to refresh data and synchronize route
const handleLoginSuccess = async (token?: string) => {
  await onLoginSuccess(token);
  loadData();
  syncTabFromUrl();
  const welcomeName = currentUser.value?.name || (currentUser.value?.role === 'merchant' ? 'Merchant' : 'Administrator');
  showToast(`Login berhasil! Selamat datang ${welcomeName}.`);
};

const onLogout = async () => {
  await handleLogout();
  showToast('Anda telah logout dari dashboard.');
};

const onCopy = async (text: string) => {
  const ok = await copy(text);
  if (ok) showToast('Berhasil disalin ke clipboard!');
};

onMounted(async () => {
  syncTabFromUrl();
  window.addEventListener('popstate', () => {
    syncTabFromUrl();
  });
  const authed = await checkAuth(isCheckoutRoute.value);
  if (authed) {
    loadData();
  }
  syncTabFromUrl();
});
</script>

<template>
  <!-- TOAST NOTIFICATION -->
  <Transition name="fade">
    <div v-if="toastMessage" class="toast-bar">
      <CheckCircle2 :size="15" class="text-emerald-400 shrink-0" />
      <span>{{ toastMessage }}</span>
    </div>
  </Transition>

  <!-- 1. HOSTED CHECKOUT VIEW (PUBLIC ROUTE) -->
  <HostedCheckoutView v-if="isCheckoutRoute" :chargeId="checkoutChargeId" />

  <!-- 2. HEXCLAVE CUSTOM ERROR PAGE V1 -->
  <ErrorView v-else-if="isErrorRoute" />

  <!-- 3. HEXCLAVE CUSTOM MFA PAGE V1 -->
  <MfaView v-else-if="isMfaRoute" @mfaSuccess="handleLoginSuccess" />

  <!-- 4. HEXCLAVE CUSTOM FORGOT PASSWORD PAGE V1 -->
  <ForgotPasswordView v-else-if="isForgotPasswordRoute" @backToSignIn="navigateToSignIn" />

  <!-- 5. HEXCLAVE CUSTOM PASSWORD RESET PAGE V1 -->
  <PasswordResetView v-else-if="isPasswordResetRoute" />

  <!-- 6. HEXCLAVE CUSTOM EMAIL VERIFICATION PAGE V1 -->
  <EmailVerificationView v-else-if="isEmailVerificationRoute" />

  <!-- 7. AUTHENTICATION GATE -->
  <div v-else-if="authChecking" class="min-h-screen bg-slate-50 flex items-center justify-center">
    <div class="flex flex-col items-center gap-2">
      <div class="w-6 h-6 rounded-full border-2 border-[#d71920] border-t-transparent animate-spin"></div>
      <span class="text-xs text-slate-500 font-medium">Memverifikasi sesi gateway...</span>
    </div>
  </div>

  <!-- 8. HEXCLAVE CUSTOM SIGN UP PAGE V1 -->
  <SignUpView v-else-if="isSignUpRoute && !isAuthenticated" @signUpSuccess="handleLoginSuccess" />

  <!-- 9. SIGN IN / LOGIN VIEW -->
  <LoginView v-else-if="!isAuthenticated" @loginSuccess="handleLoginSuccess" />

  <!-- 10. DIRECT / STANDALONE ACCOUNT SETTINGS ROUTE -->
  <AccountSettingsView 
    v-else-if="isAccountSettingsRoute" 
    @backToDashboard="switchTab('dashboard')" 
    @signOut="onLogout" 
  />

  <!-- 11. MAIN PLATFORM DASHBOARD (AUTHENTICATED USER) -->
  <div v-else :class="['flex min-h-screen bg-slate-50/40 text-slate-900 font-sans antialiased', isFullWidthMode ? 'w-full' : '']">
    <!-- MINIMALIST SIDEBAR (DESKTOP) & SLIDE-OVER DRAWER (MOBILE) -->
    <AppSidebar
      v-if="!isFullWidthMode || isMobileDrawerOpen"
      :activeTab="activeTab"
      :isMerchantMode="isMerchantMode"
      :currentUser="currentUser"
      :tenants="tenants"
      :defaultStaticQRIS="settings.defaultStaticQRIS"
      :isMobileDrawerOpen="isMobileDrawerOpen"
      @selectTab="switchTab($event)"
      @closeMobileDrawer="closeMobileDrawer"
    />

    <!-- MAIN VIEW AREA (WITH BOTTOM PADDING FOR MOBILE BOTTOM NAV) -->
    <main class="flex-1 flex flex-col min-w-0 bg-white min-h-screen pb-16 md:pb-0">
      <!-- HEADER (MODULAR) -->
      <AppHeader
        :title="pageTitle"
        :currentUser="currentUser"
        :isMerchantMode="isMerchantMode"
        :masterQRISInfo="masterQRISInfo"
        :tenants="tenants"
        :isFullWidthMode="isFullWidthMode"
        :activeTab="activeTab"
        @toggleFullWidth="toggleFullWidth"
        @toggleDrawer="toggleMobileDrawer"
        @switchContext="switchContext($event)"
        @switchTab="switchTab($event)"
        @refresh="loadData"
        @logout="onLogout"
      />

      <!-- CONTENT BODY - EXPANDS FULL WIDTH -->
      <div :class="['flex-1 overflow-y-auto w-full max-w-full', ['docs', 'settings'].includes(activeTab) ? 'p-4 sm:p-6 lg:p-8' : 'p-0']">
        <!-- TENANT/MERCHANT DASHBOARD -->
        <TenantDashboardView
          v-if="activeTab === 'dashboard' && isMerchant"
          :transactions="transactions"
          :tenants="tenants"
          :currentUser="currentUser || undefined"
          :authToken="authToken"
          @navigate="switchTab($event)"
          @simulatePaid="simulatePaid"
          @refresh="loadData"
          @toast="showToast"
        />

        <!-- ADMIN DASHBOARD -->
        <DashboardView 
          v-else-if="activeTab === 'dashboard'" 
          :transactions="transactions" 
          :tenants="tenants"
          :authToken="authToken"
          @navigate="switchTab($event)"
          @simulatePaid="simulatePaid"
          @refresh="loadData"
        />

        <TransactionsView
          v-else-if="activeTab === 'transactions'"
          :transactions="transactions"
          :tenants="tenants"
          :currentUser="currentUser || undefined"
          :isMerchantMode="isMerchantMode"
          :authToken="authToken"
          @navigate="switchTab($event)"
          @simulatePaid="simulatePaid"
          @refresh="loadData"
          @toast="showToast"
        />

        <MasterQrisView 
          v-else-if="activeTab === 'qris'" 
          :rawQRISInput="rawQRISInput"
          :masterQRISInfo="masterQRISInfo"
          :isMerchant="isMerchant"
          @update:rawQRISInput="rawQRISInput = $event"
          @decode="decodeQRIS"
          @save="saveMasterQRIS"
          @toast="showToast"
        />

        <SaaSAppsView 
          v-else-if="activeTab === 'apps'" 
          :tenants="tenants" 
          @openModal="showNewAppModal = true"
          @deleteApp="deleteSaaSApp"
          @copy="onCopy"
          @refresh="loadData"
        />

        <ListenerView 
          v-else-if="activeTab === 'listener'" 
          :listenerUrl="listenerUrl"
          :tenants="tenants"
          @copy="onCopy"
          @toast="showToast"
          @refresh="loadData"
        />

        <PlaygroundView 
          v-else-if="activeTab === 'playground' && (isMerchantRole || isDevMode)" 
          :tenants="tenants"
          :settings="settings"
          @navigate="switchTab($event)"
          @toast="showToast"
          @refresh="loadData"
        />

        <DocsView v-else-if="activeTab === 'docs'" />

        <WebhookLogsView 
          v-else-if="activeTab === 'webhooks'" 
          :currentUser="currentUser || undefined" 
          :tenants="tenants" 
          @toast="showToast" 
          @navigate="switchTab($event)" 
        />

        <AccountSettingsView 
          v-else-if="activeTab === 'settings'" 
          @backToDashboard="switchTab('dashboard')" 
          @signOut="onLogout" 
        />
      </div>
    </main>

    <!-- MOBILE BOTTOM NAVIGATION (THUMB FRIENDLY) -->
    <MobileBottomNav
      :activeTab="activeTab"
      :isMerchantMode="isMerchantMode"
      :currentUser="currentUser"
      @selectTab="switchTab($event)"
      @toggleDrawer="toggleMobileDrawer"
    />
  </div>

  <!-- MODAL CREATE SAAS CLIENT -->
  <CreateAppModal
    :show="showNewAppModal"
    @close="showNewAppModal = false"
    @create="createSaaSApp"
  />
</template>
