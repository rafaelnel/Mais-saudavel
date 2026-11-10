import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Standard Google Auth Provider for app login
const baseProvider = new GoogleAuthProvider();

// Google Fit Auth Provider with Fitness API read scopes
const googleFitProvider = new GoogleAuthProvider();
googleFitProvider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
googleFitProvider.addScope('https://www.googleapis.com/auth/fitness.body.read');

// Cache OAuth access token strictly in memory (never in localStorage)
let cachedGoogleFitToken: string | null = null;
let isSigningIn = false;

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    if (!user && !isSigningIn) {
      cachedGoogleFitToken = null;
    }
    callback(user);
  });
};

export const signInWithGoogle = async (): Promise<User> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, baseProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleFitToken = credential.accessToken;
    }
    return result.user;
  } finally {
    isSigningIn = false;
  }
};

export const connectGoogleFitOAuth = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleFitProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Fit.');
    }
    cachedGoogleFitToken = credential.accessToken;
    return { user: result.user, accessToken: cachedGoogleFitToken };
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleFitAccessToken = (): string | null => {
  return cachedGoogleFitToken;
};

export const signInWithEmail = async (email: string, pass: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return result.user;
};

export const signUpWithEmail = async (
  email: string,
  pass: string,
  displayName: string
): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(result.user, { displayName: displayName.trim() });
    } catch {
      // Ignore non-fatal display name update error
    }
  }
  return result.user;
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const signOutUser = async () => {
  cachedGoogleFitToken = null;
  await auth.signOut();
};
