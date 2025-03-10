// hooks/use-reports.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import type { Database } from "@/types/database.types";

// Get all reports (for admin)
export function useReports() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["reports"],
		async () => {
			// Only admin should be able to see all reports
			if (!user || user.user_metadata?.role !== "admin") {
				return { data: [], error: null };
			}

			return await supabase
				.from("reports")
				.select(`
          id,
          place,
          content,
          seen,
          file_url,
          user:user_id(id, username, email),
          created_at,
          updated_at
        `)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user && user.user_metadata?.role === "admin",
		},
	);
}

// Get a single report
export function useReport(reportId: string) {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["report", reportId],
		async () => {
			if (!user || !reportId) {
				return { data: null, error: null };
			}

			// Mark report as seen when fetched
			if (user.user_metadata?.role === "admin") {
				await supabase
					.from("reports")
					.update({ seen: true })
					.eq("id", reportId);
			}

			return await supabase
				.from("reports")
				.select(`
          id,
          place,
          content,
          seen,
          file_url,
          user:user_id(id, username, email),
          created_at,
          updated_at
        `)
				.eq("id", reportId)
				.single();
		},
		{
			enabled: !!user && !!reportId,
		},
	);
}

// Create a new report
export function useCreateReport() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (newReport: {
			place: string;
			content: string;
			file_url?: string | null;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby zgłosić problem",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			return await supabase
				.from("reports")
				.insert({
					...newReport,
					user_id: user.id,
					seen: false,
				})
				.select()
				.single();
		},
		{
			invalidateQueries: ["reports"],
			successMessage: "Zgłoszenie zostało wysłane",
		},
	);
}

// Update report status
export function useUpdateReportStatus() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({ reportId, seen }: { reportId: string; seen: boolean }) => {
			return await supabase
				.from("reports")
				.update({ seen })
				.eq("id", reportId)
				.select()
				.single();
		},
		{
			invalidateQueries: ["reports"],
			successMessage: "Status zgłoszenia został zaktualizowany",
		},
	);
}
