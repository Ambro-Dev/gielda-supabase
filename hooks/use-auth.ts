// hooks/use-auth.ts
import { useState } from "react";
import { createClientComponentClient } from "@/lib/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { toast } from "sonner";

export function useSignIn() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { signIn } = useSupabase();

	const login = async (email: string, password: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const { data, error } = await signIn(email, password);

			if (error) {
				setError(error.message);
				return null;
			}

			return data;
		} catch (err: any) {
			setError(err.message || "Wystąpił błąd podczas logowania");
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	return { login, isLoading, error };
}

export function useSignUp() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { signUp } = useSupabase();

	const register = async (
		email: string,
		password: string,
		userData: {
			username: string;
			name?: string;
			surname?: string;
		},
	) => {
		setIsLoading(true);
		setError(null);

		try {
			const { data, error } = await signUp(email, password, {
				username: userData.username,
				name: userData.name,
				surname: userData.surname,
				role: "user",
			});

			if (error) {
				setError(error.message);
				return null;
			}

			return data;
		} catch (err: any) {
			setError(err.message || "Wystąpił błąd podczas rejestracji");
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	return { register, isLoading, error };
}

export function useSignOut() {
	const [isLoading, setIsLoading] = useState(false);
	const { signOut } = useSupabase();

	const logout = async () => {
		setIsLoading(true);

		try {
			await signOut();
		} catch (err: any) {
			toast.error(err.message || "Wystąpił błąd podczas wylogowywania");
		} finally {
			setIsLoading(false);
		}
	};

	return { logout, isLoading };
}

export function useResetPassword() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const supabase = createClientComponentClient();

	const sendResetLink = async (email: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`,
			});

			if (error) {
				setError(error.message);
				return false;
			}

			toast.success(
				"Link do resetowania hasła został wysłany na podany adres email",
			);
			return true;
		} catch (err: any) {
			setError(
				err.message ||
					"Wystąpił błąd podczas wysyłania linku do resetowania hasła",
			);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	const resetPassword = async (newPassword: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				setError(error.message);
				return false;
			}

			toast.success("Twoje hasło zostało zresetowane");
			return true;
		} catch (err: any) {
			setError(err.message || "Wystąpił błąd podczas resetowania hasła");
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { sendResetLink, resetPassword, isLoading, error };
}

export function useVerifyTokenForPasswordReset() {
	const [isLoading, setIsLoading] = useState(true);
	const [isValid, setIsValid] = useState(false);
	const supabase = createClientComponentClient();

	const verifyToken = async (token: string) => {
		setIsLoading(true);

		try {
			// Check if token exists in reset_tokens table
			const { data, error } = await supabase
				.from("reset_tokens")
				.select("expires")
				.eq("token", token)
				.single();

			if (error || !data) {
				setIsValid(false);
				return false;
			}

			// Check if token is expired
			const expiresAt = new Date(data.expires);
			const now = new Date();

			if (expiresAt < now) {
				// Token is expired
				setIsValid(false);
				return false;
			}

			setIsValid(true);
			return true;
		} catch (err) {
			setIsValid(false);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	return { verifyToken, isLoading, isValid };
}
