// hooks/use-realtime-messages.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeManager } from "@/lib/realtime-manager";

interface TypingStatus {
	isTyping: boolean;
	userId: string;
	username: string;
}

export function useRealtimeMessages(conversationId: string) {
	const { user } = useSupabase();
	const supabase = createClientComponentClient();
	const queryClient = useQueryClient();
	const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Śledź status pisania - czyść po 3 sekundach nieaktywności
	const clearTypingTimeout = useCallback(() => {
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = null;
		}
	}, []);

	// Obsługa nowych wiadomości w czasie rzeczywistym
	useEffect(() => {
		if (!user || !conversationId) return;

		// Utwórz nazwę kanału dla wiadomości
		const channelName = `messages:${conversationId}`;

		// Obserwuj zmiany w tabeli wiadomości
		const unsubscribe = realtimeManager.onTableChanges(
			channelName,
			"public",
			"messages",
			"INSERT",
			`conversation_id=eq.${conversationId}`,
			async (payload) => {
				// Pobierz informacje o nadawcy
				const { data: sender } = await supabase
					.from("users")
					.select("id, username")
					.eq("id", payload.new.sender_id)
					.single();

				// Aktualizuj cache React Query
				queryClient.setQueryData(
					["messages", conversationId],
					(oldData: any) => {
						if (!oldData) return { data: [{ ...payload.new, sender }] };
						return {
							...oldData,
							data: [...oldData.data, { ...payload.new, sender }],
						};
					},
				);

				// Auto-oznacz jako przeczytane, jeśli wiadomość nie jest od bieżącego użytkownika
				if (payload.new.sender_id !== user.id) {
					await supabase
						.from("messages")
						.update({ is_read: true })
						.eq("id", payload.new.id);

					// Usuń ze store powiadomień (jeśli istnieje tam powiązanie)
					// To można zrobić jako osobny efekt lub przy użyciu dodatkowego hooka
				}
			},
		);

		// Funkcja czyszcząca
		return () => {
			unsubscribe();
		};
	}, [conversationId, user, queryClient, supabase]);

	// Obsługa statusu pisania
	useEffect(() => {
		if (!user || !conversationId) return;

		// Utwórz nazwę kanału dla statusu pisania
		const channelName = `typing:${conversationId}`;

		// Obserwuj broadcasty o pisaniu
		const unsubscribe = realtimeManager.onBroadcast(
			channelName,
			"typing",
			(payload) => {
				const { userId, username, isTyping } = payload;

				// Nie aktualizuj stanu, jeśli to wiadomość od bieżącego użytkownika
				if (userId === user.id) return;

				setTypingUsers((prev) => {
					// Usuń użytkownika, jeśli już nie pisze
					if (!isTyping) {
						return prev.filter((u) => u.userId !== userId);
					}

					// Aktualizuj status, jeśli użytkownik już jest na liście
					if (prev.some((u) => u.userId === userId)) {
						return prev.map((u) =>
							u.userId === userId ? { ...u, isTyping } : u,
						);
					}

					// Dodaj nowego użytkownika, który zaczął pisać
					return [...prev, { userId, username, isTyping }];
				});
			},
		);

		// Funkcja czyszcząca
		return () => {
			unsubscribe();
		};
	}, [conversationId, user]);

	// Funkcja do ustawiania statusu pisania
	const setTypingStatus = useCallback(
		(isTyping: boolean) => {
			if (!user || !conversationId) return;

			const channelName = `typing:${conversationId}`;

			// Wyślij broadcast o statusie pisania
			realtimeManager.broadcast(channelName, "typing", {
				userId: user.id,
				username: user.user_metadata?.username || "Użytkownik",
				isTyping,
			});

			// Usuń status pisania po 3 sekundach nieaktywności
			clearTypingTimeout();

			if (isTyping) {
				typingTimeoutRef.current = setTimeout(() => {
					realtimeManager.broadcast(channelName, "typing", {
						userId: user.id,
						username: user.user_metadata?.username || "Użytkownik",
						isTyping: false,
					});
				}, 3000);
			}
		},
		[user, conversationId, clearTypingTimeout],
	);

	// Hook do automatycznego śledzenia pisania przy wpisywaniu tekstu
	const useTypingDetection = (
		inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		useEffect(() => {
			if (!inputRef.current) return;

			const handleInput = () => {
				setTypingStatus(true);
			};

			const handleBlur = () => {
				setTypingStatus(false);
			};

			// Dodaj listenery do inputa
			inputRef.current.addEventListener("input", handleInput);
			inputRef.current.addEventListener("blur", handleBlur);

			return () => {
				if (inputRef.current) {
					inputRef.current.removeEventListener("input", handleInput);
					inputRef.current.removeEventListener("blur", handleBlur);
				}
				// Upewnij się, że status pisania jest wyczyszczony po odmontowaniu
				setTypingStatus(false);
			};
		}, [inputRef]);
	};

	// Hook do śledzenia obecności w konwersacji
	const useConversationPresence = () => {
		const [conversationUsers, setConversationUsers] = useState<
			{ id: string; username: string; online: boolean }[]
		>([]);

		useEffect(() => {
			if (!user || !conversationId) return;

			const presenceChannelName = `presence:${conversationId}`;

			// Rejestruj obecność w konwersacji
			const unsubscribe = realtimeManager.joinPresence(
				presenceChannelName,
				{
					user_id: user.id,
					username: user.user_metadata?.username || "Użytkownik",
					online_at: new Date().toISOString(),
				},
				// onSync
				() => {
					// Możesz zaktualizować listę użytkowników w konwersacji
					// np. poprzez pobranie obecnych użytkowników z kanału
				},
				// onJoin
				(key, newPresence) => {
					setConversationUsers((prev) => {
						// Jeśli użytkownik już jest na liście, aktualizuj jego status
						if (prev.some((u) => u.id === key)) {
							return prev.map((u) =>
								u.id === key ? { ...u, online: true } : u,
							);
						}

						// Dodaj nowego użytkownika
						return [
							...prev,
							{
								id: key,
								username: newPresence.username || "Użytkownik",
								online: true,
							},
						];
					});
				},
				// onLeave
				(key, leftPresence) => {
					setConversationUsers((prev) =>
						prev.map((u) => (u.id === key ? { ...u, online: false } : u)),
					);
				},
			);

			return () => {
				unsubscribe();
			};
		}, [user, conversationId]);

		return conversationUsers;
	};

	return {
		typingUsers,
		setTypingStatus,
		useTypingDetection,
		useConversationPresence,
	};
}
