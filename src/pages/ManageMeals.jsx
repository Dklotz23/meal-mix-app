import { useState } from 'react';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

const PRESET_TAGS = ["Quick", "Healthy", "Weekend", "Cheat Meal"];
const AMOUNTS = [" " ,"1/4", "1/2", "3/4", "1", "1 1/4", "1 1/2", "1 3/4", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12", "16", "20", "24", "32"];
const UNITS = [" ", "tsp", "Tbsp", "cup", "oz", "lb", "g", "kg", "ml", "pt", "qt", "ct", "clove", "can", "bottle", "jar", "slice", "pc", "pkg", "bag", "box"];

export default function ManageMeals() {
  const { meals, loading, HOUSEHOLD_ID } = useData();
  const [newMealName, setNewMealName] = useState("");
  const [newRecipeUrl, setNewRecipeUrl] = useState("");
  const [newRecipe, setNewRecipe] = useState("");
  const [entryMode, setEntryMode] = useState('manual');
  const [importUrl, setImportUrl] = useState('');
  const [importedMeal, setImportedMeal] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editIngredients, setEditIngredients] = useState([]);
  const [editRecipeUrl, setEditRecipeUrl] = useState("");
  const [editRecipe, setEditRecipe] = useState("");
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  // Ingredient Builder State
  const [ingredients, setIngredients] = useState([]);
  const [curAmount, setCurAmount] = useState("1");
  const [curUnit, setCurUnit] = useState("cup");
  const [curIngredientName, setCurIngredientName] = useState("");

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addIngredientToList = () => {
    if (!curIngredientName.trim()) return;
    const newIngredient = {
      amount: curAmount,
      unit: curUnit,
      name: curIngredientName.trim()
    };
    setIngredients([...ingredients, newIngredient]);
    setCurIngredientName(""); // Reset name only, keep amount/unit for speed
  };

  const removeIngredientFromList = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    setIsSubmitting(true);
    try {
      const mealsRef = collection(db, "households", HOUSEHOLD_ID, "meals");

      await addDoc(mealsRef, {
        name: newMealName,
        recipeUrl: newRecipeUrl.trim(),
        recipe: newRecipe.trim(),
        tags: selectedTags,
        ingredients: ingredients, // Injected the ingredients array here
        created_at: serverTimestamp()
      });
      
      // Reset everything
      setNewMealName('');
      setNewRecipeUrl('');
      setNewRecipe('');
      setSelectedTags([]);
      setIngredients([]);
      setCurIngredientName("");
    } catch (error) {
      console.error("Error adding meal:", error);
      alert("Failed to add meal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportMeal = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    setIsImporting(true);
    setImportedMeal(null);
    try {
      const response = await fetch('/.netlify/functions/import-meal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to import this recipe.');
      setImportedMeal(data);
    } catch (error) {
      console.error('Error importing meal:', error);
      alert(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const saveImportedMeal = async () => {
    if (!importedMeal) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'households', HOUSEHOLD_ID, 'meals'), {
        ...importedMeal,
        tags: [],
        created_at: serverTimestamp()
      });
      setImportUrl('');
      setImportedMeal(null);
    } catch (error) {
      console.error('Error saving imported meal:', error);
      alert('Failed to save imported meal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this meal forever?")) {
      await deleteDoc(doc(db, "households", HOUSEHOLD_ID, "meals", id));
    }
  };

  const toggleMealDetails = (meal) => {
    setExpandedMealId(currentId => currentId === meal.id ? null : meal.id);
    setEditingMealId(null);
  };

  const startEditingIngredients = (meal) => {
    setExpandedMealId(meal.id);
    setEditingMealId(meal.id);
    setEditIngredients(meal.ingredients ? meal.ingredients.map(ingredient => ({ ...ingredient })) : []);
    setEditRecipeUrl(meal.recipeUrl || "");
    setEditRecipe(meal.recipe || "");
  };

  const updateEditIngredient = (index, field, value) => {
    setEditIngredients(current => current.map((ingredient, ingredientIndex) => (
      ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient
    )));
  };

  const addEditIngredient = () => {
    setEditIngredients(current => [...current, { amount: '1', unit: 'cup', name: '' }]);
  };

  const removeEditIngredient = (index) => {
    setEditIngredients(current => current.filter((_, ingredientIndex) => ingredientIndex !== index));
  };

  const saveIngredients = async (mealId) => {
    const validIngredients = editIngredients
      .filter(ingredient => ingredient.name.trim())
      .map(ingredient => ({
        amount: ingredient.amount.trim(),
        unit: ingredient.unit.trim(),
        name: ingredient.name.trim()
      }));

    setIsSavingIngredients(true);
    try {
      await updateDoc(doc(db, "households", HOUSEHOLD_ID, "meals", mealId), {
        ingredients: validIngredients,
        recipeUrl: editRecipeUrl.trim(),
        recipe: editRecipe.trim()
      });
      setEditingMealId(null);
    } catch (error) {
      console.error("Error updating ingredients:", error);
      alert("Failed to update ingredients.");
    } finally {
      setIsSavingIngredients(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading meals...</div>;

  return (
    <div className="pb-24 max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Your Meals</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Add New Option</h2>
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
          <button type="button" onClick={() => setEntryMode('import')} className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${entryMode === 'import' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'}`}>Import from Web</button>
          <button type="button" onClick={() => setEntryMode('manual')} className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${entryMode === 'manual' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'}`}>Manually Add</button>
        </div>

        {entryMode === 'import' ? (
          <form onSubmit={handleImportMeal}>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recipe Website URL</label>
            <input type="url" required value={importUrl} onChange={event => setImportUrl(event.target.value)} placeholder="https://example.com/recipe" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            <p className="text-xs text-gray-400 mt-2">The page must publish structured Recipe data.</p>
            <button type="submit" disabled={!importUrl.trim() || isImporting} className="w-full mt-4 bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50">{isImporting ? 'Importing...' : 'Extract Meal Details'}</button>
            {importedMeal && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <h3 className="font-bold text-gray-800">{importedMeal.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{importedMeal.ingredients.length} ingredients imported</p>
                <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
                  {importedMeal.ingredients.map((ingredient, index) => <p key={`${ingredient.name}-${index}`} className="text-sm text-gray-700">{ingredient.amount} {ingredient.unit} {ingredient.name}</p>)}
                </div>
                {importedMeal.recipe && <p className="text-xs text-gray-500 mt-3 whitespace-pre-line line-clamp-5">{importedMeal.recipe}</p>}
                <button type="button" onClick={saveImportedMeal} disabled={isSubmitting} className="w-full mt-4 bg-gray-900 text-white font-bold py-3 rounded-xl disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Imported Meal'}</button>
              </div>
            )}
          </form>
        ) : (
        <form onSubmit={handleAddMeal}>
          
          {/* Meal Name */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Meal Name</label>
            <input 
              type="text" 
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              placeholder="e.g. Tacos"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recipe</label>
            <textarea value={newRecipe} onChange={event => setNewRecipe(event.target.value)} placeholder="Optional cooking instructions" rows="3" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-y" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recipe URL</label>
            <input
              type="url"
              value={newRecipeUrl}
              onChange={(e) => setNewRecipeUrl(e.target.value)}
              placeholder="https://example.com/recipe"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          {/* --- INGREDIENT BUILDER AREA --- */}
          <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">
              Ingredient Builder
            </label>

            <div className="flex flex-col gap-2 mb-3">
              <div className="h-28 relative rounded-xl border border-gray-100 bg-white shadow-inner overflow-hidden">
                <div className="absolute inset-x-0 h-10 border-y border-orange-200 bg-orange-50/40 pointer-events-none top-1/2 -translate-y-1/2 rounded-md z-10" />

                <div className="h-full flex">
                  <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar text-center py-9 scroll-smooth"
                      onScroll={(e) => {
                        const idx = Math.round(e.target.scrollTop / 40);
                        if (AMOUNTS[idx] && AMOUNTS[idx] !== curAmount) setCurAmount(AMOUNTS[idx]);
                      }}>
                    {AMOUNTS.map((a) => (
                      <div key={a} className={`h-10 flex items-center justify-center snap-center text-xs font-medium transition-colors ${a === curAmount ? 'text-orange-700' : 'text-gray-400'}`}>
                        {a}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar text-center py-9 scroll-smooth"
                      onScroll={(e) => {
                        const idx = Math.round(e.target.scrollTop / 40);
                        if (UNITS[idx] && UNITS[idx] !== curUnit) setCurUnit(UNITS[idx]);
                      }}>
                    {UNITS.map((u) => (
                      <div key={u} className={`h-10 flex items-center justify-center snap-center text-xs font-medium transition-colors ${u === curUnit ? 'text-orange-700' : 'text-gray-400'}`}>
                        {u}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <input 
                  type="text"
                  placeholder="Item name..."
                  value={curIngredientName}
                  onChange={(e) => setCurIngredientName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                />
                <button 
                  type="button"
                  onClick={addIngredientToList}
                  className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  disabled={!curIngredientName.trim()}
                >
                  <span>Add Item</span>
                  <span className="text-base leading-none">+</span>
                </button>
              </div>
            </div>

            {/* ... visual list of ingredients below ... */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-white border border-orange-100 px-3 py-1.5 rounded-full text-xs shadow-sm animate-in zoom-in duration-200">
                  <span className="font-bold text-orange-600">{ing.amount} {ing.unit}</span>
                  <span className="text-gray-700">{ing.name}</span>
                  <button onClick={() => removeIngredientFromList(idx)} className="ml-1 text-gray-400 hover:text-red-500 font-bold">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(tag) 
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!newMealName.trim() || isSubmitting}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-black disabled:opacity-50 transition-all active:scale-95"
          >
            {isSubmitting ? 'Saving...' : 'Save Meal to Library'}
          </button>
        </form>
        )}
      </div>

      {/* List Display */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Current Library ({meals.length})</h2>
        <div className="space-y-3">
          {meals.map(meal => {
            const isExpanded = expandedMealId === meal.id;
            const isEditing = editingMealId === meal.id;
            const mealIngredients = meal.ingredients || [];

            return (
              <div key={meal.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 flex justify-between items-start">
                  <button type="button" onClick={() => toggleMealDetails(meal)} className="flex-1 text-left" aria-expanded={isExpanded}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{meal.name}</h3>
                      <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mealIngredients.slice(0, 3).map((ing, i) => (
                        <span key={i} className="text-[10px] text-gray-400 italic">• {ing.name}{i === 2 && mealIngredients.length > 3 ? '...' : ''}</span>
                      ))}
                      {mealIngredients.length === 0 && <span className="text-[10px] text-gray-400 italic">No ingredients listed</span>}
                    </div>
                  </button>
                  <button onClick={() => handleDelete(meal.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors" aria-label={`Delete ${meal.name}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    {!isEditing ? (
                      <>
                        {meal.recipeUrl && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Recipe URL</p>
                            <a
                              href={meal.recipeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-orange-700 hover:text-orange-900 hover:underline break-all"
                            >
                              {meal.recipeUrl}
                            </a>
                          </div>
                        )}
                        {meal.recipe && <div className="mb-4"><p className="text-xs font-bold text-gray-500 uppercase mb-1">Recipe</p><p className="text-sm text-gray-700 whitespace-pre-line">{meal.recipe}</p></div>}
                        <div className="space-y-2 mb-4">
                          {mealIngredients.length > 0 ? mealIngredients.map((ingredient, index) => (
                            <div key={`${ingredient.name}-${index}`} className="flex justify-between text-sm">
                              <span className="text-gray-700">{ingredient.name}</span>
                              <span className="font-medium text-orange-700">{ingredient.amount} {ingredient.unit}</span>
                            </div>
                          )) : <p className="text-sm text-gray-400 italic">No ingredients listed.</p>}
                        </div>
                        <button type="button" onClick={() => startEditingIngredients(meal)} className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors">Edit Ingredients</button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recipe URL</label>
                          <input
                            type="url"
                            value={editRecipeUrl}
                            onChange={event => setEditRecipeUrl(event.target.value)}
                            placeholder="https://example.com/recipe"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recipe</label>
                          <textarea value={editRecipe} onChange={event => setEditRecipe(event.target.value)} rows="3" placeholder="Cooking instructions" className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-y" />
                        </div>
                        {editIngredients.map((ingredient, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input value={ingredient.amount} onChange={event => updateEditIngredient(index, 'amount', event.target.value)} className="w-16 p-2 border border-gray-200 rounded-lg text-sm" aria-label="Ingredient amount" />
                            <input value={ingredient.unit} onChange={event => updateEditIngredient(index, 'unit', event.target.value)} className="w-20 p-2 border border-gray-200 rounded-lg text-sm" aria-label="Ingredient unit" />
                            <input value={ingredient.name} onChange={event => updateEditIngredient(index, 'name', event.target.value)} className="flex-1 min-w-0 p-2 border border-gray-200 rounded-lg text-sm" placeholder="Ingredient" aria-label="Ingredient name" />
                            <button type="button" onClick={() => removeEditIngredient(index)} className="text-gray-400 hover:text-red-500 font-bold px-1" aria-label="Remove ingredient">×</button>
                          </div>
                        ))}
                        <button type="button" onClick={addEditIngredient} className="w-full py-2 border border-dashed border-orange-300 text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-50">+ Add Ingredient</button>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingMealId(null)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold">Cancel</button>
                          <button type="button" onClick={() => saveIngredients(meal.id)} disabled={isSavingIngredients} className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">{isSavingIngredients ? 'Saving...' : 'Save Ingredients'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}