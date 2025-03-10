"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type {
	Session,
	User,
	AuthError,
	AuthResponse,
} from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

// Typowanie dla danych zwracanych przez funkcje auth
type AuthData = {
	user: User | null;
	session: Session | null;
};

// Typowanie dla metadanych użytkownika
type UserMetadata = {
	username?: string;
	name?: string;
	surname?: string;
	role?: "user" | "admin" | "school_admin" | "student";
	school_id?: string;
	admin_of_school_id?: string;
	[key: string]:
		| string
		| undefined
		| "user"
		| "admin"
		| "school_admin"
		| "student";
};

// Typy dla kontekstu
type SupabaseContextType = {
	user: User | null;
	session: Session | null;
	isLoading: boolean;
	signUp: (
		email: string,
		password: string,
		metadata?: UserMetadata,
	) => Promise<{ data: AuthData | null; error: AuthError | null }>;
	signIn: (
		email: string,
		password: string,
	) => Promise<{ data: AuthData | null; error: AuthError | null }>;
	signOut: () => Promise<{ error: AuthError | null }>;
	refreshSession: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextType>({
	user: null,
	session: null,
	isLoading: true,
	signUp: async () => ({ data: null, error: null }),
	signIn: async () => ({ data: null, error: null }),
	signOut: async () => ({ error: null }),
	refreshSession: async () => {},
});

export const useSupabase = () => useContext(SupabaseContext);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const router = useRouter();
	const supabase = createClientComponentClient();

	useEffect(() => {
		let isMounted = true;

		// Get initial session
		const initializeAuth = async () => {
			try {
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();
				if (error) {
					console.error("Auth initialization error:", error);
					return;
				}

				if (isMounted) {
					setSession(session);
					setUser(session?.user ?? null);
				}
			} catch (error) {
				console.error("Auth initialization error:", error);
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		// Subscribe to auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (isMounted) {
				setSession(session);
				setUser(session?.user ?? null);

				// Tylko przy logowaniu/wylogowaniu, nie przy każdej zmianie sesji
				if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
					router.refresh();
				}
			}
		});

		initializeAuth();

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, [supabase, router]);

	// Funkcje autoryzacyjne z poprawnym typowaniem
	const signUp = async (
		email: string,
		password: string,
		metadata?: UserMetadata,
	): Promise<{ data: AuthData | null; error: AuthError | null }> => {
		try {
			const response: AuthResponse = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: metadata,
				},
			});

			if (response.error) {
				toast.error(response.error.message);
				return { data: null, error: response.error };
			}

			toast.success("Konto zostało utworzone");

			return {
				data: {
					user: response.data.user,
					session: response.data.session,
				},
				error: null,
			};
		} catch (err) {
			const error = err as Error;
			toast.error(error.message || "Wystąpił błąd podczas rejestracji");
			return {
				data: null,
				error: {
					name: "UnknownError",
					message: error.message || "Wystąpił błąd podczas rejestracji",
				} as AuthError,
			};
		}
	};

	const signIn = async (
		email: string,
		password: string,
	): Promise<{ data: AuthData | null; error: AuthError | null }> => {
		try {
			const response: AuthResponse = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (response.error) {
				toast.error(response.error.message);
				return { data: null, error: response.error };
			}

			toast.success("Zalogowano pomyślnie");

			return {
				data: {
					user: response.data.user,
					session: response.data.session,
				},
				error: null,
			};
		} catch (err) {
			const error = err as Error;
			toast.error(error.message || "Wystąpił błąd podczas logowania");
			return {
				data: null,
				error: {
					name: "UnknownError",
					message: error.message || "Wystąpił błąd podczas logowania",
				} as AuthError,
			};
		}
	};

	const signOut = async (): Promise<{ error: AuthError | null }> => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				toast.error(error.message);
				return { error };
			}

			toast.success("Wylogowano pomyślnie");
			router.push("/signin");
			return { error: null };
		} catch (err) {
			const error = err as Error;
			toast.error(error.message || "Wystąpił błąd podczas wylogowywania");
			return {
				error: {
					name: "UnknownError",
					message: error.message || "Wystąpił błąd podczas wylogowywania",
				} as AuthError,
			};
		}
	};

	const refreshSession = async (): Promise<void> => {
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setSession(session);
			setUser(session?.user ?? null);
		} catch (error) {
			console.error("Session refresh error:", error);
		}
	};

	const value = {
		user,
		session,
		isLoading,
		signUp,
		signIn,
		signOut,
		refreshSession,
	};

	return (
		<SupabaseContext.Provider value={value}>
			{children}
		</SupabaseContext.Provider>
	);
}
