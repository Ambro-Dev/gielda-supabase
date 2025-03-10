// stores/user-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";

interface UserState {
	user: User | null;
	profile: {
		username: string;
		image: string | null;
		role: string;
		[key: string]: any;
	} | null;

	// Akcje
	setUser: (user: User | null) => void;
	setProfile: (profile: any) => void;
	clearUser: () => void;
}

export const useUserStore = create<UserState>()(
	persist(
		(set) => ({
			user: null,
			profile: null,

			setUser: (user) => set({ user }),
			setProfile: (profile) => set({ profile }),
			clearUser: () => set({ user: null, profile: null }),
		}),
		{
			name: "user-storage",
		},
	),
);
