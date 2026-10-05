<script setup lang="ts">
import { ref } from 'vue';
import { Users, Plus, Trash2, Loader2, Key, UserPlus, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  currentUser: any;
  userTeams: any[];
  isLoading: boolean;
  activeTeamData: any;
  projectConfig: any;
}>();

const emit = defineEmits<{
  (e: 'selectTeam', team: any): void;
  (e: 'createTeam', name: string): void;
  (e: 'leaveTeam', team: any): void;
  (e: 'inviteMember', email: string): void;
  (e: 'revokeInvitation', invitation: any): void;
  (e: 'createApiKey', description: string): void;
  (e: 'toast', msg: string): void;
}>();

const newTeamName = ref('');
const isCreatingTeam = ref(false);
const newMemberEmail = ref('');
const newApiKeyDescription = ref('');

const handleCreateTeam = async () => {
  if (!newTeamName.value.trim()) return;
  isCreatingTeam.value = true;
  try {
    emit('createTeam', newTeamName.value.trim());
    newTeamName.value = '';
  } finally {
    isCreatingTeam.value = false;
  }
};

const handleSelectTeam = (team: any) => {
  emit('selectTeam', team);
};

const handleLeaveTeam = (team: any) => {
  if (!confirm(`Tinggalkan tim '${team.displayName}'? Anda akan kehilangan akses ke data tim ini.`)) return;
  emit('leaveTeam', team);
};

const handleInviteMember = () => {
  if (!newMemberEmail.value.trim()) return;
  emit('inviteMember', newMemberEmail.value.trim());
  newMemberEmail.value = '';
};

const handleRevokeInvitation = (invitation: any) => {
  emit('revokeInvitation', invitation);
};

const handleCreateApiKey = () => {
  if (!newApiKeyDescription.value.trim()) return;
  emit('createApiKey', newApiKeyDescription.value.trim());
  newApiKeyDescription.value = '';
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Users :size="16" class="text-slate-400" />
        Teams
      </h3>
      <p class="text-xs text-slate-500 mt-1">Kelola tim dan kolaborasi anggota</p>
    </div>

    <!-- Create team -->
    <div v-if="projectConfig?.config?.clientTeamCreationEnabled" class="space-y-3">
      <div class="flex gap-2">
        <input
          v-model="newTeamName"
          type="text"
          class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nama tim baru"
          @keyup.enter="handleCreateTeam"
        />
        <button
          @click="handleCreateTeam"
          :disabled="isCreatingTeam || !newTeamName.trim()"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isCreatingTeam" :size="14" class="animate-spin" />
          <Plus v-else :size="14" />
          Buat
        </button>
      </div>
    </div>

    <!-- Teams list -->
    <div class="space-y-2">
      <div
        v-for="team in userTeams"
        :key="team.id"
        class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Users :size="14" class="text-blue-600" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-slate-900 truncate">{{ team.displayName }}</div>
            <div class="text-[11px] text-slate-500">
              {{ team.memberCount || 0 }} anggota
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="handleSelectTeam(team)"
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Buka
          </button>
          <button
            @click="handleLeaveTeam(team)"
            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Tinggalkan tim"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div v-if="userTeams.length === 0 && !isLoading" class="text-center py-8 text-slate-400">
        <Users :size="32" class="mx-auto mb-2 opacity-50" />
        <p class="text-sm">Belum ada tim</p>
      </div>

      <div v-if="isLoading" class="text-center py-8 text-slate-400">
        <Loader2 :size="32" class="mx-auto mb-2 animate-spin opacity-50" />
        <p class="text-sm">Memuat tim...</p>
      </div>
    </div>

    <!-- Active team detail -->
    <div v-if="activeTeamData" class="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <h4 class="text-sm font-bold text-slate-900">{{ activeTeamData.team?.displayName }}</h4>

      <!-- Members -->
      <div v-if="activeTeamData.members.length > 0" class="space-y-2">
        <h5 class="text-xs font-medium text-slate-700">Members</h5>
        <div
          v-for="member in activeTeamData.members"
          :key="member.id"
          class="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
        >
          <div class="text-sm text-slate-900">{{ member.email }}</div>
          <span class="text-[10px] text-slate-500">{{ member.role }}</span>
        </div>
      </div>

      <!-- Invitations -->
      <div v-if="activeTeamData.canInviteMembers" class="space-y-2">
        <h5 class="text-xs font-medium text-slate-700">Invite Member</h5>
        <div class="flex gap-2">
          <input
            v-model="newMemberEmail"
            type="email"
            class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="email@anggota.com"
            @keyup.enter="handleInviteMember"
          />
          <button
            @click="handleInviteMember"
            :disabled="!newMemberEmail.trim()"
            class="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <UserPlus :size="14" />
            Undang
          </button>
        </div>

        <div v-if="activeTeamData.invitations.length > 0" class="space-y-1">
          <div
            v-for="invitation in activeTeamData.invitations"
            :key="invitation.id"
            class="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
          >
            <div class="text-sm text-slate-900">{{ invitation.email }}</div>
            <button
              @click="handleRevokeInvitation(invitation)"
              class="text-xs text-rose-600 hover:text-rose-700"
            >
              Cabut
            </button>
          </div>
        </div>
      </div>

      <!-- API Keys -->
      <div v-if="activeTeamData.canManageApiKeys && projectConfig?.config?.allowTeamApiKeys" class="space-y-2">
        <h5 class="text-xs font-medium text-slate-700">Team API Keys</h5>
        <div class="flex gap-2">
          <input
            v-model="newApiKeyDescription"
            type="text"
            class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Deskripsi kunci API"
            @keyup.enter="handleCreateApiKey"
          />
          <button
            @click="handleCreateApiKey"
            :disabled="!newApiKeyDescription.trim()"
            class="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Key :size="14" />
            Buat
          </button>
        </div>

        <div v-if="activeTeamData.apiKeys.length > 0" class="space-y-1">
          <div
            v-for="key in activeTeamData.apiKeys"
            :key="key.id"
            class="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
          >
            <div class="text-sm text-slate-900">{{ key.description || 'API Key' }}</div>
            <span class="text-[10px] text-slate-500">{{ key.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
