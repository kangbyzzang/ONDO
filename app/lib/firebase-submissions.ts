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
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import type { Answers, Locale } from "../data/questions";
import { isAdminEmail } from "./admin-access";
import { DUPLICATE_INSTAGRAM_MESSAGE, normalizeInstagramId } from "./instagram";
import type { MatchProfile } from "./matching";
import { firebaseAuth, firestore, initializeAuthSession } from "./firebase";

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

function isPermissionDenied(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "permission-denied";
}

function validateInstagramKey(instagram: string) {
  const instagramKey = normalizeInstagramId(instagram);
  if (!/^[a-z0-9._]{2,30}$/.test(instagramKey)) {
    throw new Error("올바른 인스타그램 아이디를 입력해주세요.");
  }
  return instagramKey;
}

async function anonymousUser() {
  await initializeAuthSession();
  if (firebaseAuth.currentUser?.isAnonymous) return firebaseAuth.currentUser;
  if (firebaseAuth.currentUser) await signOut(firebaseAuth);
  return (await signInAnonymously(firebaseAuth)).user;
}

export async function saveSubmission(payload: SubmissionPayload) {
  const user = await anonymousUser();
  const instagramKey = validateInstagramKey(payload.instagram);

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
    if (isPermissionDenied(error)) {
      throw new Error(DUPLICATE_INSTAGRAM_MESSAGE);
    }
    throw error;
  }

  try {
    await setDoc(doc(firestore, "submissionChecks", instagramKey), {
      instagramKey,
      submitted: true,
      createdAt: serverTimestamp(),
    });
  } catch {
    // The submission itself is already safely stored. A later availability
    // check can recreate this privacy-safe marker if this best-effort write fails.
  }

  return instagramKey;
}

export async function checkInstagramAlreadySubmitted(instagram: string) {
  await anonymousUser();
  const instagramKey = validateInstagramKey(instagram);
  const marker = doc(firestore, "submissionChecks", instagramKey);
  const snapshot = await getDoc(marker);
  if (snapshot.exists()) return true;

  try {
    // Rules permit this write only when a private submission with this exact
    // normalized ID already exists. No answers or profile data are exposed.
    await setDoc(marker, {
      instagramKey,
      submitted: true,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (isPermissionDenied(error)) return false;
    throw error;
  }
}

export async function signInAdmin() {
  await initializeAuthSession();
  if (isAdminEmail(firebaseAuth.currentUser?.email)) return firebaseAuth.currentUser;
  if (firebaseAuth.currentUser) await signOut(firebaseAuth);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const user = (await signInWithPopup(firebaseAuth, provider)).user;
  if (!isAdminEmail(user.email)) {
    await signOut(firebaseAuth);
    throw new Error("등록된 관리자 계정만 접근할 수 있습니다.");
  }
  return user;
}

export async function signOutAdmin() {
  await signOut(firebaseAuth);
}

export function isAdminUser(user: User | null): user is User {
  return isAdminEmail(user?.email);
}

export async function listSubmissionsForAdmin(): Promise<MatchProfile[]> {
  await initializeAuthSession();
  if (!isAdminUser(firebaseAuth.currentUser)) throw new Error("관리자 로그인이 필요합니다.");

  const snapshot = await getDocs(
    query(collection(firestore, "submissions"), orderBy("updatedAt", "desc"), limit(100)),
  );

  return snapshot.docs.map((record) => {
    const data = record.data() as SubmissionDocument;
    const submittedName = data.answers?.BIO003;
    return {
      id: record.id,
      instagram: data.instagram,
      name: typeof submittedName === "string" && submittedName.trim()
        ? submittedName.trim()
        : data.instagram.replace(/^@/, ""),
      locale: data.locale,
      answers: data.answers ?? {},
      importance: data.importance ?? {},
      updatedAt: data.updatedAt?.toDate().toISOString(),
    };
  });
}
