import { useState } from 'react';
import { useData } from '../context/DataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const parseAmount = (amount) => {
  const value = String(amount).trim();
  const parts = value.split(/\s+/);
  let total = 0;

  for (const part of parts) {
    if (part.includes('/')) {
      const [numerator, denominator] = part.split('/').map(Number);
      if (!denominator) return null;
      total += numerator / denominator;
    } else {
      const number = Number(part);
      if (Number.isNaN(number)) return null;
      total += number;
    }
  }

  return total;
};

const formatAmount = (amount) => {
  const whole = Math.floor(amount);
  const fraction = amount - whole;
  const fractions = [
    [1 / 4, '1/4'],
    [1 / 2, '1/2'],
    [3 / 4, '3/4']
  ];
  const match = fractions.find(([value]) => Math.abs(fraction - value) < 0.001);

  if (!match) return String(Math.round(amount * 100) / 100);
  if (whole === 0) return match[1];
  return `${whole} ${match[1]}`;
};

export default function Generator() {
  // 1. Pull selectedDays from context (this was missing from your destructuring)
  const { meals, weekPlan, lockedDays, selectedDays, HOUSEHOLD_ID } = useData();
  const [shufflingDays, setShufflingDays] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [filterTag] = useState(null);
  const [manualSelectDay, setManualSelectDay] = useState(null);
  
  const navigate = useNavigate();

  // Helper to update the array in Firestore
  const updateSelectedInDB = async (newList) => {
    const householdRef = doc(db, "households", HOUSEHOLD_ID);
    await updateDoc(householdRef, { selected_days: newList });
  };

  const assignMealToDay = async (day, mealName) => {
    if (!mealName) return;

    const lockedMealNames = DAYS
      .filter(lockedDay => lockedDays.includes(lockedDay))
      .map(lockedDay => weekPlan[lockedDay])
      .filter(Boolean);

    if (lockedMealNames.includes(mealName)) {
      setShowErrorModal(true);
      return;
    }

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);
      await updateDoc(householdRef, {
        [`week_plan.${day}`]: mealName,
        locked_days: [...lockedDays, day],
        selected_days: selectedDays.filter(selectedDay => selectedDay !== day)
      });
    } catch (error) {
      console.error("Error assigning meal to day:", error);
    }
  };

  const clearAllMealsFromPlan = async () => {
    const hasMeals = DAYS.some(day => !!weekPlan[day]);
    if (!hasMeals) return;

    if (!window.confirm("Clear all meals from this week's plan?")) return;

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);
      const updates = {
        selected_days: [],
        locked_days: []
      };

      DAYS.forEach(day => {
        updates[`week_plan.${day}`] = null;
      });

      await updateDoc(householdRef, updates);
    } catch (error) {
      console.error("Error clearing all plan meals:", error);
    }
  };

  const moveLockedMealsToPantry = async () => {
    const plannedMealNames = DAYS
      .map(day => weekPlan[day])
      .filter(Boolean);

    if (plannedMealNames.length === 0) {
      navigate('/store');
      return;
    }

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);
      const ingredientTotals = new Map();
      const mealsWithoutIngredients = new Set();

      plannedMealNames.forEach(mealName => {
        const meal = meals.find(item => item.name === mealName);
        if (!meal?.ingredients?.length) {
          mealsWithoutIngredients.add(mealName);
          return;
        }

        meal.ingredients.forEach(ingredient => {
          const name = ingredient.name.trim();
          const unit = ingredient.unit.trim();
          const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
          const amount = parseAmount(ingredient.amount);
          const current = ingredientTotals.get(key);

          if (!current) {
            ingredientTotals.set(key, { name, unit, amount, rawAmount: ingredient.amount });
          } else if (amount !== null && current.amount !== null) {
            current.amount += amount;
          } else {
            current.amount = null;
            current.rawAmount = `${current.rawAmount}, ${ingredient.amount}`;
          }
        });
      });

      const newPantryItems = [...ingredientTotals.values()].map(ingredient => ({
        id: uuidv4(),
        text: `${ingredient.amount === null ? ingredient.rawAmount : formatAmount(ingredient.amount)} ${ingredient.unit} ${ingredient.name}`,
        checked: false
      })).concat(
        [...mealsWithoutIngredients].map(mealName => ({
          id: uuidv4(),
          text: mealName,
          checked: false
        }))
      );

      await updateDoc(householdRef, {
        pantry: newPantryItems
      });
      navigate('/store');
    } catch (error) {
      console.error("Error refreshing pantry from plan:", error);
    }
  };

  // --- PERSISTENT LOCK TOGGLE ---
const toggleLock = async (e, day) => {
  e.stopPropagation();
  const isCurrentlyLocked = lockedDays.includes(day);
  
  // 1. Determine new locks
    const newLockedDays = isCurrentlyLocked
      ? lockedDays.filter((d) => d !== day) // Unlock
      : [...lockedDays, day];               // Lock

    // 2. LOGIC: If we are UNLOCKING, add it back to selection.
    // If we are LOCKING, remove it from selection.
    let newSelectedDays;
    if (isCurrentlyLocked) {
      // Unlocking: Add to blue selection if not already there
      newSelectedDays = selectedDays.includes(day) 
        ? selectedDays 
        : [...selectedDays, day];
    } else {
      // Locking: Remove from blue selection
      newSelectedDays = selectedDays.filter(d => d !== day);
    }

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);
      await updateDoc(householdRef, {
        locked_days: newLockedDays,
        selected_days: newSelectedDays
      });
    } catch (error) {
      console.error("Error toggling lock state:", error);
    }
  };

  // --- DAY CLICK LOGIC (Moved outside the map) ---
  const handleDayClick = async (day) => {
    const isSelected = selectedDays.includes(day);
    const isLocked = lockedDays.includes(day);
    const hasMeal = !!weekPlan[day];
    const householdRef = doc(db, "households", HOUSEHOLD_ID);

    // 1. IF LOCKED: Toggle selection highlight only
    if (isLocked) {
      const newList = isSelected 
        ? selectedDays.filter(d => d !== day) 
        : [...selectedDays, day];
      await updateSelectedInDB(newList);
      return;
    }

    // 2. IF UNLOCKED & HAS MEAL: Clear meal + Remove lock + Deselect
    if (hasMeal) {
      try {
        const newLockedDays = lockedDays.filter((d) => d !== day);
        const newSelectedDays = selectedDays.filter((d) => d !== day);
        
        await updateDoc(householdRef, { 
          [`week_plan.${day}`]: null,
          locked_days: newLockedDays,
          selected_days: newSelectedDays
        });
      } catch (error) {
        console.error("Error clearing day:", error);
      }
      return;
    }

    // 3. IF EMPTY: Toggle Selection with Capacity Check
    if (isSelected) {
      setManualSelectDay(null);
      await updateSelectedInDB(selectedDays.filter(d => d !== day));
    } else {
      const availableMealCount = meals.length - lockedDays.length;
      if (selectedDays.length >= availableMealCount) {
        setShowErrorModal(true);
        return;
      }
      await updateSelectedInDB([...selectedDays, day]);
    }
  };

  const generateForSelected = async () => {
    // 1. Identify which days are blue AND not locked
    const targetDays = selectedDays.filter(day => !lockedDays.includes(day));

    // 2. Safety Check: If no days are eligible, stop here
    if (targetDays.length === 0) {
      console.log("No unlocked selected days found.");
      return;
    }

    setShufflingDays(targetDays);

    try {
      const householdRef = doc(db, "households", HOUSEHOLD_ID);

      // 3. Get names of meals already locked in the plan to avoid duplicates
      const lockedMealNames = DAYS
        .filter(d => lockedDays.includes(d))
        .map(d => weekPlan[d])
        .filter(Boolean);

      // 4. Create the pool of available meals
      let pool = meals.filter(m => !lockedMealNames.includes(m.name));

      if (filterTag) {
        pool = pool.filter(m => m.tags?.includes(filterTag));
      }

      // 5. Capacity Check
      if (pool.length < targetDays.length) {
        setShowErrorModal(true);
        setShufflingDays([]);
        return;
      }

      // 6. Shuffle and Wait
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      await new Promise(resolve => setTimeout(resolve, 800));

      // 7. Build the Update Object
      const updates = {}; 
      targetDays.forEach((day, index) => {
        updates[`week_plan.${day}`] = shuffled[index].name;
      });

      // 8. Send to Firestore (Notice: we are NOT clearing selected_days here)
      console.log("Sending updates to Firestore:", updates);
      await updateDoc(householdRef, updates);

    } catch (error) {
      console.error("Magic Fill Error:", error);
    } finally {
      setShufflingDays([]);
    }
  };
  return (
    <div className="pb-24 max-w-md mx-auto p-4">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-6 min-h-[40px]">
          <h3 className="text-lg font-bold text-gray-700">This Week's Plan</h3>
          {DAYS.some(day => !!weekPlan[day]) && (
            <button
              type="button"
              onClick={clearAllMealsFromPlan}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-3">
          {DAYS.map(day => {
            const hasMeal = !!weekPlan[day];
            const isSelected = selectedDays?.includes(day) || false;
            const isLocked = lockedDays?.includes(day) || false;

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer
                  ${isSelected || hasMeal 
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                    : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs
                    ${isSelected || hasMeal ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                    {day.slice(0, 3).toUpperCase()}
                  </div>

                  <div>
                    {shufflingDays.includes(day) ? (
                      <span className="font-bold text-blue-400 animate-pulse">Picking...</span>
                    ) : hasMeal ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-900">{weekPlan[day]}</span>
                        {!isLocked && <span className="text-[10px] text-blue-400 italic">Click to clear</span>}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className="text-gray-400 italic text-sm">
                          {isSelected ? 'Ready to fill...' : 'Click to select'}
                        </span>
                        {isSelected && manualSelectDay !== day && (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              setManualSelectDay(day);
                            }}
                            className="max-w-[220px] px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Manually Select Meal
                          </button>
                        )}
                        {isSelected && manualSelectDay === day && (
                          <select
                            autoFocus
                            defaultValue=""
                            onClick={event => event.stopPropagation()}
                            onBlur={() => setManualSelectDay(null)}
                            onChange={event => assignMealToDay(day, event.target.value)}
                            className="max-w-[220px] p-2 bg-white border border-blue-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={`Choose a meal for ${day}`}
                          >
                            <option value="">Choose a meal to lock...</option>
                            {meals
                              .filter(meal => !lockedDays.some(lockedDay => weekPlan[lockedDay] === meal.name))
                              .map(meal => (
                                <option key={meal.id} value={meal.name}>{meal.name}</option>
                              ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasMeal && (
                    <button onClick={(e) => toggleLock(e, day)} className="p-1 group transition-transform active:scale-90">
                      {isLocked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600">
                          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-300 group-hover:text-blue-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 flex justify-center items-center">
          {/* NEW GATE: Show the area if there are ANY blue days OR if there are ANY locked meals */}
          {(selectedDays.length > 0 || lockedDays.length > 0) && (
            <>
              {/* 1. If there are blue days that are NOT locked, show 'Mix it Up' */}
              {selectedDays.filter(d => !lockedDays.includes(d)).length > 0 ? (
                <button 
                  onClick={generateForSelected}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                >
                  Let's Mix it Up! ({selectedDays.filter(d => !lockedDays.includes(d)).length} days)
                </button>
              ) : (
                /* 2. ELSE (Everything selected is locked, or we have a finished plan), show 'Go to Store' */
                /* We add a check to make sure there's actually a meal in the plan before showing this */
                Object.keys(weekPlan).some(day => !!weekPlan[day]) && (
                  <button 
                    onClick={moveLockedMealsToPantry}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 animate-in fade-in zoom-in duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                    Go to Store
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* --- CAPACITY ERROR MODAL --- */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-amber-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Need More Meals</h3>
              <p className="text-sm text-gray-500 mb-6">
                You currently have <strong>{meals.length} total meals</strong>. To plan for more days, please add more unique meals to your library first!
              </p>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}