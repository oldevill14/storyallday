// lib/auth.tsx — Firebase Auth context + useAuth() hook for Story AI.
//
// Exposes { user, loading, signInGoogle, signInEmail, signUpEmail, signOutUser }.
// Auth state is tracked via onAuthStateChanged; `loading` is true until the
// first auth resolution arrives. All sign-in/up helpers throw Error with a
// friendly Thai message on failure (callers should catch + show e.message).

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Map Firebase auth error codes → friendly Thai messages. */
function friendlyAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    case 'auth/missing-password':
      return 'กรุณากรอกรหัสผ่าน';
    case 'auth/weak-password':
      return 'รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัวอักษร)';
    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้สมัครแล้ว ลองเข้าสู่ระบบแทน';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'auth/too-many-requests':
      return 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ยกเลิกการเข้าสู่ระบบด้วย Google';
    case 'auth/popup-blocked':
      return 'เบราว์เซอร์บล็อกหน้าต่าง Google กรุณาอนุญาต popup แล้วลองใหม่';
    case 'auth/network-request-failed':
      return 'เชื่อมต่อเครือข่ายไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต';
    case 'auth/operation-not-allowed':
      return 'วิธีเข้าสู่ระบบนี้ยังไม่ถูกเปิดใช้งาน';
    default:
      return 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      signInGoogle: async () => {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (err) {
          throw new Error(friendlyAuthError(err));
        }
      },
      signInEmail: async (email: string, password: string) => {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (err) {
          throw new Error(friendlyAuthError(err));
        }
      },
      signUpEmail: async (email: string, password: string) => {
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (err) {
          throw new Error(friendlyAuthError(err));
        }
      },
      signOutUser: async () => {
        try {
          await signOut(auth);
        } catch (err) {
          throw new Error(friendlyAuthError(err));
        }
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access auth state + actions. Must be used under <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth ต้องถูกใช้ภายใน <AuthProvider>');
  }
  return ctx;
}
