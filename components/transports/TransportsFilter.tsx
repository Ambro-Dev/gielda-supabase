"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/DatePicker";
import { FilterX, Search, SlidersHorizontal } from "lucide-react";
import { useFiltersStore } from "@/stores/filters-store";
import { useCategories, useVehicles } from "@/hooks/use-categories-vehicles"; // Używamy istniejących hooków!
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import TransportsList from "./TransportsList";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Tag, Transport } from "@/types/transport.types";

interface TransportsFilterProps {
	categories?: Tag[];
	vehicles?: Tag[];
	initialTransports?: Transport[];
}

export default function TransportsFilter({
	categories: initialCategories,
	vehicles: initialVehicles,
	initialTransports,
}: TransportsFilterProps) {
	const isMobile = useIsMobile();
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);

	// Pobierz kategorie i pojazdy z hooków jeśli nie przekazano jako props
	const { data: categoriesData, isLoading: categoriesLoading } =
		useCategories();
	const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();

	// Użyj danych przekazanych jako props (SSR) lub pobranych z hooków (CSR)
	const categories = initialCategories || (categoriesData as Tag[]) || [];
	const vehicles = initialVehicles || (vehiclesData as Tag[]) || [];

	// Get filters and actions from store
	const {
		categoryId,
		vehicleId,
		dateFrom,
		dateTo,
		searchTerm,
		sortBy,
		sortDirection,
		setCategory,
		setVehicle,
		setDateRange,
		setSearchTerm,
		setSorting,
		resetFilters,
	} = useFiltersStore();

	// Search input state
	const [search, setSearch] = useState(searchTerm || "");

	// Local date states for the date pickers
	const [fromDate, setFromDate] = useState<Date | undefined>(
		dateFrom ? new Date(dateFrom) : undefined,
	);
	const [toDate, setToDate] = useState<Date | undefined>(
		dateTo ? new Date(dateTo) : undefined,
	);

	// Apply filters and close sheet on mobile
	const applyFilters = () => {
		// Update store with local state values
		setSearchTerm(search || null);
		setDateRange(fromDate || null, toDate || null);

		// Close filters sheet on mobile
		if (isMobile) {
			setIsFiltersOpen(false);
		}
	};

	// Clear all filters
	const clearFilters = () => {
		resetFilters();
		setSearch("");
		setFromDate(undefined);
		setToDate(undefined);
	};

	// Count active filters
	const activeFiltersCount = [
		categoryId,
		vehicleId,
		fromDate,
		toDate,
		searchTerm,
	].filter(Boolean).length;

	// Filter content shared between desktop and mobile views
	const filterContent = (
		<div className="space-y-4">
			<div className="flex flex-col space-y-2">
				<Label htmlFor="search">Szukaj w opisie</Label>
				<div className="flex space-x-2">
					<Input
						id="search"
						placeholder="Wpisz fragment opisu..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Button type="button" onClick={applyFilters} variant="secondary">
						<Search className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="category">Kategoria</Label>
					<Select
						value={categoryId || "all"}
						onValueChange={(value) =>
							setCategory(value === "all" ? null : value)
						}
					>
						<SelectTrigger id="category">
							<SelectValue placeholder="Wybierz kategorię" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Wszystkie kategorie</SelectItem>
							{categories.map((category) => (
								<SelectItem key={category.id} value={category.id}>
									{category.name} ({category._count?.transports || 0})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="vehicle">Pojazd</Label>
					<Select
						value={vehicleId || "all"}
						onValueChange={(value) =>
							setVehicle(value === "all" ? null : value)
						}
					>
						<SelectTrigger id="vehicle">
							<SelectValue placeholder="Wybierz pojazd" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Wszystkie pojazdy</SelectItem>
							{vehicles.map((vehicle) => (
								<SelectItem key={vehicle.id} value={vehicle.id}>
									{vehicle.name} ({vehicle._count?.transports || 0})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="dateFrom">Data od</Label>
					<DatePicker selectedDay={fromDate} onChange={setFromDate} />
				</div>

				<div className="space-y-2">
					<Label htmlFor="dateTo">Data do</Label>
					<DatePicker selectedDay={toDate} onChange={setToDate} />
				</div>
			</div>

			<div className="flex justify-between pt-2">
				<Button
					type="button"
					onClick={clearFilters}
					variant="outline"
					className="gap-2"
				>
					<FilterX className="h-4 w-4" />
					Wyczyść filtry
				</Button>

				<Button type="button" onClick={applyFilters} variant="default">
					Zastosuj filtry
				</Button>
			</div>
		</div>
	);

	// Mobile view uses Sheet component
	if (isMobile) {
		return (
			<div className="space-y-4">
				<div className="flex w-full justify-between">
					<div className="flex items-center gap-2">
						<Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
							<SheetTrigger asChild>
								<Button variant="outline" className="gap-2">
									<SlidersHorizontal className="h-4 w-4" />
									Filtry
									{activeFiltersCount > 0 && (
										<span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
											{activeFiltersCount}
										</span>
									)}
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-[300px] sm:w-[400px]">
								<SheetHeader>
									<SheetTitle>Filtry transportów</SheetTitle>
								</SheetHeader>
								<div className="py-4">{filterContent}</div>
							</SheetContent>
						</Sheet>
					</div>

					<Select
						value={`${sortBy || "date"}-${sortDirection}`}
						onValueChange={(value) => {
							const [sort, direction] = value.split("-");
							setSorting(
								sort as "date" | "price" | "distance" | null,
								direction as "asc" | "desc",
							);
						}}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Sortowanie" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="date-desc">Najnowsze</SelectItem>
							<SelectItem value="date-asc">Najstarsze</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<TransportsList initialTransports={initialTransports} />
			</div>
		);
	}

	// Desktop view
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Filtry transportów</span>
						<Select
							value={`${sortBy || "date"}-${sortDirection}`}
							onValueChange={(value) => {
								const [sort, direction] = value.split("-");
								setSorting(
									sort as "date" | "price" | "distance" | null,
									direction as "asc" | "desc",
								);
							}}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Sortowanie" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="date-desc">Najnowsze</SelectItem>
								<SelectItem value="date-asc">Najstarsze</SelectItem>
							</SelectContent>
						</Select>
					</CardTitle>
				</CardHeader>
				<CardContent>{filterContent}</CardContent>
			</Card>

			<Separator />

			<TransportsList initialTransports={initialTransports} />
		</div>
	);
}
