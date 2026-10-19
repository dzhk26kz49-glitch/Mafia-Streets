import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { toast } from 'sonner';

export const firebaseConfig = {
  projectId: "gen-lang-client-0050850314",
  appId: "1:138761784517:web:d904b3004dce17396174ac",
  apiKey: "AIzaSyD5ZdLhnIpYDPt7pZFeqWU3TDxuJOYcEAo",
  authDomain: "gen-lang-client-0050850314.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-8cc62377-7ee3-487a-94df-8f7806043943",
  storageBucket: "gen-lang-client-0050850314.firebasestorage.app",
  messagingSenderId: "138761784517",
};

const app = initializeApp(firebaseConfig);

let dbInstance: any;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  try {
    dbInstance = getFirestore(app);
  } catch (err) {
    console.error('Failed to initialize firestore with cache, falling back:', err);
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = (error instanceof Error ? error.message : String(error)) || '';
  
  if (errorMessage && (errorMessage.includes('offline') || errorMessage.includes('client is offline') || errorMessage.includes('backend') || errorMessage.includes('Could not reach Cloud Firestore backend'))) {
    console.warn('Firestore offline / network warning:', errorMessage);
    return;
  }

  if (errorMessage && (errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota limit exceeded') || errorMessage.includes('Quota exceeded') || errorMessage.includes('quota metric'))) {
    toast.error('تم استنفاد الحصة اليومية المجانية لقاعدة البيانات (Firestore Quota Exceeded). سيتم إعادة التعيين اليومي تلقائياً.', {
      duration: 10000,
      id: 'quota-error'
    });
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
