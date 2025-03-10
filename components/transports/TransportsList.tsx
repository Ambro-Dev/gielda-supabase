"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import TransportCard from "./TransportCard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFilteredTransports } from "@/hooks/use-transports";
import type { Transport } from "@/types/transport.types";

interface TransportsListProps {
	initialTransports?: Transport[];
}

export default function TransportsList({
	initialTransports,
}: TransportsListProps) {
	// Używamy istniejącego hooka useFilteredTransports który zawiera obsługę filtrów z useFiltersStore
	const { transports, isLoading } = useFilteredTransports();

	// W przypadku błędu wyświetl toast z sonner
	React.useEffect(() => {
		if (transports === undefined && !isLoading) {
			toast.error("Nie udało się pobrać ogłoszeń transportowych");
		}
	}, [transports, isLoading]);

	// Użyj przekazanych initialTransports (dla SSR) lub pobranych z hooka (dla CSR)
	const displayTransports =
		initialTransports?.length && !transports.length
			? initialTransports
			: (transports as unknown as Transport[]);

	if (isLoading) {
		return (
			<div className="w-full flex justify-center items-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-amber-500" />
			</div>
		);
	}

	if (!displayTransports.length) {
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
