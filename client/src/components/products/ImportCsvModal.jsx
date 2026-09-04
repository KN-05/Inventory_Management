// src/components/products/ImportCsvModal.jsx
// Lets Admin/Manager bulk-upload products from a CSV file.
//
// PHASE 9: added the spec's "Upload -> Validate -> Preview -> Confirm ->
// Insert" flow. Step 1 uploads the file with `preview: true`, which
// validates everything server-side but writes nothing to the database -
// the person sees totals (valid/invalid/duplicate rows), a sample of
// what would be created, and every row-level error before anything
// happens. Only clicking "Confirm Import" re-sends the exact same File
// object with `preview: false`, which actually inserts the valid rows.

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
  const [preview, setPreview] = useState(null); // preview response (nothing inserted yet)
  const [result, setResult] = useState(null); // final import response (rows actually inserted)

  const handleClose = () => {
    setFile(null);
    setError('');
    setPreview(null);
    setResult(null);
    onClose();
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Choose a CSV file first');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const data = await importProductsCsv(file, { preview: true });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not read this file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setUploading(true);
    try {
      const data = await importProductsCsv(file, { preview: false });
      setResult(data);
      if (data.summary.validRows > 0) {
        onImported(); // tell the Products page to reload its list
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const summary = result?.summary || preview?.summary;
  const errors = result?.errors || preview?.errors || [];

  return (
    <AnimatedModal open={open} onClose={handleClose} maxWidth={520}>
      <h2>Import Products from CSV</h2>

      <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
        Columns required: <code>name, category, supplier, quantity, price</code>.{' '}
        <code>sku</code> and <code>lowStockThreshold</code> are optional - SKU and barcode are
        auto-generated when left blank. Category and supplier names must already exist.
      </p>

      <button type="button" className="btn-link" onClick={downloadTemplate}>
        Download CSV template
      </button>

      {error && <p className="form-error">{error}</p>}

      {!preview && !result && (
        <div style={{ margin: '0.75rem 0' }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files[0] || null);
              setPreview(null);
              setResult(null);
            }}
          />
        </div>
      )}

      {summary && (
        <div className="detail-grid" style={{ margin: '0.75rem 0' }}>
          <div>
            <div className="detail-item-label">Total Rows</div>
            <div className="detail-item-value">{summary.totalRows}</div>
          </div>
          <div>
            <div className="detail-item-label">Valid Rows</div>
            <div className="detail-item-value">{summary.validRows}</div>
          </div>
          <div>
            <div className="detail-item-label">Invalid Rows</div>
            <div className="detail-item-value">{summary.invalidRows}</div>
          </div>
          <div>
            <div className="detail-item-label">Duplicate Rows</div>
            <div className="detail-item-value">{summary.duplicateRows}</div>
          </div>
        </div>
      )}

      {preview && !result && preview.sampleRows.length > 0 && (
        <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
            Preview of rows that would be created:
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Name</th>
                <th>SKU</th>
                <th className="col-numeric">Qty</th>
                <th className="col-numeric">Price</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td>
                  <td>{r.name}</td>
                  <td className="cell-mono">{r.sku}</td>
                  <td className="cell-numeric">{r.quantity}</td>
                  <td className="cell-numeric">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <div className="banner banner-success" style={{ marginBottom: '0.5rem' }}>
          {result.message}
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
            Rows that {result ? 'failed' : 'will be skipped'}:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
            {errors.map((e, i) => (
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
        {!preview && !result && (
          <Button variant="primary" type="button" onClick={handlePreview} disabled={uploading}>
            {uploading ? 'Validating...' : 'Preview Import'}
          </Button>
        )}
        {preview && !result && (
          <Button
            variant="primary"
            type="button"
            onClick={handleConfirm}
            disabled={uploading || summary.validRows === 0}
          >
            {uploading ? 'Importing...' : `Confirm Import (${summary.validRows} row(s))`}
          </Button>
        )}
      </div>
    </AnimatedModal>
  );
}

export default ImportCsvModal;
