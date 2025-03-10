// hooks/use-transports.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import type { Database } from "@/types/database.types";
import { useFiltersStore } from "@/stores/filters-store";
import { useMemo } from "react";
import type { Transport } from "@/types/transport.types";

export function useFilteredTransports() {
	const { data: transports, isLoading } = useTransports();
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
		if (!transports) return [] as Transport[];

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

				// Domyślne sortowanie (najnowsze pierwsze)
				const dateA = new Date(a.created_at || a.send_date).getTime();
				const dateB = new Date(b.created_at || b.send_date).getTime();
				return dateB - dateA;
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

// Zaktualizowana implementacja głównego hooka useTransports
export function useTransports() {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
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
          creator:users!creator_id(id, username, name, surname, student:students(name, surname)),
          directions:directions_id(start, finish),
          objects(id, name, description, amount, width, height, length, weight),
          created_at,
          updated_at,
          school_id,
          is_accepted
        `)
				.eq("is_available", true);
		},
		{
			select: (data: Transport[]) => {
				if (!data) return [];

				// Mapuj dane Supabase na format Transport
				return data.map(
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					(item: any): Transport => ({
						id: item.id,
						send_date: item.send_date,
						receive_date: item.receive_date,
						send_time: item.send_time,
						receive_time: item.receive_time,
						is_available: item.is_available,
						is_accepted: item.is_accepted,
						description: item.description,
						// Kategoria jest tablicą z jednym elementem lub null
						category: item.category?.[0] || null,
						// Pojazd jest tablicą z jednym elementem lub null
						vehicle: item.vehicle?.[0] || null,
						// Twórca z zagnieżdżonym studentem
						creator: item.creator?.[0]
							? {
									...item.creator[0],
									student: item.creator[0].student?.[0] || null,
								}
							: null,
						// Kierunek jest tablicą z jednym elementem lub null
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
					}),
				);
			},
		},
	);
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
