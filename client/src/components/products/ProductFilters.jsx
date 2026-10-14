// src/components/products/ProductFilters.jsx
// Search bar + dropdown filters for the Products page.
// This component is "controlled" - it doesn't hold its own state, it just
// reports changes up to the parent (Products.jsx) via the callbacks passed in.
//
// PHASE 19: search input now sits in an icon wrapper (matches the
// reference design's pill-style search field) - purely a markup/CSS
// change, the same onSearchChange callback still fires on every keystroke.

import { Search } from 'lucide-react';
import { ICON_SM } from '../../utils/iconProps';
function ProductFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  supplier,
  onSupplierChange,
  status,
  onStatusChange,
  categories,
  suppliers,
  sort,
  onSortChange,
}) {
  return (
    <div className="filters-bar">
      <div className="filters-search-wrap">
        <span className="filters-search-icon" aria-hidden="true">
          <Search {...ICON_SM} />
        </span>
        <input
          type="text"
          placeholder="Search by name, SKU, or barcode..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="filters-search"
        />
      </div>

      <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>

      <select value={supplier} onChange={(e) => onSupplierChange(e.target.value)}>
        <option value="">All Suppliers</option>
        {suppliers.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>

      <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="In Stock">In Stock</option>
        <option value="Low Stock">Low Stock</option>
        <option value="Out of Stock">Out of Stock</option>
      </select>

      {/* Sorts the already-loaded list client-side - no extra API call. */}
      {onSortChange && (
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          <option value="">Sort: Default</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price (Low-High)</option>
          <option value="price-desc">Price (High-Low)</option>
          <option value="quantity-asc">Stock (Low-High)</option>
          <option value="quantity-desc">Stock (High-Low)</option>
        </select>
      )}
    </div>
  );
}

export default ProductFilters;

