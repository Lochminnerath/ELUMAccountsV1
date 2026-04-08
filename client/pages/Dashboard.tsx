import { useState } from "react";
import Layout from "@/components/Layout";
import { Plus, Flame, Zap, Moon, Heart } from "lucide-react";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
}

export default function Dashboard() {
  const [foods, setFoods] = useState<FoodEntry[]>([
    {
      id: "1",
      name: "Chicken Breast with Rice",
      calories: 450,
      protein: 45,
      carbs: 50,
      fats: 5,
      time: "7:30 AM",
    },
    {
      id: "2",
      name: "Greek Yogurt with Berries",
      calories: 180,
      protein: 20,
      carbs: 25,
      fats: 2,
      time: "10:00 AM",
    },
  ]);

  const [exercises, setExercises] = useState([
    { id: "1", name: "Morning Run", duration: 45, caloriesBurned: 450, time: "6:00 AM" },
  ]);

  const dailyCalorieGoal = 2500;
  const totalCaloriesConsumed = foods.reduce((acc, food) => acc + food.calories, 0);
  const totalCaloriesBurned = exercises.reduce((acc, ex) => acc + ex.caloriesBurned, 0);
  const remainingCalories = dailyCalorieGoal + totalCaloriesBurned - totalCaloriesConsumed;

  const totalProtein = foods.reduce((acc, food) => acc + food.protein, 0);
  const totalCarbs = foods.reduce((acc, food) => acc + food.carbs, 0);
  const totalFats = foods.reduce((acc, food) => acc + food.fats, 0);

  const proteinGoal = 150;
  const carbsGoal = 300;
  const fatsGoal = 85;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Today's Summary</h1>
            <p className="mt-2 text-muted-foreground">Wednesday, January 15, 2025</p>
          </div>

          {/* Streak Counter */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground">Current Streak</h2>
                <p className="mt-2 text-4xl font-bold text-primary">24 Days</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">🔥</p>
              </div>
            </div>
          </div>

          {/* Main Calorie Tracking */}
          <div className="mb-8 grid gap-6 lg:grid-cols-3">
            {/* Main calorie card */}
            <div className="rounded-xl border border-border bg-card p-8 lg:col-span-2">
              <h2 className="mb-6 text-lg font-semibold text-foreground">Calorie Balance</h2>

              <div className="mb-8 flex items-end justify-around">
                <div className="text-center">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">Goal</div>
                  <div className="text-3xl font-bold text-foreground">{dailyCalorieGoal}</div>
                  <div className="text-xs text-muted-foreground">base</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-sm font-medium text-muted-foreground">+</div>
                </div>

                <div className="text-center">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">Burned</div>
                  <div className="text-3xl font-bold text-carbs">{totalCaloriesBurned}</div>
                  <div className="text-xs text-muted-foreground">exercise</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-sm font-medium text-muted-foreground">-</div>
                </div>

                <div className="text-center">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">Eaten</div>
                  <div className="text-3xl font-bold text-calories">{totalCaloriesConsumed}</div>
                  <div className="text-xs text-muted-foreground">consumed</div>
                </div>
              </div>

              {/* Remaining Calories */}
              <div className="rounded-lg bg-secondary/50 p-6 text-center">
                <div className="text-sm font-medium text-muted-foreground">Remaining</div>
                <div
                  className={`mt-2 text-5xl font-bold ${
                    remainingCalories > 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {remainingCalories}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {remainingCalories > 0
                    ? "You can still eat this many calories"
                    : "You have exceeded your calorie goal"}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-protein">
                    <Flame className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">Protein</h3>
                </div>
                <div className="text-2xl font-bold text-protein">{totalProtein}g</div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-protein transition-all"
                    style={{ width: `${Math.min((totalProtein / proteinGoal) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Goal: {proteinGoal}g</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-carbs">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">Carbs</h3>
                </div>
                <div className="text-2xl font-bold text-carbs">{totalCarbs}g</div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-carbs transition-all"
                    style={{ width: `${Math.min((totalCarbs / carbsGoal) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Goal: {carbsGoal}g</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-fats">
                    <Heart className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">Fats</h3>
                </div>
                <div className="text-2xl font-bold text-fats">{totalFats}g</div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-fats transition-all"
                    style={{ width: `${Math.min((totalFats / fatsGoal) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Goal: {fatsGoal}g</p>
              </div>
            </div>
          </div>

          {/* Food Entries */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Food Intake</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Add Food
                </button>
              </div>

              <div className="space-y-3">
                {foods.map((food) => (
                  <div key={food.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{food.name}</p>
                      <p className="text-xs text-muted-foreground">{food.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{food.calories}</p>
                      <p className="text-xs text-muted-foreground">cal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercise Entries */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Exercises</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </button>
              </div>

              <div className="space-y-3">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{exercise.time} • {exercise.duration} min</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-carbs">+{exercise.caloriesBurned}</p>
                      <p className="text-xs text-muted-foreground">cal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sleep & Wellness */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Sleep Tracking</h2>
                <button className="text-sm font-semibold text-primary hover:text-primary/80">Edit</button>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-bold text-primary">7h 45m</p>
                <p className="mt-2 text-sm text-muted-foreground">Last night sleep duration</p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">QUALITY</p>
                  <p className="mt-1 text-lg font-bold text-foreground">Good</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">BED TIME</p>
                  <p className="mt-1 text-lg font-bold text-foreground">11:15 PM</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">WAKE TIME</p>
                  <p className="mt-1 text-lg font-bold text-foreground">7:00 AM</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Mental Wellness</h2>
                <button className="text-sm font-semibold text-primary hover:text-primary/80">Review</button>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Daily check-in at 7 PM</p>
              <div className="space-y-3">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-sm font-medium text-foreground">Mood</p>
                  <p className="mt-1 text-lg font-bold text-primary">Positive</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-sm font-medium text-foreground">Stress Level</p>
                  <p className="mt-1 text-lg font-bold text-carbs">Moderate</p>
                </div>
                <button className="w-full rounded-lg border border-primary bg-transparent py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/10">
                  Complete Evening Check-in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
