import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/firebase';

export default function Layout({ children }) {
  const { user, logOut } = useAuth();
  const { storeSections, HOUSEHOLD_ID } = useData();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStoreLayoutOpen, setIsStoreLayoutOpen] = useState(false);
  const [sectionDraft, setSectionDraft] = useState(storeSections);
  const [newSectionName, setNewSectionName] = useState('');
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [layoutError, setLayoutError] = useState('');
  const [draggedSectionId, setDraggedSectionId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen && !isStoreLayoutOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsStoreLayoutOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, isStoreLayoutOpen]);

  const openStoreLayout = () => {
    setSectionDraft(storeSections.map((section) => ({ ...section })));
    setNewSectionName('');
    setLayoutError('');
    setIsMenuOpen(false);
    setIsStoreLayoutOpen(true);
  };

  const moveSection = (sectionId, direction) => {
    setSectionDraft((sections) => {
      const index = sections.findIndex((section) => section.id === sectionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sections.length) return sections;

      const reordered = [...sections];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  };

  const reorderSection = (sectionId, targetId) => {
    if (sectionId === targetId) return;

    setSectionDraft((sections) => {
      const fromIndex = sections.findIndex((section) => section.id === sectionId);
      const targetIndex = sections.findIndex((section) => section.id === targetId);
      if (fromIndex < 0 || targetIndex < 0) return sections;

      const reordered = [...sections];
      const [section] = reordered.splice(fromIndex, 1);
      reordered.splice(targetIndex, 0, section);
      return reordered;
    });
  };

  const addSection = (event) => {
    event.preventDefault();
    const name = newSectionName.trim();
    if (!name) return;
    if (sectionDraft.some((section) => section.name.toLowerCase() === name.toLowerCase())) {
      setLayoutError('That section already exists.');
      return;
    }

    setSectionDraft((sections) => [...sections, { id: uuidv4(), name }]);
    setNewSectionName('');
    setLayoutError('');
  };

  const saveStoreLayout = async () => {
    if (!HOUSEHOLD_ID) return;

    setIsSavingLayout(true);
    setLayoutError('');
    try {
      await updateDoc(doc(db, 'households', HOUSEHOLD_ID), {
        store_sections: sectionDraft,
      });
      setIsStoreLayoutOpen(false);
    } catch {
      setLayoutError('Unable to save the store layout. Please try again.');
    } finally {
      setIsSavingLayout(false);
    }
  };

  return (
    // 1. Outer Background: Gray and centered (Like a desktop workspace)
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
      
      {/* 2. The "Phone" Container: Fixed width, white background, shadow */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative overflow-x-clip">
        
        {/* Mobile Top Header (Now visible everywhere) */}
        <div className="bg-white p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-100">
          <div className="flex items-center">
            <img src={logo} alt="Meal Mix" className="h-8 w-auto mr-2" />
            <span className="text-lg font-bold text-orange-600">Meal Mix</span>
          </div>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-gray-700 hover:text-orange-600"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div
          className={`absolute inset-0 z-[60] bg-gray-900/40 transition-opacity duration-300 ease-out ${
            isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
          aria-hidden={!isMenuOpen}
        >
            <aside
              className={`absolute right-0 top-0 h-full w-[90%] bg-white shadow-2xl transition-transform duration-300 ease-out ${
                isMenuOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-orange-600"
                  aria-label="Close menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <section className="border-b border-gray-100 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Manage</h3>
                <button
                  onClick={openStoreLayout}
                  className="block text-sm font-medium text-gray-800 hover:text-orange-600"
                >
                  Store Layout
                </button>
              </section>

              <section className="border-b border-gray-100 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Account</h3>
                <p className="break-words text-sm font-medium text-gray-800">{user?.email}</p>
                <button
                  onClick={logOut}
                  className="mt-4 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  Log out
                </button>
              </section>

            </aside>
        </div>

        {isStoreLayoutOpen && (
          <div
            className="absolute inset-0 z-[70] flex items-start justify-center bg-gray-900/50 p-4 pt-12"
            onClick={() => setIsStoreLayoutOpen(false)}
          >
            <section
              className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-lg bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="store-layout-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 id="store-layout-title" className="text-lg font-bold text-gray-900">Store Layout</h2>
                <button
                  onClick={() => setIsStoreLayoutOpen(false)}
                  className="p-2 text-gray-500 hover:text-orange-600"
                  aria-label="Close store layout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </header>

              <ol className="no-scrollbar space-y-2 overflow-y-auto p-4">
                {sectionDraft.map((section, index) => (
                  <li
                    key={section.id}
                    draggable
                    onDragStart={() => setDraggedSectionId(section.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      reorderSection(draggedSectionId, section.id);
                      setDraggedSectionId(null);
                    }}
                    onDragEnd={() => setDraggedSectionId(null)}
                    className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 ${
                      draggedSectionId === section.id ? 'opacity-40' : ''
                    }`}
                  >
                    <span className="cursor-grab text-gray-400" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h.008v.008H8.25V6.75Zm0 5.25h.008v.008H8.25V12Zm0 5.25h.008v.008H8.25v-.008Zm7.5-10.5h.008v.008h-.008V6.75Zm0 5.25h.008v.008h-.008V12Zm0 5.25h.008v.008h-.008v-.008Z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-gray-800">{section.name}</span>
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSection(section.id, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-orange-600 disabled:opacity-30"
                        aria-label={`Move ${section.name} up`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 15 7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(section.id, 1)}
                        disabled={index === sectionDraft.length - 1}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-orange-600 disabled:opacity-30"
                        aria-label={`Move ${section.name} down`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ol>

              <form onSubmit={addSection} className="flex gap-2 border-t border-gray-100 p-4">
                <input
                  value={newSectionName}
                  onChange={(event) => setNewSectionName(event.target.value)}
                  placeholder="Add a section"
                  aria-label="New section name"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newSectionName.trim()}
                  className="rounded-lg bg-gray-900 px-3 text-white hover:bg-gray-700 disabled:opacity-40"
                  aria-label="Add section"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                  </svg>
                </button>
              </form>

              {layoutError && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{layoutError}</p>}

              <footer className="flex justify-end gap-2 border-t border-gray-100 p-4">
                <button
                  onClick={() => setIsStoreLayoutOpen(false)}
                  disabled={isSavingLayout}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStoreLayout}
                  disabled={isSavingLayout}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {isSavingLayout ? 'Saving...' : 'Save layout'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {/* Main Content Area */}
        <main className="p-4 pb-24">
          {children}
        </main>

        {/* Navigation */}
        <Navbar />
      </div>
    </div>
  );
}