import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from "@material-tailwind/react"; // Import ThemeProvider for Material Tailwind
import './index.css';

/**
 * Entry point of the React application.
 *
 * This file initializes the React application and renders the main App component
 * within a ThemeProvider for Material Tailwind styling.
 */

// Create a root for rendering the application
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the application within React.StrictMode and ThemeProvider
root.render(
  <React.StrictMode>
    <ThemeProvider> {/* Wrap the App component with ThemeProvider */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
