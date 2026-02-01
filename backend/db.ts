console.log('[DB] ========== In-Memory Database ==========');

interface User {
  id: string;
  email: string | null;
  name: string | null;
  appleId: string;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const users: Map<string, User> = new Map();
const appleIdIndex: Map<string, string> = new Map();

function generateId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export async function findUserByAppleId(appleId: string): Promise<User | null> {
  const userId = appleIdIndex.get(appleId);
  if (userId) {
    return users.get(userId) || null;
  }
  return null;
}

export async function findUserById(id: string): Promise<User | null> {
  return users.get(id) || null;
}

export async function createUser(data: {
  email: string | null;
  name: string | null;
  appleId: string;
}): Promise<User> {
  const existing = await findUserByAppleId(data.appleId);
  if (existing) {
    console.log('[DB] User already exists:', existing.id);
    return existing;
  }

  const id = generateId();
  const now = new Date();
  
  const user: User = {
    id,
    email: data.email,
    name: data.name,
    appleId: data.appleId,
    isPremium: false,
    createdAt: now,
    updatedAt: now,
  };

  users.set(id, user);
  appleIdIndex.set(data.appleId, id);
  
  console.log('[DB] User created:', id);
  console.log('[DB] Total users:', users.size);
  
  return user;
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
  const user = users.get(id);
  if (!user) {
    return null;
  }

  const updated: User = {
    ...user,
    ...data,
    updatedAt: new Date(),
  };

  users.set(id, updated);
  console.log('[DB] User updated:', id);
  
  return updated;
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = users.get(id);
  if (!user) {
    return false;
  }

  appleIdIndex.delete(user.appleId);
  users.delete(id);
  
  console.log('[DB] User deleted:', id);
  return true;
}

export function getDbStatus() {
  return {
    ready: true,
    type: 'in-memory',
    userCount: users.size,
    error: null,
  };
}

export const isDbReady = true;

console.log('[DB] In-memory database ready');
console.log('[DB] ==========================================');
