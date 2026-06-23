import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';

export interface Member {
  name: string;
  phone: string;
  walletAddress: string;
  joinedAt: number;
  hasContributed?: boolean;
}

export interface JoinRequest {
  id: string;
  groupCode: string;
  userWallet: string;
  name: string;
  phone: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requestedAt: number;
}

export interface Group {
  id: string; // Group code (doc ID)
  name: string;
  chairmanName: string;
  chairmanPhone: string;
  chairmanWallet: string;
  amount: number;
  cycle: string;
  minMembers: number;
  maxMembers: number;
  status: 'PENDING' | 'ACTIVE';
  members: Member[];
  memberWallets: string[]; // For easy Firestore querying
  requests: JoinRequest[];
  totalFunds?: number;
  payoutIndex?: number;
  lastCycleStartTime?: number;
}

const GROUPS_COLLECTION = 'groups';

// Save a new group to Firestore
export const createGroupDb = async (group: Group): Promise<void> => {
  const docRef = doc(db, GROUPS_COLLECTION, group.id);
  // Ensure the chairman is in the memberWallets array
  if (!group.memberWallets) {
    group.memberWallets = [group.chairmanWallet.toLowerCase()];
  }
  await setDoc(docRef, group);
};

// Fetch a single group by ID (code)
export const getGroupDb = async (id: string): Promise<Group | null> => {
  const docRef = doc(db, GROUPS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Group;
  }
  return null;
};

// Fetch all groups a user belongs to (either as chairman or member)
export const getUserGroupsDb = async (walletAddress: string): Promise<Group[]> => {
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where('memberWallets', 'array-contains', walletAddress.toLowerCase())
  );
  
  const querySnapshot = await getDocs(q);
  const groups: Group[] = [];
  querySnapshot.forEach((doc) => {
    groups.push(doc.data() as Group);
  });
  
  return groups;
};

// Update specific fields of a group
export const updateGroupDb = async (id: string, data: Partial<Group>): Promise<void> => {
  const docRef = doc(db, GROUPS_COLLECTION, id);
  await updateDoc(docRef, data as any);
};

// Request to join a group
export const requestToJoinDb = async (groupId: string, request: JoinRequest): Promise<void> => {
  const docRef = doc(db, GROUPS_COLLECTION, groupId);
  await updateDoc(docRef, {
    requests: arrayUnion(request)
  });
};
