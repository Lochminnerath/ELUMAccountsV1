import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Plus, X, Flame, Zap, Moon, Heart, Search } from "lucide-react";
import { searchFoods, type Food } from "@/lib/foods";
import { getUserSettings } from "@/lib/settings";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
}

interface ExerciseEntry {
  id: string;
  name: string;
  duration: number;
  caloriesBurned: number;
  time: string;
}

export default function Dashboard() {
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepQuality, setSleepQuality] = useState("Not logged");
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(1600);
  const [userName, setUserName] = useState("");

  // Form states
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

  // Load user settings on mount
  useEffect(() => {
    const settings = getUserSettings();
    setDailyCalorieGoal(settings.calorieGoal);
    setUserName(settings.name);
  }, []);

  // Get current date
  const getFormattedDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("en-US", options);
  };

  // Handle food name input and show search results
  const handleFoodNameChange = (value: string) => {
    setFoodForm({ ...foodForm, name: value });

    if (value.trim()) {
      const results = searchFoods(value);
      setFoodSearchResults(results);
      setShowFoodSearch(results.length > 0);
    } else {
      setFoodSearchResults([]);
      setShowFoodSearch(false);
    }
  };

  // Select a food from search results
  const handleSelectFood = (food: Food) => {
    setFoodForm({
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fats: food.fats.toString(),
    });
    setShowFoodSearch(false);
    setFoodSearchResults([]);
  };

  // Add food
  const handleAddFood = () => {
    if (
      !foodForm.name ||
      !foodForm.calories ||
      foodForm.calories === ""
    ) {
      return;
    }

    const newFood: FoodEntry = {
      id: Date.now().toString(),
      name: foodForm.name,
      calories: parseInt(foodForm.calories) || 0,
      protein: parseInt(foodForm.protein) || 0,
      carbs: parseInt(foodForm.carbs) || 0,
      fats: parseInt(foodForm.fats) || 0,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setFoods([...foods, newFood]);
    setFoodForm({ name: "", calories: "", protein: "", carbs: "", fats: "" });
    setShowFoodForm(false);
  };

  // Remove food
  const handleRemoveFood = (id: string) => {
    setFoods(foods.filter((food) => food.id !== id));
  };

  // Add exercise
  const handleAddExercise = () => {
    if (!exerciseForm.name || !exerciseForm.caloriesBurned) {
      return;
    }

    const newExercise: ExerciseEntry = {
      id: Date.now().toString(),
      name: exerciseForm.name,
      duration: parseInt(exerciseForm.duration) || 0,
      caloriesBurned: parseInt(exerciseForm.caloriesBurned) || 0,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setExercises([...exercises, newExercise]);
    setExerciseForm({ name: "", duration: "", caloriesBurned: "" });
    setShowExerciseForm(false);
  };

  // Remove exercise
  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

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
            <p className="mt-2 text-muted-foreground">{getFormattedDate()}</p>
          </div>

          {/* Streak Counter */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground">Current Streak</h2>
                <p className="mt-2 text-4xl font-bold text-primary">{streak} Days</p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  value={streak}
                  onChange={(e) => setStreak(parseInt(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
                  placeholder="Days"
                />
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
                <button
                  onClick={() => setShowFoodForm(!showFoodForm)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Food
                </button>
              </div>

              {showFoodForm && (
                <div className="mb-6 space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background">
                      <Search className="ml-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search foods (e.g. Chicken, Rice, Apple)"
                        value={foodForm.name}
                        onChange={(e) => handleFoodNameChange(e.target.value)}
                        className="w-full border-0 bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none"
                      />
                    </div>
                    {showFoodSearch && foodSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                        {foodSearchResults.map((food) => (
                          <button
                            key={food.id}
                            onClick={() => handleSelectFood(food)}
                            className="w-full border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-secondary/50 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">{food.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {food.calories} cal | P: {food.protein}g C: {food.carbs}g F: {food.fats}g
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">{food.servingSize}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Calories"
                    value={foodForm.calories}
                    onChange={(e) =>
                      setFoodForm({ ...foodForm, calories: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      placeholder="Protein (g)"
                      value={foodForm.protein}
                      onChange={(e) =>
                        setFoodForm({ ...foodForm, protein: e.target.value })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                    />
                    <input
                      type="number"
                      placeholder="Carbs (g)"
                      value={foodForm.carbs}
                      onChange={(e) =>
                        setFoodForm({ ...foodForm, carbs: e.target.value })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                    />
                    <input
                      type="number"
                      placeholder="Fats (g)"
                      value={foodForm.fats}
                      onChange={(e) =>
                        setFoodForm({ ...foodForm, fats: e.target.value })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddFood}
                      className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowFoodForm(false)}
                      className="flex-1 rounded-lg border border-border bg-background py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {foods.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No foods added yet
                  </p>
                ) : (
                  foods.map((food) => (
                    <div
                      key={food.id}
                      className="flex items-center justify-between rounded-lg bg-secondary/50 p-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{food.name}</p>
                        <p className="text-xs text-muted-foreground">{food.time}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {food.calories}
                          </p>
                          <p className="text-xs text-muted-foreground">cal</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFood(food.id)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Exercise Entries */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Exercises</h2>
                <button
                  onClick={() => setShowExerciseForm(!showExerciseForm)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </button>
              </div>

              {showExerciseForm && (
                <div className="mb-6 space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={exerciseForm.name}
                    onChange={(e) =>
                      setExerciseForm({ ...exerciseForm, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Duration (min)"
                      value={exerciseForm.duration}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          duration: e.target.value,
                        })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                    />
                    <input
                      type="number"
                      placeholder="Calories burned"
                      value={exerciseForm.caloriesBurned}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          caloriesBurned: e.target.value,
                        })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddExercise}
                      className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowExerciseForm(false)}
                      className="flex-1 rounded-lg border border-border bg-background py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {exercises.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No exercises added yet
                  </p>
                ) : (
                  exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between rounded-lg bg-secondary/50 p-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {exercise.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.time} • {exercise.duration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-carbs">
                            +{exercise.caloriesBurned}
                          </p>
                          <p className="text-xs text-muted-foreground">cal</p>
                        </div>
                        <button
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sleep & Wellness */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">Sleep Tracking</h2>
              </div>
              <div className="mb-6 space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Sleep Duration
                  </label>
                  <div className="mt-2 flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(parseInt(e.target.value) || 0)}
                        placeholder="Hours"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Hours</p>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepMinutes}
                        onChange={(e) => setSleepMinutes(parseInt(e.target.value) || 0)}
                        placeholder="Minutes"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Minutes</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Quality</label>
                  <select
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option>Not logged</option>
                    <option>Poor</option>
                    <option>Fair</option>
                    <option>Good</option>
                    <option>Excellent</option>
                  </select>
                </div>
              </div>

              {(sleepHours > 0 || sleepMinutes > 0) && (
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm font-medium text-foreground">Total Sleep</p>
                  <p className="mt-2 text-3xl font-bold text-primary">
                    {sleepHours}h {sleepMinutes}m
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Quality: {sleepQuality}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">Mental Wellness</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Daily check-in available at 7 PM</p>
              <div className="space-y-3">
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm font-medium text-foreground">Status</p>
                  <p className="mt-2 text-lg text-muted-foreground">
                    Complete your evening questionnaire to track mood, stress level, and daily strengths/weaknesses.
                  </p>
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
