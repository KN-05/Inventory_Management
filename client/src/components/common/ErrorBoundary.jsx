// src/components/common/ErrorBoundary.jsx
// Catches a crash inside whatever it wraps (a render error in one page, or a
// page file that failed to download) and shows a friendly message instead of
// a blank white screen. Without this, ONE broken component blanks the whole
// app, sidebar included.
//
// resetKey: when this value changes (we pass the current URL path) the
// boundary clears its error, so moving to another page works again without
// a full reload.

import { Component } from 'react';

const looksLikeChunkError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module/i.test(
    String(error?.message || error)
  );

class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  // A new resetKey (e.g. the user opened another page) clears the error.
  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    // visible in the browser console for debugging
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // After a new deploy, an open tab may ask for a page file that no longer
    // exists - a reload fetches the new version.
    const stale = looksLikeChunkError(error);

    return (
      <div className="error-fallback" role="alert">
        <h2>{stale ? 'A newer version is available' : 'Something went wrong'}</h2>
        <p>
          {stale
            ? 'This page could not be loaded because the app was updated. Reload to get the latest version.'
            : 'This page hit an unexpected error. Your data is safe. You can try again, or reload the page.'}
        </p>
        <div className="error-fallback-actions">
          {!stale && (
            <button type="button" className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
