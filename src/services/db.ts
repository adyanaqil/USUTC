import type { User, Activity, LeaderboardEntry } from "../types";
import { getInitialMockData } from "../utils/mockData";

const USERS_KEY = "usutc_users";
const ACTIVITIES_KEY = "usutc_activities";

// Initialize data if not present in localStorage
export function initializeDB(): void {
  if (!localStorage.getItem(USERS_KEY) || !localStorage.getItem(ACTIVITIES_KEY)) {
    const { users, activities } = getInitialMockData();
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    console.log("Database initialized with mock data.");
  }
}

// Get all users
export async function getUsers(): Promise<User[]> {
  initializeDB();
  return new Promise((resolve) => {
    setTimeout(() => {
      const usersStr = localStorage.getItem(USERS_KEY);
      resolve(usersStr ? JSON.parse(usersStr) : []);
    }, 300); // Simulate network latency
  });
}

// Add a new user (for profile creation/lapoRUN entry)
export async function createUser(name: string): Promise<User> {
  initializeDB();
  return new Promise((resolve) => {
    setTimeout(() => {
      const usersStr = localStorage.getItem(USERS_KEY) || "[]";
      const users: User[] = JSON.parse(usersStr);
      
      const newUser: User = {
        id: "u_" + Math.random().toString(36).substring(2, 9),
        name,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      };
      
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      resolve(newUser);
    }, 200);
  });
}

// Get all activities
export async function getActivities(): Promise<Activity[]> {
  initializeDB();
  return new Promise((resolve) => {
    setTimeout(() => {
      const actsStr = localStorage.getItem(ACTIVITIES_KEY);
      resolve(actsStr ? JSON.parse(actsStr) : []);
    }, 400); // Simulate network latency
  });
}

// Add a new activity
export async function addActivity(activity: Omit<Activity, "id">): Promise<Activity> {
  initializeDB();
  return new Promise((resolve) => {
    setTimeout(() => {
      const actsStr = localStorage.getItem(ACTIVITIES_KEY) || "[]";
      const activities: Activity[] = JSON.parse(actsStr);
      
      const newActivity: Activity = {
        ...activity,
        id: "act_" + Math.random().toString(36).substring(2, 9)
      };
      
      activities.unshift(newActivity); // Add to beginning
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
      resolve(newActivity);
    }, 500); // Simulated processing/network lag
  });
}

// Delete an activity (for management/testing)
export async function deleteActivity(id: string): Promise<void> {
  initializeDB();
  return new Promise((resolve) => {
    setTimeout(() => {
      const actsStr = localStorage.getItem(ACTIVITIES_KEY) || "[]";
      let activities: Activity[] = JSON.parse(actsStr);
      activities = activities.filter(a => a.id !== id);
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
      resolve();
    }, 300);
  });
}

// Reset database back to initial mock data state
export async function resetDB(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const { users, activities } = getInitialMockData();
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
      resolve();
    }, 500);
  });
}

// Get leaderboard ranking for a specific month (format: "YYYY-MM")
export async function getMonthlyLeaderboard(monthStr: string): Promise<LeaderboardEntry[]> {
  initializeDB();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const usersStr = localStorage.getItem(USERS_KEY) || "[]";
      const actsStr = localStorage.getItem(ACTIVITIES_KEY) || "[]";
      
      const users: User[] = JSON.parse(usersStr);
      const activities: Activity[] = JSON.parse(actsStr);
      
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
        // Only include users who have at least one run in this month (or we can show all users, but filter 0 runs to keep leaderboard clean)
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
      
      resolve(rankedEntries);
    }, 450); // Simulate database aggregation latency
  });
}
