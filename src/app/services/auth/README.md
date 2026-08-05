# Auth Service

The `AuthService` manages user session state, local authentication persistence, and user profile metadata for the application.

## Primary Files
- [auth.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/auth/auth.service.ts) - Angular `@Injectable()` providing reactive signals for user auth state and local storage persistence.

## Key Signals & State Exposed
- `currentUser`: `Signal<UserProfile | null>` - Computed signal returning the currently authenticated user profile.
- `isAuthenticated`: `Signal<boolean>` - Computed signal checking if a valid user session is active.

## Key Methods
- `signInWithGoogle(customUser?: UserProfile)`: Simulates Google OAuth sign-in and persists user session.
- `signOut()`: Clears active user session and removes local storage data.

## Persistence
Auth state is persisted to `localStorage` under key `lens_clone_auth_v1`.
