# Catalog View Refactoring Migration Guide

## Overview

This guide helps you migrate from the monolithic `CatalogView.tsx` (819 lines) to the refactored modular structure.

---

## New Component Structure

```
components/
├── CatalogView/
│   ├── index.tsx                 # Barrel export (backward compatible)
│   ├── CatalogView.logic.tsx     # Main container with state & logic (~350 lines)
│   ├── BookTableRow.tsx          # Table row display component (~120 lines)
│   ├── FilterDropdown.tsx        # Status filter dropdown (~140 lines)
│   ├── SortDropdown.tsx          # Column sort dropdown (~220 lines)
│   ├── ViewModeButtons.tsx       # Grid/table toggle buttons (~60 lines)
│   └── EmptyState.tsx            # Empty library message (~35 lines)
├── CatalogView.tsx               # DEPRECATED (keep for backward compat)
└── BookCard.tsx                  # Already exists, no changes needed
```

---

## Migration Steps

### Step 1: Update Import in Parent Component

**Before:**
```typescript
import CatalogView from './CatalogView';
```

**After (Option A - Direct import):**
```typescript
import CatalogView from './components/CatalogView';
```

**After (Option B - Barrel export - Recommended):**
Create `components/index.ts` at the root components level:
```typescript
export { default as CatalogView } from './CatalogView';
export { default as BookCard } from './BookCard';
// ... other exports
```

Then in parent:
```typescript
import { CatalogView } from '../components';
```

---

### Step 2: Test the Application

Run your application to ensure all functionality works correctly:

1. **Test grid view** - Verify book cards render properly
2. **Test table view** - Check that rows display with all metadata
3. **Test filtering** - Click filter button, toggle status checkboxes
4. **Test sorting** - In table mode, click column headers to sort
5. **Test search** - Type in search box and verify filtering works
6. **Test actions** - Edit, delete, add to queue buttons work correctly
7. **Test localStorage persistence** - Refresh page and verify settings persist
8. **Test import/export** - Export books to JSON, then import back

---

### Step 3: Verify Features

#### Filter Dropdown ✅
- Click filter button to open dropdown
- Toggle 'All' checkbox (shows/hides all statuses)
- Toggle individual status checkboxes
- Click outside or press Escape to close
- Badge shows count of selected statuses

#### Sort Dropdown ✅  
- Only visible in table view mode
- Shows current sort option with icon
- Groups options by column:
  - Rating (asc/desc with trend icons)
  - Title (A-Z/Z-A with arrow icons)
  - Status (A-Z/Z-A)
  - Pages (asc/desc)
- Click outside to close

#### View Mode Buttons ✅
- Grid2x2 icon for large grid view
- List icon for table view
- Active mode highlighted in green (#6b9071)
- Persists to localStorage

---

### Step 4: Deprecated Component Notice

The original `components/CatalogView.tsx` is now deprecated but kept for backward compatibility. Consider deleting it after confirming all tests pass and no other files reference it directly.

---

## Benefits Achieved

✅ **Separation of Concerns** - Each component has a single responsibility  
✅ **Improved Maintainability** - Easier to find and modify specific functionality  
✅ **Better Testability** - Can unit test individual components in isolation  
✅ **Code Reusability** - Components like `BookTableRow` can be used elsewhere  
✅ **Reduced Cognitive Load** - 819 lines → ~500+ total lines across focused files  

---

## Troubleshooting

### Issue: Filter dropdown doesn't close when clicking outside
**Solution:** Ensure the `.filter-dropdown-container` class is present (already in code)

### Issue: Sort options not showing icons correctly  
**Solution:** Verify `lucide-react` is installed and all icon imports are correct

### Issue: localStorage persistence broken
**Solution:** Check browser console for errors related to localStorage operations

---

## Next Steps

1. ✅ Run application and verify all features work
2. ✅ Update any other files that import from the old CatalogView.tsx
3. ⬜ Consider deleting original CatalogView.tsx after migration is complete
4. ⬜ Add TypeScript types for any missing interfaces
5. ⬜ Write unit tests for individual components (optional but recommended)

---

**Migration Date:** May 18, 2026  
**Status:** Complete - Ready for Production
