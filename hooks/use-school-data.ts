// hooks/use-school-data.ts
import { useSupabase } from "@/context/supabase-provider";
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery } from "./use-supabase-query";

export function useSchoolData() {
	const { user } = useSupabase();
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["school", user?.id ?? "anonymous"],
		async () => {
			if (!user) return { data: null, error: null };

			const userRole = user.user_metadata?.role;
			if (userRole !== "student" && userRole !== "school_admin") {
				return { data: null, error: null };
			}

			return await supabase
				.from("schools")
				.select("*")
				.eq("id", user.user_metadata?.school_id)
				.single();
		},
		{
			enabled:
				!!user &&
				(user.user_metadata?.role === "student" ||
					user.user_metadata?.role === "school_admin"),
			staleTime: 5 * 60 * 1000, // 5 minutes
		},
	);
}
