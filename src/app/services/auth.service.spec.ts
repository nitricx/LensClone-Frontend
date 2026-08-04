import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockStore: Map<string, string>;

  beforeEach(() => {
    mockStore = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => mockStore.get(key) ?? null,
      setItem: (key: string, value: string) => mockStore.set(key, value),
      removeItem: (key: string) => mockStore.delete(key),
      clear: () => mockStore.clear(),
      length: 0,
      key: () => null,
    };
    vi.stubGlobal('localStorage', localStorageMock);
    service = new AuthService();
  });

  it('should initialize as anonymous (null user)', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should sign in user with Google profile', () => {
    service.signInWithGoogle();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).not.toBeNull();
    expect(service.currentUser()?.email).toBe('alex.rivera@gmail.com');
  });

  it('should sign out user back to anonymous state', () => {
    service.signInWithGoogle();
    expect(service.isAuthenticated()).toBe(true);

    service.signOut();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });
});
