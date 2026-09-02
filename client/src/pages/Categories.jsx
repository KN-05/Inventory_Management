// src/pages/Categories.jsx

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} from '../api/categories';

import CategoryTable from '../components/categories/CategoryTable';
import CategoryForm from '../components/categories/CategoryForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';

function Categories() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager; // create/edit/delete - Staff has view-only per the permission map
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState(''); // PHASE 6: search by name, same pattern as Suppliers

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getCategories({ search: search || undefined });
      setCategories(data.categories);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openAddForm = () => {
    setEditingCategory(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setFormError('');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory._id, formData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(formData);
        toast.success('Category added successfully');
      }
      setFormOpen(false);
      loadCategories();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        data?.errors?.map((e) => e.message).join(', ') || data?.message || 'Something went wrong'
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(deleteTarget._id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
      setDeleteTarget(null);
    }
  };

  // PHASE 6: uploads a category photo from inside the edit form, same
  // pattern as Products.jsx's handleUploadImage.
  const handleUploadImage = async (categoryId, file) => {
    try {
      const data = await uploadCategoryImage(categoryId, file);
      setEditingCategory(data.category);
      toast.success('Category photo updated');
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Categories</h1>
        {canManage && (
          <Button variant="primary" onClick={openAddForm}>
            + Add Category
          </Button>
        )}
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <input
        type="text"
        placeholder="Search categories by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="filters-search"
        style={{ marginBottom: '1rem' }}
      />

      {loading ? (
        <Loader label="Loading categories..." />
      ) : (
        <CategoryTable
          categories={categories}
          canManage={canManage}
          onEdit={openEditForm}
          onDelete={setDeleteTarget}
        />
      )}

      <CategoryForm
        open={formOpen}
        category={editingCategory}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormOpen(false)}
        onUploadImage={handleUploadImage}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Categories;
