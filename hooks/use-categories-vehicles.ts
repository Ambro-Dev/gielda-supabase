// hooks/use-categories-vehicles.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import type { Database } from "@/types/database.types";

// =============== CATEGORIES =============== //

// Get all categories
export function useCategories() {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["categories"],
		async () => {
			return await supabase
				.from("categories")
				.select("id, name")
				.order("name", { ascending: true });
		},
		{
			staleTime: 5 * 60 * 1000, // 5 minutes (categories don't change often)
		},
	);
}

// Add a new category (admin only)
export function useAddCategory() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (name: string) => {
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
				.from("categories")
				.insert({ name })
				.select()
				.single();
		},
		{
			invalidateQueries: ["categories"],
			successMessage: "Kategoria została dodana",
		},
	);
}

// Update a category (admin only)
export function useUpdateCategory() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({ id, name }: { id: string; name: string }) => {
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
				.from("categories")
				.update({ name })
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["categories"],
			successMessage: "Kategoria została zaktualizowana",
		},
	);
}

// Delete a category (admin only)
export function useDeleteCategory() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (id: string) => {
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

			return await supabase.from("categories").delete().eq("id", id);
		},
		{
			invalidateQueries: ["categories"],
			successMessage: "Kategoria została usunięta",
		},
	);
}

// =============== VEHICLES =============== //

// Get all vehicles
export function useVehicles() {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["vehicles"],
		async () => {
			return await supabase
				.from("vehicles")
				.select("id, name")
				.order("name", { ascending: true });
		},
		{
			staleTime: 5 * 60 * 1000, // 5 minutes (vehicles don't change often)
		},
	);
}

// Add a new vehicle (admin only)
export function useAddVehicle() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (name: string) => {
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

			return await supabase.from("vehicles").insert({ name }).select().single();
		},
		{
			invalidateQueries: ["vehicles"],
			successMessage: "Pojazd został dodany",
		},
	);
}

// Update a vehicle (admin only)
export function useUpdateVehicle() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({ id, name }: { id: string; name: string }) => {
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
				.from("vehicles")
				.update({ name })
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["vehicles"],
			successMessage: "Pojazd został zaktualizowany",
		},
	);
}

// Delete a vehicle (admin only)
export function useDeleteVehicle() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (id: string) => {
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

			return await supabase.from("vehicles").delete().eq("id", id);
		},
		{
			invalidateQueries: ["vehicles"],
			successMessage: "Pojazd został usunięty",
		},
	);
}

// =============== USER VEHICLES =============== //

type VehicleType = Database["public"]["Enums"]["vehicle_type"];

// Get user vehicles
export function useUserVehicles() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["user-vehicles", user?.id],
		async () => {
			if (!user) return { data: [], error: null };

			return await supabase
				.from("users_vehicles")
				.select(`
          id,
          type,
          name,
          place,
          size,
          description,
          created_at
        `)
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user,
		},
	);
}

// Add a new user vehicle
export function useAddUserVehicle() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (newVehicle: {
			type: VehicleType;
			name: string;
			place: any;
			size: any;
			description: string;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby dodać pojazd",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			return await supabase
				.from("users_vehicles")
				.insert({
					...newVehicle,
					user_id: user.id,
				})
				.select()
				.single();
		},
		{
			invalidateQueries: ["user-vehicles"],
			successMessage: "Pojazd został dodany",
		},
	);
}

// Update user vehicle
export function useUpdateUserVehicle() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({
			id,
			...updates
		}: {
			id: string;
			type?: VehicleType;
			name?: string;
			place?: any;
			size?: any;
			description?: string;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby zaktualizować pojazd",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			return await supabase
				.from("users_vehicles")
				.update(updates)
				.eq("id", id)
				.eq("user_id", user.id) // Ensure user can only update their own vehicles
				.select()
				.single();
		},
		{
			invalidateQueries: ["user-vehicles"],
			successMessage: "Pojazd został zaktualizowany",
		},
	);
}

// Delete user vehicle
export function useDeleteUserVehicle() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (id: string) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby usunąć pojazd",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			return await supabase
				.from("users_vehicles")
				.delete()
				.eq("id", id)
				.eq("user_id", user.id); // Ensure user can only delete their own vehicles
		},
		{
			invalidateQueries: ["user-vehicles"],
			successMessage: "Pojazd został usunięty",
		},
	);
}
