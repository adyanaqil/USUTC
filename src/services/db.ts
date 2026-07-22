import type { User, Activity, LeaderboardEntry } from "../types";
import { getInitialMockData } from "../utils/mockData";
import { db, isFirebaseConfigured } from "../firebaseConfig";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";

const USERS_KEY = "usutc_users";
const ACTIVITIES_KEY = "usutc_activities";

// Local Storage helper to initialize database
function initializeLocalStorageDB(): void {
  const { users } = getInitialMockData();
  if (!localStorage.getItem("usutc_cleaned_v3")) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify([]));
    localStorage.setItem("usutc_cleaned_v3", "true");
    console.log("Local Storage reset: empty activities for each month.");
    return;
  }
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  if (!localStorage.getItem(ACTIVITIES_KEY)) {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify([]));
  }
}

// Initial seeding of Firebase Firestore with mock data
async function seedFirestoreDB(): Promise<{ users: User[]; activities: Activity[] }> {
  if (!db) throw new Error("Firebase is not initialized");
  
  console.log("Seeding Firestore database with initial mock data...");
  const { users, activities } = getInitialMockData();
  
  const batch = writeBatch(db);
  for (const u of users) {
    batch.set(doc(db, "users", u.id), u);
  }
  for (const a of activities) {
    batch.set(doc(db, "activities", a.id), a);
  }
  await batch.commit();
  console.log("Firestore database seeded successfully.");
  return { users, activities };
}

// Get all users
export async function getUsers(): Promise<User[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "users"));
      if (snap.empty) {
        const seeded = await seedFirestoreDB();
        return seeded.users;
      }
      const users: User[] = [];
      snap.forEach((docSnap) => {
        users.push(docSnap.data() as User);
      });
      return users;
    } catch (e) {
      console.error("Failed to fetch users from Firestore, falling back to local storage", e);
    }
  }

  // Fallback to LocalStorage
  initializeLocalStorageDB();
  return new Promise((resolve) => {
    const usersStr = localStorage.getItem(USERS_KEY);
    resolve(usersStr ? JSON.parse(usersStr) : []);
  });
}

// Add a new user (for profile creation/lapoRUN entry)
export async function createUser(name: string): Promise<User> {
  const newUser: User = {
    id: "u_" + Math.random().toString(36).substring(2, 9),
    name,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "users", newUser.id), newUser);
      return newUser;
    } catch (e) {
      console.error("Failed to create user in Firestore, falling back to local storage", e);
    }
  }

  // Fallback to LocalStorage
  initializeLocalStorageDB();
  return new Promise((resolve) => {
    const usersStr = localStorage.getItem(USERS_KEY) || "[]";
    const users: User[] = JSON.parse(usersStr);
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    resolve(newUser);
  });
}

// Get all activities
export async function getActivities(): Promise<Activity[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "activities"));
      if (snap.empty) {
        const seeded = await seedFirestoreDB();
        return seeded.activities;
      }
      const activities: Activity[] = [];
      snap.forEach((docSnap) => {
        activities.push(docSnap.data() as Activity);
      });
      // Sort by date descending (latest first)
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return activities;
    } catch (e) {
      console.error("Failed to fetch activities from Firestore, falling back to local storage", e);
    }
  }

  // Fallback to LocalStorage
  initializeLocalStorageDB();
  return new Promise((resolve) => {
    const actsStr = localStorage.getItem(ACTIVITIES_KEY);
    resolve(actsStr ? JSON.parse(actsStr) : []);
  });
}

// Add a new activity
export async function addActivity(activity: Omit<Activity, "id">): Promise<Activity> {
  const newActivity: Activity = {
    ...activity,
    id: "act_" + Math.random().toString(36).substring(2, 9)
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "activities", newActivity.id), newActivity);
      return newActivity;
    } catch (e) {
      console.error("Failed to save activity in Firestore, falling back to local storage", e);
    }
  }

  // Fallback to LocalStorage
  initializeLocalStorageDB();
  return new Promise((resolve) => {
    const actsStr = localStorage.getItem(ACTIVITIES_KEY) || "[]";
    const activities: Activity[] = JSON.parse(actsStr);
    activities.unshift(newActivity); // Add to beginning
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    resolve(newActivity);
  });
}

// Delete an activity (for management/testing)
export async function deleteActivity(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "activities", id));
      return;
    } catch (e) {
      console.error("Failed to delete activity from Firestore, falling back to local storage", e);
    }
  }

  // Fallback to LocalStorage
  initializeLocalStorageDB();
  return new Promise((resolve) => {
    const actsStr = localStorage.getItem(ACTIVITIES_KEY) || "[]";
    let activities: Activity[] = JSON.parse(actsStr);
    activities = activities.filter(a => a.id !== id);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    resolve();
  });
}

// Reset database back to initial mock data state
export async function resetDB(): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const actsSnap = await getDocs(collection(db, "activities"));
      
      const batch = writeBatch(db);
      usersSnap.forEach(d => batch.delete(d.ref));
      actsSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      
      await seedFirestoreDB();
      return;
    } catch (e) {
      console.error("Failed to reset Firestore DB, falling back to local storage", e);
    }
  }

  // Fallback to LocalStorage
  const { users, activities } = getInitialMockData();
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
}

// Get leaderboard ranking for a specific month (format: "YYYY-MM")
export async function getMonthlyLeaderboard(monthStr: string): Promise<LeaderboardEntry[]> {
  const users = await getUsers();
  const activities = await getActivities();
  
  // Filter activities that occurred in the specified month and are location valid
  const monthActs = activities.filter(act => {
    // Date is in format YYYY-MM-DD
    const actMonth = act.date.substring(0, 7); // Get "YYYY-MM"
    return actMonth === monthStr && act.isValidLocation;
  });
  
  // Group by userId
  const userStatsMap: Record<string, {
    totalDistance: number;
    totalDuration: number; // to compute weighted average pace
    totalRuns: number;
  }> = {};
  
  // Initialize map for all users (so they show up even if 0 km in that month)
  for (const u of users) {
    userStatsMap[u.id] = { totalDistance: 0, totalDuration: 0, totalRuns: 0 };
  }
  
  // Aggregate data
  for (const act of monthActs) {
    if (!userStatsMap[act.userId]) {
      // User might have been created but not in cache
      continue;
    }
    
    userStatsMap[act.userId].totalDistance += act.usuDistanceKm;
    // Estimate duration run inside USU = distance inside * avg pace
    userStatsMap[act.userId].totalDuration += act.usuDistanceKm * act.avgPaceMinPerKm;
    userStatsMap[act.userId].totalRuns += 1;
  }
  
  // Compile entries
  const entries: LeaderboardEntry[] = users
    .map(user => {
      const stats = userStatsMap[user.id] || { totalDistance: 0, totalDuration: 0, totalRuns: 0 };
      const avgPace = stats.totalDistance > 0 ? stats.totalDuration / stats.totalDistance : 0;
      
      return {
        rank: 0, // Assigned later
        userId: user.id,
        userName: user.name,
        avatarUrl: user.avatarUrl,
        totalDistanceKm: parseFloat(stats.totalDistance.toFixed(2)),
        avgPaceMinPerKm: parseFloat(avgPace.toFixed(2)),
        totalRuns: stats.totalRuns
      };
    })
    // Only include users who have at least one run in this month
    .filter(entry => entry.totalRuns > 0);
  
  // Sort by total distance descending
  entries.sort((a, b) => {
    if (b.totalDistanceKm !== a.totalDistanceKm) {
      return b.totalDistanceKm - a.totalDistanceKm;
    }
    // Tie breaker: better pace (lower is faster)
    return a.avgPaceMinPerKm - b.avgPaceMinPerKm;
  });
  
  // Assign ranks
  const rankedEntries = entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));
  
  return rankedEntries;
}
