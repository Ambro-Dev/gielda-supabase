// lib/realtime-manager.ts
import { createClientComponentClient } from "@/lib/supabase";
import type {
	RealtimeChannel,
	RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

type ChannelName = string;
type EventHandler = (payload: any) => void;

// Singleton pattern dla zarządzania kanałami realtime
class RealtimeManager {
	private static instance: RealtimeManager;
	private supabase = createClientComponentClient();
	private channels: Map<ChannelName, RealtimeChannel> = new Map();
	private eventHandlers: Map<string, Set<EventHandler>> = new Map();
	private presenceChannels: Set<string> = new Set();

	private constructor() {
		// Prywatny konstruktor dla singletona
	}

	public static getInstance(): RealtimeManager {
		if (!RealtimeManager.instance) {
			RealtimeManager.instance = new RealtimeManager();
		}
		return RealtimeManager.instance;
	}

	/**
	 * Tworzy i subskrybuje do kanału, jeśli nie istnieje
	 */
	public getOrCreateChannel(channelName: string): RealtimeChannel {
		if (this.channels.has(channelName)) {
			return this.channels.get(channelName)!;
		}

		const channel = this.supabase.channel(channelName);
		this.channels.set(channelName, channel);

		return channel;
	}

	/**
	 * Dodaje obserwatora zmian w tabeli PostgreSQL
	 */
	public onTableChanges(
		channelName: string,
		schema: string,
		table: string,
		event: "INSERT" | "UPDATE" | "DELETE",
		filter?: string,
		handler: (payload: RealtimePostgresChangesPayload<any>) => void,
	): () => void {
		const channel = this.getOrCreateChannel(channelName);
		const handlerId = `${channelName}:${schema}:${table}:${event}:${filter || ""}`;

		if (!this.eventHandlers.has(handlerId)) {
			this.eventHandlers.set(handlerId, new Set());
		}

		this.eventHandlers.get(handlerId)!.add(handler);

		// Dodaj obserwatora do kanału, jeśli jeszcze nie ma
		if (this.eventHandlers.get(handlerId)!.size === 1) {
			channel.on(
				"postgres_changes",
				{
					event,
					schema,
					table,
					filter,
				},
				(payload) => {
					// Wywołaj wszystkich obserwatorów
					this.eventHandlers.get(handlerId)!.forEach((h) => h(payload));
				},
			);

			// Upewnij się, że kanał jest subskrybowany
			if (channel.state !== "joined") {
				channel.subscribe();
			}
		}

		// Zwróć funkcję do usunięcia obserwatora
		return () => {
			if (this.eventHandlers.has(handlerId)) {
				this.eventHandlers.get(handlerId)!.delete(handler);

				// Jeśli nie ma więcej obserwatorów, usuń kanał
				if (this.eventHandlers.get(handlerId)!.size === 0) {
					this.eventHandlers.delete(handlerId);
					this.removeChannelIfUnused(channelName);
				}
			}
		};
	}

	/**
	 * Dodaje obserwatora broadcastów (np. wskaźniki pisania)
	 */
	public onBroadcast(
		channelName: string,
		event: string,
		handler: (payload: any) => void,
	): () => void {
		const channel = this.getOrCreateChannel(channelName);
		const handlerId = `${channelName}:broadcast:${event}`;

		if (!this.eventHandlers.has(handlerId)) {
			this.eventHandlers.set(handlerId, new Set());
		}

		this.eventHandlers.get(handlerId)!.add(handler);

		// Dodaj obserwatora do kanału, jeśli jeszcze nie ma
		if (this.eventHandlers.get(handlerId)!.size === 1) {
			channel.on("broadcast", { event }, (payload) => {
				// Wywołaj wszystkich obserwatorów
				this.eventHandlers.get(handlerId)!.forEach((h) => h(payload));
			});

			// Upewnij się, że kanał jest subskrybowany
			if (channel.state !== "joined") {
				channel.subscribe();
			}
		}

		// Zwróć funkcję do usunięcia obserwatora
		return () => {
			if (this.eventHandlers.has(handlerId)) {
				this.eventHandlers.get(handlerId)!.delete(handler);

				// Jeśli nie ma więcej obserwatorów, usuń kanał
				if (this.eventHandlers.get(handlerId)!.size === 0) {
					this.eventHandlers.delete(handlerId);
					this.removeChannelIfUnused(channelName);
				}
			}
		};
	}

	/**
	 * Dołącza do presence channel i śledzi obecność
	 */
	public joinPresence(
		channelName: string,
		presenceData: any,
		onSync?: () => void,
		onJoin?: (key: string, newPresence: any) => void,
		onLeave?: (key: string, leftPresence: any) => void,
	): () => void {
		const channel = this.getOrCreateChannel(channelName);
		this.presenceChannels.add(channelName);

		if (onSync) {
			channel.on("presence", { event: "sync" }, onSync);
		}

		if (onJoin) {
			channel.on("presence", { event: "join" }, ({ key, newPresence }) => {
				onJoin(key, newPresence);
			});
		}

		if (onLeave) {
			channel.on("presence", { event: "leave" }, ({ key, leftPresence }) => {
				onLeave(key, leftPresence);
			});
		}

		// Upewnij się, że kanał jest subskrybowany
		if (channel.state !== "joined") {
			channel.subscribe(async (status) => {
				if (status === "SUBSCRIBED") {
					await channel.track(presenceData);
				}
			});
		} else {
			// Jeśli już subskrybowany, po prostu śledź obecność
			channel.track(presenceData);
		}

		// Zwróć funkcję do opuszczenia presence
		return () => {
			channel.untrack();

			// Usuń obserwatorów presence
			if (onSync) channel.off("presence", { event: "sync" });
			if (onJoin) channel.off("presence", { event: "join" });
			if (onLeave) channel.off("presence", { event: "leave" });

			this.presenceChannels.delete(channelName);
			this.removeChannelIfUnused(channelName);
		};
	}

	/**
	 * Wysyła broadcast (np. dla wskaźnika pisania)
	 */
	public broadcast(channelName: string, event: string, payload: any): void {
		const channel = this.getOrCreateChannel(channelName);

		// Upewnij się, że kanał jest subskrybowany
		if (channel.state !== "joined") {
			channel.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					channel.send({
						type: "broadcast",
						event,
						payload,
					});
				}
			});
		} else {
			// Jeśli już subskrybowany, wyślij broadcast
			channel.send({
				type: "broadcast",
				event,
				payload,
			});
		}
	}

	/**
	 * Usuwa kanał, jeśli nie jest już używany
	 */
	private removeChannelIfUnused(channelName: string): void {
		// Sprawdź czy jakiekolwiek zdarzenia nadal używają tego kanału
		const hasHandlers = Array.from(this.eventHandlers.keys()).some((key) =>
			key.startsWith(channelName + ":"),
		);

		// Sprawdź czy kanał jest używany jako presence
		const isPresence = this.presenceChannels.has(channelName);

		if (!hasHandlers && !isPresence && this.channels.has(channelName)) {
			const channel = this.channels.get(channelName)!;
			this.supabase.removeChannel(channel);
			this.channels.delete(channelName);
		}
	}

	/**
	 * Usuwa wszystkie kanały i obserwatorów
	 */
	public cleanup(): void {
		this.channels.forEach((channel) => {
			this.supabase.removeChannel(channel);
		});

		this.channels.clear();
		this.eventHandlers.clear();
		this.presenceChannels.clear();
	}
}

export const realtimeManager = RealtimeManager.getInstance();
