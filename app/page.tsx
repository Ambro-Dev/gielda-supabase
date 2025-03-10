// app/page.tsx
import { Suspense } from "react";
import { createServerComponentClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import TransportPageWrapper from "@/components/transports/TransportPageWrapper";
import type { Transport, Tag } from "@/types/transport.types";

export default async function HomePage() {
	const supabase = await createServerComponentClient();

	// Fetch categories and vehicles for filters
	const [categoriesResponse, vehiclesResponse] = await Promise.all([
		supabase.from("categories").select("id, name, _count(transports(id))"),
		supabase.from("vehicles").select("id, name, _count(transports(id))"),
	]);

	const categories = (categoriesResponse.data || []) as unknown as Tag[];
	const vehicles = (vehiclesResponse.data || []) as unknown as Tag[];

	// Check user authentication status
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (session) {
		// Check if user's profile is complete (for redirection if needed)
		const { data: user } = await supabase
			.from("users")
			.select("name, surname, phone")
			.eq("id", session.user.id)
			.single();

		// If user has no profile details, redirect to settings
		if (!user?.name || !user?.surname || !user?.phone) {
			redirect("/user/profile/settings");
		}
	}

	// Pre-fetch initial transports for SSR
	const { data: transportData } = await supabase
		.from("transports")
		.select(`
      id,
      send_date,
      receive_date,
      send_time,
      receive_time,
      is_available,
      is_accepted,
      description,
      category:categories(id, name),
      vehicle:vehicles(id, name),
      creator:users(id, username, name, surname, student(name, surname)),
      directions(start, finish),
      objects(id, name, description, amount, width, height, length, weight),
      distance,
      duration,
      start_address,
      end_address,
      polyline,
      created_at,
      updated_at,
      school_id
    `)
		.eq("is_available", true)
		.order("created_at", { ascending: false })
		.limit(9);

	// Format the data to match Transport type
	const initialTransports: Transport[] =
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		transportData?.map((item: any) => ({
			id: item.id,
			send_date: item.send_date,
			receive_date: item.receive_date,
			send_time: item.send_time,
			receive_time: item.receive_time,
			is_available: item.is_available,
			is_accepted: item.is_accepted,
			description: item.description,
			category: item.category?.[0] || null,
			vehicle: item.vehicle?.[0] || null,
			creator: item.creator?.[0]
				? {
						...item.creator[0],
						student: item.creator[0].student?.[0] || null,
					}
				: null,
			directions: item.directions?.[0] || null,
			objects: item.objects || [],
			distance: item.distance,
			duration: item.duration,
			start_address: item.start_address,
			end_address: item.end_address,
			polyline: item.polyline,
			created_at: item.created_at,
			updated_at: item.updated_at,
			school_id: item.school_id,
		})) || [];

	// Używamy client componentu jako wrapper, który otrzymuje wszystkie dane z SSR
	return (
		<TransportPageWrapper
			categories={categories}
			vehicles={vehicles}
			initialTransports={initialTransports}
		/>
	);
}
