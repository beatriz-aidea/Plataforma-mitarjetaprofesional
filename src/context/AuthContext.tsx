import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

interface AuthContextType {
  user: User | null;
  userRole: string;
  companyId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInAnon: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('free');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set language to Spanish
    auth.languageCode = 'es';

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          try {
            console.log("AuthContext: User document not found, creating new one for UID:", currentUser.uid);
            const isBeatriz = currentUser.email === 'beatriz@aidea.es';
            const initialRole = isBeatriz ? 'admin' : 'free';
            console.log("AuthContext: Assigning initial role:", initialRole);
            
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: initialRole,
              isAnonymous: currentUser.isAnonymous,
              createdAt: serverTimestamp()
            });
            setUserRole(initialRole);
            setCompanyId(null);
          } catch (error) {
            console.error("Error creating user document:", error);
          }
        } else {
          const data = userSnap.data();
          console.log("AuthContext: User document found for UID:", currentUser.uid, "with role:", data.role);
          setCompanyId(data.companyId || null);
          // If Beatriz already exists but doesn't have admin role, update it
          if (currentUser.email === 'beatriz@aidea.es' && data.role !== 'admin') {
            try {
              console.log("AuthContext: User is Beatriz but role is not admin, updating role...");
              await setDoc(userRef, { role: 'admin' }, { merge: true });
              setUserRole('admin');
            } catch (error) {
              console.error("Error updating admin role:", error);
              setUserRole(data.role || 'free');
            }
          } else {
            setUserRole(data.role || 'free');
          }
        }

        // Determine current role to avoid permission errors
        const currentRole = userSnap.exists() ? userSnap.data().role : (currentUser.email === 'beatriz@aidea.es' ? 'admin' : 'free');

        // Link existing cards with the same email to this user
        if (!currentUser.isAnonymous && currentUser.email && currentRole !== 'company_admin' && currentRole !== 'enterprise') {
          try {
            const cardsQuery = query(collection(db, 'cards'), where('contact.email', '==', currentUser.email));
            const cardsSnap = await getDocs(cardsQuery);
            
            for (const cardDoc of cardsSnap.docs) {
              const cardData = cardDoc.data();
              if (cardData.ownerUid !== currentUser.uid) {
                console.log(`AuthContext: Linking card ${cardDoc.id} to user ${currentUser.uid}`);
                await updateDoc(doc(db, 'cards', cardDoc.id), {
                  ownerUid: currentUser.uid
                });
              }
            }
          } catch (error) {
            console.error("Error linking cards:", error);
          }
        }
      } else {
        setUserRole('free');
        setCompanyId(null);
      }
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (auth.currentUser?.isAnonymous) {
        await auth.signOut();
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      if (auth.currentUser?.isAnonymous) {
        await auth.signOut();
      }
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error signing in with email', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      if (auth.currentUser?.isAnonymous) {
        await auth.signOut();
      }
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error signing up with email', error);
      throw error;
    }
  };

  const signInAnon = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in anonymously', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: 'https://mitarjetaprofesional.es/login',
        handleCodeInApp: false
      });
    } catch (error) {
      console.error('Error sending password reset email', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, companyId, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnon, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
