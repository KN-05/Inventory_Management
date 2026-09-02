// src/pages/Products.jsx

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCategoryOptions, getSupplierOptions } from '../api/lookups';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  increaseStock,
  decreaseStock,
  uploadProductImage,
} from '../api/products';

import ProductFilters from '../components/products/ProductFilters';
import ProductTable from '../components/products/ProductTable';
import ProductForm from '../components/products/ProductForm';
import ProductDetailsModal from '../components/products/ProductDetailsModal';
import ImportCsvModal from '../components/products/ImportCsvModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';

function Products() {
  const { isAdmin, isManager } = useAuth();
  const canDelete = isAdmin || isManager;
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(''); // persistent - page failed to load at all

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState('');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false); // PHASE 13: CSV import modal
  const [viewingProduct, setViewingProduct] = useState(null); // PHASE 6: Product Details modal

  const loadLookups = useCallback(async () => {
    const [cats, sups] = await Promise.all([getCategoryOptions(), getSupplierOptions()]);
    setCategories(cats);
    setSuppliers(sups);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getProducts({
        search: search || undefined,
        category: category || undefined,
        supplier: supplier || undefined,
        status: status || undefined,
      });
      setProducts(data.products);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, category, supplier, status]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Debounce-free simple approach: reload whenever a filter changes.
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openAddForm = () => {
    setEditingProduct(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setFormError('');
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, formData);
        toast.success('Product updated successfully');
      } else {
        await createProduct(formData);
        toast.success('Product added successfully');
      }
      setFormOpen(false);
      loadProducts();
    } catch (err) {
      const data = err.response?.data;
      const text =
        data?.errors?.map((e) => e.message).join(', ') || data?.message || 'Something went wrong';
      setFormError(text);
    }
  };

  const confirmDelete = (product) => setDeleteTarget(product);

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteTarget._id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
      setDeleteTarget(null);
    }
  };

  const handleAdjustStock = async (productId, direction, amount) => {
    try {
      if (direction === 'increase') {
        await increaseStock(productId, amount);
      } else {
        await decreaseStock(productId, amount);
      }
      toast.success('Stock updated');
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  // PHASE 6: uploads a product photo from inside the edit form, then
  // refreshes both the modal's own `editingProduct` (so the new photo
  // shows immediately without closing/reopening the modal) and the
  // underlying table data.
  const handleUploadImage = async (productId, file) => {
    try {
      const data = await uploadProductImage(productId, file);
      setEditingProduct(data.product);
      toast.success('Product photo updated');
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canDelete && (
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
          )}
          <Button variant="primary" onClick={openAddForm}>
            + Add Product
          </Button>
        </div>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <ProductFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        supplier={supplier}
        onSupplierChange={setSupplier}
        status={status}
        onStatusChange={setStatus}
        categories={categories}
        suppliers={suppliers}
      />

      {loading ? (
        <Loader label="Loading products..." />
      ) : (
        <ProductTable
          products={products}
          isAdmin={canDelete}
          onEdit={openEditForm}
          onDelete={confirmDelete}
          onAdjustStock={handleAdjustStock}
          onView={setViewingProduct}
        />
      )}

      <ProductForm
        open={formOpen}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormOpen(false)}
        onUploadImage={handleUploadImage}
        error={formError}
      />

      <ProductDetailsModal
        open={!!viewingProduct}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          toast.success('Products imported');
          loadProducts();
        }}
      />
    </div>
  );
}

export default Products;
