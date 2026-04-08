export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  duration: number;
  caloriesBurned: number;
  time: string;
}

export interface SleepEntry {
  hours: number;
  minutes: number;
  quality: string;
}

export interface MentalQuestionnaire {
  completed: boolean;
  mood: number;
  stress: number;
  energy: number;
  focus: number;
  notes: string;
}

export interface DailyLog {
  date: string;
  foods: FoodEntry[];
  exercises: ExerciseEntry[];
  sleep: SleepEntry;
  questionnaire: MentalQuestionnaire;
  streak: number;
}

interface TrackerState {
  logs: Record<string, DailyLog>;
}

const TRACKER_STORAGE_KEY = "afh-health-tracker-v1";

const defaultQuestionnaire: MentalQuestionnaire = {
  completed: false,
  mood: 3,
  stress: 3,
  energy: 3,
  focus: 3,
  notes: "",
};

const defaultSleep: SleepEntry = {
  hours: 0,
  minutes: 0,
  quality: "Not logged",
};

export function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultDailyLog(date: string = getTodayKey()): DailyLog {
  return {
    date,
    foods: [],
    exercises: [],
    sleep: { ...defaultSleep },
    questionnaire: { ...defaultQuestionnaire },
    streak: 0,
  };
}

export function getTrackerState(): TrackerState {
  try {
    const stored = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!stored) {
      return { logs: {} };
    }

    const parsed = JSON.parse(stored) as TrackerState;
    return {
      logs: parsed.logs || {},
    };
  } catch (error) {
    console.error("Error reading tracker data", error);
    return { logs: {} };
  }
}

export function saveTrackerState(state: TrackerState): void {
  try {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving tracker data", error);
  }
}

export function getDailyLog(date: string = getTodayKey()): DailyLog {
  const state = getTrackerState();
  return state.logs[date] || getDefaultDailyLog(date);
}

export function saveDailyLog(log: DailyLog): void {
  const state = getTrackerState();
  state.logs[log.date] = log;
  saveTrackerState(state);
}

export function getLastNDaysLogs(days: number): DailyLog[] {
  const state = getTrackerState();
  const result: DailyLog[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = date.toISOString().split("T")[0];
    result.push(state.logs[key] || getDefaultDailyLog(key));
  }

  return result;
}

export function formatDisplayDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
