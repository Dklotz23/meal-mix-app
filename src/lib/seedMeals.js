import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// Snapshot of the meals currently stored in demo_household.
export const SEED_MEALS = [
  {
    name: "Turkey Burgers",
    recipeUrl: "https://downshiftology.com/recipes/turkey-burger/",
    tags: ["Healthy"],
    ingredients: [
      { amount: "1", unit: "lb", name: "ground turkey" },
      { amount: "1", unit: "Tbsp", name: "mayonnaise" },
      { amount: "1", unit: "Tbsp", name: "dijon mustard" },
      { amount: "1", unit: "tsp", name: "worchestershire sauce" },
      { amount: "3", unit: "clove", name: "garlic" },
      { amount: "1", unit: "tsp", name: "salt" },
      { amount: "1/2", unit: "tsp", name: "pepper" },
      { amount: "2", unit: "Tbsp", name: "olive oil" }
    ]
  },
  {
    name: "Chicken Curry",
    recipeUrl: "",
    tags: [],
    ingredients: [
      { amount: "1", unit: "lb", name: "Chicken Breast" },
      { amount: "1", unit: "can", name: "tomato sauce" },
      { amount: "1", unit: "can", name: "Coconut Milk" },
      { amount: "3", unit: "clove", name: "Garlic" },
      { amount: "2", unit: "Tbsp", name: "Curry" },
      { amount: "3", unit: "Tbsp", name: "Honey" },
      { amount: "1", unit: "tsp", name: "Salt" }
    ]
  },
  {
    name: "Tacos",
    recipeUrl: "",
    tags: [],
    ingredients: [
      { amount: "1/2", unit: "lb", name: "Ground Turkey" },
      { amount: "1", unit: " ", name: "Avocado" },
      { amount: "2", unit: "cup", name: "Lettuce" },
      { amount: "1", unit: " ", name: "Red Onion" },
      { amount: "1", unit: " ", name: "Taco Kit" }
    ]
  },
  {
    name: "Homemade Pizza",
    recipeUrl: "",
    tags: ["Quick"],
    ingredients: [
      { amount: "1", unit: "jar", name: "Tomato sauce" },
      { amount: "6", unit: "oz", name: "Pepperoni" },
      { amount: "3", unit: "cup", name: "Mozzarella cheese" },
      { amount: "2", unit: "slice", name: "Naan bread" }
    ]
  },
  {
    name: "Chicken Tortilla Soup",
    recipeUrl: "https://www.thepioneerwoman.com/food-cooking/recipes/a11528/chicken-tortilla-soup/",
    tags: [],
    ingredients: [
      { amount: "2", unit: "lb", name: "Chicken Breast" },
      { amount: "1", unit: "Tbsp", name: "Olive Oil" },
      { amount: "1 1/2", unit: "tsp", name: "cummin" },
      { amount: "1", unit: "tsp", name: "chili powder" },
      { amount: "1/2", unit: "tsp", name: "garlic powder" },
      { amount: "1/2", unit: "tsp", name: "salt" },
      { amount: "1", unit: "can", name: "(10oz) Rotel" },
      { amount: "1", unit: "", name: "Avocado" }
    ]
  }
];

export async function seedHousehold(householdId) {
  const batch = writeBatch(db);
  const householdRef = doc(db, "households", householdId);

  batch.set(householdRef, {
    pantry: [],
    week_plan: {},
    locked_days: [],
    selected_days: []
  });

  const mealsCollection = collection(db, "households", householdId, "meals");
  SEED_MEALS.forEach((meal) => {
    batch.set(doc(mealsCollection), {
      ...meal,
      created_at: serverTimestamp()
    });
  });

  await batch.commit();
}