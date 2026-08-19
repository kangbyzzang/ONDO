import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import type { Answers, Locale } from "../data/questions";
import { DUPLICATE_INSTAGRAM_MESSAGE, normalizeInstagramId } from "./instagram";
import type { MatchProfile } from "./matching";
import { ADMIN_EMAIL, firebaseAuth, firestore, initializeAuthSession } from "./firebase";

interface SubmissionPayload {
  instagram: string;
  locale: Locale;
  answers: Answers;
  importance: Record<string, number>;
  completion: number;
}

interface SubmissionDocument extends SubmissionPayload {
  ownerUid: string;
  instagramKey: string;
  intent: string;
  country: string;
  updatedAt?: Timestamp;
}

async function anonymousUser() {
  await initializeAuthSession();
  if (firebaseAuth.currentUser?.isAnonymous) return firebaseAuth.currentUser;
  if (firebaseAuth.currentUser) await signOut(firebaseAuth);
  return (await signInAnonymously(firebaseAuth)).user;
}

export async function saveSubmission(payload: SubmissionPayload) {
  const user = await anonymousUser();
  const instagramKey = normalizeInstagramId(payload.instagram);
  if (!/^[a-z0-9._]{2,30}$/.test(instagramKey)) {
    throw new Error("올바른 인스타그램 아이디를 입력해주세요.");
  }

  try {
    await setDoc(
      doc(firestore, "submissions", instagramKey),
      {
        ownerUid: user.uid,
        instagramKey,
        instagram: `@${instagramKey}`,
        locale: payload.locale,
        intent: String(payload.answers.R001 ?? "UNSURE"),
        country: String(payload.answers.CB001 ?? "OTHER"),
        answers: payload.answers,
        importance: payload.importance,
        completion: Math.max(0, Math.min(100, Math.round(payload.completion))),
        updatedAt: serverTimestamp(),
      },
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "permission-denied") {
      throw new Error(DUPLICATE_INSTAGRAM_MESSAGE);
    }
    throw error;
  }

  return instagramKey;
}

export async function signInAdmin() {
  await initializeAuthSession();
  if (firebaseAuth.currentUser?.email === ADMIN_EMAIL) return firebaseAuth.currentUser;
  if (firebaseAuth.currentUser) await signOut(firebaseAuth);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ login_hint: ADMIN_EMAIL, prompt: "select_account" });
  const user = (await signInWithPopup(firebaseAuth, provider)).user;
  if (user.email !== ADMIN_EMAIL) {
    await signOut(firebaseAuth);
    throw new Error(`${ADMIN_EMAIL} 계정만 관리자 화면에 접근할 수 있습니다.`);
  }
  return user;
}

export async function signOutAdmin() {
  await signOut(firebaseAuth);
}

export function isAdminUser(user: User | null): user is User {
  return user?.email === ADMIN_EMAIL;
}

export async function listSubmissionsForAdmin(): Promise<MatchProfile[]> {
  await initializeAuthSession();
  if (!isAdminUser(firebaseAuth.currentUser)) throw new Error("관리자 로그인이 필요합니다.");

  const snapshot = await getDocs(
    query(collection(firestore, "submissions"), orderBy("updatedAt", "desc"), limit(100)),
  );

  return snapshot.docs.map((record) => {
    const data = record.data() as SubmissionDocument;
    return {
      id: record.id,
      instagram: data.instagram,
      name: data.instagram.replace(/^@/, ""),
      locale: data.locale,
      answers: data.answers ?? {},
      importance: data.importance ?? {},
      updatedAt: data.updatedAt?.toDate().toISOString(),
    };
  });
}
