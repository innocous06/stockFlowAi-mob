import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  sector: string;
  unitId: string;
  badge: string;
  clearance: string;
  avatarColor: string;
  phone: string;
  lastLogin?: string;
}

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user_vikram',
    name: 'Vikram Sharma',
    email: 'vikram.sharma@stockflow.ai',
    password: 'password123',
    role: 'Senior Logistics Officer',
    department: 'Guwahati Central Distribution Hub',
    sector: 'NER Sector 4A (Assam / Meghalaya)',
    unitId: 'CONVOY-ECHO-07',
    badge: 'HUB COMMAND',
    clearance: 'Level 4 — Tactical Operations Lead',
    avatarColor: '#B8703D',
    phone: '+91 94350 12845',
    lastLogin: 'Today, 08:30 AM',
  },
  {
    id: 'user_ananya',
    name: 'Ananya Roy',
    email: 'ananya.roy@pwd.meghalaya.gov.in',
    password: 'password123',
    role: 'Field Road Safety Inspector',
    department: 'Meghalaya PWD Rapid Response',
    sector: 'Guwahati — Shillong Corridor (NH-6)',
    unitId: 'PATROL-ALPHA-02',
    badge: 'PWD INSPECTOR',
    clearance: 'Level 3 — Highway Safety Officer',
    avatarColor: '#2A7A4D',
    phone: '+91 98630 44120',
    lastLogin: 'Today, 09:15 AM',
  },
  {
    id: 'user_tenzin',
    name: 'Tenzin Norbu',
    email: 'tenzin.norbu@borderlogistics.in',
    password: 'password123',
    role: 'High-Altitude Convoy Lead',
    department: 'Arunachal Border Supply Chain',
    sector: 'Sela Pass / Tawang Sector',
    unitId: 'SNOW-TACTICAL-09',
    badge: 'COLD CONVOY',
    clearance: 'Level 4 — Border Supply Lead',
    avatarColor: '#2563EB',
    phone: '+91 94022 88910',
    lastLogin: 'Yesterday, 06:45 PM',
  },
  {
    id: 'user_priya',
    name: 'Dr. Priya Das',
    email: 'priya.das@health.assam.gov.in',
    password: 'password123',
    role: 'Medical Relief Coordinator',
    department: 'Barak Valley Health & Disaster Response',
    sector: 'Silchar — Haflong Corridor',
    unitId: 'MED-RESPONSE-04',
    badge: 'MEDICAL COORD',
    clearance: 'Level 3 — Emergency Health Officer',
    avatarColor: '#C23B2E',
    phone: '+91 94351 77340',
    lastLogin: 'Today, 07:10 AM',
  },
  {
    id: 'user_rakesh',
    name: 'Rakesh Sangma',
    email: 'rakesh.sangma@ner-freight.co.in',
    password: 'password123',
    role: 'Essential Goods Transporter',
    department: 'Garo Hills PDS Supply Line',
    sector: 'Tura — Dalu Transit Sector',
    unitId: 'FREIGHT-KILO-11',
    badge: 'HEAVY FREIGHT',
    clearance: 'Level 2 — Field Freight Driver',
    avatarColor: '#B87D28',
    phone: '+91 98560 33819',
    lastLogin: 'Today, 09:40 AM',
  },
];

const DB_KEY = 'sf_users_db';
const SESSION_KEY = 'sf_auth_session';

function getDatabaseUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  // Initialize DB with default users
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_USERS));
  } catch {}
  return DEFAULT_USERS;
}

function saveDatabaseUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
  } catch {}
}

interface AuthContextType {
  currentUser: UserProfile;
  isAuthenticated: boolean;
  allUsers: UserProfile[];
  login: (emailOrBadge: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (userId: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(getDatabaseUsers);

  // Initialize session from localStorage
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const dbUsers = getDatabaseUsers();
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const { userId } = JSON.parse(savedSession);
        const match = dbUsers.find((u) => u.id === userId);
        if (match) return match;
      }
    } catch {}
    // Default to first user if session existed or fallback
    return dbUsers[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SESSION_KEY) !== null;
    } catch {
      return false;
    }
  });

  // Keep session synced to storage
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      try {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            userId: currentUser.id,
            timestamp: Date.now(),
          })
        );
      } catch {}
    } else {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}
    }
  }, [isAuthenticated, currentUser]);

  const login = useCallback(
    async (emailOrBadge: string, password = ''): Promise<{ success: boolean; error?: string }> => {
      const cleanInput = emailOrBadge.trim().toLowerCase();
      const currentDb = getDatabaseUsers();

      // Find user by email or badge or unitId or name
      const found = currentDb.find(
        (u) =>
          u.email.toLowerCase() === cleanInput ||
          u.badge.toLowerCase() === cleanInput ||
          u.unitId.toLowerCase() === cleanInput ||
          u.name.toLowerCase() === cleanInput
      );

      if (!found) {
        return { success: false, error: 'User account not found in field database.' };
      }

      // Check password (allow default password123 or dummy check)
      if (found.password && password && found.password !== password) {
        return { success: false, error: 'Incorrect password. (Default is password123)' };
      }

      const updatedUser = {
        ...found,
        lastLogin: 'Just now',
      };

      setCurrentUser(updatedUser);
      setIsAuthenticated(true);

      // Update in DB
      const updatedList = currentDb.map((u) => (u.id === found.id ? updatedUser : u));
      saveDatabaseUsers(updatedList);
      setUsers(updatedList);

      return { success: true };
    },
    []
  );

  const quickLogin = useCallback(async (userId: string) => {
    const currentDb = getDatabaseUsers();
    const found = currentDb.find((u) => u.id === userId);
    if (found) {
      const updatedUser = { ...found, lastLogin: 'Just now' };
      setCurrentUser(updatedUser);
      setIsAuthenticated(true);
      const updatedList = currentDb.map((u) => (u.id === found.id ? updatedUser : u));
      saveDatabaseUsers(updatedList);
      setUsers(updatedList);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  const changePassword = useCallback(
    async (currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
      if (!newPass || newPass.length < 4) {
        return { success: false, error: 'New password must be at least 4 characters long.' };
      }
      const currentDb = getDatabaseUsers();
      const found = currentDb.find((u) => u.id === currentUser.id);

      if (found && found.password && currentPass && found.password !== currentPass) {
        return { success: false, error: 'Current password does not match database record.' };
      }

      const updatedUser = { ...currentUser, password: newPass };
      setCurrentUser(updatedUser);

      const updatedList = currentDb.map((u) => (u.id === currentUser.id ? updatedUser : u));
      saveDatabaseUsers(updatedList);
      setUsers(updatedList);

      return { success: true };
    },
    [currentUser]
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setCurrentUser((prev) => {
        const updated = { ...prev, ...updates };
        const currentDb = getDatabaseUsers();
        const updatedList = currentDb.map((u) => (u.id === prev.id ? updated : u));
        saveDatabaseUsers(updatedList);
        setUsers(updatedList);
        return updated;
      });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        allUsers: users,
        login,
        quickLogin,
        logout,
        changePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
