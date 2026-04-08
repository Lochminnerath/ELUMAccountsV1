export interface UserSettings {
  name: string;
  age: number | null;
  gender: string;
  calorieGoal: number;
}

const STORAGE_KEY = "health-manager-settings";

const defaultSettings: UserSettings = {
  name: "",
  age: null,
  gender: "",
  calorieGoal: 1600,
};

export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading settings:", error);
  }
  return defaultSettings;
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

export function getCalorieGoal(): number {
  const settings = getUserSettings();
  return settings.calorieGoal || 1600;
}
