import { useState } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';

export default function Pantry() {
  const { pantry, HOUSEHOLD_ID } = useData();
  const [newItem, setNewItem] = useState('');

  const addItem = async (event) => {
    event.preventDefault();
    const text = newItem.trim();
    if (!text) return;

    await updateDoc(doc(db, 'households', HOUSEHOLD_ID), {
      pantry: arrayUnion({ id: uuidv4(), text })
    });
    setNewItem('');
  };

  const removeItem = async (itemToRemove) => {
    const updatedPantry = pantry.filter(item => item.id !== itemToRemove.id);
    await updateDoc(doc(db, 'households', HOUSEHOLD_ID), {
      pantry: updatedPantry
    });
  };

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pantry</h1>
        <p className="mt-1 text-sm text-gray-500">{pantry.length} items in your pantry</p>
      </div>

      <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-900">
        We'll leave these items off your Grocery List.
      </p>

      <form onSubmit={addItem} className="relative mb-6">
        <label htmlFor="pantry-item" className="sr-only">Add pantry item</label>
        <input
          id="pantry-item"
          type="text"
          value={newItem}
          onChange={event => setNewItem(event.target.value)}
          placeholder="Add item (e.g. Salt, Pepper, Olive Oil)"
          className="w-full rounded-xl border border-gray-300 py-3 pl-4 pr-20 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          disabled={!newItem.trim()}
          className="absolute right-2 top-2 bottom-2 rounded-lg bg-gray-900 px-4 font-bold text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        {pantry.length === 0 ? (
          <p className="py-10 text-center text-gray-400">Your pantry is empty.</p>
        ) : pantry.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <span className="min-w-0 break-words font-medium text-gray-800">{item.text}</span>
            <button
              type="button"
              onClick={() => removeItem(item)}
              aria-label={`Remove ${item.text} from pantry`}
              className="ml-3 shrink-0 rounded p-2 text-gray-400 hover:text-red-500"
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