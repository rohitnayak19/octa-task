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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Trash2, Edit, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";

function CallSchedule() {
    const { currentUser } = useAuth();
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

    const [filter, setFilter] = useState("all");
    const [editId, setEditId] = useState(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isOtherBusiness, setIsOtherBusiness] = useState(false);



    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Fetch calls
    const fetchCalls = async () => {
        try {
            const callsRef = collection(db, "calls");
            const snapshot = await getDocs(query(callsRef, orderBy("date", "asc")));
            const list = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((c) => c.userId === currentUser.uid);
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
        if (!campaign || !businessType || !ownerName || !date) {
            toast.error("⚠️ Campaign, Business Type, Owner Name, Date required");
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
                    date,
                });
                toast.success("Lead updated");
            } else {
                await addDoc(collection(db, "calls"), {
                    userId: currentUser.uid,
                    campaign,
                    businessType,
                    ownerName,
                    ownerContact,
                    status,
                    serviceFollowUpDate,
                    sourceOfLead,
                    date,
                    createdAt: new Date(),
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
            toast.success("🗑️ Lead deleted");
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

    return (
        <>
            <Navbar />
            <div className="space-y-6 p-4 max-w-7xl mx-auto">
                {/* Filters */}
                <div className="flex gap-2">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        onClick={() => setFilter("all")}
                    >
                        All <Badge className="ml-2">{calls.length}</Badge>
                    </Button>
                    <Button
                        variant={filter === "today" ? "default" : "outline"}
                        onClick={() => setFilter("today")}
                        className="flex items-center gap-2"
                    >
                        Today
                        {todayCount > 0 && (
                            <Badge className="bg-red-600 text-white">{todayCount}</Badge>
                        )}
                    </Button>
                    <Button
                        variant={filter === "tomorrow" ? "default" : "outline"}
                        onClick={() => setFilter("tomorrow")}
                        className="flex items-center gap-2"
                    >
                        Tomorrow
                        {tomorrowCount > 0 && (
                            <Badge className="bg-blue-600 text-white">{tomorrowCount}</Badge>
                        )}
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between gap-2">
                    <Input
                        placeholder="Search leads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
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
                                <Button className="flex items-center gap-2">
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
                                        <Button onClick={handleSave}>
                                            {editId ? "Update" : "Save"}
                                        </Button>
                                        {editId && (
                                            <Button variant="outline" onClick={resetForm}>
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
                                            <TableCell>{c.sourceOfLead}</TableCell>
                                            <TableCell>
                                                {c.date?.seconds
                                                    ? format(new Date(c.date.seconds * 1000), "PPP")
                                                    : format(new Date(c.date), "PPP")}
                                            </TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button
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
                                                        setOpen(true);
                                                    }}
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(c.id)}
                                                >
                                                    <Trash2 size={16} stroke="red" />
                                                </Button>
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
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <PaginationItem key={i}>
                                            <PaginationLink
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
                                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export default CallSchedule;
