// src/components/products/ProductFilters.jsx
// Search bar + dropdown filters for the Products page.
// This component is "controlled" - it doesn't hold its own state, it just
// reports changes up to the parent (Products.jsx) via the callbacks passed in.

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
}) {
  return (
    <div className="filters-bar">
      <input
        type="text"
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="filters-search"
      />

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
    </div>
  );
}

export default ProductFilters;
