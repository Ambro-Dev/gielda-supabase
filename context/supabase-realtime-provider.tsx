// context/supabase-realtime-provider.tsx (zmodyfikowana wersja)
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "@/context/supabase-provider";
import { realtimeManager } from "@/lib/realtime-manager";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

type RealtimeContextType = {
	isConnected: boolean;
	joinRoom: (roomId: string) => void;
	leaveRoom: (roomId: string) => void;
	sendTypingStatus: (roomId: string, isTyping: boolean) => void;
};

const RealtimeContext = createContext<RealtimeContextType>({
	isConnected: false,
	joinRoom: () => {},
	leaveRoom: () => {},
	sendTypingStatus: () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

export function SupabaseRealtimeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isConnected, setIsConnected] = useState(false);
	const { user } = useSupabase();

	// Inicjalizuj nasłuchiwanie powiadomień
	useRealtimeNotifications();

	// Obecność użytkownika online
	useEffect(() => {
		if (!user) return;

		// Inicjalizuj kanał obecności dla wszystkich użytkowników online
		const unsubscribe = realtimeManager.joinPresence(
			"online-users",
			{
				user_id: user.id,
				username: user.user_metadata?.username || "Użytkownik",
				online_at: new Date().toISOString(),
				// Możesz dodać więcej danych, np. avatar
			},
			// onSync
			() => {
				setIsConnected(true);
			},
			// onJoin
			(key) => {
				if (key === user.id) {
					setIsConnected(true);
				}
			},
			// onLeave
			(key) => {
				if (key === user.id) {
					setIsConnected(false);
				}
			},
		);

		return () => {
			unsubscribe();
		};
	}, [user]);

	// Dołącz do konkretnego pokoju/konwersacji
	const joinRoom = (roomId: string) => {
		if (!user || !roomId) return;

		// Dołącz do pokoju, rejestrując obecność
		realtimeManager.joinPresence(`room:${roomId}`, {
			user_id: user.id,
			username: user.user_metadata?.username || "Użytkownik",
			joined_at: new Date().toISOString(),
		});
	};

	// Opuść pokój/konwersację
	const leaveRoom = (roomId: string) => {
		if (!roomId) return;

		// Nie musimy jawnie wywoływać untrack, ponieważ realtimeManager
		// zadba o to w ramach funkcji zwracanej przez joinPresence
	};

	// Wyślij status pisania
	const sendTypingStatus = (roomId: string, isTyping: boolean) => {
		if (!user || !roomId) return;

		// Wyślij status pisania jako broadcast
		realtimeManager.broadcast(`typing:${roomId}`, "typing", {
			userId: user.id,
			username: user.user_metadata?.username || "Użytkownik",
			isTyping,
		});
	};

	// Wyczyść zasoby przy odmontowaniu
	useEffect(() => {
		return () => {
			// Podczas odmontowania providera, wyczyść wszystkie kanały
			// np. przy wylogowaniu użytkownika
			if (user) {
				realtimeManager.cleanup();
			}
		};
	}, [user]);

	return (
		<RealtimeContext.Provider
			value={{
				isConnected,
				joinRoom,
				leaveRoom,
				sendTypingStatus,
			}}
		>
			{children}
		</RealtimeContext.Provider>
	);
}
