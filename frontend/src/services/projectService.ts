import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  doc,
  deleteDoc,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { GeneratedApp } from "@/lib/gemini";
import { toast } from "sonner";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
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

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}

export async function saveProject(project: GeneratedApp) {
  if (!auth.currentUser) return;

  const path = "projects";
  try {
    await addDoc(collection(db, path), {
      ownerId: auth.currentUser.uid,
      name: project.projectName,
      config: project,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToProjects(callback: (projects: any[]) => void) {
  if (!auth.currentUser) return () => {};

  const path = "projects";
  const q = query(
    collection(db, path),
    where("ownerId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(projects);
  }, (error) => {
    // Log the error but don't throw to avoid crashing the React component
    const errInfo = {
      error: error.message,
      operationType: OperationType.LIST,
      path
    };
    console.error('Firestore Subscription Error: ', JSON.stringify(errInfo));
    toast.error("Failed to load project history. Please check your connection.");
  });
}

export async function deleteProject(projectId: string) {
  if (!auth.currentUser) return;

  const path = "projects";
  try {
    await deleteDoc(doc(db, path, projectId));
    toast.success("Project deleted successfully");
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearHistory() {
  if (!auth.currentUser) return;

  const path = "projects";
  try {
    const q = query(
      collection(db, path),
      where("ownerId", "==", auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    toast.success("History cleared successfully");
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
