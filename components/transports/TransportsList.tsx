"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import TransportCard from "./TransportCard";
import { Loader2 } from "lucide-react";
import type { Transport, TransportsListProps } from "@/types/transport.types";
import { useFilteredTransports } from "@/hooks/use-transports";
import { toast } from "sonner";

export default function TransportsList({
	initialTransports,
}: TransportsListProps) {
	// Użyj istniejącego hooka do filtrowanych transportów zamiast własnej implementacji
	const { transports, isLoading } = useFilteredTransports();

	// W przypadku błędu wyświetl toast
	React.useEffect(() => {
		if (transports === undefined && !isLoading) {
			toast.error("Nie udało się pobrać ogłoszeń transportowych");
		}
	}, [transports, isLoading]);

	// Użyj przekazanych initialTransports (dla SSR) lub pobrane z hooka (dla CSR)
	const displayTransports =
		initialTransports && initialTransports.length > 0 && !transports.length
			? initialTransports
			: (transports as unknown as Transport[]);

	if (isLoading) {
		return (
			<div className="w-full flex justify-center items-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-amber-500" />
			</div>
		);
	}

	if (displayTransports.length === 0) {
		return (
			<Card className="w-full mt-4">
				<CardContent className="flex flex-col items-center justify-center py-12">
					<h3 className="text-xl font-semibold mb-2">Brak ogłoszeń</h3>
					<p className="text-muted-foreground">
						Nie znaleziono ogłoszeń transportowych spełniających podane
						kryteria.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
			{displayTransports.map((transport) => (
				<TransportCard key={transport.id} transport={transport} />
			))}
		</div>
	);
}
