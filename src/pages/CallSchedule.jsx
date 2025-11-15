import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Trash2, Edit, Plus, FileText,CalendarDays, Search, Download } from "lucide-react";
import { format, set } from "date-fns";
import toast from "react-hot-toast";
import { subDays, subMonths, subYears, isWithinInterval } from "date-fns";
import Navbar from "../components/Navbar";
import { useParams } from "react-router-dom";


function CallSchedule() {
    const { userId } = useParams()
    const { role, currentUser } = useAuth();
    const [calls, setCalls] = useState([]);
    // CRM fields
    const [campaign, setCampaign] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [ownerContact, setOwnerContact] = useState("");
    const [status, setStatus] = useState("");
    const [serviceFollowUpDate, setServiceFollowUpDate] = useState(null);
    const [sourceOfLead, setSourceOfLead] = useState("");
    const [date, setDate] = useState(null);
    const [customDate, setCustomDate] = useState(null);
    const [note, setNote] = useState("");

    const [filter, setFilter] = useState("all");
    const [editId, setEditId] = useState(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isOtherBusiness, setIsOtherBusiness] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [statusRange, setStatusRange] = useState("7d");
    const [statusCustomRange, setStatusCustomRange] = useState({ start: null, end: null });

    const [businessRange, setBusinessRange] = useState("1m");
    const [businessCustomRange, setBusinessCustomRange] = useState({ start: null, end: null });


    // Fetch calls
    const fetchCalls = async () => {
        try {
            const targetUserId = role === "admin" && userId ? userId : currentUser?.uid;
            const callsRef = collection(db, "calls");
            const snapshot = await getDocs(query(callsRef, orderBy("date", "asc")));
            const list = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((c) => c.userId === targetUserId);
            setCalls(list);
        } catch (e) {
            console.error("Error fetching calls:", e);
        }
    };


    useEffect(() => {
        fetchCalls();
    }, []);

    // Add / Update
    const handleSave = async () => {
        const finalDate = date ? date : new Date();
        if (!campaign || !businessType || !ownerName) {
            toast.error("Campaign, Business Type, Owner Name, Date required");
            return;
        }

        // ✅ Mobile number validation
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!ownerContact || !phoneRegex.test(ownerContact)) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }

        try {
            if (editId) {
                const ref = doc(db, "calls", editId);
                await updateDoc(ref, {
                    campaign,
                    businessType,
                    ownerName,
                    ownerContact,
                    status,
                    serviceFollowUpDate,
                    sourceOfLead,
                    date: finalDate,
                    note,
                });
                toast.success("Lead updated");
            } else {
                await addDoc(collection(db, "calls"), {
                    userId: role === "admin" && userId ? userId : currentUser.uid,
                    campaign,
                    businessType,
                    ownerName,
                    ownerContact,
                    status,
                    serviceFollowUpDate,
                    sourceOfLead,
                    date: finalDate,
                    createdAt: new Date(),
                    note,
                });

                toast.success("Lead added");
            }
            resetForm();
            fetchCalls();
            setOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save lead");
        }
    };

    // Delete
    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "calls", id));
            toast.success("Lead deleted");
            fetchCalls();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete");
        }
    };

    const resetForm = () => {
        setCampaign("");
        setBusinessType("");
        setOwnerName("");
        setOwnerContact("");
        setStatus("");
        setServiceFollowUpDate(null);
        setSourceOfLead("");
        setDate(null);
        setNote("");
        setEditId(null);
    };

    // Counts for Today/Tomorrow
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayCount = calls.filter((c) => {
        const callDate = new Date(c.date?.seconds ? c.date.seconds * 1000 : c.date);
        return callDate.toDateString() === today.toDateString();
    }).length;

    const tomorrowCount = calls.filter((c) => {
        const callDate = new Date(c.date?.seconds ? c.date.seconds * 1000 : c.date);
        return callDate.toDateString() === tomorrow.toDateString();
    }).length;

    // Filter + Search
    const filteredCalls = calls
        .filter((c) => {
            if (filter === "all") return true;
            const callDate = new Date(c.date?.seconds ? c.date.seconds * 1000 : c.date);
            if (filter === "today") {
                return callDate.toDateString() === today.toDateString();
            }
            if (filter === "tomorrow") {
                return callDate.toDateString() === tomorrow.toDateString();
            }
            if (filter === "custom" && customDate) {
                return callDate.toDateString() === customDate.toDateString();
            }
            return true;
        })
        .filter((c) => {
            const q = search.toLowerCase();
            return (
                (c.campaign || "").toLowerCase().includes(q) ||
                (c.businessType || "").toLowerCase().includes(q) ||
                (c.ownerName || "").toLowerCase().includes(q) ||
                (c.ownerContact || "").toLowerCase().includes(q) ||
                (c.status || "").toLowerCase().includes(q) ||
                (c.sourceOfLead || "").toLowerCase().includes(q)
            );
        })
        .filter((c) => {
            if (statusFilter === "all") return true;
            return c.status === statusFilter;
        });

    // Pagination
    const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
    const paginatedCalls = filteredCalls.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const filterByRange = (calls, range, customRange) => {
        const now = new Date();
        return calls.filter((c) => {
            const callDate = new Date(c.date?.seconds ? c.date.seconds * 1000 : c.date);

            if (range === "7d") return callDate >= subDays(now, 7);
            if (range === "1m") return callDate >= subMonths(now, 1);
            if (range === "1y") return callDate >= subYears(now, 1);

            if (
                range === "custom" &&
                customRange &&
                customRange.start &&
                customRange.end
            ) {
                return isWithinInterval(callDate, {
                    start: customRange.start,
                    end: customRange.end,
                });
            }

            return true; // fallback if no filter
        });
    };

    const filteredStatusCalls = filterByRange(calls, statusRange, statusCustomRange);
    const filteredBusinessCalls = filterByRange(calls, businessRange, businessCustomRange);


    return (
        <>
            <Navbar />
            <div className="space-y-6 p-4 max-w-8xl mx-auto">
                {/* Filters */}
                <div className="flex gap-3">
                    {/* All */}
                    <Button
                        onClick={() => setFilter("all")}
                        variant={filter === "all" ? "default" : "outline"}
                        className={`cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl shadow-sm 
            ${filter === "all" ? "bg-black text-white" : "bg-white"}`}
                    >
                        All
                        <Badge className="ml-1 bg-gray-900 text-white px-2 py-0.5 rounded-full">
                            {calls.length}
                        </Badge>
                    </Button>

                    {/* Today */}
                    <Button
                        onClick={() => setFilter("today")}
                        variant={filter === "today" ? "default" : "outline"}
                        className={`cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl shadow-sm
            ${filter === "today" ? "bg-red-600 text-white" : "bg-white"}`}
                    >
                        Today
                        <Badge
                            className="ml-1 bg-red-600 text-white px-2 py-0.5 rounded-full shadow-sm"
                        >
                            {todayCount}
                        </Badge>
                    </Button>

                    {/* Tomorrow */}
                    <Button
                        onClick={() => setFilter("tomorrow")}
                        variant={filter === "tomorrow" ? "default" : "outline"}
                        className={`cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl shadow-sm
            ${filter === "tomorrow" ? "bg-blue-600 text-white" : "bg-white"}`}
                    >
                        Tomorrow
                        <Badge
                            className="ml-1 bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm"
                        >
                            {tomorrowCount}
                        </Badge>
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={filter === "custom" ? "default" : "outline"}
                                onClick={() => setFilter("custom")}
                                className={`cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl shadow-sm
                ${filter === "custom" ? "bg-green-600 text-white" : "bg-white"}`}
                            >
                               <CalendarDays/> {customDate ? format(customDate, "PPP") : "Pick Date"}
                            </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={customDate}
                                onSelect={(d) => {
                                    setCustomDate(d);
                                    setFilter("custom");
                                }}
                            />
                        </PopoverContent>
                    </Popover>

                </div>
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />

                        <Input
                            placeholder="Search leads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 py-2 rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-1">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="New Lead">New Lead</SelectItem>
                                <SelectItem value="Interested">Interested</SelectItem>
                                <SelectItem value="Follow Up">Follow Up</SelectItem>
                                <SelectItem value="Service Follow Up">Service Follow Up</SelectItem>
                                <SelectItem value="Converted">Converted</SelectItem>
                                <SelectItem value="Not Interested">Not Interested</SelectItem>
                                <SelectItem value="Call Not Connected">Call Not Connected</SelectItem>
                            </SelectContent>
                        </Select>

                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()} className="flex items-center gap-2 cursor-pointer">
                                    <Plus size={16} /> Add Lead
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editId ? "Edit Lead" : "New Lead"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                    <Input
                                        placeholder="Campaign"
                                        value={campaign}
                                        onChange={(e) => setCampaign(e.target.value)}
                                    />

                                    {/* Business Type with Other */}
                                    <Select
                                        onValueChange={(val) => {
                                            if (val === "other") {
                                                setIsOtherBusiness(true);
                                                setBusinessType("");
                                            } else {
                                                setIsOtherBusiness(false);
                                                setBusinessType(val);
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={businessType || "Business Type"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bakery">Bakery</SelectItem>
                                            <SelectItem value="Car Showroom">Car Showroom</SelectItem>
                                            <SelectItem value="Restaurant">Restaurant</SelectItem>
                                            <SelectItem value="Food Truck">Food Truck</SelectItem>
                                            <SelectItem value="Specialty Café">Specialty Café</SelectItem>
                                            <SelectItem value="Cloud Kitchen">Cloud Kitchen</SelectItem>
                                            <SelectItem value="Boutique Clothing Store">Boutique Clothing Store</SelectItem>
                                            <SelectItem value="Home Décor & Furnishing Shop">Home Décor & Furnishing Shop</SelectItem>
                                            <SelectItem value="Fitness Studio">Fitness Studio</SelectItem>
                                            <SelectItem value="Car Wash & Detailing Service">Car Wash & Detailing Service</SelectItem>
                                            <SelectItem value="Event Planning & Catering">Event Planning & Catering</SelectItem>
                                            <SelectItem value="Pet Grooming & Boarding">Pet Grooming & Boarding</SelectItem>
                                            <SelectItem value="E-commerce Store">E-commerce Store</SelectItem>
                                            <SelectItem value="Digital Marketing Agency">Digital Marketing Agency</SelectItem>
                                            <SelectItem value="Coworking Space">Coworking Space</SelectItem>
                                            <SelectItem value="Organic Farm-to-Table Store">Organic Farm-to-Table Store</SelectItem>
                                            <SelectItem value="Recycling & Upcycling Business">Recycling & Upcycling Business</SelectItem>
                                            <SelectItem value="EV Charging Station">EV Charging Station</SelectItem>
                                            <SelectItem value="Bed & Breakfast">Bed & Breakfast</SelectItem>
                                            <SelectItem value="Theme Café / Restaurant">Theme Café / Restaurant</SelectItem>
                                            <SelectItem value="Travel Agency">Travel Agency</SelectItem>
                                            <SelectItem value="Spa & Wellness Center">Spa & Wellness Center</SelectItem>
                                            <SelectItem value="Nutrition & Diet Consultancy">Nutrition & Diet Consultancy</SelectItem>
                                            <SelectItem value="Pharmacy & Health Store">Pharmacy & Health Store</SelectItem>
                                            <SelectItem value="Tutoring / Coaching Center">Tutoring / Coaching Center</SelectItem>
                                            <SelectItem value="Skill Development Workshops">Skill Development Workshops</SelectItem>
                                            <SelectItem value="Daycare / Montessori">Daycare / Montessori</SelectItem>
                                            <SelectItem value="Mobile App Development">Mobile App Development</SelectItem>
                                            <SelectItem value="IT Support & Cybersecurity">IT Support & Cybersecurity</SelectItem>
                                            <SelectItem value="Smart Home Solutions">Smart Home Solutions</SelectItem>
                                            <SelectItem value="Solar Panel Installation">Solar Panel Installation</SelectItem>
                                            <SelectItem value="Organic Skincare Brand">Organic Skincare Brand</SelectItem>
                                            <SelectItem value="Urban Farming / Hydroponics">Urban Farming / Hydroponics</SelectItem>
                                            <SelectItem value="Podcast / YouTube Studio">Podcast / YouTube Studio</SelectItem>
                                            <SelectItem value="Photography & Videography">Photography & Videography</SelectItem>
                                            <SelectItem value="Game Zone / VR Arcade">Game Zone / VR Arcade</SelectItem>
                                            <SelectItem value="Courier & Delivery Service">Courier & Delivery Service</SelectItem>
                                            <SelectItem value="Bike / Car Rental">Bike / Car Rental</SelectItem>
                                            <SelectItem value="Shared Mobility">Shared Mobility</SelectItem>
                                            <SelectItem value="other">Other (Add New)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {isOtherBusiness && (
                                        <Input
                                            placeholder="Enter Business Type"
                                            value={businessType}
                                            onChange={(e) => setBusinessType(e.target.value)}
                                        />
                                    )}


                                    <Input
                                        placeholder="Owner Name"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Owner Contact"
                                        value={ownerContact}
                                        onChange={(e) => setOwnerContact(e.target.value)}
                                    />

                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="New Lead">New Lead</SelectItem>
                                            <SelectItem value="Interested">Interested</SelectItem>
                                            <SelectItem value="Follow Up">Follow Up</SelectItem>
                                            <SelectItem value="Service Follow Up">Service Follow Up</SelectItem>
                                            <SelectItem value="Converted">Converted</SelectItem>
                                            <SelectItem value="Not Interested">Not Interested</SelectItem>
                                            <SelectItem value="Call Not Connected">Call Not Connected</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Service Follow Up Date */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="justify-start">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {serviceFollowUpDate
                                                    ? format(serviceFollowUpDate, "PPP")
                                                    : "Service Follow Up Date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent>
                                            <Calendar
                                                mode="single"
                                                selected={serviceFollowUpDate}
                                                onSelect={setServiceFollowUpDate}
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Input
                                        placeholder="Source of Lead"
                                        value={sourceOfLead}
                                        onChange={(e) => setSourceOfLead(e.target.value)}
                                    />

                                    <Textarea
                                        placeholder="Type what you discussed with the lead..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="mt-1"
                                    />

                                    {/* Main Date */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="justify-start">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, "PPP") : "Pick a date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent>
                                            <Calendar mode="single" selected={date} onSelect={setDate} />
                                        </PopoverContent>
                                    </Popover>

                                    <div className="flex gap-2">
                                        <Button onClick={handleSave} className="cursor-pointer">
                                            {editId ? "Update" : "Save"}
                                        </Button>
                                        {editId && (
                                            <Button className="cursor-pointer" variant="outline" onClick={resetForm}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Leads</CardTitle>
                        <CardDescription>Manage and track your business leads</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Campaign</TableHead>
                                        <TableHead>Business Type</TableHead>
                                        <TableHead>Owner name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Follow Up</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedCalls.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.campaign}</TableCell>
                                            <TableCell>{c.businessType}</TableCell>
                                            <TableCell>{c.ownerName}</TableCell>
                                            <TableCell>{c.ownerContact}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`${c.status === "New Lead"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : c.status === "Converted"
                                                            ? "bg-green-100 text-green-800"
                                                            : c.status === "Interested"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : c.status === "Follow Up"
                                                                    ? "bg-orange-100 text-orange-800"
                                                                    : c.status === "Service Follow Up"
                                                                        ? "bg-violet-100 text-violet-800"
                                                                        : c.status === "Call Not Connected"
                                                                            ? "bg-red-100 text-red-800"
                                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {c.serviceFollowUpDate
                                                    ? format(new Date(c.serviceFollowUpDate.seconds * 1000), "PPP")
                                                    : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {c.sourceOfLead ? (
                                                    c.sourceOfLead.match(/(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i) ? (
                                                        <a
                                                            href={
                                                                c.sourceOfLead.startsWith("http")
                                                                    ? c.sourceOfLead
                                                                    : `https://${c.sourceOfLead.replace(/^\/+/, "")}`
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition`}
                                                        >
                                                            {c.sourceOfLead.includes("instagram")
                                                                ? "Instagram"
                                                                : c.sourceOfLead.includes("facebook")
                                                                    ? "Facebook"
                                                                    : c.sourceOfLead.includes("youtube")
                                                                        ? "YouTube"
                                                                        : "Source"}
                                                        </a>
                                                    ) : (
                                                        c.sourceOfLead
                                                    )
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {c.date?.seconds
                                                    ? format(new Date(c.date.seconds * 1000), "PPP")
                                                    : format(new Date(c.date), "PPP")}
                                            </TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="xs" className="text-blue-600 py-1 px-2">
                                                            <FileText /> See Note
                                                        </Button>
                                                    </DialogTrigger>

                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Lead Notes</DialogTitle>
                                                        </DialogHeader>

                                                        <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                                                            {c.note ? c.note : "No notes added."}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>

                                            <TableCell className="flex gap-2">
                                                <Button
                                                    className="cursor-pointer"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditId(c.id);
                                                        setCampaign(c.campaign || "");
                                                        setBusinessType(c.businessType || "");
                                                        setOwnerName(c.ownerName || "");
                                                        setOwnerContact(c.ownerContact || "");
                                                        setStatus(c.status || "");
                                                        setServiceFollowUpDate(
                                                            c.serviceFollowUpDate?.seconds
                                                                ? new Date(c.serviceFollowUpDate.seconds * 1000)
                                                                : null
                                                        );
                                                        setSourceOfLead(c.sourceOfLead || "");
                                                        setDate(new Date(c.date?.seconds ? c.date.seconds * 1000 : c.date));
                                                        setNote(c.note || "");
                                                        setOpen(true);
                                                    }}
                                                >
                                                    <Edit size={16} className="text-neutral-700" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button className={'cursor-pointer'} size="sm" variant="outline">
                                                            <Trash2 size={16} stroke="red" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure you want to delete this?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. It will permanently remove this item from your list.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(c.id)}
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-2 py-3">
                            <div className="text-sm text-muted-foreground">
                                Showing {(currentPage - 1) * itemsPerPage + 1}–
                                {Math.min(currentPage * itemsPerPage, filteredCalls.length)} of{" "}
                                {filteredCalls.length} results
                            </div>
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                className={"cursor-pointer"}
                                                onClick={() => setCurrentPage(i + 1)}
                                                isActive={currentPage === i + 1}
                                            >
                                                {i + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>

                {/* Charts Section */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie Chart by Status */}
                    <Card>
                        <div className="flex flex-wrap gap-3 mb-4 ml-5">

                            {/* Last 7 Days */}
                            <Button
                                variant={statusRange === "7d" ? "default" : "outline"}
                                className={`rounded-xl px-4 py-2 shadow-sm 
            ${statusRange === "7d" ? "bg-black text-white" : ""}
        `}
                                onClick={() => setStatusRange("7d")}
                            >
                                Last 7 Days
                            </Button>

                            {/* Last 1 Month */}
                            <Button
                                variant={statusRange === "1m" ? "default" : "outline"}
                                className={`rounded-xl px-4 py-2 shadow-sm 
            ${statusRange === "1m" ? "bg-black text-white" : ""}
        `}
                                onClick={() => setStatusRange("1m")}
                            >
                                Last 1 Month
                            </Button>

                            {/* Last 1 Year */}
                            <Button
                                variant={statusRange === "1y" ? "default" : "outline"}
                                className={`rounded-xl px-4 py-2 shadow-sm 
            ${statusRange === "1y" ? "bg-black text-white" : ""}
        `}
                                onClick={() => setStatusRange("1y")}
                            >
                                Last 1 Year
                            </Button>

                            {/* Custom Range */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={statusRange === "custom" ? "default" : "outline"}
                                        className={`rounded-xl px-4 py-2 shadow-sm flex items-center gap-2
                    ${statusRange === "custom" ? "bg-black text-white" : ""}
                `}
                                    >
                                        {statusCustomRange?.start && statusCustomRange?.end
                                            ? `${format(statusCustomRange.start, "MMM d")} - ${format(
                                                statusCustomRange.end,
                                                "MMM d, yyyy"
                                            )}`
                                            : "Custom Range"}
                                    </Button>
                                </PopoverTrigger>

                                <PopoverContent className="p-3 rounded-xl shadow-xl border bg-white">
                                    <Calendar
                                        mode="range"
                                        selected={statusCustomRange}
                                        onSelect={(range) => {
                                            setStatusCustomRange(range);
                                            setStatusRange("custom");
                                        }}
                                        className="rounded-xl"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <CardHeader>
                            <CardTitle>Leads by Status</CardTitle>
                            <CardDescription>Distribution of leads</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={Object.entries(
                                            filteredStatusCalls.reduce((acc, c) => {
                                                acc[c.status] = (acc[c.status] || 0) + 1;
                                                return acc;
                                            }, {})
                                        ).map(([status, value]) => ({ name: status, value }))}

                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50} // makes it a donut
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            `${name}: ${(percent * 100).toFixed(0)}%`
                                        }
                                    >
                                        {[
                                            "#60a5fa", // blue
                                            "#4ade80", // green
                                            "#facc15", // yellow
                                            "#f97316", // orange
                                            "#a78bfa", // purple
                                            "#f87171", // red
                                            "#94a3b8", // gray
                                        ].map((color, index) => (
                                            <Cell key={`cell-${index}`} fill={color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        className={'text-[2px'}
                                        formatter={(value, name) => [`${value} Leads`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legends */}
                            <div className="flex flex-wrap gap-3 justify-start mt-4">
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">Converted</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">Not Interested</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">Interested</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">Follow Up</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">Service Follow Up</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">New Lead</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 border rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                    <span className="text-xs text-neutral-700 font-semibold">Call Not Connected</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {/* Bar Chart by Business Type */}
                    <Card>
                        <CardHeader>
                            {/* Filter Buttons */}
                            <div className="flex flex-wrap gap-3 mb-4">

                                {/* Last 7 Days */}
                                <Button
                                    variant={businessRange === "7d" ? "default" : "outline"}
                                    className={`rounded-xl px-4 py-2 shadow-sm
            ${businessRange === "7d" ? "bg-black text-white" : ""}
        `}
                                    onClick={() => setBusinessRange("7d")}
                                >
                                    Last 7 Days
                                </Button>

                                {/* Last 1 Month */}
                                <Button
                                    variant={businessRange === "1m" ? "default" : "outline"}
                                    className={`rounded-xl px-4 py-2 shadow-sm
            ${businessRange === "1m" ? "bg-black text-white" : ""}
        `}
                                    onClick={() => setBusinessRange("1m")}
                                >
                                    Last 1 Month
                                </Button>

                                {/* Last 1 Year */}
                                <Button
                                    variant={businessRange === "1y" ? "default" : "outline"}
                                    className={`rounded-xl px-4 py-2 shadow-sm
            ${businessRange === "1y" ? "bg-black text-white" : ""}
        `}
                                    onClick={() => setBusinessRange("1y")}
                                >
                                    Last 1 Year
                                </Button>

                                {/* Custom Range */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={businessRange === "custom" ? "default" : "outline"}
                                            className={`rounded-xl px-4 py-2 shadow-sm flex items-center gap-2
                    ${businessRange === "custom" ? "bg-black text-white" : ""}
                `}
                                        >
                                            {businessCustomRange?.start && businessCustomRange?.end
                                                ? `${format(businessCustomRange.start, "MMM d")} - ${format(
                                                    businessCustomRange.end,
                                                    "MMM d, yyyy"
                                                )}`
                                                : "Custom Range"}
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="p-3 rounded-xl shadow-xl border bg-white">
                                        <Calendar
                                            mode="range"
                                            selected={businessCustomRange}
                                            onSelect={(range) => {
                                                setBusinessCustomRange(range);
                                                setBusinessRange("custom");
                                            }}
                                            className="rounded-xl"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <CardTitle>Leads by Business Type</CardTitle>
                            <CardDescription>Comparison across businesses</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Chart */}
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    data={Object.entries(
                                        filteredBusinessCalls.reduce((acc, c) => {
                                            acc[c.businessType] = (acc[c.businessType] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).map(([type, value]) => ({ name: type, value }))}
                                    margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-25}
                                        textAnchor="end"
                                        interval={0}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                                        formatter={(value) => [`${value} Leads`, ""]}
                                        contentStyle={{
                                            backgroundColor: "white",
                                            borderRadius: "8px",
                                            border: "1px solid #e5e7eb",
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                        {Object.entries(
                                            filteredBusinessCalls.reduce((acc, c) => {
                                                acc[c.businessType] = (acc[c.businessType] || 0) + 1;
                                                return acc;
                                            }, {})
                                        ).map(([type], index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={[
                                                    "#3b82f6", // blue
                                                    "#f97316", // orange
                                                    "#22c55e", // green
                                                    "#a855f7", // purple
                                                    "#eab308", // yellow
                                                    "#ef4444", // red
                                                    "#06b6d4", // cyan
                                                ][index % 7]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

export default CallSchedule;
