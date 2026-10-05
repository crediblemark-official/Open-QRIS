/**
 * Auth Me Handler
 * Mengambil data user yang sedang login
 */

import { store } from '../../services/store';

export async function handleMe(authUser: any) {
  if (!authUser) {
    return { success: false, message: 'Tidak terautentikasi' };
  }

  const tenant = authUser.tenantId ? await store.getTenantById(authUser.tenantId) : undefined;

  return {
    success: true,
    user: {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      tenantId: authUser.tenantId,
      provider: authUser.provider,
      tenant,
    },
  };
}
