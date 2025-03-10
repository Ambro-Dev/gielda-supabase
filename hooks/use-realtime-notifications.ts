// hooks/use-realtime-notifications.ts
import { useEffect } from "react";
import { useSupabase } from "@/context/supabase-provider";
import { useNotificationsStore } from "@/stores/notifications-store";
import { realtimeManager } from "@/lib/realtime-manager";
import { createClientComponentClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useRealtimeNotifications() {
	const { user } = useSupabase();
	const supabase = createClientComponentClient();
	const router = useRouter();

	const {
		addMessage,
		addOfferMessage,
		addOffer,
		addReport,
		removeMessage,
		removeOfferMessage,
		removeOffer,
		removeReport,
	} = useNotificationsStore();

	// Ustaw nasłuchiwanie powiadomień w czasie rzeczywistym
	useEffect(() => {
		if (!user) return;

		// Utwórz nazwę kanału dla powiadomień użytkownika
		const notificationsChannel = `user-notifications:${user.id}`;

		// 1. Nasłuchuj nowych wiadomości
		const unsubscribeMessages = realtimeManager.onTableChanges(
			notificationsChannel,
			"public",
			"messages",
			"INSERT",
			`receiver_id=eq.${user.id}`,
			async (payload) => {
				// Pobierz informacje o nadawcy
				const { data: senderData } = await supabase
					.from("users")
					.select("id, username, email")
					.eq("id", payload.new.sender_id)
					.single();

				const message = {
					id: payload.new.id,
					created_at: payload.new.created_at,
					text: payload.new.text,
					is_read: payload.new.is_read,
					sender: senderData || {
						id: payload.new.sender_id,
						username: "Nieznany",
						email: "",
					},
					conversation: {
						id: payload.new.conversation_id,
					},
				};

				// Dodaj do store'a
				addMessage(message);

				// Powiadomienie dźwiękowe
				const audio = new Audio("/notification.mp3");
				audio.play().catch(() => {});

				// Toast
				toast("Nowa wiadomość", {
					description: `Otrzymałeś nową wiadomość od ${message.sender?.username || "użytkownika"}`,
					action: {
						label: "Zobacz",
						onClick: () =>
							router.push(`/user/market/messages/${message.conversation?.id}`),
					},
				});
			},
		);

		// 2. Nasłuchuj usunięcia/odczytu wiadomości
		const unsubscribeMessagesUpdate = realtimeManager.onTableChanges(
			notificationsChannel,
			"public",
			"messages",
			"UPDATE",
			`receiver_id=eq.${user.id}`,
			async (payload) => {
				// Jeśli wiadomość została oznaczona jako przeczytana, usuń ją z powiadomień
				if (payload.new.is_read) {
					removeMessage(payload.new.id);
				}
			},
		);

		// 3. Nasłuchuj nowych ofert
		const unsubscribeOffers = realtimeManager.onTableChanges(
			notificationsChannel,
			"public",
			"offers",
			"INSERT",
			`creator_id=eq.${user.id}`,
			async (payload) => {
				// Pobierz informacje o twórcy
				const { data: creatorData } = await supabase
					.from("users")
					.select("id, username, email")
					.eq("id", payload.new.creator_id)
					.single();

				const offer = {
					...payload.new,
					id: payload.new.id,
					created_at: payload.new.created_at,
					sender: creatorData || {
						id: payload.new.creator_id,
						username: "Nieznany",
						email: "",
					},
					transport: {
						id: payload.new.transport_id,
					},
				};

				// Dodaj do store'a
				addOffer(offer);

				// Powiadomienie dźwiękowe
				const audio = new Audio("/notification.mp3");
				audio.play().catch(() => {});

				// Toast
				toast("Nowa oferta", {
					description: "Otrzymałeś nową ofertę na transport",
					action: {
						label: "Zobacz",
						onClick: () =>
							router.push(`/transport/${offer.transport.id}/offer/${offer.id}`),
					},
				});
			},
		);

		// 4. Nasłuchuj aktualizacji ofert (np. zaakceptowanie)
		const unsubscribeOffersUpdate = realtimeManager.onTableChanges(
			notificationsChannel,
			"public",
			"offers",
			"UPDATE",
			null,
			async (payload) => {
				// Jeśli oferta została zaakceptowana, usuń ją z powiadomień
				if (payload.new.is_accepted) {
					removeOffer(payload.new.id);

					// Pokaż toast informacyjny
					toast.success("Oferta zaakceptowana", {
						description: "Twoja oferta została zaakceptowana",
						action: {
							label: "Zobacz",
							onClick: () =>
								router.push(
									`/transport/${payload.new.transport_id}/offer/${payload.new.id}`,
								),
						},
					});
				}
			},
		);

		// 5. Nasłuchuj wiadomości ofertowych
		const unsubscribeOfferMessages = realtimeManager.onTableChanges(
			notificationsChannel,
			"public",
			"offer_messages",
			"INSERT",
			`receiver_id=eq.${user.id}`,
			async (payload) => {
				// Pobierz informacje o nadawcy
				const { data: senderData } = await supabase
					.from("users")
					.select("id, username, email")
					.eq("id", payload.new.sender_id)
					.single();

				// Pobierz informacje o ofercie (aby uzyskać transport_id)
				const { data: offerData } = await supabase
					.from("offers")
					.select("transport_id")
					.eq("id", payload.new.offer_id)
					.single();

				const message = {
					id: payload.new.id,
					created_at: payload.new.created_at,
					text: payload.new.text,
					is_read: payload.new.is_read || false,
					sender: senderData || {
						id: payload.new.sender_id,
						username: "Nieznany",
						email: "",
					},
					receiver: {
						id: payload.new.receiver_id,
						username: "",
						email: "",
					},
					offer: {
						id: payload.new.offer_id,
					},
					transport: {
						id: offerData?.transport_id,
					},
				};

				// Dodaj do store'a
				addOfferMessage(message);

				// Powiadomienie dźwiękowe
				const audio = new Audio("/notification.mp3");
				audio.play().catch(() => {});

				// Toast
				toast("Nowa wiadomość w ofercie", {
					description: "Otrzymałeś nową wiadomość dotyczącą oferty",
					action: {
						label: "Zobacz",
						onClick: () =>
							router.push(
								`/transport/${message.transport?.id}/offer/${message.offer?.id}`,
							),
					},
				});
			},
		);

		// 6. Nasłuchuj aktualizacji wiadomości ofertowych
		const unsubscribeOfferMessagesUpdate = realtimeManager.onTableChanges(
			notificationsChannel,
			"public",
			"offer_messages",
			"UPDATE",
			`receiver_id=eq.${user.id}`,
			async (payload) => {
				// Jeśli wiadomość została oznaczona jako przeczytana, usuń ją z powiadomień
				if (payload.new.is_read) {
					removeOfferMessage(payload.new.id);
				}
			},
		);

		// 7. Nasłuchuj raportów (dla admina)
		let unsubscribeReports = () => {};
		if (user.user_metadata?.role === "admin") {
			unsubscribeReports = realtimeManager.onTableChanges(
				notificationsChannel,
				"public",
				"reports",
				"INSERT",
				null,
				(payload) => {
					const report = {
						id: payload.new.id,
						place: payload.new.place,
						content: payload.new.content,
						seen: payload.new.seen || false,
						created_at: payload.new.created_at,
						updated_at: payload.new.updated_at || payload.new.created_at,
						reporter_id: payload.new.reporter_id,
						reported_id: payload.new.reported_id,
						status: payload.new.status,
						type: payload.new.type,
						file_url: payload.new.file_url || null,
						user_id: payload.new.user_id || payload.new.reporter_id,
					};

					// Dodaj do store'a
					addReport(report);

					// Powiadomienie dźwiękowe
					const audio = new Audio("/notification.mp3");
					audio.play().catch(() => {});

					// Toast
					toast("Nowy raport", {
						description: "Otrzymałeś nowy raport do sprawdzenia",
						action: {
							label: "Zobacz",
							onClick: () => router.push("/admin/reports"),
						},
					});
				},
			);
		}

		// Funkcja czyszcząca
		return () => {
			unsubscribeMessages();
			unsubscribeMessagesUpdate();
			unsubscribeOffers();
			unsubscribeOffersUpdate();
			unsubscribeOfferMessages();
			unsubscribeOfferMessagesUpdate();
			unsubscribeReports();
		};
	}, [
		user,
		addMessage,
		addOffer,
		addOfferMessage,
		addReport,
		removeMessage,
		removeOffer,
		removeOfferMessage,
		removeReport,
		router,
		supabase,
	]);

	// Nie zwracamy nic, ponieważ ta funkcja jedynie ustawia nasłuchiwanie w tle
	return null;
}
