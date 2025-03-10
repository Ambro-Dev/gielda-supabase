import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SupabaseProvider } from "@/context/supabase-provider";
import { ReactQueryProvider } from "@/lib/react-query";
import { SupabaseRealtimeProvider } from "@/context/supabase-realtime-provider";
import NotificationsLoader from "@/components/notifications-loader";
import TopBar from "@/components/TopBar";

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: "http://localhost:3000";

export const metadata = {
	metadataBase: new URL(defaultUrl),
	title: "Next.js and Supabase Starter Kit",
	description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
	display: "swap",
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pl" className={geistSans.className} suppressHydrationWarning>
			<body className="bg-background text-foreground">
				<SupabaseProvider>
					<ReactQueryProvider>
						<SupabaseRealtimeProvider>
							<NotificationsLoader />
							<ThemeProvider
								attribute="class"
								defaultTheme="light"
								enableSystem={false}
								disableTransitionOnChange
							>
								<main className="min-h-screen flex flex-col items-center">
									<TopBar />
									{children}
									<Toaster />
								</main>
							</ThemeProvider>
						</SupabaseRealtimeProvider>
					</ReactQueryProvider>
				</SupabaseProvider>
			</body>
		</html>
	);
}
