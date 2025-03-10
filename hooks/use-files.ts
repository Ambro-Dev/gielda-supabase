// hooks/use-files.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import { uploadFile } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

// Get files for an offer
export function useOfferFiles(offerId: string) {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["offer-files", offerId],
		async () => {
			if (!offerId) return { data: [], error: null };

			return await supabase
				.from("files")
				.select(`
          id,
          file_name,
          name,
          file_size,
          size,
          file_key,
          key,
          file_url,
          url,
          created_at,
          user:user_id(id, username)
        `)
				.eq("offer_id", offerId)
				.order("created_at", { ascending: true });
		},
		{
			enabled: !!offerId,
		},
	);
}

// Upload file mutation
export function useUploadFile() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({ file, offerId }: { file: File; offerId: string }) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby dodać plik",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			if (!offerId) {
				return {
					data: null,
					error: {
						name: "ValidationError",
						message: "Brak identyfikatora oferty",
						details: "",
						hint: "",
						code: "VALIDATION_ERROR",
					},
				};
			}

			// Create a unique file path
			const fileExt = file.name.split(".").pop();
			const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
			const filePath = `${offerId}/${fileName}`;

			// Upload to storage
			const fileUrl = await uploadFile("offer-files", filePath, file);

			// Save file metadata to database
			return await supabase
				.from("files")
				.insert({
					file_name: file.name,
					name: file.name,
					file_size: file.size,
					size: file.size,
					file_key: filePath,
					key: filePath,
					file_url: fileUrl,
					url: fileUrl,
					offer_id: offerId,
					user_id: user.id,
				})
				.select()
				.single();
		},
		{
			invalidateQueries: ["offer-files"],
			successMessage: "Plik został dodany",
		},
	);
}

// Delete file mutation
export function useDeleteFile() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({ fileId, fileKey }: { fileId: string; fileKey: string }) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby usunąć plik",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			// Remove from storage
			const { error: storageError } = await supabase.storage
				.from("offer-files")
				.remove([fileKey]);

			if (storageError) {
				console.error("Error removing file from storage:", storageError);
			}

			// Delete from database
			return await supabase.from("files").delete().eq("id", fileId);
		},
		{
			invalidateQueries: ["offer-files"],
			successMessage: "Plik został usunięty",
		},
	);
}

// Upload profile image
export function useUploadProfileImage() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (file: File) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby dodać zdjęcie profilowe",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			// Create a unique file path
			const fileExt = file.name.split(".").pop();
			const fileName = `avatar-${user.id}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

			// Upload to storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("avatars")
				.upload(fileName, file, {
					cacheControl: "3600",
					upsert: true,
				});

			if (uploadError) {
				return { data: null, error: uploadError };
			}

			// Get the public URL
			const { data: urlData } = supabase.storage
				.from("avatars")
				.getPublicUrl(uploadData.path);

			// Update user profile with new avatar URL
			return await supabase
				.from("users")
				.update({
					image: urlData.publicUrl,
				})
				.eq("id", user.id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["profile"],
			successMessage: "Zdjęcie profilowe zostało zaktualizowane",
		},
	);
}

// Upload report attachment
export function useUploadReportAttachment() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (file: File) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby dodać załącznik",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			// Create a unique file path
			const fileExt = file.name.split(".").pop();
			const fileName = `report-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

			// Upload to storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("reports")
				.upload(fileName, file, {
					cacheControl: "3600",
					upsert: false,
				});

			if (uploadError) {
				return { data: null, error: uploadError };
			}

			// Get the public URL
			const { data: urlData } = supabase.storage
				.from("reports")
				.getPublicUrl(uploadData.path);

			return { data: urlData.publicUrl, error: null };
		},
		{
			successMessage: "Załącznik został dodany",
		},
	);
}
