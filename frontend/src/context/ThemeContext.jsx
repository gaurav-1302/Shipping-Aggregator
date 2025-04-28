import { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { DARK_THEME, LIGHT_THEME } from "../constants/themeConstants";

// Create a context for managing the theme.
export const ThemeContext = createContext({});

/**
 * ThemeProvider component.
 * Provides the theme context to its children.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The children to render within the provider.
 * @returns {JSX.Element} The ThemeProvider component.
 */
export const ThemeProvider = ({ children }) => {
  // Initialize the theme state from local storage or default to light theme.
  const [theme, setTheme] = useState(() => {
    const storedTheme = window.localStorage.getItem("themeMode");
    return storedTheme || LIGHT_THEME;
  });

  /**
   * Toggles the theme between light and dark.
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
      return newTheme;
    });
  };

  // Update local storage whenever the theme changes.
  useEffect(() => {
    window.localStorage.setItem("themeMode", theme);
  }, [theme]);

  // Provide the theme state and toggle function to the context.
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    > 
      {children}
    </ThemeContext.Provider>
  );
};

// Define prop types for the ThemeProvider component.
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
