// hooks/use-conversations.ts
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useSupabase } from "@/context/supabase-provider";
import type { Database } from "@/types/database.types";

// Get all conversations for the current user
export function useConversations() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseQuery(
		["conversations", user?.id],
		async () => {
			if (!user) return { data: [], error: null };

			// Get all conversations where the user is a participant
			const { data: participations, error: participationsError } =
				await supabase
					.from("conversation_participants")
					.select("conversation_id")
					.eq("user_id", user.id);

			if (participationsError) {
				return { data: [], error: participationsError };
			}

			if (!participations || participations.length === 0) {
				return { data: [], error: null };
			}

			const conversationIds = participations.map((p) => p.conversation_id);

			// Get the conversations with the most recent message and participants
			const { data, error } = await supabase
				.from("conversations")
				.select(`
          id,
          created_at,
          transport_id,
          transport:transport_id(id, description),
          participants:conversation_participants(
            user:users(id, username, image)
          )
        `)
				.in("id", conversationIds)
				.order("created_at", { ascending: false });

			if (error) {
				return { data: [], error };
			}

			// For each conversation, get the latest message
			const conversationsWithLatestMessage = await Promise.all(
				data.map(async (conversation) => {
					const { data: messages } = await supabase
						.from("messages")
						.select(`
              id,
              text,
              created_at,
              is_read,
              sender:users!sender_id(id, username)
            `)
						.eq("conversation_id", conversation.id)
						.order("created_at", { ascending: false })
						.limit(1);

					return {
						...conversation,
						latest_message:
							messages && messages.length > 0 ? messages[0] : null,
					};
				}),
			);

			return { data: conversationsWithLatestMessage, error: null };
		},
		{
			enabled: !!user,
		},
	);
}

// Get a single conversation
export function useConversation(conversationId: string) {
	const supabase = createClientComponentClient();

	return useSupabaseQuery(
		["conversation", conversationId],
		async () => {
			if (!conversationId) return { data: null, error: null };

			return await supabase
				.from("conversations")
				.select(`
          id,
          created_at,
          transport_id,
          transport:transports(
            id,
            description,
            creator:users!creator_id(id, username)
          ),
          participants:conversation_participants(
            user:users(id, username, image)
          )
        `)
				.eq("id", conversationId)
				.single();
		},
		{
			enabled: !!conversationId,
		},
	);
}

// Create a new conversation
export function useCreateConversation() {
	const supabase = createClientComponentClient();
	const { user } = useSupabase();

	return useSupabaseMutation(
		async ({
			transportId,
			otherUserId,
		}: {
			transportId?: string;
			otherUserId: string;
		}) => {
			if (!user) {
				return {
					data: null,
					error: {
						name: "AuthError",
						message: "Musisz być zalogowany, aby rozpocząć konwersację",
						details: "",
						hint: "",
						code: "AUTH_ERROR",
					},
				};
			}

			// Check if conversation already exists
			const { data: existingConversations, error: existingError } =
				await supabase
					.from("conversation_participants")
					.select(`
          conversation_id,
          conversations!inner(id${transportId ? ", transport_id" : ""})
        `)
					.eq("user_id", user.id);

			if (existingError) {
				throw existingError;
			}

			const otherParticipations = await supabase
				.from("conversation_participants")
				.select("conversation_id")
				.eq("user_id", otherUserId);

			// Find if there's a conversation that both users participate in
			const sharedConversations = existingConversations.filter((conv) =>
				otherParticipations.data?.some(
					(other) => other.conversation_id === conv.conversation_id,
				),
			);

			// If transport ID is specified, also check if there's a conversation for this transport
			let matchingConversation = null;
			if (transportId) {
				matchingConversation = sharedConversations.find(
					(conv) => conv.conversations.transport_id === transportId,
				);
			} else if (sharedConversations.length > 0) {
				// If no transport ID, just use the first shared conversation
				matchingConversation = sharedConversations[0];
			}

			if (matchingConversation) {
				return {
					data: { id: matchingConversation.conversation_id },
					error: null,
				};
			}

			// Create a new conversation
			const { data: newConversation, error: conversationError } = await supabase
				.from("conversations")
				.insert({
					transport_id: transportId || null,
				})
				.select()
				.single();

			if (conversationError) {
				throw conversationError;
			}

			// Add participants
			await supabase.from("conversation_participants").insert([
				{
					conversation_id: newConversation.id,
					user_id: user.id,
				},
				{
					conversation_id: newConversation.id,
					user_id: otherUserId,
				},
			]);

			return { data: newConversation, error: null };
		},
		{
			invalidateQueries: ["conversations"],
			successMessage: "Konwersacja została utworzona",
		},
	);
}
