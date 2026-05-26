import React from 'react';
// @ts-ignore: allow side-effect CSS import without type declarations
import './index.css';
import MapComponent from './MapComponent';

function App() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <MapComponent />
    </div>
  );
}

export default App;
