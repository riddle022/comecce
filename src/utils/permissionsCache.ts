interface CachedPermissions {
  permissions: {
    isAdmin: boolean;
    canEdit: boolean;
    canDelete: boolean;
    menus: string[];
    empresas: any[];
    perfil: {
      id: string;
      nome: string;
      email: string;
    } | null;
    grupo: {
      id: string;
      nome: string;
    } | null;
  };
  timestamp: number;
  userId: string;
}

const CACHE_KEY = 'app_permissions_cache';
const CACHE_DURATION = 10 * 60 * 1000;

export function savePermissionsToCache(
  userId: string,
  permissions: CachedPermissions['permissions']
): void {
  try {
    const cache: CachedPermissions = {
      permissions,
      timestamp: Date.now(),
      userId,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving permissions to cache:', error);
  }
}

export function getPermissionsFromCache(userId: string): CachedPermissions['permissions'] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: CachedPermissions = JSON.parse(cached);

    if (cache.userId !== userId) {
      clearPermissionsCache();
      return null;
    }

    if (!isPermissionsCacheValid(cache.timestamp)) {
      clearPermissionsCache();
      return null;
    }

    return cache.permissions;
  } catch (error) {
    console.error('Error reading permissions from cache:', error);
    clearPermissionsCache();
    return null;
  }
}

export function clearPermissionsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing permissions cache:', error);
  }
}

export function isPermissionsCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

export function getCacheDuration(): number {
  return CACHE_DURATION;
}
