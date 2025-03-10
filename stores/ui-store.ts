// stores/ui-store.ts
import { create } from "zustand";

interface UIState {
	sidebarOpen: boolean;
	mobileMenuOpen: boolean;
	currentTab: string;
	theme: "light" | "dark" | "system";

	// Akcje
	toggleSidebar: () => void;
	toggleMobileMenu: () => void;
	setCurrentTab: (tab: string) => void;
	setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
	sidebarOpen: true,
	mobileMenuOpen: false,
	currentTab: "",
	theme: "light",

	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
	toggleMobileMenu: () =>
		set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
	setCurrentTab: (tab) => set({ currentTab: tab }),
	setTheme: (theme) => set({ theme }),
}));
