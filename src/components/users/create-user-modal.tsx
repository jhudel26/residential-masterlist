"use client";

import React, { useState } from "react";
import { UserRole } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { isValidEmail } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { UserPlus, Lock } from "lucide-react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    full_name: string;
    email: string;
    password?: string;
    role: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function CreateUserModal({ isOpen, onClose, onCreate }: CreateUserModalProps) {
  const { success, error: toastError } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full Name is required";
    if (!email.trim() || !isValidEmail(email)) errs.email = "Valid email is required";
    if (!password || password.length < 6) errs.password = "Temporary password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await onCreate({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });

      if (res.success) {
        success("Account Created", `Account for ${fullName} has been created.`);
        setFullName("");
        setEmail("");
        setPassword("");
        setRole("user");
        onClose();
      } else {
        toastError("Creation Failed", res.error || "Could not create user account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create HOA Staff / Admin Account"
      description="Register an authorized board member or volunteer account"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          required
          placeholder="e.g. Atty. Roberto Tan"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />

        <Input
          label="Email Address"
          type="email"
          required
          placeholder="e.g. roberto.tan@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          helperText="Used for login and credentials distribution"
        />

        <Input
          label="Initial Temporary Password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          icon={<Lock className="h-4 w-4" />}
          helperText="The user will be prompted to change this upon first login"
        />

        <Select
          label="Assigned Role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          helperText="Role permissions can be customized further after creation"
        >
          <option value="admin">Admin (Board Member / Officer)</option>
          <option value="user">User (Staff / Volunteer / View-only)</option>
        </Select>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            <span>Create Account</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
