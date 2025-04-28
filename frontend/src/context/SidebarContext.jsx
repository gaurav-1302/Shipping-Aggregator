import { createContext, useState } from "react";
import { PropTypes } from "prop-types";

// Create a context for managing the sidebar state.
export const SidebarContext = createContext({});

/**
 * SidebarProvider component.
 * Provides the sidebar context to its children.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The children to render within the provider.
 * @returns {JSX.Element} The SidebarProvider component.
 */
export const SidebarProvider = ({ children }) => {
  // State to manage whether the sidebar is open or closed.
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Opens the sidebar.
   */
  const openSidebar = () => {
    setSidebarOpen(true);
  };

  /**
   * Closes the sidebar.
   */
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Provide the sidebar state and functions to the context.
  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

SidebarProvider.propTypes = {
  children: PropTypes.node
};
