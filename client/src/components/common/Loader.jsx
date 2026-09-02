// src/components/common/Loader.jsx
// A tiny reusable loading indicator, used while data is being fetched.

function Loader({ label = 'Loading...' }) {
  return <p className="loader">{label}</p>;
}

export default Loader;
