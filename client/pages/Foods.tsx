import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { addCustomFood, getAllFoods } from "@/lib/foods";

const unhealthySuggestions = ["Chips", "Pizza", "Chocolate", "Donuts", "Soda", "French Fries", "Ice Cream"];

const emptyCustomFoodForm = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  servingSize: "",
};

export default function Foods() {
  const [query, setQuery] = useState("");
  const [foodsVersion, setFoodsVersion] = useState(0);
  const [customFoodForm, setCustomFoodForm] = useState(emptyCustomFoodForm);

  const foods = useMemo(() => getAllFoods(), [foodsVersion]);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return foods;
    return foods.filter((food) => food.name.toLowerCase().includes(query.toLowerCase()));
  }, [foods, query]);

  const handleAddCustomFood = () => {
    if (!customFoodForm.name.trim() || !customFoodForm.calories.trim()) {
      return;
    }

    addCustomFood({
      name: customFoodForm.name.trim(),
      calories: parseInt(customFoodForm.calories) || 0,
      protein: parseFloat(customFoodForm.protein) || 0,
      carbs: parseFloat(customFoodForm.carbs) || 0,
      fats: parseFloat(customFoodForm.fats) || 0,
      servingSize: customFoodForm.servingSize.trim() || "1 serving",
    });

    setFoodsVersion((version) => version + 1);
    setCustomFoodForm(emptyCustomFoodForm);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Foods Database</h1>
        <p className="mt-2 text-muted-foreground">Search foods and include both healthy and unhealthy items in your tracking.</p>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">Add Custom Food</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={customFoodForm.name}
              onChange={(event) => setCustomFoodForm({ ...customFoodForm, name: event.target.value })}
              placeholder="Food name"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
            <input
              value={customFoodForm.servingSize}
              onChange={(event) => setCustomFoodForm({ ...customFoodForm, servingSize: event.target.value })}
              placeholder="Serving size (e.g. 1 cup)"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input
              value={customFoodForm.calories}
              onChange={(event) => setCustomFoodForm({ ...customFoodForm, calories: event.target.value })}
              type="number"
              placeholder="Calories"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
            <input
              value={customFoodForm.protein}
              onChange={(event) => setCustomFoodForm({ ...customFoodForm, protein: event.target.value })}
              type="number"
              placeholder="Protein"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
            <input
              value={customFoodForm.carbs}
              onChange={(event) => setCustomFoodForm({ ...customFoodForm, carbs: event.target.value })}
              type="number"
              placeholder="Carbs"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
            <input
              value={customFoodForm.fats}
              onChange={(event) => setCustomFoodForm({ ...customFoodForm, fats: event.target.value })}
              type="number"
              placeholder="Fats"
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </div>
          <button onClick={handleAddCustomFood} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Save Custom Food
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">Popular Unhealthy Foods to Track</h2>
          <div className="flex flex-wrap gap-2">
            {unhealthySuggestions.map((item) => (
              <button key={item} onClick={() => setQuery(item)} className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-sm hover:bg-secondary">
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search food name"
            className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2">Food</th>
                  <th className="py-2">Calories</th>
                  <th className="py-2">Protein</th>
                  <th className="py-2">Carbs</th>
                  <th className="py-2">Fats</th>
                  <th className="py-2">Serving</th>
                </tr>
              </thead>
              <tbody>
                {filteredFoods.map((food) => (
                  <tr key={food.id} className="border-b border-border/50">
                    <td className="py-2">{food.name}</td>
                    <td className="py-2">{food.calories}</td>
                    <td className="py-2">{food.protein}g</td>
                    <td className="py-2">{food.carbs}g</td>
                    <td className="py-2">{food.fats}g</td>
                    <td className="py-2">{food.servingSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
