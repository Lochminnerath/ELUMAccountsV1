export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
}

// Comprehensive food database
const foodDatabase: Food[] = [
  // Proteins
  { id: "1", name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, servingSize: "100g" },
  { id: "2", name: "Ground Beef", calories: 250, protein: 26, carbs: 0, fats: 15, servingSize: "100g" },
  { id: "3", name: "Salmon", calories: 208, protein: 20, carbs: 0, fats: 13, servingSize: "100g" },
  { id: "4", name: "Turkey Breast", calories: 135, protein: 30, carbs: 0, fats: 1.3, servingSize: "100g" },
  { id: "5", name: "Tuna", calories: 144, protein: 30, carbs: 0, fats: 1.3, servingSize: "100g" },
  { id: "6", name: "Pork Chop", calories: 242, protein: 27, carbs: 0, fats: 14, servingSize: "100g" },
  { id: "7", name: "Egg", calories: 78, protein: 6.3, carbs: 0.6, fats: 5.3, servingSize: "1 large" },
  { id: "8", name: "Tofu", calories: 76, protein: 8, carbs: 1.9, fats: 4.8, servingSize: "100g" },
  { id: "9", name: "Shrimp", calories: 99, protein: 24, carbs: 0, fats: 0.3, servingSize: "100g" },
  { id: "10", name: "Tilapia", calories: 96, protein: 20, carbs: 0, fats: 1.7, servingSize: "100g" },
  
  // Dairy
  { id: "11", name: "Greek Yogurt", calories: 59, protein: 10, carbs: 3.3, fats: 0.4, servingSize: "100g" },
  { id: "12", name: "Milk (2%)", calories: 61, protein: 3.2, carbs: 4.8, fats: 2.4, servingSize: "240ml" },
  { id: "13", name: "Cheese", calories: 402, protein: 25, carbs: 1.3, fats: 33, servingSize: "100g" },
  { id: "14", name: "Cottage Cheese", calories: 98, protein: 11, carbs: 3.7, fats: 5, servingSize: "100g" },
  
  // Grains & Carbs
  { id: "15", name: "White Rice", calories: 130, protein: 2.7, carbs: 28, fats: 0.3, servingSize: "100g cooked" },
  { id: "16", name: "Brown Rice", calories: 111, protein: 2.6, carbs: 23, fats: 0.9, servingSize: "100g cooked" },
  { id: "17", name: "Oatmeal", calories: 389, protein: 17, carbs: 66, fats: 6.9, servingSize: "100g dry" },
  { id: "18", name: "Whole Wheat Bread", calories: 247, protein: 8.2, carbs: 41, fats: 3.3, servingSize: "100g" },
  { id: "19", name: "Pasta", calories: 131, protein: 5, carbs: 25, fats: 1.1, servingSize: "100g cooked" },
  { id: "20", name: "Quinoa", calories: 120, protein: 4.4, carbs: 21, fats: 1.9, servingSize: "100g cooked" },
  
  // Vegetables
  { id: "21", name: "Broccoli", calories: 34, protein: 2.8, carbs: 7, fats: 0.4, servingSize: "100g" },
  { id: "22", name: "Spinach", calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, servingSize: "100g" },
  { id: "23", name: "Carrot", calories: 41, protein: 0.9, carbs: 10, fats: 0.2, servingSize: "100g" },
  { id: "24", name: "Bell Pepper", calories: 31, protein: 1, carbs: 6, fats: 0.3, servingSize: "100g" },
  { id: "25", name: "Tomato", calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, servingSize: "100g" },
  { id: "26", name: "Cucumber", calories: 16, protein: 0.7, carbs: 3.6, fats: 0.1, servingSize: "100g" },
  { id: "27", name: "Lettuce", calories: 15, protein: 1.2, carbs: 2.9, fats: 0.2, servingSize: "100g" },
  { id: "28", name: "Kale", calories: 49, protein: 4.3, carbs: 9, fats: 0.9, servingSize: "100g" },
  
  // Fruits
  { id: "29", name: "Banana", calories: 89, protein: 1.1, carbs: 23, fats: 0.3, servingSize: "1 medium" },
  { id: "30", name: "Apple", calories: 52, protein: 0.3, carbs: 14, fats: 0.2, servingSize: "1 medium" },
  { id: "31", name: "Orange", calories: 47, protein: 0.9, carbs: 12, fats: 0.3, servingSize: "1 medium" },
  { id: "32", name: "Berries", calories: 57, protein: 1.1, carbs: 14, fats: 0.3, servingSize: "150g" },
  { id: "33", name: "Grapes", calories: 67, protein: 0.6, carbs: 17, fats: 0.4, servingSize: "100g" },
  { id: "34", name: "Watermelon", calories: 30, protein: 0.6, carbs: 7.6, fats: 0.2, servingSize: "100g" },
  
  // Nuts & Seeds
  { id: "35", name: "Almonds", calories: 579, protein: 21, carbs: 22, fats: 50, servingSize: "100g" },
  { id: "36", name: "Peanut Butter", calories: 588, protein: 25, carbs: 20, fats: 50, servingSize: "100g" },
  { id: "37", name: "Chia Seeds", calories: 486, protein: 17, carbs: 42, fats: 31, servingSize: "100g" },
  
  // Prepared Meals
  { id: "38", name: "Chicken with Rice", calories: 350, protein: 45, carbs: 35, fats: 5, servingSize: "1 serving" },
  { id: "39", name: "Salmon with Vegetables", calories: 400, protein: 35, carbs: 20, fats: 18, servingSize: "1 serving" },
  { id: "40", name: "Pasta with Sauce", calories: 380, protein: 15, carbs: 55, fats: 8, servingSize: "1 serving" },
  { id: "41", name: "Turkey Sandwich", calories: 320, protein: 25, carbs: 35, fats: 8, servingSize: "1 sandwich" },
  { id: "42", name: "Grilled Chicken Salad", calories: 280, protein: 35, carbs: 15, fats: 8, servingSize: "1 salad" },
  
  // Breakfast Items
  { id: "43", name: "Pancakes", calories: 364, protein: 6.7, carbs: 48, fats: 17, servingSize: "2 pancakes" },
  { id: "44", name: "French Toast", calories: 156, protein: 5, carbs: 17, fats: 7, servingSize: "1 slice" },
  { id: "45", name: "Cereal with Milk", calories: 150, protein: 4, carbs: 28, fats: 1.5, servingSize: "1 bowl" },
  { id: "46", name: "Yogurt with Granola", calories: 200, protein: 8, carbs: 32, fats: 5, servingSize: "1 cup" },
  
  // Snacks
  { id: "47", name: "Granola Bar", calories: 150, protein: 4, carbs: 21, fats: 6, servingSize: "1 bar" },
  { id: "48", name: "Protein Shake", calories: 200, protein: 25, carbs: 10, fats: 2, servingSize: "1 shake" },
  { id: "49", name: "Trail Mix", calories: 567, protein: 17, carbs: 45, fats: 35, servingSize: "100g" },
  { id: "50", name: "Crackers", calories: 421, protein: 8, carbs: 71, fats: 11, servingSize: "100g" },
  
  // Additional proteins
  { id: "51", name: "Beef Steak", calories: 271, protein: 26, carbs: 0, fats: 18, servingSize: "100g" },
  { id: "52", name: "Lamb", calories: 294, protein: 25, carbs: 0, fats: 21, servingSize: "100g" },
  { id: "53", name: "Cod", calories: 82, protein: 18, carbs: 0, fats: 0.7, servingSize: "100g" },
  { id: "54", name: "Halibut", calories: 111, protein: 21, carbs: 0, fats: 2.3, servingSize: "100g" },
  { id: "55", name: "Chicken Thigh", calories: 209, protein: 26, carbs: 0, fats: 11, servingSize: "100g" },
  
  // Additional vegetables
  { id: "56", name: "Zucchini", calories: 21, protein: 1.5, carbs: 3.7, fats: 0.4, servingSize: "100g" },
  { id: "57", name: "Cabbage", calories: 25, protein: 1.3, carbs: 5.8, fats: 0.1, servingSize: "100g" },
  { id: "58", name: "Cauliflower", calories: 25, protein: 1.9, carbs: 5, fats: 0.3, servingSize: "100g" },
  { id: "59", name: "Green Beans", calories: 31, protein: 2.1, carbs: 7, fats: 0.2, servingSize: "100g" },
  { id: "60", name: "Peas", calories: 81, protein: 5.4, carbs: 14, fats: 0.4, servingSize: "100g" },
];

export function searchFoods(query: string): Food[] {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  return foodDatabase
    .filter((food) =>
      food.name.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10); // Return top 10 results
}

export function getFoodById(id: string): Food | undefined {
  return foodDatabase.find((food) => food.id === id);
}

export function getAllFoods(): Food[] {
  return foodDatabase;
}
