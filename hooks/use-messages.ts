// hooks/use-messages.ts (zmodyfikowana wersja)
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { useCallback, useEffect, useRef } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "./use-supabase-query";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useRealtimeMessages } from "./use-realtime-messages";
import type { Database } from "@/types/database.types";

// Define proper types for our messages
interface MessageSender {
	id: string;
	username: string;
	image?: string | null;
}

interface Message {
	id: string;
	text: string;
	created_at: string;
	sender: MessageSender;
	is_read: boolean;
}

export function useMessages(conversationId: string) {
	const { user } = useSupabase();
	const supabase = createClientComponentClient();
	const queryClient = useQueryClient();
	const { removeMessage } = useNotificationsStore();
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Pobierz funkcjonalność realtime z dedykowanego hooka
	const { typingUsers, useTypingDetection, useConversationPresence } =
		useRealtimeMessages(conversationId);

	// Zastosuj detekcję pisania do inputa
	useTypingDetection(inputRef);

	// Pobierz informacje o obecności
	const conversationUsers = useConversationPresence();

	// Fetch messages with React Query and mark as read
	const messagesQuery = useSupabaseQuery(
		["messages", conversationId],
		async () => {
			if (!user || !conversationId) {
				return { data: [], error: null };
			}

			// Mark messages as read first
			const { data: unreadMessages } = await supabase
				.from("messages")
				.update({ is_read: true })
				.eq("conversation_id", conversationId)
				.neq("sender_id", user.id)
				.eq("is_read", false)
				.select("id");

			// Remove read messages from notifications
			if (unreadMessages) {
				for (const msg of unreadMessages) {
					removeMessage(msg.id);
				}
			}

			// Then fetch all messages
			return await supabase
				.from("messages")
				.select(`
          id,
          text,
          created_at,
          sender:users!sender_id(id, username, image),
          is_read
        `)
				.eq("conversation_id", conversationId)
				.order("created_at", { ascending: true });
		},
		{
			enabled: !!user && !!conversationId,
			staleTime: 1000, // 1 sekunda - dłuższe staleTime nie jest potrzebne z realtime
			refetchOnWindowFocus: false, // Nie odświeżaj przy focusie, ponieważ używamy realtime
		},
	);

	// Send message mutation with optimistic updates
	const sendMessageMutation = useSupabaseMutation(
		async (text: string) => {
			if (!user || !text.trim() || !conversationId) {
				return { data: null, error: null };
			}

			// Get conversation participants to find receiver
			const { data: participants } = await supabase
				.from("conversation_participants")
				.select("user_id")
				.eq("conversation_id", conversationId);

			if (!participants || participants.length === 0) {
				throw new Error("Nie można znaleźć uczestników konwersacji");
			}

			// Find receiver (not current user)
			const receiverId = participants.find(
				(p) => p.user_id !== user.id,
			)?.user_id;

			if (!receiverId) {
				throw new Error("Nie można znaleźć odbiorcy wiadomości");
			}

			return await supabase
				.from("messages")
				.insert({
					conversation_id: conversationId,
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
			onMutate: async (text) => {
				// Optymistyczna aktualizacja dla lepszego UX
				// Anuluj wszelkie trwające pobierania, które mogłyby nadpisać naszą optymistyczną aktualizację
				await queryClient.cancelQueries({
					queryKey: ["messages", conversationId],
				});

				// Pobierz aktualne dane
				const previousMessages = queryClient.getQueryData([
					"messages",
					conversationId,
				]);

				// Optymistycznie aktualizuj cache
				queryClient.setQueryData(["messages", conversationId], (old: any) => {
					if (!old || !old.data) return { data: [] };

					// Dodaj optymistycznie wiadomość
					const optimisticMessage = {
						id: `temp-${Date.now()}`,
						conversation_id: conversationId,
						sender_id: user.id,
						text,
						is_read: false,
						created_at: new Date().toISOString(),
						sender: {
							id: user.id,
							username: user.user_metadata?.username || "Ty",
							image: user.user_metadata?.image,
						},
					};

					return {
						...old,
						data: [...old.data, optimisticMessage],
					};
				});

				// Zwróć kontekst dla onError
				return { previousMessages };
			},
			onError: (err, text, context) => {
				// W przypadku błędu przywróć poprzedni stan
				queryClient.setQueryData(
					["messages", conversationId],
					context?.previousMessages,
				);
				console.error("Błąd wysyłania wiadomości:", err);
			},
		},
	);

	// Simplified send message function
	const sendMessage = useCallback(
		async (text: string) => {
			return sendMessageMutation.mutateAsync(text);
		},
		[sendMessageMutation],
	);

	return {
		messages: messagesQuery.data || [],
		isLoading: messagesQuery.isLoading,
		error: messagesQuery.error,
		sendMessage,
		isSending: sendMessageMutation.isPending,
		typingUsers,
		conversationUsers,
		inputRef, // Eksportuj referencję, aby umożliwić komponentom podpięcie się pod nią
	};
}
