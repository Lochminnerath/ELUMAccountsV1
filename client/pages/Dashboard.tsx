import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Flame, Heart, Moon, Plus, Search, X, Zap } from "lucide-react";
import { searchFoods, type Food } from "@/lib/foods";
import { getUserSettings } from "@/lib/settings";
import {
  type DailyLog,
  type ExerciseEntry,
  type FoodEntry,
  getDailyLog,
  getTodayKey,
  saveDailyLog,
} from "@/lib/tracker";
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";

const SUSTAINED_DEFICIT = 400;

export default function Dashboard() {
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(1600);
  const [dailyLog, setDailyLog] = useState<DailyLog>(() => getDailyLog(getTodayKey()));

  const [showFoodForm, setShowFoodForm] = useState(false);
  const [foodForm, setFoodForm] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });
  const [foodSearchResults, setFoodSearchResults] = useState<Food[]>([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    duration: "",
    caloriesBurned: "",
  });

  useEffect(() => {
    const settings = getUserSettings();
    setDailyCalorieGoal(settings.calorieGoal);
  }, []);

  useEffect(() => {
    saveDailyLog(dailyLog);
  }, [dailyLog]);

  const updateLog = (updates: Partial<DailyLog>) => {
    setDailyLog((current) => ({ ...current, ...updates }));
  };

  const handleFoodNameChange = (value: string) => {
    setFoodForm({ ...foodForm, name: value });

    if (value.trim()) {
      const results = searchFoods(value);
      setFoodSearchResults(results);
      setShowFoodSearch(results.length > 0);
      return;
    }

    setFoodSearchResults([]);
    setShowFoodSearch(false);
  };

  const handleSelectFood = (food: Food) => {
    setFoodForm({
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fats: food.fats.toString(),
    });
    setShowFoodSearch(false);
  };

  const handleAddFood = () => {
    if (!foodForm.name || !foodForm.calories) return;

    const newFood: FoodEntry = {
      id: Date.now().toString(),
      name: foodForm.name,
      calories: parseInt(foodForm.calories) || 0,
      protein: parseInt(foodForm.protein) || 0,
      carbs: parseInt(foodForm.carbs) || 0,
      fats: parseInt(foodForm.fats) || 0,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };

    updateLog({ foods: [...dailyLog.foods, newFood] });
    setFoodForm({ name: "", calories: "", protein: "", carbs: "", fats: "" });
    setShowFoodForm(false);
  };

  const handleAddExercise = () => {
    if (!exerciseForm.name || !exerciseForm.caloriesBurned) return;

    const newExercise: ExerciseEntry = {
      id: Date.now().toString(),
      name: exerciseForm.name,
      duration: parseInt(exerciseForm.duration) || 0,
      caloriesBurned: parseInt(exerciseForm.caloriesBurned) || 0,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };

    updateLog({ exercises: [...dailyLog.exercises, newExercise] });
    setExerciseForm({ name: "", duration: "", caloriesBurned: "" });
    setShowExerciseForm(false);
  };

  const totalCaloriesConsumed = useMemo(
    () => dailyLog.foods.reduce((acc, food) => acc + food.calories, 0),
    [dailyLog.foods],
  );
  const totalCaloriesBurned = useMemo(
    () => dailyLog.exercises.reduce((acc, exercise) => acc + exercise.caloriesBurned, 0),
    [dailyLog.exercises],
  );

  const totalProtein = dailyLog.foods.reduce((acc, food) => acc + food.protein, 0);
  const totalCarbs = dailyLog.foods.reduce((acc, food) => acc + food.carbs, 0);
  const totalFats = dailyLog.foods.reduce((acc, food) => acc + food.fats, 0);

  const remainingCalories = dailyCalorieGoal + totalCaloriesBurned - totalCaloriesConsumed;
  const goalForChart = Math.max(dailyCalorieGoal, 1);
  const caloriesTowardGoal = Math.min(totalCaloriesConsumed, goalForChart);

  const caloriePieData = [
    { name: "Consumed", value: caloriesTowardGoal, color: "#f97316" },
    {
      name: "Deficit Target (400)",
      value: Math.min(SUSTAINED_DEFICIT, Math.max(goalForChart - caloriesTowardGoal, 0)),
      color: "#2563eb",
    },
    {
      name: "Remaining",
      value: Math.max(goalForChart - caloriesTowardGoal - SUSTAINED_DEFICIT, 0),
      color: "#22c55e",
    },
  ].filter((item) => item.value > 0);

  const mentalChartData = [
    { subject: "Mood", score: dailyLog.questionnaire.mood },
    { subject: "Stress", score: dailyLog.questionnaire.stress },
    { subject: "Energy", score: dailyLog.questionnaire.energy },
    { subject: "Focus", score: dailyLog.questionnaire.focus },
  ];

  const getFormattedDate = () => {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">AF Health Daily Dashboard</h1>
          <p className="mt-2 text-muted-foreground">{getFormattedDate()}</p>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-foreground">
              Streak (days)
              <input
                type="number"
                min="0"
                value={dailyLog.streak}
                onChange={(event) =>
                  updateLog({ streak: parseInt(event.target.value) || 0 })
                }
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground">Daily calorie goal</p>
              <p className="text-3xl font-bold text-foreground">{dailyCalorieGoal}</p>
              <p className="text-xs text-muted-foreground">Default target: 1600</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-3xl font-bold ${remainingCalories >= 0 ? "text-green-600" : "text-red-600"}`}>
                {remainingCalories}
              </p>
              <p className="text-xs text-muted-foreground">Includes exercise and food logs.</p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Daily Calorie Intake Pie</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={caloriePieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105}>
                    {caloriePieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground">
              The 400-calorie sustained deficit segment is shown in blue.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Macro Progress</h2>
            {[{ label: "Protein", value: totalProtein, goal: 150, color: "bg-red-500", icon: Flame }, { label: "Carbs", value: totalCarbs, goal: 300, color: "bg-yellow-500", icon: Zap }, { label: "Fats", value: totalFats, goal: 85, color: "bg-pink-500", icon: Heart }].map(({ label, value, goal, color, icon: Icon }) => (
              <div key={label} className="mb-5">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" /> {label}: {Math.round(value)} / {goal}g</div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Food Intake</h2>
              <button onClick={() => setShowFoodForm((show) => !show)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add Food</button>
            </div>
            {showFoodForm && (
              <div className="mb-4 space-y-2 rounded-lg border border-border p-3">
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input value={foodForm.name} onChange={(event) => handleFoodNameChange(event.target.value)} placeholder="Search foods" className="w-full bg-transparent py-2 outline-none" />
                  </div>
                  {showFoodSearch && (
                    <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-card">
                      {foodSearchResults.map((food) => (
                        <button key={food.id} onClick={() => handleSelectFood(food)} className="w-full border-b border-border/50 px-3 py-2 text-left text-sm hover:bg-secondary/50">{food.name} ({food.calories} cal)</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input value={foodForm.calories} onChange={(event) => setFoodForm({ ...foodForm, calories: event.target.value })} type="number" placeholder="Calories" className="rounded border border-border px-2 py-1" />
                  <input value={foodForm.protein} onChange={(event) => setFoodForm({ ...foodForm, protein: event.target.value })} type="number" placeholder="Protein" className="rounded border border-border px-2 py-1" />
                  <input value={foodForm.carbs} onChange={(event) => setFoodForm({ ...foodForm, carbs: event.target.value })} type="number" placeholder="Carbs" className="rounded border border-border px-2 py-1" />
                  <input value={foodForm.fats} onChange={(event) => setFoodForm({ ...foodForm, fats: event.target.value })} type="number" placeholder="Fats" className="rounded border border-border px-2 py-1" />
                </div>
                <button onClick={handleAddFood} className="rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Save Food</button>
              </div>
            )}
            <div className="space-y-2">
              {dailyLog.foods.length === 0 ? <p className="text-sm text-muted-foreground">No food added today.</p> : dailyLog.foods.map((food) => (
                <div key={food.id} className="flex items-center justify-between rounded bg-secondary/50 p-3">
                  <div><p className="font-medium">{food.name}</p><p className="text-xs text-muted-foreground">{food.time}</p></div>
                  <div className="flex items-center gap-3"><p className="font-semibold">{food.calories} cal</p><button onClick={() => updateLog({ foods: dailyLog.foods.filter((item) => item.id !== food.id) })}><X className="h-4 w-4" /></button></div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Exercises</h2>
              <button onClick={() => setShowExerciseForm((show) => !show)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add Exercise</button>
            </div>
            {showExerciseForm && (
              <div className="mb-4 space-y-2 rounded-lg border border-border p-3">
                <input value={exerciseForm.name} onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })} placeholder="Exercise" className="w-full rounded border border-border px-2 py-1" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={exerciseForm.duration} onChange={(event) => setExerciseForm({ ...exerciseForm, duration: event.target.value })} type="number" placeholder="Minutes" className="rounded border border-border px-2 py-1" />
                  <input value={exerciseForm.caloriesBurned} onChange={(event) => setExerciseForm({ ...exerciseForm, caloriesBurned: event.target.value })} type="number" placeholder="Calories burned" className="rounded border border-border px-2 py-1" />
                </div>
                <button onClick={handleAddExercise} className="rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Save Exercise</button>
              </div>
            )}
            <div className="space-y-2">
              {dailyLog.exercises.length === 0 ? <p className="text-sm text-muted-foreground">No exercise added today.</p> : dailyLog.exercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center justify-between rounded bg-secondary/50 p-3">
                  <div><p className="font-medium">{exercise.name}</p><p className="text-xs text-muted-foreground">{exercise.time} • {exercise.duration} min</p></div>
                  <div className="flex items-center gap-3"><p className="font-semibold text-green-600">+{exercise.caloriesBurned}</p><button onClick={() => updateLog({ exercises: dailyLog.exercises.filter((item) => item.id !== exercise.id) })}><X className="h-4 w-4" /></button></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Sleep Tracking</h2>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min="0" max="23" value={dailyLog.sleep.hours} onChange={(event) => updateLog({ sleep: { ...dailyLog.sleep, hours: parseInt(event.target.value) || 0 } })} placeholder="Hours" className="rounded border border-border px-2 py-1" />
              <input type="number" min="0" max="59" value={dailyLog.sleep.minutes} onChange={(event) => updateLog({ sleep: { ...dailyLog.sleep, minutes: parseInt(event.target.value) || 0 } })} placeholder="Minutes" className="rounded border border-border px-2 py-1" />
              <select value={dailyLog.sleep.quality} onChange={(event) => updateLog({ sleep: { ...dailyLog.sleep, quality: event.target.value } })} className="rounded border border-border px-2 py-1">
                <option>Not logged</option><option>Poor</option><option>Fair</option><option>Good</option><option>Excellent</option>
              </select>
            </div>
            <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm">
              <Moon className="mr-2 inline h-4 w-4" /> {dailyLog.sleep.hours}h {dailyLog.sleep.minutes}m • {dailyLog.sleep.quality}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Evening Mental Health Questionnaire</h2>
            <p className="mb-3 text-sm text-muted-foreground">Complete this daily check-in to keep your weekly trend data accurate.</p>
            {[
              { key: "mood", label: "Mood (1-5)" },
              { key: "stress", label: "Stress (1-5)" },
              { key: "energy", label: "Energy (1-5)" },
              { key: "focus", label: "Focus (1-5)" },
            ].map((item) => (
              <label key={item.key} className="mb-2 block text-sm">{item.label}
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={dailyLog.questionnaire[item.key as keyof typeof dailyLog.questionnaire] as number}
                  onChange={(event) =>
                    updateLog({
                      questionnaire: {
                        ...dailyLog.questionnaire,
                        [item.key]: parseInt(event.target.value),
                        completed: true,
                      },
                    })
                  }
                  className="w-full"
                />
              </label>
            ))}
            <textarea
              value={dailyLog.questionnaire.notes}
              onChange={(event) =>
                updateLog({
                  questionnaire: {
                    ...dailyLog.questionnaire,
                    notes: event.target.value,
                    completed: true,
                  },
                })
              }
              placeholder="How did you feel today?"
              className="mt-2 w-full rounded border border-border px-2 py-2 text-sm"
            />
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={mentalChartData} outerRadius={80}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.5} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
