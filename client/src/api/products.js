// src/api/products.js
// Thin wrapper functions around axiosInstance for all Product endpoints.
// Keeping these in one place means pages/components don't need to know
// the exact URL shape - they just call e.g. getProducts(filters).

import axiosInstance from './axiosInstance';

export const getProducts = (params = {}) =>
  axiosInstance.get('/products', { params }).then((res) => res.data);

export const getProductById = (id) =>
  axiosInstance.get(`/products/${id}`).then((res) => res.data);

export const createProduct = (data) =>
  axiosInstance.post('/products', data).then((res) => res.data);

export const updateProduct = (id, data) =>
  axiosInstance.put(`/products/${id}`, data).then((res) => res.data);

export const deleteProduct = (id) =>
  axiosInstance.delete(`/products/${id}`).then((res) => res.data);

export const increaseStock = (id, amount) =>
  axiosInstance
    .patch(`/products/${id}/increase-stock`, { amount })
    .then((res) => res.data);

export const decreaseStock = (id, amount) =>
  axiosInstance
    .patch(`/products/${id}/decrease-stock`, { amount })
    .then((res) => res.data);

// PHASE 6: product photo upload, same multipart pattern as the profile
// photo / CSV import uploads below - a separate request from
// create/updateProduct since a new product doesn't have an id/file yet.
export const uploadProductImage = (id, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return axiosInstance
    .post(`/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

// PHASE 7: recent stock movement history for a product (purchases
// received + manual adjustments), newest first.
export const getProductStockMovements = (id) =>
  axiosInstance.get(`/products/${id}/stock-movements`).then((res) => res.data);

// PHASE 13: CSV bulk import. We send a FormData object (not JSON), so we
// override the Content-Type header for just this one request - axios
// detects the FormData and lets the browser fill in the correct
// multipart boundary automatically once we stop forcing 'application/json'.
// PHASE 9: `preview` controls whether the backend actually inserts rows
// (false/omitted) or just validates and reports what WOULD happen
// (true) - see productController.js's importProducts for the full
// upload -> validate -> preview -> confirm -> insert flow.
export const importProductsCsv = (file, { preview = false } = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance
    .post(`/products/import?preview=${preview}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

// PHASE 9: triggers a CSV download of the full product/inventory list.
// Uses axios with responseType 'blob' (rather than a plain <a href>)
// because the endpoint requires an Authorization header, which a plain
// link click can't send.
export const exportProductsCsv = () =>
  axiosInstance.get('/products/export', { responseType: 'blob' }).then((res) => res.data);
