import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { seedHousehold } from "../lib/seedMeals";
import { useAuth } from "./AuthContext";

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [weekPlan, setWeekPlan] = useState({});
  const [lockedDays, setLockedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState([]);

  const HOUSEHOLD_ID = user?.uid || null;

  useEffect(() => {
    if (!HOUSEHOLD_ID) {
      setMeals([]);
      setPantry([]);
      setWeekPlan({});
      setLockedDays([]);
      setSelectedDays([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const mealsRef = collection(db, "households", HOUSEHOLD_ID, "meals");
    const householdRef = doc(db, "households", HOUSEHOLD_ID);

    // 1. Subscribe to Meals
    const unsubMeals = onSnapshot(mealsRef, (snapshot) => {
      const mealsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMeals(mealsData);
    });

    // 2. Subscribe to Household + Handle Initialization
  const unsubHousehold = onSnapshot(householdRef, async (docSnap) => {
  // Check if the document truly exists in the cloud
  if (docSnap.exists() && docSnap.data() !== undefined) {
    const data = docSnap.data();
    setPantry(data.pantry || []);
    setWeekPlan(data.week_plan || {});
    setLockedDays(data.locked_days || []);
    setLoading(false);
    setSelectedDays(data.selected_days || []);
  } else {
    // If we reach here, the document is officially GONE.
    console.log("No household found. Seeding initial data...");
    
    try {
      await seedHousehold(HOUSEHOLD_ID);
      console.log("Seeding complete!");
      
    } catch (err) {
      console.error("Seeding failed:", err);
    } finally {
      setLoading(false);
    }
  }
  });

    return () => {
      unsubMeals();
      unsubHousehold();
    };
  }, [HOUSEHOLD_ID]);

  // ... rest of provider
  const value = {
    meals,
    pantry,
    weekPlan,
    lockedDays,
    selectedDays,
    loading,
    HOUSEHOLD_ID
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}