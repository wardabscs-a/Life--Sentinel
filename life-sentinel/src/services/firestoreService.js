// Firestore service — CRUD helpers for user profiles and emergency reports
// All functions operate on the Firestore instance exported from firebase.js

import { doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ===== User Profile =====

/**
 * Create a new user profile in Firestore.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} data - { fullName, email }
 */
export async function createUserProfile(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    uid,
    fullName: data.fullName || '',
    email: data.email || '',
    phone: data.phone || '',
    bloodGroup: data.bloodGroup || '',
    medicalConditions: data.medicalConditions || '',
    trustedContacts: data.trustedContacts || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Retrieve a user's profile from Firestore.
 * @param {string} uid
 * @returns {Object|null} profile data or null if not found
 */
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Update fields on a user's profile document.
 * Uses setDoc with merge so it also works when the document does not
 * exist yet (e.g. accounts created while Firestore writes were blocked),
 * which updateDoc cannot handle.
 * @param {string} uid
 * @param {Object} updates - key/value pairs to merge
 */
export async function updateUserProfile(uid, updates) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Load a user's profile, creating the document — and backfilling any
 * missing fields — when needed. Guarantees authenticated users always
 * have a complete users/{uid} document, even if the account was created
 * while Firestore writes were blocked (leaving an empty/partial doc).
 * @param {string} uid - Firebase Auth UID
 * @param {Object} fallbackData - initial values used when creating/backfilling
 * @returns {Object|null} profile data
 */
export async function ensureUserProfile(uid, fallbackData = {}) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      fullName: fallbackData.fullName || '',
      email: fallbackData.email || '',
      phone: fallbackData.phone || '',
      bloodGroup: fallbackData.bloodGroup || '',
      medicalConditions: fallbackData.medicalConditions || '',
      trustedContacts: fallbackData.trustedContacts || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await getDoc(ref);
    return created.exists() ? created.data() : null;
  }

  // Doc exists — backfill any missing core fields so downstream code can
  // always rely on them (especially trustedContacts being an array).
  const data = snap.data();
  const defaults = {
    uid,
    fullName: fallbackData.fullName || '',
    email: fallbackData.email || '',
    phone: '',
    bloodGroup: '',
    medicalConditions: '',
    trustedContacts: [],
  };
  const missing = {};
  let hasMissing = false;
  Object.entries(defaults).forEach(([key, value]) => {
    if (data[key] === undefined) {
      missing[key] = value;
      hasMissing = true;
    }
  });
  if (hasMissing) {
    await setDoc(ref, missing, { merge: true });
    const refreshed = await getDoc(ref);
    return refreshed.exists() ? refreshed.data() : data;
  }
  return data;
}

// ===== Emergency Reports =====

/**
 * Save an emergency report to Firestore.
 * @param {Object} report - must include userId (Firebase UID)
 * @returns {string} Firestore document ID
 */
export async function saveReportToFirestore(report) {
  const ref = collection(db, 'reports');
  const docRef = await addDoc(ref, {
    ...report,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch reports belonging to a specific user.
 * @param {string} uid
 * @param {number} limit - max reports to return
 * @returns {Array} reports sorted newest first
 */
export async function getUserReports(uid, limit = 50) {
  const q = query(
    collection(db, 'reports'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
