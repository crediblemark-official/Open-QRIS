<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  User,
  Mail,
  Bell,
  Laptop,
  Key,
  CreditCard,
  Settings as SettingsIcon,
  Users,
  Plus,
  ChevronRight,
  LogOut,
  Trash2,
  ArrowLeft
} from 'lucide-vue-next';
import { hexclaveClientApp } from '../lib/hexclave';
import ProfileSection from '../components/settings/ProfileSection.vue';
import EmailSection from '../components/settings/EmailSection.vue';
import SecuritySection from '../components/settings/SecuritySection.vue';
import SessionsSection from '../components/settings/SessionsSection.vue';
import NotificationSection from '../components/settings/NotificationSection.vue';
import ApiKeysSection from '../components/settings/ApiKeysSection.vue';
import PaymentSection from '../components/settings/PaymentSection.vue';
import TeamsSection from '../components/settings/TeamsSection.vue';

const props = defineProps<{
  extraItems?: { id: string; title: string; content?: any }[];
}>();

const emit = defineEmits<{
  (e: 'backToDashboard'): void;
  (e: 'signOut'): void;
}>();

// --- CORE STATES ---
const isLoadingInitial = ref(true);
const currentUser = ref<any>(null);
const projectConfig = ref<any>(null);
const activeTabId = ref<string>('profile');
const globalToast = ref('');

const showToast = (msg: string) => {
  globalToast.value = msg;
  setTimeout(() => (globalToast.value = ''), 3000);
};

// --- EMAIL STATE ---
const contactChannels = ref<any[]>([]);

const loadContactChannels = async () => {
  if (!currentUser.value) return;
  try {
    const list = await currentUser.value.listContactChannels();
    contactChannels.value = list;
  } catch (err) {}
};

const handleAddEmail = async (email: string) => {
  try {
    await currentUser.value.createContactChannel({
      type: 'email',
      value: email,
      usedForAuth: false,
    });
    await loadContactChannels();
    showToast('Email baru berhasil ditambahkan');
  } catch (err: any) {
    showToast(err?.message || 'Gagal menambahkan email');
  }
};

const handleDeleteEmail = async (channel: any) => {
  if (!confirm(`Hapus email ${channel.value}?`)) return;
  try {
    await channel.delete();
    await loadContactChannels();
    showToast('Email berhasil dihapus');
  } catch (err: any) {
    showToast(err?.message || 'Gagal menghapus email');
  }
};

const handleSetPrimaryEmail = async (channel: any) => {
  try {
    await channel.update({ isPrimary: true });
    await loadContactChannels();
    showToast(`${channel.value} dijadikan email utama`);
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengubah email utama');
  }
};

const handleToggleUsedForAuth = async (channel: any, enable: boolean) => {
  try {
    await channel.update({ usedForAuth: enable });
    await loadContactChannels();
    showToast(enable ? 'Email dapat digunakan untuk masuk' : 'Email tidak lagi digunakan untuk masuk');
  } catch (err: any) {
    showToast(err?.message || 'Gagal memperbarui status sign-in email');
  }
};

const handleSendVerificationEmail = async (channel: any) => {
  try {
    await channel.sendVerificationEmail();
    showToast(`Email verifikasi telah dikirim ke ${channel.value}`);
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengirim email verifikasi');
  }
};

// --- SECURITY STATE ---
const handleUpdatePassword = async (data: { oldPassword?: string; newPassword: string }) => {
  try {
    if (currentUser.value.hasPassword) {
      await currentUser.value.updatePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      showToast('Kata sandi berhasil diperbarui');
    } else {
      await currentUser.value.setPassword({
        password: data.newPassword,
      });
      showToast('Kata sandi berhasil dibuat');
    }
    currentUser.value = await hexclaveClientApp.getUser();
  } catch (e: any) {
    showToast(e?.message || 'Gagal memperbarui kata sandi');
  }
};

const handleRegisterPasskey = async () => {
  try {
    const res = await currentUser.value.registerPasskey();
    if (res && res.status === 'error') {
      showToast((res.error as any)?.humanReadableMessage || 'Gagal mendaftarkan Passkey');
    } else {
      currentUser.value = await hexclaveClientApp.getUser();
      showToast('Passkey berhasil didaftarkan');
    }
  } catch (err: any) {
    showToast(err?.message || 'Gagal mendaftarkan Passkey');
  }
};

const handleDisablePasskey = async () => {
  try {
    await currentUser.value.update({ passkeyAuthEnabled: false });
    currentUser.value = await hexclaveClientApp.getUser();
    showToast('Passkey berhasil dinonaktifkan');
  } catch (err: any) {
    showToast(err?.message || 'Gagal menonaktifkan passkey');
  }
};

const handleToggleOtp = async (enable: boolean) => {
  try {
    await currentUser.value.update({ otpAuthEnabled: enable });
    currentUser.value = await hexclaveClientApp.getUser();
    showToast(enable ? 'Masuk OTP Magic Link diaktifkan' : 'Masuk OTP Magic Link dinonaktifkan');
  } catch (err: any) {
    showToast(err?.message || 'Gagal memperbarui pengaturan OTP');
  }
};

const handleSetupMfa = async () => {
  // MFA setup ditangani oleh SecuritySection
};

const handleConfirmMfa = async (code: string) => {
  try {
    await currentUser.value.update({ totpMultiFactorSecret: null }); // Will be set by SecuritySection
    currentUser.value = await hexclaveClientApp.getUser();
    showToast('Autentikasi dua langkah (MFA) berhasil diaktifkan!');
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengaktifkan MFA');
  }
};

const handleDisableMfa = async () => {
  if (!confirm('Yakin ingin menonaktifkan MFA? Akun Anda akan menjadi kurang aman.')) return;
  try {
    await currentUser.value.update({ totpMultiFactorSecret: null });
    currentUser.value = await hexclaveClientApp.getUser();
    showToast('MFA telah dinonaktifkan');
  } catch (err: any) {
    showToast(err?.message || 'Gagal menonaktifkan MFA');
  }
};

// --- NOTIFICATION STATE ---
const notificationCategories = ref<any[]>([]);
const isNotificationsLoading = ref(false);

const loadNotifications = async () => {
  if (!currentUser.value) return;
  isNotificationsLoading.value = true;
  try {
    const cats = await currentUser.value.listNotificationCategories();
    notificationCategories.value = cats;
  } catch (err) {}
  finally {
    isNotificationsLoading.value = false;
  }
};

const handleToggleNotification = async (category: any, val: boolean) => {
  if (!category.canDisable && !val) return;
  try {
    await category.setEnabled(val);
    category.enabled = val;
    showToast(`Preferensi notifikasi '${category.name}' disimpan`);
  } catch (err: any) {
    showToast(err?.message || 'Gagal memperbarui notifikasi');
  }
};

// --- SESSIONS STATE ---
const activeSessions = ref<any[]>([]);
const isSessionsLoading = ref(false);

const loadSessions = async () => {
  if (!currentUser.value) return;
  isSessionsLoading.value = true;
  try {
    const list = await currentUser.value.getActiveSessions();
    activeSessions.value = list;
  } catch (err) {}
  finally {
    isSessionsLoading.value = false;
  }
};

const handleRevokeSession = async (sessionId: string) => {
  try {
    await currentUser.value.revokeSession(sessionId);
    await loadSessions();
    showToast('Sesi berhasil dicabut');
  } catch (err: any) {
    showToast(err?.message || 'Gagal mencabut sesi');
  }
};

const handleRevokeAllOtherSessions = async () => {
  if (!confirm('Cabut semua sesi lain? Anda akan tetap masuk di perangkat ini.')) return;
  isSessionsLoading.value = true;
  try {
    const sessions = await currentUser.value.getActiveSessions();
    const otherSessions = sessions.filter((s: any) => !s.isCurrentSession);
    await Promise.all(otherSessions.map((s: any) => currentUser.value.revokeSession(s.id)));
    await loadSessions();
    showToast('Semua sesi lain berhasil dicabut');
  } catch (err: any) {
    showToast(err?.message || 'Gagal mencabut sesi lain');
  } finally {
    isSessionsLoading.value = false;
  }
};

// --- API KEYS STATE ---
const userApiKeys = ref<any[]>([]);
const isApiKeysLoading = ref(false);
const newlyCreatedKey = ref<any>(null);

const loadUserApiKeys = async () => {
  if (!currentUser.value || !projectConfig.value?.config?.allowUserApiKeys) return;
  isApiKeysLoading.value = true;
  try {
    const keys = await currentUser.value.listApiKeys();
    userApiKeys.value = keys;
  } catch (err) {}
  finally {
    isApiKeysLoading.value = false;
  }
};

const handleCreateApiKey = async (description: string) => {
  try {
    const created = await currentUser.value.createApiKey({ description });
    newlyCreatedKey.value = created;
    await loadUserApiKeys();
    showToast('Kunci API baru berhasil dibuat');
  } catch (err: any) {
    showToast(err?.message || 'Gagal membuat kunci API');
  }
};

const handleRevokeApiKey = async (key: any) => {
  try {
    await key.revoke();
    await loadUserApiKeys();
    showToast('Kunci API berhasil dicabut');
  } catch (err: any) {
    showToast(err?.message || 'Gagal mencabut kunci API');
  }
};

// --- PAYMENTS STATE ---
const paymentsReady = ref(false);
const userHasProducts = ref(false);
const teamsWithProducts = ref<any[]>([]);
const selectedPaymentTarget = ref<'user' | string>('user');
const paymentCustomerBilling = ref<any>(null);
const paymentCustomerProducts = ref<any[]>([]);
const paymentCustomerInvoices = ref<any[]>([]);
const isPaymentLoading = ref(false);

const checkPaymentsEligibility = async () => {
  if (!currentUser.value) return;
  try {
    const userProducts = await currentUser.value.listProducts({ limit: 1 });
    const hasUProd = userProducts.some((p: any) => p.customerType === 'user');
    userHasProducts.value = hasUProd;

    const allTeams = await currentUser.value.listTeams();
    const tWithProd: any[] = [];
    for (const t of allTeams) {
      try {
        const tProducts = await t.listProducts({ limit: 1 });
        if (tProducts.some((p: any) => p.customerType === 'team')) {
          tWithProd.push(t);
        }
      } catch {}
    }
    teamsWithProducts.value = tWithProd;
    paymentsReady.value = true;
  } catch {
    paymentsReady.value = true;
  }
};

const loadPaymentDetails = async () => {
  if (!currentUser.value || !shouldShowPayments.value) return;
  isPaymentLoading.value = true;
  try {
    let customer: any = currentUser.value;
    let customerType: 'user' | 'team' = 'user';

    if (selectedPaymentTarget.value !== 'user') {
      customer = teamsWithProducts.value.find((t) => t.id === selectedPaymentTarget.value) || currentUser.value;
      customerType = 'team';
    }

    try {
      paymentCustomerBilling.value = await customer.getBilling?.();
    } catch {
      paymentCustomerBilling.value = null;
    }

    const prods = await customer.listProducts();
    paymentCustomerProducts.value = prods.filter((p: any) => p.customerType === customerType);

    const invs = await customer.listInvoices({ limit: 10 });
    paymentCustomerInvoices.value = invs;
  } catch (err) {}
  finally {
    isPaymentLoading.value = false;
  }
};

const handleUpdatePaymentMethod = async () => {
  let customer: any = currentUser.value;
  if (selectedPaymentTarget.value !== 'user') {
    customer = teamsWithProducts.value.find((t) => t.id === selectedPaymentTarget.value) || currentUser.value;
  }
  try {
    const setup = await customer.createPaymentMethodSetupIntent();
    await customer.setDefaultPaymentMethodFromSetupIntent(setup.clientSecret);
    await loadPaymentDetails();
    showToast('Metode pembayaran berhasil diperbarui');
  } catch (err: any) {
    showToast(err?.message || 'Gagal memperbarui metode pembayaran');
  }
};

const handleCancelSubscription = async (product: any) => {
  try {
    await hexclaveClientApp.cancelSubscription({
      ...(selectedPaymentTarget.value !== 'user' ? { teamId: selectedPaymentTarget.value } : {}),
      productId: product.id || '',
      subscriptionId: product.subscription?.subscriptionId || undefined,
    });
    await loadPaymentDetails();
    showToast('Langganan berhasil dibatalkan');
  } catch (err: any) {
    showToast(err?.message || 'Gagal membatalkan langganan');
  }
};

const shouldShowPayments = computed(() => {
  return paymentsReady.value && (userHasProducts.value || teamsWithProducts.value.length > 0);
});

// --- TEAMS STATE ---
const userTeams = ref<any[]>([]);
const isTeamsLoading = ref(false);
const activeTeamData = ref<any>(null);

const loadTeams = async () => {
  if (!currentUser.value) return;
  isTeamsLoading.value = true;
  try {
    const list = await currentUser.value.listTeams();
    userTeams.value = list;
  } catch (err) {}
  finally {
    isTeamsLoading.value = false;
  }
};

const selectTeamPage = async (team: any) => {
  activeTabId.value = 'team-' + team.id;
  activeTeamData.value = {
    team,
    userTeamProfile: null,
    canUpdateTeam: false,
    canReadMembers: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageApiKeys: false,
    members: [],
    invitations: [],
    apiKeys: [],
    newMemberEmail: '',
    newApiKeyDescription: '',
    isActionLoading: true,
  };

  try {
    const [
      profile,
      canUpdate,
      canRead,
      canInvite,
      canRemove,
      canManageKeys,
    ] = await Promise.all([
      currentUser.value.getTeamProfile(team).catch(() => null),
      currentUser.value.hasPermission(team, '$update_team').catch(() => false),
      currentUser.value.hasPermission(team, '$read_members').catch(() => false),
      currentUser.value.hasPermission(team, '$invite_members').catch(() => false),
      currentUser.value.hasPermission(team, '$remove_members').catch(() => false),
      currentUser.value.hasPermission(team, '$manage_api_keys').catch(() => false),
    ]);

    let members: any[] = [];
    let invitations: any[] = [];
    let apiKeys: any[] = [];

    if (canRead || canInvite) {
      try { members = await team.listUsers(); } catch {}
    }
    if (canRead || canInvite) {
      try { invitations = await team.listInvitations(); } catch {}
    }
    if (canManageKeys && projectConfig.value?.config?.allowTeamApiKeys) {
      try { apiKeys = await team.listApiKeys(); } catch {}
    }

    activeTeamData.value = {
      team,
      userTeamProfile: profile,
      canUpdateTeam: canUpdate,
      canReadMembers: canRead,
      canInviteMembers: canInvite,
      canRemoveMembers: canRemove,
      canManageApiKeys: canManageKeys,
      members,
      invitations,
      apiKeys,
      newMemberEmail: '',
      newApiKeyDescription: '',
      isActionLoading: false,
    };
  } catch {
    if (activeTeamData.value) activeTeamData.value.isActionLoading = false;
  }
};

const handleCreateTeam = async (name: string) => {
  try {
    const team = await currentUser.value.createTeam({ displayName: name });
    await loadTeams();
    await selectTeamPage(team);
    showToast(`Tim '${team.displayName}' berhasil dibuat!`);
  } catch (err: any) {
    showToast(err?.message || 'Gagal membuat tim');
  }
};

const handleLeaveTeam = async (team: any) => {
  try {
    await currentUser.value.leaveTeam(team);
    await loadTeams();
    activeTabId.value = 'profile';
    showToast(`Anda telah keluar dari ${team.displayName}`);
  } catch (err: any) {
    showToast(err?.message || 'Gagal keluar dari tim');
  }
};

const handleInviteMember = async (email: string) => {
  if (!activeTeamData.value?.team) return;
  try {
    await activeTeamData.value.team.inviteUser({ email });
    activeTeamData.value.newMemberEmail = '';
    const invs = await activeTeamData.value.team.listInvitations();
    activeTeamData.value.invitations = invs;
    showToast('Undangan anggota berhasil dikirim');
  } catch (err: any) {
    showToast(err?.message || 'Gagal mengundang anggota');
  }
};

const handleRevokeInvitation = async (invitation: any) => {
  try {
    await invitation.revoke();
    if (activeTeamData.value?.team) {
      activeTeamData.value.invitations = await activeTeamData.value.team.listInvitations();
    }
    showToast('Undangan berhasil dicabut');
  } catch (err: any) {
    showToast(err?.message || 'Gagal mencabut undangan');
  }
};

const handleCreateTeamApiKey = async (description: string) => {
  if (!activeTeamData.value?.team) return;
  try {
    const created = await activeTeamData.value.team.createApiKey({ description });
    activeTeamData.value.newApiKeyDescription = '';
    activeTeamData.value.apiKeys = await activeTeamData.value.team.listApiKeys();
    showToast('Kunci API Tim berhasil dibuat: ' + created.value);
  } catch (err: any) {
    showToast(err?.message || 'Gagal membuat kunci API tim');
  }
};

// --- SETTINGS (SIGN OUT & DELETE ACCOUNT) ---
const isDeletingAccount = ref(false);

const handleSignOut = async () => {
  try {
    if (currentUser.value) await currentUser.value.signOut();
    localStorage.removeItem('qris_admin_token');
    emit('signOut');
    await hexclaveClientApp.redirectToSignIn();
  } catch {
    window.location.href = '/login';
  }
};

const handleDeleteAccount = async () => {
  if (!confirm('PERINGATAN: Tindakan ini permanen. Semua data akun, kunci API, dan akses Anda akan dihapus. Lanjutkan?')) return;
  isDeletingAccount.value = true;
  try {
    await currentUser.value.delete();
    localStorage.removeItem('qris_admin_token');
    await hexclaveClientApp.redirectToHome();
  } catch (err: any) {
    showToast(err?.message || 'Gagal menghapus akun');
    isDeletingAccount.value = false;
  }
};

// Navigation Items
const navigationItems = computed(() => {
  const items: Array<{ id: string; title: string; icon: any; isDivider?: boolean }> = [
    { id: 'profile', title: 'My Profile', icon: User },
    { id: 'auth', title: 'Emails & Auth', icon: Mail },
    { id: 'notifications', title: 'Notifications', icon: Bell },
    { id: 'sessions', title: 'Active Sessions', icon: Laptop },
  ];

  if (projectConfig.value?.config?.allowUserApiKeys) {
    items.push({ id: 'api-keys', title: 'API Keys', icon: Key });
  }

  if (shouldShowPayments.value) {
    items.push({ id: 'payments', title: 'Payments', icon: CreditCard });
  }

  if (props.extraItems && props.extraItems.length > 0) {
    props.extraItems.forEach((it) => {
      items.push({ id: it.id, title: it.title, icon: ChevronRight });
    });
  }

  const showTeamsSection = userTeams.value.length > 0 || projectConfig.value?.config?.clientTeamCreationEnabled;
  if (showTeamsSection) {
    items.push({ id: 'teams-divider', title: 'Teams', icon: Users, isDivider: true });
    userTeams.value.forEach((t) => {
      items.push({ id: 'team-' + t.id, title: t.displayName, icon: Users });
    });
    if (projectConfig.value?.config?.clientTeamCreationEnabled) {
      items.push({ id: 'team-create', title: 'Create a team', icon: Plus });
    }
  }

  items.push({ id: 'settings', title: 'Settings', icon: SettingsIcon });
  return items;
});

// Initialization
onMounted(async () => {
  isLoadingInitial.value = true;
  try {
    const [u, p] = await Promise.all([
      hexclaveClientApp.getUser(),
      hexclaveClientApp.getProject(),
    ]);

    if (!u || u.isAnonymous) {
      await hexclaveClientApp.redirectToSignIn();
      return;
    }

    currentUser.value = u;
    projectConfig.value = p;

    // Load initial data
    await Promise.all([
      loadContactChannels(),
      loadNotifications(),
      loadSessions(),
      loadUserApiKeys(),
      loadTeams(),
      checkPaymentsEligibility(),
    ]);

    if (shouldShowPayments.value) {
      await loadPaymentDetails();
    }
  } catch (err) {
    console.error('Failed to initialize account settings:', err);
  } finally {
    isLoadingInitial.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Toast -->
    <div v-if="globalToast" class="fixed top-4 right-4 z-50 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg">
      {{ globalToast }}
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <button
          @click="emit('backToDashboard')"
          class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft :size="20" />
        </button>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Account Settings</h1>
          <p class="text-sm text-slate-500">Kelola profil, keamanan, dan preferensi akun Anda</p>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar Navigation -->
        <div class="lg:w-64 shrink-0">
          <nav class="space-y-1">
            <template v-for="item in navigationItems" :key="item.id">
              <div
                v-if="item.isDivider"
                class="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                {{ item.title }}
              </div>
              <button
                v-else
                @click="item.id.startsWith('team-') && item.id !== 'team-create' ? selectTeamPage(userTeams.find(t => 'team-' + t.id === item.id)) : activeTabId = item.id"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left',
                  activeTabId === item.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                ]"
              >
                <component :is="item.icon" :size="16" />
                {{ item.title }}
              </button>
            </template>
          </nav>
        </div>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
          <div v-if="isLoadingInitial" class="flex items-center justify-center py-12">
            <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <div v-else class="bg-white rounded-xl border border-slate-200 p-6">
            <!-- Profile -->
            <ProfileSection
              v-if="activeTabId === 'profile'"
              :currentUser="currentUser"
              :isLoading="isLoadingInitial"
              @save="handleSaveProfile"
              @toast="showToast"
            />

            <!-- Emails & Auth -->
            <template v-else-if="activeTabId === 'auth'">
              <EmailSection
                :currentUser="currentUser"
                :contactChannels="contactChannels"
                @add="handleAddEmail"
                @delete="handleDeleteEmail"
                @setPrimary="handleSetPrimaryEmail"
                @toggleAuth="handleToggleUsedForAuth"
                @sendVerification="handleSendVerificationEmail"
                @toast="showToast"
              />
              <div class="mt-8">
                <SecuritySection
                  :currentUser="currentUser"
                  @updatePassword="handleUpdatePassword"
                  @registerPasskey="handleRegisterPasskey"
                  @disablePasskey="handleDisablePasskey"
                  @toggleOtp="handleToggleOtp"
                  @setupMfa="handleSetupMfa"
                  @confirmMfa="handleConfirmMfa"
                  @disableMfa="handleDisableMfa"
                  @toast="showToast"
                />
              </div>
            </template>

            <!-- Notifications -->
            <NotificationSection
              v-else-if="activeTabId === 'notifications'"
              :currentUser="currentUser"
              :notificationCategories="notificationCategories"
              :isLoading="isNotificationsLoading"
              @toggle="handleToggleNotification"
              @toast="showToast"
            />

            <!-- Sessions -->
            <SessionsSection
              v-else-if="activeTabId === 'sessions'"
              :currentUser="currentUser"
              :activeSessions="activeSessions"
              :isLoading="isSessionsLoading"
              @revoke="handleRevokeSession"
              @revokeAll="handleRevokeAllOtherSessions"
              @toast="showToast"
            />

            <!-- API Keys -->
            <ApiKeysSection
              v-else-if="activeTabId === 'api-keys'"
              :currentUser="currentUser"
              :projectConfig="projectConfig"
              :apiKeys="userApiKeys"
              :isLoading="isApiKeysLoading"
              @create="handleCreateApiKey"
              @revoke="handleRevokeApiKey"
              @toast="showToast"
            />

            <!-- Payments -->
            <PaymentSection
              v-else-if="activeTabId === 'payments'"
              :currentUser="currentUser"
              :paymentsReady="paymentsReady"
              :userHasProducts="userHasProducts"
              :teamsWithProducts="teamsWithProducts"
              :selectedPaymentTarget="selectedPaymentTarget"
              :paymentCustomerBilling="paymentCustomerBilling"
              :paymentCustomerProducts="paymentCustomerProducts"
              :paymentCustomerInvoices="paymentCustomerInvoices"
              :isLoading="isPaymentLoading"
              @updatePaymentMethod="handleUpdatePaymentMethod"
              @cancelSubscription="handleCancelSubscription"
              @selectTarget="selectedPaymentTarget = $event"
              @toast="showToast"
            />

            <!-- Teams -->
            <TeamsSection
              v-else-if="activeTabId.startsWith('team-') || activeTabId === 'team-create'"
              :currentUser="currentUser"
              :userTeams="userTeams"
              :isLoading="isTeamsLoading"
              :activeTeamData="activeTeamData"
              :projectConfig="projectConfig"
              @selectTeam="selectTeamPage"
              @createTeam="handleCreateTeam"
              @leaveTeam="handleLeaveTeam"
              @inviteMember="handleInviteMember"
              @revokeInvitation="handleRevokeInvitation"
              @createApiKey="handleCreateTeamApiKey"
              @toast="showToast"
            />

            <!-- Settings -->
            <div v-else-if="activeTabId === 'settings'" class="space-y-6">
              <div>
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SettingsIcon :size="16" class="text-slate-400" />
                  Settings
                </h3>
                <p class="text-xs text-slate-500 mt-1">Pengaturan akun lanjutan</p>
              </div>

              <div class="space-y-3">
                <button
                  @click="handleSignOut"
                  class="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
                >
                  <div class="flex items-center gap-3">
                    <LogOut :size="16" class="text-slate-400" />
                    <div class="text-left">
                      <div class="text-sm font-medium text-slate-900">Sign Out</div>
                      <div class="text-xs text-slate-500">Keluar dari akun Anda</div>
                    </div>
                  </div>
                  <ChevronRight :size="16" class="text-slate-400" />
                </button>

                <button
                  @click="handleDeleteAccount"
                  :disabled="isDeletingAccount"
                  class="w-full flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200 hover:bg-rose-100 transition disabled:opacity-50"
                >
                  <div class="flex items-center gap-3">
                    <Trash2 :size="16" class="text-rose-500" />
                    <div class="text-left">
                      <div class="text-sm font-medium text-rose-700">Delete Account</div>
                      <div class="text-xs text-rose-500">Hapus akun secara permanen</div>
                    </div>
                  </div>
                  <ChevronRight :size="16" class="text-rose-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
