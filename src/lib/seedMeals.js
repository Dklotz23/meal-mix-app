import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// Snapshot of the meals currently stored in demo_household.
export const SEED_MEALS = [
  {
    name: "Turkey Burgers",
    recipeUrl: "https://downshiftology.com/recipes/turkey-burger/",
    recipe: "Make patties: Make the patties. In a medium bowl, combine the turkey, mayonnaise, Dijon mustard, Worcestershire sauce, garlic, salt, and pepper. Use your hands to mix everything together. Divide the mixture evenly and form 4 large patties. Cook patties: Cook the patties. In a large skillet over medium heat, heat the oil. Cook the patties for approximately 5 minutes per side, or until golden brown and cooked through. Assemble the turkey burger. Enjoy the patties plain or assemble them into turkey burgers with your favorite toppings and condiments!: Assemble the turkey burger. Enjoy the patties plain or assemble them into turkey burgers with your favorite toppings and condiments!",
    tags: ["Healthy"],
    ingredients: [
      { amount: "1", unit: "lb", name: "ground turkey" },
      { amount: "1", unit: "Tbsp", name: "mayonnaise" },
      { amount: "1", unit: "Tbsp", name: "dijon mustard" },
      { amount: "1", unit: "tsp", name: "worchestershire sauce" },
      { amount: "3", unit: "clove", name: "garlic" },
      { amount: "1", unit: "tsp", name: "salt" },
      { amount: "1/2", unit: "tsp", name: "pepper" },
      { amount: "2", unit: "Tbsp", name: "olive oil" },
      { amount: "4", unit: " ", name: "burger buns" },
      { amount: "1", unit: " ", name: "lettuce" },
      { amount: "1", unit: " ", name: "tomato" },
      { amount: "1", unit: " ", name: " red onion" } 
    ]
  },
  {
    name: "Chicken Curry",
    recipeUrl: "",
    recipe: "Mix all ingredients (except chicken, onions and peas) in a large bowl. Pour over chicken and onions in a crockpot and cook for 4 hours. Shred chicken and add peas; cook another 20 min.",
    tags: ["Healthy"],
    ingredients: [
      { amount: "2", unit: "lb", name: "Chicken Breast" },
      { amount: "1", unit: "can", name: "tomato sauce" },
      { amount: "6", unit: "oz", name: "Tomato paste" },
      { amount: "1", unit: "cup", name: "Onion" },
      { amount: "2", unit: "cup", name: "Frozen Peas" },
      { amount: "1", unit: "can", name: "Coconut Milk" },
      { amount: "3", unit: "clove", name: "Garlic" },
      { amount: "2", unit: "Tbsp", name: "Curry Powder" },
      { amount: "3", unit: "Tbsp", name: "Honey" },
      { amount: "1", unit: "tsp", name: "Salt" }
    ]
  },
  {
    name: "Tacos",
    recipeUrl: "",
    recipe: "",
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
    recipe: "Add tomato sauce to naan bread, then top with mozzarella cheese and pepperoni. Bake at 400°F for 10 minutes or until cheese is melted and bubbly.",
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
    recipe: "Preheat the oven to 375°F. Mix cumin, chili pepper, garlic powder, and salt. Drizzle 1 tablespoon olive oil on chicken breasts, then sprinkle a small amount of spice mix on both sides. Set aside the rest of the spice mix. Place chicken breasts on a baking sheet. Bake for 20 to 25 minutes, or until chicken is done. Use two forks to shred chicken. Set aside. Heat 1 tablespoon olive oil in a pot over medium-high heat. Add onions, red pepper, green pepper, and minced garlic. Stir and begin cooking, then add the rest of the spice mix. Stir to combine, then add shredded chicken and stir. Pour in Rotel, chicken stock, tomato paste, water, and black beans. Bring to a boil, then reduce heat to a simmer. Simmer for 45 minutes, uncovered. Mix cornmeal with a small amount of water. Pour into the soup, then simmer for an additional 30 minutes. Check seasonings, adding more if needed---add more chili powder if it needs more spice, and be sure not to undersalt. Turn off heat and allow to sit for 15 to 20 minutes before serving. Five minutes before serving, gently stir in tortilla strips. Ladle into bowls, then top with sour cream, diced red onion, diced avocado, pico de gallo, grated cheese and/or, cilantro if you have it! (The garnishes really make the soup delicious.)",
    tags: [],
    ingredients: [
      { amount: "2", unit: "lb", name: "Chicken Breast" },
      { amount: "1", unit: "Tbsp", name: "Olive Oil" },
      { amount: "1 1/2", unit: "tsp", name: "cummin" },
      { amount: "1", unit: "tsp", name: "chili powder" },
      { amount: "1/2", unit: "tsp", name: "garlic powder" },
      { amount: "1/2", unit: "tsp", name: "salt" },
      { amount: "1", unit: "can", name: "(10oz) Rotel" },
      { amount: "1", unit: "", name: "Avocado" },
      { amount: "4", unit: "cup", name: "Hot Water" },
      { amount: "32", unit: "oz", name: "Chicken Stock" },
      { amount: "3", unit: "Tbsp", name: "Tomato Paste" },
      { amount: "2", unit: "cup", name: "Black Beans" },
      { amount: "3", unit: "Tbsp", name: "Cornmeal or Masa" },
      { amount: "1", unit: "cup", name: "Onion" },
      { amount: "1/4", unit: "cup", name: "Red Pepper" },
      { amount: "1/4", unit: "cup", name: "Green Pepper" },
      { amount: "3", unit: "clove", name: "Garlic" },
      { amount: "1", unit: "cup", name: "Tortilla Strips" },
      { amount: "1/2", unit: "cup", name: "Sour Cream" },
      { amount: "1/4", unit: "cup", name: "Pico de Gallo" },
      { amount: "1/4", unit: "cup", name: "Monterey Jack Cheese" },
      { amount: "1/4", unit: "cup", name: "Cilantro" },
      { amount: "1/4", unit: "cup", name: "Red Onion" }   

    ]
  }
];

export async function seedHousehold(householdId) {
  const batch = writeBatch(db);
  const householdRef = doc(db, "households", householdId);

  batch.set(householdRef, {
    store: [],
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