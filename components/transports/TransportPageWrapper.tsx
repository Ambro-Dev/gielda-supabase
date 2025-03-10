"use client";

import { Suspense } from "react";
import TransportsList from "@/components/transports/TransportsList";
import TransportsFilter from "@/components/transports/TransportsFilter";
import type { Transport, Tag } from "@/types/transport.types";

interface TransportPageProps {
	categories: Tag[];
	vehicles: Tag[];
	initialTransports: Transport[];
}

// Client-side wrapper dla strony głównej
export default function TransportPageWrapper({
	categories,
	vehicles,
	initialTransports,
}: TransportPageProps) {
	return (
		<div className="w-full pt-36">
			<h1 className="text-2xl font-bold mb-6 sr-only">
				Giełda transportowa Fenilo
			</h1>

			{/* TransportsFilter zawiera już rendering TransportsList, 
          ale musimy przekazać initialTransports do TransportsList */}
			<Suspense fallback={<div>Ładowanie...</div>}>
				{/* Rozwiązanie polega na modyfikacji komponentu TransportsFilter, 
            który przekaże initialTransports do TransportsList wewnątrz siebie */}
				<TransportsFilter
					categories={categories}
					vehicles={vehicles}
					initialTransports={initialTransports}
				/>
			</Suspense>
		</div>
	);
}
