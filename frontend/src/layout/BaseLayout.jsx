import { Outlet } from 'react-router-dom';
import { Sidebar } from "../components";
import { SidebarProvider } from "../context/SidebarContext";

/**
 * BaseLayout component.
 *
 * This component serves as the main layout for the application. It provides a sidebar
 * and a content area where other components can be rendered.
 *
 * @returns {JSX.Element} The rendered BaseLayout component.
 */
const BaseLayout = () => {
  return (
    <main className="page-wrapper">
      {/* Sidebar section (left side of the page) */}
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>

      {/* Content section (right side of the page) */}
      <div className="content-wrapper">
        {/* Outlet component renders the child route components */}
        <Outlet />
      </div>
    </main>
  );
};

export default BaseLayout;
