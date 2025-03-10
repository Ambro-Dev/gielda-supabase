// hooks/use-offer-messages.ts
import { useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { useEffect } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import type { Database } from "@/types/database.types";

export function useOfferMessages(offerId: string) {
	const { user } = useSupabase();
	const supabase = createClientComponentClient();
	const queryClient = useQueryClient();

	// Fetch messages
	const messagesQuery = useSupabaseQuery(
		["offer-messages", offerId],
		async () => {
			if (!user || !offerId) {
				return { data: [], error: null };
			}

			// Mark messages as read first
			await supabase
				.from("offer_messages")
				.update({ is_read: true })
				.eq("offer_id", offerId)
				.neq("sender_id", user.id);

			// Then fetch all messages
			return await supabase
				.from("offer_messages")
				.select(`
          id,
          text,
          created_at,
          sender:users!sender_id(id, username, image),
          is_read
        `)
				.eq("offer_id", offerId)
				.order("created_at", { ascending: true });
		},
		{
			enabled: !!user && !!offerId,
		},
	);

	// Subscribe to new messages
	useEffect(() => {
		if (!user || !offerId) return;

		const channel = supabase
			.channel(`offer-messages:${offerId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "offer_messages",
					filter: `offer_id=eq.${offerId}`,
				},
				async (payload) => {
					// Get additional sender data
					const { data: sender, error: senderError } = await supabase
						.from("users")
						.select("id, username, image")
						.eq("id", payload.new.sender_id)
						.single();

					if (senderError) {
						console.error("Error fetching sender data:", senderError);
						return;
					}

					// Add message to cache
					queryClient.setQueryData(
						["offer-messages", offerId],
						(oldData: any) => {
							if (!oldData) return { data: [{ ...payload.new, sender }] };
							return {
								...oldData,
								data: [...oldData.data, { ...payload.new, sender }],
							};
						},
					);

					// Auto-mark as read if not from current user
					if (payload.new.sender_id !== user.id) {
						await supabase
							.from("offer_messages")
							.update({ is_read: true })
							.eq("id", payload.new.id);
					}
				},
			)
			.subscribe();

		// Cleanup subscription
		return () => {
			supabase.removeChannel(channel);
		};
	}, [offerId, supabase, user, queryClient]);

	// Send message mutation
	const sendMessageMutation = useSupabaseMutation(
		async ({
			text,
			receiverId,
		}: {
			text: string;
			receiverId: string;
		}) => {
			if (!user || !text.trim() || !offerId || !receiverId) {
				return { data: null, error: null };
			}

			return await supabase
				.from("offer_messages")
				.insert({
					offer_id: offerId,
					sender_id: user.id,
					receiver_id: receiverId,
					text,
					is_read: false,
				})
				.select()
				.single();
		},
		{
			successMessage: "Wiadomość wysłana",
		},
	);

	return {
		messages: messagesQuery.data || [],
		isLoading: messagesQuery.isLoading,
		error: messagesQuery.error,
		sendMessage: sendMessageMutation.mutateAsync,
		isSending: sendMessageMutation.isPending,
	};
}
