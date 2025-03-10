// hooks/use-profile.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import type { Database } from "@/types/database.types";

// Get user profile data
export function useProfile(userId?: string) {
	const supabase = createClientComponentClient();
	const { user: currentUser } = useSupabase();

	// Use either the provided userId or the current user's id
	const targetUserId = userId || currentUser?.id;

	return useSupabaseQuery(
		["profile", targetUserId],
		async () => {
			if (!targetUserId) return { data: null, error: null };

			return await supabase
				.from("users")
				.select(`
          id,
          username,
          email,
          name,
          surname,
          phone,
          image,
          bio,
          role,
          created_at,
          students(*)
        `)
				.eq("id", targetUserId)
				.single();
		},
		{
			enabled: !!targetUserId,
		},
	);
}

// Update user profile
export function useUpdateProfile() {
	const supabase = createClientComponentClient();
	const { user, refreshSession } = useSupabase();

	return useSupabaseMutation(
		async (profileUpdates: {
			username?: string;
			name?: string;
			surname?: string;
			phone?: string;
			image?: string;
			bio?: string;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby zaktualizować profil",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			return await supabase
				.from("users")
				.update(profileUpdates)
				.eq("id", user.id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["profile"],
			successMessage: "Profil został zaktualizowany",
			onSuccess: () => {
				// Refresh the user session to update the user metadata
				refreshSession();
			},
		},
	);
}

// Update user password
export function useUpdatePassword() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({ password }: { password: string }) => {
			return await supabase.auth.updateUser({
				password,
			});
		},
		{
			successMessage: "Hasło zostało zmienione",
		},
	);
}

// Get users for admin
export function useUsers() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["users"],
		async () => {
			// Only admin should be able to see all users
			if (!user || user.user_metadata?.role !== "admin") {
				return { data: [], error: null };
			}

			return await supabase
				.from("users")
				.select(`
          id,
          username,
          email,
          name,
          surname,
          role,
          is_blocked,
          created_at
        `)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user && user.user_metadata?.role === "admin",
		},
	);
}

// Admin: Update user role or block status
export function useAdminUpdateUser() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({
			userId,
			updates,
		}: {
			userId: string;
			updates: {
				role?: Database["public"]["Enums"]["user_role"];
				is_blocked?: boolean;
				admin_of_school_id?: string | null;
			};
		}) => {
			if (!user || user.user_metadata?.role !== "admin") {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Brak uprawnień administratora",
						details: "",
						hint: "",
						code: "AUTH_REQUIRED",
					},
				};
			}

			return await supabase
				.from("users")
				.update(updates)
				.eq("id", userId)
				.select()
				.single();
		},
		{
			invalidateQueries: ["users"],
			successMessage: "Użytkownik został zaktualizowany",
		},
	);
}
