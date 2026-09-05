"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Homeowner, HouseholdMember, OwnershipType, GenderType, RecordStatus } from "@/types/database";
import { calculateAge, isValidEmail, isValidPhilippineMobile, formatPhilippineMobile } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { HomeownerSchema } from "@/lib/validations/schemas";
import {
  Plus,
  Trash2,
  User,
  Users,
  Shield,
  Phone,
  PawPrint,
  Calendar,
  Sparkles,
  CheckCircle2,
  MapPin,
  Heart,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface HomeownerFormProps {
  initialData?: Homeowner;
  onSubmit: (
    data: Omit<Homeowner, "id" | "created_at" | "updated_at">,
    members: Omit<HouseholdMember, "id" | "homeowner_id">[]
  ) => Promise<{ success: boolean; error?: string }>;
  isEditing?: boolean;
}

export function HomeownerForm({ initialData, onSubmit, isEditing = false }: HomeownerFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Owner Info
  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [ownershipType, setOwnershipType] = useState<OwnershipType>(initialData?.ownership_type || "Owner");
  const [gender, setGender] = useState<GenderType>(initialData?.gender || "Male");
  const [birthdate, setBirthdate] = useState(initialData?.birthdate || "");
  const [age, setAge] = useState<number>(initialData?.age ?? (initialData?.birthdate ? calculateAge(initialData.birthdate) : 0));
  const [address, setAddress] = useState(initialData?.address || "");
  const [status, setStatus] = useState<RecordStatus>(initialData?.status || "Active");

  // Block & Lot Helper
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedLot, setSelectedLot] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");

  // 2. Household Info
  const [householdCount, setHouseholdCount] = useState<number>(initialData?.household_count || 1);
  const [members, setMembers] = useState<Omit<HouseholdMember, "id" | "homeowner_id">[]>(
    initialData?.household_members?.map((m) => ({
      member_name: m.member_name,
      relationship: m.relationship,
    })) || []
  );

  // 3. GA Proxy
  const [gaProxyName, setGaProxyName] = useState(initialData?.ga_proxy_name || "");
  const [gaProxyRelationship, setGaProxyRelationship] = useState(initialData?.ga_proxy_relationship || "");

  // 4. Contact Info
  const [contactMobile, setContactMobile] = useState(initialData?.contact_mobile || "");
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || "");

  // 5. Pets
  const [petCount, setPetCount] = useState<number>(initialData?.pet_count || 0);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse existing address into Block & Lot if applicable
  useEffect(() => {
    if (initialData?.address) {
      const match = initialData.address.match(/Block\s+(\d+)\s+Lot\s+(\d+)/i);
      if (match) {
        setSelectedBlock(match[1]);
        setSelectedLot(match[2]);
      }
    }
  }, [initialData]);

  // Reactive age calculation
  useEffect(() => {
    if (birthdate) {
      const calculated = calculateAge(birthdate);
      setAge(calculated);
    } else {
      setAge(0);
    }
  }, [birthdate]);

  // Sync Block & Lot into address field if using the assistant
  const applyBlockLot = () => {
    if (selectedBlock && selectedLot) {
      const formatted = `Block ${selectedBlock} Lot ${selectedLot}${
        streetAddress ? `, ${streetAddress}` : ""
      }, St. Joseph Village 6 Phase 4`;
      setAddress(formatted);
    }
  };

  // Household Member management
  const addMemberRow = () => {
    setMembers((prev) => {
      const next = [...prev, { member_name: "", relationship: "Spouse" }];
      setHouseholdCount(1 + next.length);
      return next;
    });
  };

  const removeMemberRow = (index: number) => {
    setMembers((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setHouseholdCount(1 + next.length);
      return next;
    });
  };

  const updateMemberRow = (index: number, field: "member_name" | "relationship", value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const moveMember = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;
    setMembers((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setMembers((prev) => {
      const copy = [...prev];
      const draggedItem = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(index, 0, draggedItem);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const isMobileValid = contactMobile ? isValidPhilippineMobile(contactMobile) : true;
  const isSenior = age >= 60;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    }
    if (!birthdate) {
      newErrors.birthdate = "Birthdate is required";
    }
    if (!address.trim()) {
      newErrors.address = "Address (Block & Lot) in Phase 4 is required";
    }
    if (contactEmail && !isValidEmail(contactEmail)) {
      newErrors.contactEmail = "Please enter a valid email address";
    }
    if (contactMobile && !isValidPhilippineMobile(contactMobile)) {
      newErrors.contactMobile = "Please enter a valid 11-digit mobile (e.g. 0917-123-4567)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toastError("Validation", "Please correct the highlighted fields before proceeding.");
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredMembers = members.filter((m) => m.member_name.trim().length > 0);

      const res = await onSubmit(
        {
          full_name: fullName.trim(),
          ownership_type: ownershipType,
          gender,
          birthdate,
          age,
          address: address.trim(),
          household_count: Math.max(1, householdCount),
          contact_mobile: contactMobile.trim(),
          contact_email: contactEmail.trim(),
          pet_count: Math.max(0, petCount),
          ga_proxy_name: gaProxyName.trim() || undefined,
          ga_proxy_relationship: gaProxyRelationship.trim() || undefined,
          status,
        },
        filteredMembers
      );

      if (res.success) {
        success(
          isEditing ? "Homeowner Updated" : "Homeowner Registered",
          `${fullName} is successfully saved to the St. Joseph Village 6 Phase 4 records.`
        );
        router.push("/homeowners");
      } else {
        toastError("Operation Failed", res.error || "Could not save homeowner data.");
      }
    } catch (err: any) {
      toastError("Unexpected Error", err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* SECTION 1: Principal Homeowner Information */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                1. Head of Household / Principal Registrant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary titleholder or lessee details residing in Phase 4
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/60">
            Step 1 of 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input
              label="Full Legal Name"
              required
              placeholder="e.g. Atty. Roberto M. Dela Cruz, Jr."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
            />
          </div>

          <Select
            label="Tenure / Ownership Type"
            required
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value as OwnershipType)}
          >
            <option value="Owner">Owner (Titleholder / Living in SJV6 P4)</option>
            <option value="Renter">Renter (Tenant / Lessee)</option>
          </Select>

          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as GenderType)}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other / Prefer not to say</option>
          </Select>

          <Input
            label="Date of Birth"
            type="date"
            required
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            error={errors.birthdate}
            icon={<Calendar className="h-4 w-4" />}
          />

          {/* Reactive Computed Age Card */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Auto-Computed Age
            </label>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/80 dark:bg-[#0a1526] px-4 py-2.5 shadow-subtle">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {age > 0 ? `${age} years old` : "Enter birthdate"}
              </span>
              {age > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    isSenior
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60"
                      : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
                  }`}
                >
                  {isSenior ? "Senior Citizen (60+)" : "Adult Resident"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Calculated in real-time from birthdate</p>
          </div>

          {/* Phase 4 Block & Lot Assistant Box */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider">
                <MapPin className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                <span>Phase 4 Address Quick Builder</span>
              </div>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Standardized Format Helper</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Block Number</label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Lot Number</label>
                <input
                  type="number"
                  placeholder="e.g. 8"
                  value={selectedLot}
                  onChange={(e) => setSelectedLot(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyBlockLot}
                  disabled={!selectedBlock || !selectedLot}
                  className="w-full text-xs font-semibold h-9 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800/60 hover:bg-teal-100/50 dark:hover:bg-teal-950/40"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                  Format Address
                </Button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Input
              label="Official Subdivision Address"
              required
              placeholder="e.g. Block 12 Lot 8, St. Joseph Village 6 Phase 4"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={errors.address}
              helperText="Complete house, lot, and block number in Phase 4"
            />
          </div>

          {isEditing && (
            <Select
              label="Active Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RecordStatus)}
            >
              <option value="Active">Active Resident</option>
              <option value="Inactive">Inactive / Archived</option>
            </Select>
          )}
        </div>
      </div>

      {/* SECTION 2: Household Members Registry */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                2. Household Members & Family Census
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spouse, children, in-laws, relatives, or domestic staff living at this property
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMemberRow}
            className="text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/30 h-9 font-semibold text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Family Member
          </Button>
        </div>

        <div className="max-w-xs">
          <Input
            label="Total People Living in the House"
            type="number"
            min={1}
            max={35}
            value={householdCount}
            onChange={(e) => setHouseholdCount(parseInt(e.target.value) || 1)}
            helperText={`Auto-counted: 1 principal owner + ${members.length} registered member${members.length === 1 ? "" : "s"}`}
          />
        </div>

        {/* Dynamic Member Cards */}
        <div className="space-y-3 pt-1">
          {members.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2f4d] text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#0a1526]">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No additional household members listed</p>
              <p className="mt-0.5">Click &quot;Add Family Member&quot; above to register family or occupants.</p>
            </div>
          ) : (
            members.map((member, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-2xl border transition-all animate-fade-in ${
                  draggedIndex === index
                    ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/30 scale-[0.99] opacity-75"
                    : "border-slate-200 dark:border-[#1e2f4d] bg-slate-50/60 dark:bg-[#0a1526] hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Drag Handle & Order Controls */}
                <div className="flex items-center gap-1 shrink-0 text-slate-400 dark:text-slate-500">
                  <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-slate-600 dark:hover:text-slate-300" title="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveMember(index, "up")}
                      aria-label={`Move ${member.member_name || "member"} up`}
                      className="p-0.5 text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === members.length - 1}
                      onClick={() => moveMember(index, "down")}
                      aria-label={`Move ${member.member_name || "member"} down`}
                      className="p-0.5 text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Member Full Name"
                    value={member.member_name}
                    onChange={(e) => updateMemberRow(index, "member_name", e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600 shadow-subtle"
                  />
                </div>
                <div className="w-full sm:w-52">
                  <select
                    value={member.relationship}
                    onChange={(e) => updateMemberRow(index, "relationship", e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-600 shadow-subtle font-medium"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Parent">Parent / In-law</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Partner">Partner</option>
                    <option value="Relative">Relative</option>
                    <option value="Household Helper">Household Helper</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeMemberRow(index)}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors self-end sm:self-center"
                  title="Remove member"
                  aria-label={`Remove ${member.member_name || "member"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: General Assembly (GA) Proxy */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#07162c] text-teal-300 border border-teal-500/20 shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                3. General Assembly (GA) Official Proxy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized representative to attend annual General Assembly meetings if owner is absent
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/60">
            Step 3 of 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Designated Proxy Name"
            placeholder="e.g. Maria Teresa Santos"
            value={gaProxyName}
            onChange={(e) => setGaProxyName(e.target.value)}
            helperText="Leave blank if owner attends in person"
          />

          <Input
            label="Proxy Relationship to Owner"
            placeholder="e.g. Spouse / Brother / Son"
            value={gaProxyRelationship}
            onChange={(e) => setGaProxyRelationship(e.target.value)}
          />
        </div>
      </div>

      {/* SECTION 4: Contact Information & Domestic Pets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-7 shadow-subtle space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-[#1e2f4d]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">4. Contact Channels</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official communication channels</p>
            </div>
          </div>

          <div>
            <Input
              label="Philippine Mobile Number"
              placeholder="0917-123-4567"
              value={contactMobile}
              onChange={(e) => setContactMobile(formatPhilippineMobile(e.target.value))}
              error={errors.contactMobile}
              helperText="11-digit Philippine format (09XX-XXX-XXXX)"
              rightAction={
                contactMobile && isMobileValid ? (
                  <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                ) : null
              }
            />
          </div>

          <Input
            label="Official Email Address"
            type="email"
            placeholder="name@example.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            error={errors.contactEmail}
            helperText="For HOA circulars and meeting notices"
          />
        </div>

        {/* Domestic Pets */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-7 shadow-subtle space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-[#1e2f4d]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700">
              <PawPrint className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">5. Domestic Pet Census</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Phase 4 community animal registration</p>
            </div>
          </div>

          <Input
            label="Number of Registered Pets"
            type="number"
            min={0}
            max={25}
            value={petCount}
            onChange={(e) => setPetCount(parseInt(e.target.value) || 0)}
            helperText="Total dogs, cats, or other domestic animals on premises"
          />

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0a1526] border border-slate-100 dark:border-[#1e2f4d] text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Pet census helps ensure community sanitation, pet vaccination, and lost pet retrieval.</span>
          </div>
        </div>
      </div>

      {/* Form Bottom Submission Bar */}
      <div className="flex items-center justify-end gap-3 p-4 rounded-3xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]/90 shadow-subtle sticky bottom-4 z-20 backdrop-blur-md">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="h-11 px-5"
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="min-w-[180px] h-11 px-6 font-bold shadow-md bg-teal-700 hover:bg-teal-800 text-white"
        >
          {isEditing ? "Update Homeowner Record" : "Confirm & Save Homeowner"}
        </Button>
      </div>
    </form>
  );
}
