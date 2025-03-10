// hooks/use-objects.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import type { Database } from "@/types/database.types";

// Get all objects for a transport
export function useTransportObjects(transportId: string) {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["objects", transportId],
		async () => {
			if (!transportId) return { data: [], error: null };

			return await supabase
				.from("objects")
				.select(`
          id,
          name,
          description,
          amount,
          width,
          height,
          length,
          weight
        `)
				.eq("transport_id", transportId)
				.order("created_at", { ascending: true });
		},
		{
			enabled: !!transportId,
		},
	);
}

// Add a new object
export function useAddObject() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async (newObject: {
			transport_id: string;
			name: string;
			description?: string;
			amount: number;
			width: number;
			height: number;
			length: number;
			weight: number;
		}) => {
			return await supabase.from("objects").insert(newObject).select().single();
		},
		{
			invalidateQueries: ["objects"],
			successMessage: "Obiekt został dodany",
		},
	);
}

// Update an object
export function useUpdateObject() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({
			id,
			...updates
		}: {
			id: string;
			name?: string;
			description?: string;
			amount?: number;
			width?: number;
			height?: number;
			length?: number;
			weight?: number;
		}) => {
			return await supabase
				.from("objects")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["objects"],
			successMessage: "Obiekt został zaktualizowany",
		},
	);
}

// Delete an object
export function useDeleteObject() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async (id: string) => {
			return await supabase.from("objects").delete().eq("id", id);
		},
		{
			invalidateQueries: ["objects"],
			successMessage: "Obiekt został usunięty",
		},
	);
}

// Bulk add objects
export function useBulkAddObjects() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({
			objects,
			transportId,
		}: {
			objects: {
				name: string;
				description?: string;
				amount: number;
				width: number;
				height: number;
				length: number;
				weight: number;
			}[];
			transportId: string;
		}) => {
			// Prepare objects with transport_id
			const objectsToInsert = objects.map((obj) => ({
				...obj,
				transport_id: transportId,
			}));

			return await supabase.from("objects").insert(objectsToInsert).select();
		},
		{
			invalidateQueries: ["objects"],
			successMessage: "Obiekty zostały dodane",
		},
	);
}

// Calculate total volume and weight
export function useObjectsStats(transportId: string) {
	const { data: objects, isLoading, error } = useTransportObjects(transportId);

	if (isLoading || error || !objects) {
		return {
			totalVolume: 0,
			totalWeight: 0,
			totalAmount: 0,
			isLoading,
			error,
		};
	}

	const stats = objects.reduce(
		(acc, obj) => {
			// Calculate volume in cubic meters (cm³ to m³)
			const volume =
				(obj.width * obj.height * obj.length * obj.amount) / 1000000;

			// Weight in kg
			const weight = obj.weight * obj.amount;

			return {
				totalVolume: acc.totalVolume + volume,
				totalWeight: acc.totalWeight + weight,
				totalAmount: acc.totalAmount + obj.amount,
			};
		},
		{ totalVolume: 0, totalWeight: 0, totalAmount: 0 },
	);

	return {
		...stats,
		isLoading,
		error,
	};
}
