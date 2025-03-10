// hooks/use-offers.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import type { Database } from "@/types/database.types";

type CurrencyType = Database["public"]["Enums"]["currency_type"];

// Get offers for a transport
export function useTransportOffers(transportId: string) {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["offers", transportId],
		async () => {
			if (!transportId) return { data: [], error: null };

			return await supabase
				.from("offers")
				.select(`
          id,
          currency,
          vat,
          netto,
          brutto,
          load_date,
          unload_date,
          unload_time,
          contact_number,
          is_accepted,
          creator:creator_id(id, username, image)
        `)
				.eq("transport_id", transportId);
		},
		{
			enabled: !!transportId,
		},
	);
}

// Get a single offer
export function useOffer(offerId: string) {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["offer", offerId],
		async () => {
			if (!offerId) return { data: null, error: null };

			return await supabase
				.from("offers")
				.select(`
          id,
          currency,
          vat,
          netto,
          brutto,
          load_date,
          unload_date,
          unload_time,
          contact_number,
          is_accepted,
          transport_id,
          creator:creator_id(id, username, image),
          files(id, file_name, file_url)
        `)
				.eq("id", offerId)
				.single();
		},
		{
			enabled: !!offerId,
		},
	);
}

// Create a new offer
export function useCreateOffer() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async (newOffer: {
			transport_id: string;
			currency: CurrencyType;
			vat: number;
			netto: number;
			brutto: number;
			load_date: string;
			unload_date: string;
			unload_time: number;
			contact_number: string;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby dodać ofertę",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			return await supabase
				.from("offers")
				.insert({
					...newOffer,
					creator_id: user.id,
					is_accepted: false,
				})
				.select()
				.single();
		},
		{
			invalidateQueries: ["offers"],
			successMessage: "Oferta została dodana",
		},
	);
}

// Update an offer
export function useUpdateOffer() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({
			id,
			...updates
		}: {
			id: string;
			[key: string]: any;
		}) => {
			return await supabase
				.from("offers")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
		},
		{
			invalidateQueries: ["offers"],
			successMessage: "Oferta została zaktualizowana",
		},
	);
}

// Accept or reject an offer
export function useUpdateOfferStatus() {
	const supabase = createClientComponentClient();

	return useSupabaseMutation(
		async ({
			offerId,
			isAccepted,
		}: { offerId: string; isAccepted: boolean }) => {
			return await supabase
				.from("offers")
				.update({ is_accepted: isAccepted })
				.eq("id", offerId)
				.select()
				.single();
		},
		{
			invalidateQueries: ["offers"],
			successMessage: (data) =>
				data?.is_accepted
					? "Oferta została zaakceptowana"
					: "Oferta została odrzucona",
		},
	);
}
