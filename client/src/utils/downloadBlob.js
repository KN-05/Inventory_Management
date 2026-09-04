// src/utils/downloadBlob.js
// PHASE 9: turns an axios blob response into an actual file download.
// Needed because our export endpoints require an Authorization header,
// so we can't just point a plain <a href="/api/..."> at them - the
// request has to go through axiosInstance first, and this is the
// standard way to hand the resulting Blob to the browser afterwards.

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
