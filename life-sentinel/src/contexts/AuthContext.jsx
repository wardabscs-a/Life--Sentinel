import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserProfile, ensureUserProfile, getUserProfile, updateUserProfile } from '../services/firestoreService';

const AuthContext = createContext(null);

// Map common Firebase error codes to translation keys
export const FIREBASE_ERROR_MAP = {
  'auth/email-already-in-use': 'auth.emailInUse',
  'auth/invalid-email': 'auth.invalidEmail',
  'auth/weak-password': 'auth.weakPassword',
  'auth/user-not-found': 'auth.userNotFound',
  'auth/wrong-password': 'auth.wrongPassword',
  'auth/invalid-credential': 'auth.wrongPassword',
  'auth/too-many-requests': 'auth.tooManyRequests',
  'auth/network-request-failed': 'auth.networkError',
  'auth/operation-not-allowed': 'auth.operationNotAllowed',
};

/**
 * Translate a Firebase error into a translation key.
 * Callers should pass the result through t() to get the localized string.
 */
export function mapFirebaseError(errorCode) {
  return FIREBASE_ERROR_MAP[errorCode] || 'auth.genericError';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Bumped on every profile write; lets profile loads skip merging
  // stale data when an update happened while the load was in flight.
  const updatesVersionRef = useRef(0);

  // Firebase auth state listener — single source of truth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Build base user from Firebase Auth immediately
        const baseUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          phone: '',
          bloodGroup: '',
          medicalConditions: '',
          trustedContacts: [],
        };
        setUser(baseUser);
        setLoading(false);
        setAuthReady(true);

        // Load (or create) the Firestore profile in the background.
        // Skips the merge if a profile update happened while loading, so
        // freshly saved data is never overwritten with stale values.
        const versionBeforeLoad = updatesVersionRef.current;
        try {
          const profile = await ensureUserProfile(firebaseUser.uid, {
            fullName: firebaseUser.displayName || baseUser.name,
            email: firebaseUser.email || '',
          });
          if (profile && updatesVersionRef.current === versionBeforeLoad) {
            setUser(prev => prev?.uid === firebaseUser.uid
              ? { ...prev, ...profile, name: profile.fullName || prev.name }
              : prev);
          }
        } catch (err) {
          console.warn('Could not load user profile from Firestore:', err.message);
        }
      } else {
        setUser(null);
        setLoading(false);
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  /**
   * Sign up with email/password. Creates Firebase Auth account + Firestore profile.
   */
  const signup = useCallback(async (email, password, fullName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName: fullName });

    // Create Firestore user document
    await createUserProfile(cred.user.uid, {
      fullName,
      email,
    });

    return { uid: cred.user.uid, name: fullName, email };
  }, []);

  /**
   * Sign in with email/password.
   */
  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles profile loading
  }, []);

  /**
   * Sign out.
   */
  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  /**
   * Send password reset email.
   */
  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  /**
   * Update profile fields. Merges into Firestore user document.
   * Maintains backward-compatible interface: updateProfile({ name, bloodGroup, ... })
   */
  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    const { id, uid, ...cleanUpdates } = updates;

    // Map 'name' → 'fullName' for Firestore
    if (cleanUpdates.name !== undefined) {
      cleanUpdates.fullName = cleanUpdates.name;
    }

    const previous = user;
    updatesVersionRef.current += 1;

    // Optimistic local update
    setUser(prev => prev ? { ...prev, ...updates } : prev);

    // Persist to Firestore. On failure the optimistic update is reverted
    // and the error re-thrown so callers can show it instead of silently
    // losing the data.
    try {
      await updateUserProfile(user.uid, cleanUpdates);
    } catch (err) {
      console.warn('Profile update to Firestore failed:', err.message);
      setUser(previous);
      throw err;
    }
  }, [user]);

  /**
   * Re-read the Firestore profile and merge it into state (no write).
   * Lets pages pull fresh data, e.g. trusted contacts, when they load.
   */
  const refreshProfile = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    const versionBefore = updatesVersionRef.current;
    const profile = await getUserProfile(fbUser.uid);
    if (profile && updatesVersionRef.current === versionBefore) {
      setUser(prev => prev?.uid === fbUser.uid
        ? { ...prev, ...profile, name: profile.fullName || prev.name }
        : prev);
    }
    return profile;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authReady,
      login,
      signup,
      logout,
      updateProfile,
      refreshProfile,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
