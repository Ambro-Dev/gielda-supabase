"use client";
import React from "react";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SocketIndicator } from "@/components/ui/socket-indicator";
import {
	Bug,
	LogOut,
	MessageSquare,
	PenBox,
	Settings,
	User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Separator } from "./ui/separator";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useSupabase } from "@/context/supabase-provider";
import { cn } from "@/lib/utils";

type MenuItemType = {
	title: string;
	href: string;
	description: string;
};

type Props = {
	school:
		| {
				id: string;
				name: string;
				accessExpires: string;
				identifier: string;
				is_active: boolean;
		  }
		| null
		| undefined;
	menu: MenuItemType[];
};

const MobileNavMenu = ({ school, menu }: Props) => {
	const router = useRouter();
	// Use Supabase context instead of Next Auth session
	const { user, signOut } = useSupabase();

	// Get notifications from Zustand store
	const { messages, offers, offerMessages, reports } = useNotificationsStore();

	const isAuth = !!user;

	// Calculate total unread notifications
	const unreadMessages = messages.length;
	const unreadOffers = offers.length;
	const unreadOfferMessages = offerMessages.length;
	const totalUnread = unreadMessages + unreadOffers + unreadOfferMessages;

	const avatar = (
		<div className="flex flex-col justify-center items-center space-y-2">
			<Avatar className="w-16 h-16">
				<AvatarFallback className="text-sm">
					{user?.user_metadata?.username
						? user.user_metadata.username.substring(0, 1).toUpperCase()
						: user?.email?.substring(0, 1).toUpperCase() || "?"}
				</AvatarFallback>
			</Avatar>
			<span>
				{user?.user_metadata?.username ||
					user?.email?.split("@")[0] ||
					"Użytkownik"}
			</span>
		</div>
	);

	// Calculate time until school access expires
	const untilExpire = () => {
		if (school?.accessExpires) {
			const date = new Date(school.accessExpires);
			const now = new Date();
			const diff = date.getTime() - now.getTime();
			const days = Math.floor(diff / (1000 * 60 * 60 * 24));
			const hours = Math.floor(
				(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
			);
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

			if (days > 0) return `${days} dni`;
			if (days === 0 && hours > 0) return `${hours} godz.`;
			if (days === 0 && hours === 0 && minutes > 0) return `${minutes} min.`;
			return "Wygasło";
		}
		return "Nieokreślony";
	};

	// Notification badge component
	const NotificationBadge = ({ count }: { count: number }) => {
		if (count <= 0) return null;

		return (
			<div className="absolute z-10 -right-2 -top-2 w-5 text-[10px] font-semibold h-5 flex justify-center text-white items-center bg-red-500 rounded-full">
				{count}
			</div>
		);
	};

	// Handle sign out with Supabase
	const handleSignOut = async () => {
		await signOut();
		router.push("/signin");
	};

	return (
		<NavigationMenu>
			<NavigationMenuList className="gap-4 flex-col">
				{isAuth && (
					<>
						<NavigationMenuItem className="hover:cursor-pointer">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<div className="relative">
										<NotificationBadge count={totalUnread} />
										{avatar}
									</div>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56">
									<DropdownMenuLabel className="flex flex-wrap justify-between">
										Moje konto <SocketIndicator />
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuItem
											className="hover:cursor-pointer hover:bg-amber-400"
											onClick={() => router.push("/user/profile/account")}
										>
											<User className="mr-2 h-4 w-4" />
											<SheetClose asChild>
												<span>Profil</span>
											</SheetClose>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="hover:cursor-pointer hover:bg-amber-400"
											onClick={() => router.push("/user/profile/settings")}
										>
											<Settings className="mr-2 h-4 w-4" />
											<SheetClose asChild>
												<span>Ustawienia</span>
											</SheetClose>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="hover:cursor-pointer relative hover:bg-amber-400"
											onClick={() => router.push("/user/market/messages")}
										>
											<MessageSquare className="mr-2 h-4 w-4" />
											<NotificationBadge count={unreadMessages} />
											<SheetClose asChild>
												<span>Wiadomości</span>
											</SheetClose>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="hover:cursor-pointer relative hover:bg-amber-400"
											onClick={() => router.push("/user/market/offers")}
										>
											<PenBox className="mr-2 h-4 w-4" />
											<NotificationBadge
												count={unreadOffers + unreadOfferMessages}
											/>
											<SheetClose asChild>
												<span>Oferty</span>
											</SheetClose>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="hover:cursor-pointer hover:bg-zinc-200 text-red-600 font-semibold"
											onClick={() => router.push("/report")}
										>
											<Bug className="mr-2 h-4 w-4" />
											<SheetClose asChild>
												<span>Zgłoś uwagę</span>
											</SheetClose>
										</DropdownMenuItem>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={handleSignOut}
										className="hover:cursor-pointer hover:bg-neutral-200"
									>
										<LogOut className="mr-2 h-4 w-4" />
										<SheetClose asChild>
											<span>Wyloguj</span>
										</SheetClose>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</NavigationMenuItem>
						<Separator />
					</>
				)}

				{user?.user_metadata?.role === "school_admin" && (
					<NavigationMenuItem>
						<Link href="/school" legacyBehavior passHref>
							<NavigationMenuLink className={navigationMenuTriggerStyle()}>
								<SheetClose asChild>
									<Button>Zarządzaj szkołą</Button>
								</SheetClose>
							</NavigationMenuLink>
						</Link>
					</NavigationMenuItem>
				)}

				{user?.user_metadata?.role === "admin" && (
					<NavigationMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild className="relative">
								<div>
									<NotificationBadge count={reports.length} />
									<Button>Panel administracyjny</Button>
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56" side="bottom">
								<DropdownMenuGroup>
									{menu.map((item) => (
										<div key={item.title}>
											<SheetClose asChild>
												<DropdownMenuItem
													className="flex flex-col w-full justify-center items-start gap-2"
													onClick={() => router.push(item.href)}
												>
													<div className="flex justify-between w-full">
														<span className="font-bold">{item.title}</span>
														{reports.length > 0 &&
															item.href === "/admin/reports" && (
																<NotificationBadge count={reports.length} />
															)}
													</div>
													<span>{item.description}</span>
												</DropdownMenuItem>
											</SheetClose>
											<DropdownMenuSeparator />
										</div>
									))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</NavigationMenuItem>
				)}

				<NavigationMenuItem className="text-amber-500 font-bold hover:bg-amber-500 py-2 px-3 transition-all duration-500 rounded-md hover:text-black text-sm hover:font-semibold">
					<Link href="/transport/add" legacyBehavior passHref>
						<NavigationMenuLink>
							<SheetClose asChild>
								<p>Dodaj ogłoszenie</p>
							</SheetClose>
						</NavigationMenuLink>
					</Link>
				</NavigationMenuItem>

				<NavigationMenuItem>
					<Link href="/" legacyBehavior passHref>
						<NavigationMenuLink className={navigationMenuTriggerStyle()}>
							<SheetTrigger asChild>
								<p>Giełda transportowa</p>
							</SheetTrigger>
						</NavigationMenuLink>
					</Link>
				</NavigationMenuItem>

				{!isAuth ? (
					<NavigationMenuItem>
						<Link href="/signin" legacyBehavior passHref>
							<SheetTrigger asChild>
								<NavigationMenuLink className={navigationMenuTriggerStyle()}>
									Zaloguj się
								</NavigationMenuLink>
							</SheetTrigger>
						</Link>
					</NavigationMenuItem>
				) : (
					<>
						<NavigationMenuItem>
							<Link href="/vehicles" legacyBehavior passHref>
								<NavigationMenuLink className={navigationMenuTriggerStyle()}>
									<SheetTrigger asChild>
										<p>Dostępne pojazdy</p>
									</SheetTrigger>
								</NavigationMenuLink>
							</Link>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<Link href="/user/market" legacyBehavior passHref>
								<NavigationMenuLink className={navigationMenuTriggerStyle()}>
									<SheetTrigger asChild>
										<span>Moja giełda</span>
									</SheetTrigger>
								</NavigationMenuLink>
							</Link>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<Link href="/documents" legacyBehavior passHref>
								<NavigationMenuLink className={navigationMenuTriggerStyle()}>
									<SheetTrigger asChild>
										<span>Dokumenty do pobrania</span>
									</SheetTrigger>
								</NavigationMenuLink>
							</Link>
						</NavigationMenuItem>

						{school && (
							<NavigationMenuItem className="text-sm">
								Dostęp wygaśnie za:{" "}
								<span
									className={cn(
										"font-semibold",
										new Date(school.accessExpires) <= new Date()
											? "text-red-500"
											: "text-amber-500",
									)}
								>
									{untilExpire()}
								</span>
							</NavigationMenuItem>
						)}
					</>
				)}
			</NavigationMenuList>
		</NavigationMenu>
	);
};

export default MobileNavMenu;
