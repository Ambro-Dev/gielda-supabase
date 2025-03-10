// hooks/use-directions.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/database.types";

// Define types for use in the hook
interface GeoLocation {
	lat: number;
	lng: number;
	address?: string;
}

interface Direction {
	id: string;
	start: GeoLocation;
	finish: GeoLocation;
	transport_id?: string | null;
}

// Get directions for a transport
export function useTransportDirections(transportId: string) {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["directions", transportId],
		async () => {
			if (!transportId) return { data: null, error: null };

			return await supabase
				.from("directions")
				.select("id, start, finish")
				.eq("transport_id", transportId)
				.single();
		},
		{
			enabled: !!transportId,
		},
	);
}

// Create or update directions
export function useUpdateDirections() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({
			id,
			start,
			finish,
			transportId,
		}: {
			id?: string;
			start: GeoLocation;
			finish: GeoLocation;
			transportId?: string | null;
		}) => {
			// Convert the locations to the correct JSON format
			const startJson: Json = {
				lat: start.lat,
				lng: start.lng,
				address: start.address || "",
			};

			const finishJson: Json = {
				lat: finish.lat,
				lng: finish.lng,
				address: finish.address || "",
			};

			if (id) {
				// Update existing directions
				return await supabase
					.from("directions")
					.update({
						start: startJson,
						finish: finishJson,
						transport_id: transportId || null,
					})
					.eq("id", id)
					.select()
					.single();
			} else {
				// Insert new directions
				return await supabase
					.from("directions")
					.insert({
						start: startJson,
						finish: finishJson,
						transport_id: transportId || null,
					})
					.select()
					.single();
			}
		},
		{
			invalidateQueries: ["directions"],
			successMessage: "Trasa została zaktualizowana",
		},
	);
}

// Delete directions
export function useDeleteDirections() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async (id: string) => {
			return await supabase.from("directions").delete().eq("id", id);
		},
		{
			invalidateQueries: ["directions"],
			successMessage: "Trasa została usunięta",
		},
	);
}

// Find directions - get all directions that match criteria
export function useSearchDirections() {
	const supabase = createClientComponentClient();

	// This function doesn't use React Query's stale-while-revalidate pattern
	// because each search is considered a new query
	const searchDirections = async ({
		startLat,
		startLng,
		finishLat,
		finishLng,
		radius = 25, // km
	}: {
		startLat?: number;
		startLng?: number;
		finishLat?: number;
		finishLng?: number;
		radius?: number;
	}) => {
		// This is a simplified approach - in a real app, you might need
		// a more sophisticated solution like a PostGIS function or a separate search service
		// Here we're just fetching all directions and filtering them client-side
		const { data, error } = await supabase
			.from("directions")
			.select(
				`
        id,
        start,
        finish,
        transport_id,
        transports(
          id,
          is_available
        )
      `,
			)
			.eq("transports.is_available", true);

		if (error) {
			throw error;
		}

		// Client-side filtering
		return data
			.filter((direction) => {
				if (!direction.transport_id || !direction.transports) return false;

				// Check if transport is available
				if (!direction.transports.is_available) return false;

				// Calculate distance for start points
				if (startLat && startLng) {
					const startDistance = calculateDistance(
						startLat,
						startLng,
						(direction.start as any).lat,
						(direction.start as any).lng,
					);
					if (startDistance > radius) return false;
				}

				// Calculate distance for finish points
				if (finishLat && finishLng) {
					const finishDistance = calculateDistance(
						finishLat,
						finishLng,
						(direction.finish as any).lat,
						(direction.finish as any).lng,
					);
					if (finishDistance > radius) return false;
				}

				return true;
			})
			.map((direction) => ({
				id: direction.id,
				start: direction.start,
				finish: direction.finish,
				transport_id: direction.transport_id,
			}));
	};

	return { searchDirections };
}

// Helper function to calculate distance between two points
// using the Haversine formula
function calculateDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371; // Radius of the earth in km
	const dLat = deg2rad(lat2 - lat1);
	const dLng = deg2rad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lat1)) *
			Math.cos(deg2rad(lat2)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c; // Distance in km
	return distance;
}

function deg2rad(deg: number): number {
	return deg * (Math.PI / 180);
}
