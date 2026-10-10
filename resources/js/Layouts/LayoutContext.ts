import { createContext, useContext } from 'react';

export interface LayoutState {
    /** Desktop: is the sidebar shown? Mobile: is the drawer open? */
    sidebarVisible: boolean;
    toggleSidebar: () => void;
    closeSidebarOnMobile: () => void;
    /** Live unread message count (kept fresh by background polling). */
    unread: number;
}

export const LayoutContext = createContext<LayoutState>({
    sidebarVisible: true,
    toggleSidebar: () => {},
    closeSidebarOnMobile: () => {},
    unread: 0,
});

export const useLayout = () => useContext(LayoutContext);
