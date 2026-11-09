import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isMobileOpen } = useSidebar();

  return (
    <div className="theme-agrinova min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        // min-w-0 : sans lui, un élément flex ne rétrécit pas sous la largeur de
        // son contenu — un tableau large (ex. /dashboard/users) élargissait
        // alors toute la page au lieu de défiler dans son overflow-x-auto.
        //
        // La marge ne suit QUE l'état replié/déplié choisi avec le bouton :
        // au survol, le sidebar replié se déplie par-dessus le contenu
        // (fixed, z-50) au lieu de le pousser de 200 px à chaque passage
        // du curseur.
        className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${
          isExpanded ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
