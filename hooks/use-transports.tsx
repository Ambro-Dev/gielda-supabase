// hooks/use-transports.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import type { Database } from "@/types/database.types";
import { useFiltersStore } from "@/stores/filters-store";
import { useMemo } from "react";

export function useTransports() {
	const supabase = createClientComponentClient();

	const transportsQuery = useSupabaseQuery(
		["transports"],
		async () => {
			return await supabase
				.from("transports")
				.select(`
          id,
          send_date,
          send_time,
          receive_date,
          receive_time,
          is_available,
          description,
          distance,
          duration,
          polyline,
          start_address,
          end_address,
          category:categories(id, name),
          vehicle:vehicles(id, name),
          creator:users!creator_id(id, username),
          directions(id, start, finish)
        `)
				.eq("is_available", true);
		},
		{
			staleTime: 60 * 1000, // 1 minuta
		},
	);

	// Add transport mutation
	const addTransportMutation = useSupabaseMutation(
		async (
			newTransport: Omit<
				Database["public"]["Tables"]["transports"]["Insert"],
				"id" | "created_at" | "updated_at"
			>,
		) => {
			return await supabase
				.from("transports")
				.insert(newTransport)
				.select()
				.single();
		},
		{
			invalidateQueries: ["transports"],
			successMessage: "Transport został dodany",
		},
	);

	// Update transport mutation
	const updateTransportMutation = useSupabaseMutation(
		async ({ id, ...updates }: { id: string; [key: string]: any }) => {
			return await supabase
				.from("transports")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["transports"],
			successMessage: "Transport został zaktualizowany",
		},
	);

	// Delete transport mutation (soft delete)
	const deleteTransportMutation = useSupabaseMutation(
		async (id: string) => {
			return await supabase
				.from("transports")
				.update({ is_available: false })
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["transports"],
			successMessage: "Transport został usunięty",
		},
	);

	return {
		transports: transportsQuery.data || [],
		isLoading: transportsQuery.isLoading,
		error: transportsQuery.error,
		addTransport: addTransportMutation.mutateAsync,
		updateTransport: updateTransportMutation.mutateAsync,
		deleteTransport: deleteTransportMutation.mutateAsync,
		isAddingTransport: addTransportMutation.isPending,
		isUpdatingTransport: updateTransportMutation.isPending,
		isDeletingTransport: deleteTransportMutation.isPending,
	};
}

// Get a single transport
export function useTransport(transportId: string) {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["transport", transportId],
		async () => {
			if (!transportId) return { data: null, error: null };

			return await supabase
				.from("transports")
				.select(`
          id,
          send_date,
          send_time,
          receive_date,
          receive_time,
          is_available,
          description,
          distance,
          duration,
          polyline,
          start_address,
          end_address,
          category:categories(id, name),
          vehicle:vehicles(id, name),
          creator:users!creator_id(id, username, image),
          directions(id, start, finish),
          objects(id, name, description, amount, width, height, length, weight)
        `)
				.eq("id", transportId)
				.single();
		},
		{
			enabled: !!transportId,
		},
	);
}

export function useFilteredTransports() {
	const { transports, isLoading } = useTransports();
	const {
		categoryId,
		vehicleId,
		dateFrom,
		dateTo,
		searchTerm,
		sortBy,
		sortDirection,
	} = useFiltersStore();

	const filteredTransports = useMemo(() => {
		if (!transports) return [];

		// Zastosuj filtry
		return transports
			.filter((transport) => {
				// Filtrowanie po kategorii
				if (categoryId && transport.category?.id !== categoryId) return false;

				// Filtrowanie po pojeździe
				if (vehicleId && transport.vehicle?.id !== vehicleId) return false;

				// Filtrowanie po datach
				if (dateFrom) {
					const transportDate = new Date(transport.send_date);
					if (transportDate < dateFrom) return false;
				}

				if (dateTo) {
					const transportDate = new Date(transport.send_date);
					if (transportDate > dateTo) return false;
				}

				// Filtrowanie po tekście
				if (searchTerm) {
					const searchLower = searchTerm.toLowerCase();
					const descriptionMatch = transport.description
						?.toLowerCase()
						.includes(searchLower);
					const startAddressMatch = transport.start_address
						?.toLowerCase()
						.includes(searchLower);
					const endAddressMatch = transport.end_address
						?.toLowerCase()
						.includes(searchLower);

					if (!descriptionMatch && !startAddressMatch && !endAddressMatch)
						return false;
				}

				return true;
			})
			.sort((a, b) => {
				// Sortowanie
				if (sortBy === "date") {
					const dateA = new Date(a.send_date).getTime();
					const dateB = new Date(b.send_date).getTime();
					return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
				}

				return 0;
			});
	}, [
		transports,
		categoryId,
		vehicleId,
		dateFrom,
		dateTo,
		searchTerm,
		sortBy,
		sortDirection,
	]);

	return { transports: filteredTransports, isLoading };
}
