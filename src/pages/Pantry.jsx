import { useState } from 'react';
import { useData } from '../context/DataContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid'; // We use this for unique IDs

export default function Pantry() {
  const { pantry, HOUSEHOLD_ID } = useData();
  const [newItem, setNewItem] = useState('');

  // 1. Add Item
  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemObj = {
      id: uuidv4(),
      text: newItem.trim(),
      checked: false
    };

    const householdRef = doc(db, "households", HOUSEHOLD_ID);
    await updateDoc(householdRef, {
      pantry: arrayUnion(itemObj)
    });

    setNewItem('');
  };

  // 2. Toggle Checked Status
  // (Firestore array updates are tricky, so we read, modify, and write back)
  const toggleItem = async (itemToToggle) => {
    const householdRef = doc(db, "households", HOUSEHOLD_ID);
    
    // Create new array with the flipped status
    const newPantry = pantry.map(item => 
      item.id === itemToToggle.id ? { ...item, checked: !item.checked } : item
    );

    await updateDoc(householdRef, { pantry: newPantry });
  };

  // 3. Delete Item (Swipe to delete style logic)
  const deleteItem = async (item) => {
    const householdRef = doc(db, "households", HOUSEHOLD_ID);
    // Note: arrayRemove only works if the object matches EXACTLY. 
    // Since 'checked' might have changed, it's safer to filter and rewrite.
    const newPantry = pantry.filter(i => i.id !== item.id);
    
    await updateDoc(householdRef, { pantry: newPantry });
  };

  // 4. Clear Completed
  const clearCompleted = async () => {
    if(!window.confirm("Clear all checked items?")) return;
    
    const householdRef = doc(db, "households", HOUSEHOLD_ID);
    const newPantry = pantry.filter(i => !i.checked);
    await updateDoc(householdRef, { pantry: newPantry });
  };

  return (
    <div className="pb-24">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Grocery List</h1>
          <p className="text-gray-500 text-sm">{pantry.filter(i => !i.checked).length} items needed</p>
        </div>
        {pantry.some(i => i.checked) && (
          <button 
            onClick={clearCompleted}
            className="text-orange-600 text-sm font-bold hover:underline"
          >
            Clear Checked
          </button>
        )}
      </div>

      {/* --- INPUT FORM --- */}
      <form onSubmit={addItem} className="relative mb-6">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item (e.g. Milk)"
          className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-sm"
        />
        <button 
          type="submit"
          disabled={!newItem.trim()}
          className="absolute right-2 top-2 bottom-2 bg-gray-900 text-white px-4 rounded-lg font-bold disabled:opacity-50"
        >
          +
        </button>
      </form>

      {/* --- THE LIST --- */}
      <div className="space-y-2">
        {pantry.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p>Your list is empty.</p>
            <p className="text-sm">Time to raid the fridge?</p>
          </div>
        )}

        {pantry.map(item => (
          <div 
            key={item.id}
            className={`flex items-center p-4 bg-white rounded-xl border transition-all ${
              item.checked ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 shadow-sm'
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleItem(item)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                item.checked 
                ? 'bg-orange-500 border-orange-500' 
                : 'border-gray-300 hover:border-orange-500'
              }`}
            >
              {item.checked && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              )}
            </button>

            {/* Text */}
            <span className={`flex-grow font-medium text-lg ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {item.text}
            </span>

            {/* Delete Button */}
            <button 
              onClick={() => deleteItem(item)}
              className="text-gray-300 hover:text-red-500 p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}