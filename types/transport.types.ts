// transport-types.ts

import type { Database } from "./database.types";

// Bazowy typ z database.types.ts
export type TransportRow = Database["public"]["Tables"]["transports"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
export type DirectionRow = Database["public"]["Tables"]["directions"]["Row"];
export type ObjectRow = Database["public"]["Tables"]["objects"]["Row"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];

// Typ dla komponentu transportu z pełnymi relacjami
export interface Transport {
	id: string;
	category: {
		id: string;
		name: string;
	} | null;
	vehicle: {
		id: string;
		name: string;
	} | null;
	creator: {
		id: string;
		username: string;
		name?: string | null;
		surname?: string | null;
		student?: {
			name?: string | null;
			surname?: string | null;
		} | null;
	} | null;
	description: string;
	is_available: boolean;
	is_accepted: boolean;
	directions: {
		start: {
			lat: number;
			lng: number;
			address?: string;
		};
		finish: {
			lat: number;
			lng: number;
			address?: string;
		};
	} | null;
	objects: TransportObject[];
	send_date: string;
	receive_date: string;
	send_time?: string;
	receive_time?: string;
	distance?: {
		text: string;
		value: number;
	} | null;
	duration?: {
		text: string;
		value: number;
	} | null;
	start_address?: string | null;
	end_address?: string | null;
	polyline?: string | null;
	created_at?: string;
	updated_at?: string;
	school_id?: string | null;
}

export interface TransportObject {
	id: string;
	name: string;
	description?: string | null;
	amount: number;
	width: number;
	height: number;
	length: number;
	weight: number;
	transport_id?: string;
}

export interface Tag {
	id: string;
	name: string;
	_count?: {
		transports: number;
	};
}

// Typ odpowiedzi z Supabase do mapowania
export interface TransportQueryResult {
	id: string;
	send_date: string;
	receive_date: string;
	send_time: string;
	receive_time: string;
	is_available: boolean;
	is_accepted: boolean;
	description: string;
	category: Array<{ id: string; name: string }> | null;
	vehicle: Array<{ id: string; name: string }> | null;
	creator: Array<{
		id: string;
		username: string;
		name: string | null;
		surname: string | null;
		student: Array<{
			name: string | null;
			surname: string | null;
		}> | null;
	}> | null;
	directions: Array<{
		start: {
			lat: number;
			lng: number;
			address?: string;
		};
		finish: {
			lat: number;
			lng: number;
			address?: string;
		};
	}> | null;
	objects: TransportObject[] | null;
	distance: {
		text: string;
		value: number;
	} | null;
	duration: {
		text: string;
		value: number;
	} | null;
	start_address: string | null;
	end_address: string | null;
	polyline: string | null;
	created_at: string;
	updated_at: string;
	school_id: string | null;
}

// Funkcja pomocnicza do mapowania danych z Supabase na typ Transport
export function mapToTransport(data: TransportQueryResult): Transport {
	return {
		id: data.id,
		send_date: data.send_date,
		receive_date: data.receive_date,
		send_time: data.send_time,
		receive_time: data.receive_time,
		is_available: data.is_available,
		is_accepted: data.is_accepted,
		description: data.description,
		category: data.category?.[0] || null,
		vehicle: data.vehicle?.[0] || null,
		creator: data.creator?.[0]
			? {
					...data.creator[0],
					student: data.creator[0].student?.[0] || null,
				}
			: null,
		directions: data.directions?.[0] || null,
		objects: data.objects || [],
		distance: data.distance,
		duration: data.duration,
		start_address: data.start_address,
		end_address: data.end_address,
		polyline: data.polyline,
		created_at: data.created_at,
		updated_at: data.updated_at,
		school_id: data.school_id,
	};
}

// Typy dla propów komponentów
export interface TransportsListProps {
	initialTransports?: Transport[];
}

export interface TransportsFilterProps {
	categories: Tag[];
	vehicles: Tag[];
}

export interface TransportCardProps {
	transport: Transport;
}

// Typy dla filtrów
export interface TransportFilters {
	categoryId: string | null;
	vehicleId: string | null;
	dateFrom: Date | null;
	dateTo: Date | null;
	searchTerm: string | null;
	sortBy: "date" | "price" | "distance" | null;
	sortDirection: "asc" | "desc";
}
