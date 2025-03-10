// hooks/use-notifications.ts
import { useEffect } from "react";
import { createClientComponentClient } from "@/lib/supabase";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useSupabase } from "@/context/supabase-provider";
import { useSupabaseQuery } from "./use-supabase-query";

export function useNotifications() {
	const { user } = useSupabase();
	const supabase = createClientComponentClient();
	const { setMessages, setReports, setOfferMessages, setOffers } =
		useNotificationsStore();

	// Get unread messages
	const messagesQuery = useSupabaseQuery(
		["unread-messages", user?.id],
		async () => {
			if (!user) return { data: [], error: null };

			return await supabase
				.from("messages")
				.select(`
          id,
          created_at,
          text,
          is_read,
          sender:users!sender_id(id, username, email),
          conversation:conversation_id(id)
        `)
				.eq("receiver_id", user.id)
				.eq("is_read", false)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user,
		},
	);

	// Get unread offer messages
	const offerMessagesQuery = useSupabaseQuery(
		["unread-offer-messages", user?.id],
		async () => {
			if (!user) return { data: [], error: null };

			return await supabase
				.from("offer_messages")
				.select(`
          id,
          created_at,
          text,
          is_read,
          sender:users!sender_id(id, username, email),
          offer:offer_id(id, transport_id)
        `)
				.eq("receiver_id", user.id)
				.eq("is_read", false)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user,
		},
	);

	// Get pending offers
	const offersQuery = useSupabaseQuery(
		["pending-offers", user?.id],
		async () => {
			if (!user) return { data: [], error: null };

			return await supabase
				.from("offers")
				.select(`
          id,
          created_at,
          transport_id,
          is_accepted,
          sender:creator_id(id, username, email)
        `)
				.eq("creator_id", user.id)
				.eq("is_accepted", false)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user,
		},
	);

	// Get unread reports (for admin only)
	const reportsQuery = useSupabaseQuery(
		["unread-reports"],
		async () => {
			if (!user || user.user_metadata?.role !== "admin") {
				return { data: [], error: null };
			}

			return await supabase
				.from("reports")
				.select("*")
				.eq("seen", false)
				.order("created_at", { ascending: false });
		},
		{
			enabled: !!user && user.user_metadata?.role === "admin",
		},
	);

	// Update store when data is loaded
	useEffect(() => {
		if (messagesQuery.data) {
			setMessages(messagesQuery.data);
		}
	}, [messagesQuery.data, setMessages]);

	useEffect(() => {
		if (offerMessagesQuery.data) {
			setOfferMessages(offerMessagesQuery.data);
		}
	}, [offerMessagesQuery.data, setOfferMessages]);

	useEffect(() => {
		if (offersQuery.data) {
			setOffers(offersQuery.data);
		}
	}, [offersQuery.data, setOffers]);

	useEffect(() => {
		if (reportsQuery.data) {
			setReports(reportsQuery.data);
		}
	}, [reportsQuery.data, setReports]);

	return {
		messagesLoading: messagesQuery.isLoading,
		offerMessagesLoading: offerMessagesQuery.isLoading,
		offersLoading: offersQuery.isLoading,
		reportsLoading: reportsQuery.isLoading,
		reloadMessages: () => messagesQuery.refetch(),
		reloadOfferMessages: () => offerMessagesQuery.refetch(),
		reloadOffers: () => offersQuery.refetch(),
		reloadReports: () => reportsQuery.refetch(),
	};
}
