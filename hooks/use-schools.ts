// hooks/use-schools.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import type { Database } from "@/types/database.types";

// Get all schools (admin only)
export function useSchools() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["schools"],
		async () => {
			// Only admin should be able to see all schools
			if (!user || user.user_metadata?.role !== "admin") {
				return { data: [], error: null };
			}

			return await supabase
				.from("schools")
				.select(`
          id,
          name,
          is_active,
          access_expires,
          identifier,
          created_at,
          updated_at
        `)
				.order("name", { ascending: true });
		},
		{
			enabled: !!user && user.user_metadata?.role === "admin",
		},
	);
}

// Get a single school
export function useSchool(schoolId: string) {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["school", schoolId],
		async () => {
			if (!schoolId) return { data: null, error: null };

			// Check permissions
			if (
				!user ||
				(user.user_metadata?.role !== "admin" &&
					user.user_metadata?.school_id !== schoolId &&
					user.user_metadata?.admin_of_school_id !== schoolId)
			) {
				return { data: null, error: null };
			}

			return await supabase
				.from("schools")
				.select(`
          id,
          name,
          is_active,
          access_expires,
          identifier,
          created_at,
          updated_at
        `)
				.eq("id", schoolId)
				.single();
		},
		{
			enabled: !!schoolId && !!user,
		},
	);
}

// Add a new school (admin only)
export function useAddSchool() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (newSchool: {
			name: string;
			access_expires: string;
			identifier: string;
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
				.from("schools")
				.insert({
					...newSchool,
					is_active: true,
				})
				.select()
				.single();
		},
		{
			invalidateQueries: ["schools"],
			successMessage: "Szkoła została dodana",
		},
	);
}

// Update a school (admin only)
export function useUpdateSchool() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({
			id,
			...updates
		}: {
			id: string;
			name?: string;
			is_active?: boolean;
			access_expires?: string;
			identifier?: string;
		}) => {
			// Check permissions (admin or school admin)
			if (
				!user ||
				(user.user_metadata?.role !== "admin" &&
					user.user_metadata?.admin_of_school_id !== id)
			) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Brak uprawnień do edycji szkoły",
						details: "",
						hint: "",
						code: "AUTH_REQUIRED",
					},
				};
			}

			// School admins should only be able to update specific fields
			if (user.user_metadata?.role === "school_admin") {
				const allowedUpdates = ["name"];
				const filteredUpdates = Object.entries(updates).reduce(
					(acc, [key, value]) => {
						if (allowedUpdates.includes(key)) {
							acc[key] = value;
						}
						return acc;
					},
					{} as Record<string, any>,
				);

				return await supabase
					.from("schools")
					.update(filteredUpdates)
					.eq("id", id)
					.select()
					.single();
			}

			// Admin can update all fields
			return await supabase
				.from("schools")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["schools", "school"],
			successMessage: "Szkoła została zaktualizowana",
		},
	);
}

// Get students for a school
export function useSchoolStudents(schoolId: string) {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["school-students", schoolId],
		async () => {
			if (!schoolId) return { data: [], error: null };

			// Check permissions
			if (
				!user ||
				(user.user_metadata?.role !== "admin" &&
					user.user_metadata?.school_id !== schoolId &&
					user.user_metadata?.admin_of_school_id !== schoolId)
			) {
				return { data: [], error: null };
			}

			return await supabase
				.from("students")
				.select(`
          id,
          name,
          surname,
          phone,
          bio,
          user:user_id(id, username, email, image)
        `)
				.eq("school_id", schoolId)
				.order("surname", { ascending: true });
		},
		{
			enabled: !!schoolId && !!user,
		},
	);
}

// Add a student to a school
export function useAddStudent() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({
			email,
			password,
			name,
			surname,
			schoolId,
		}: {
			email: string;
			password: string;
			name: string;
			surname: string;
			schoolId: string;
		}) => {
			// Check permissions
			if (
				!user ||
				(user.user_metadata?.role !== "admin" &&
					user.user_metadata?.admin_of_school_id !== schoolId)
			) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Brak uprawnień do dodawania uczniów",
						details: "",
						hint: "",
						code: "AUTH_REQUIRED",
					},
				};
			}

			// Create a username from email (without domain)
			const username = email.split("@")[0];

			// Create user in auth
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						role: "student",
						school_id: schoolId,
					},
				},
			});

			if (authError) {
				return { data: null, error: authError };
			}

			// Create user profile
			const { data: userData, error: userError } = await supabase
				.from("users")
				.insert({
					id: authData.user!.id,
					username,
					email,
					name,
					surname,
					role: "student",
				})
				.select()
				.single();

			if (userError) {
				return { data: null, error: userError };
			}

			// Create student record
			return await supabase
				.from("students")
				.insert({
					user_id: authData.user!.id,
					name,
					surname,
					school_id: schoolId,
				})
				.select()
				.single();
		},
		{
			invalidateQueries: ["school-students"],
			successMessage: "Uczeń został dodany",
		},
	);
}

// Update a student
export function useUpdateStudent() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({
			id,
			...updates
		}: {
			id: string;
			name?: string;
			surname?: string;
			phone?: string;
			bio?: string;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany",
						details: "",
						hint: "",
						code: "AUTH_REQUIRED",
					},
				};
			}

			// Get student to check permissions
			const { data: student, error: studentError } = await supabase
				.from("students")
				.select("school_id, user_id")
				.eq("id", id)
				.single();

			if (studentError) {
				return { data: null, error: studentError };
			}

			// Check permissions
			const canEditStudent =
				user.id === student.user_id ||
				user.user_metadata?.role === "admin" ||
				user.user_metadata?.admin_of_school_id === student.school_id;

			if (!canEditStudent) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Brak uprawnień do edycji ucznia",
						details: "",
						hint: "",
						code: "AUTH_REQUIRED",
					},
				};
			}

			// Update student record
			const { data, error } = await supabase
				.from("students")
				.update(updates)
				.eq("id", id)
				.select()
				.single();

			if (error) {
				return { data: null, error };
			}

			// Also update user record if it's the same data
			await supabase
				.from("users")
				.update({
					name: updates.name,
					surname: updates.surname,
					phone: updates.phone,
					bio: updates.bio,
				})
				.eq("id", student.user_id);

			return { data, error: null };
		},
		{
			invalidateQueries: ["school-students", "profile"],
			successMessage: "Dane ucznia zostały zaktualizowane",
		},
	);
}
