// src/components/products/ImportCsvModal.jsx
// PHASE 13: lets Admin/Staff bulk-upload products from a CSV file.
// Shows a downloadable template, the file picker, and a per-row result
// summary after upload (created count, failed count, and WHY each row
// failed - so the user can fix their CSV and re-upload just the bad rows).

import { useState } from 'react';
import { importProductsCsv } from '../../api/products';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';

const TEMPLATE_CSV = `name,sku,category,supplier,quantity,price,lowStockThreshold
Wireless Mouse,ELEC-101,Electronics,Acme Supplies Co.,50,19.99,10
A4 Notebook,OFF-101,Office Supplies,Acme Supplies Co.,200,3.50,25
`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function ImportCsvModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { summary, errors }

  const handleClose = () => {
    setFile(null);
    setError('');
    setResult(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Choose a CSV file first');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const data = await importProductsCsv(file);
      setResult(data);
      if (data.summary.created > 0) {
        onImported(); // tell the Products page to reload its list
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatedModal open={open} onClose={handleClose} maxWidth={480}>
      <h2>Import Products from CSV</h2>

      <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
        Columns required: <code>name, sku, category, supplier, quantity, price</code>.{' '}
        <code>lowStockThreshold</code> is optional (defaults to 10). Category and supplier
        names must already exist.
      </p>

      <button type="button" className="btn-link" onClick={downloadTemplate}>
        Download CSV template
      </button>

      {error && <p className="form-error">{error}</p>}

      <div style={{ margin: '0.75rem 0' }}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files[0] || null);
            setResult(null);
          }}
        />
      </div>

      {result && (
        <div className="banner banner-success" style={{ marginBottom: '0.5rem' }}>
          {result.message}
        </div>
      )}

      {result?.errors?.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
            Rows that failed:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
            {result.errors.map((e, i) => (
              <li key={i}>
                Row {e.row}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="modal-actions">
        <Button variant="secondary" type="button" onClick={handleClose}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button variant="primary" type="button" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
      </div>
    </AnimatedModal>
  );
}

export default ImportCsvModal;
