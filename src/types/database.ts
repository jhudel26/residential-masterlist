export type UserRole = 'super_admin' | 'admin' | 'user';
export type OwnershipType = 'Owner' | 'Renter';
export type GenderType = 'Male' | 'Female' | 'Other';
export type RecordStatus = 'Active' | 'Inactive';

export interface UserPermissions {
  can_create_homeowner: boolean;
  can_edit_homeowner: boolean;
  can_delete_homeowner: boolean;
  can_view_homeowner: boolean;
  can_export_excel: boolean;
  can_manage_users: boolean;
  can_grant_permissions: boolean;
  can_view_dashboard_stats: boolean;
  can_backup_restore: boolean;
  can_view_analytics: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  permissions: UserPermissions;
  status: RecordStatus;
  created_at: string;
  updated_at?: string;
}

export interface HouseholdMember {
  id: string;
  homeowner_id: string;
  member_name: string;
  relationship: string;
  created_at?: string;
}

export interface Homeowner {
  id: string;
  full_name: string;
  ownership_type: OwnershipType;
  gender: GenderType;
  birthdate: string; // YYYY-MM-DD
  age?: number;
  address: string;
  household_count: number;
  contact_mobile?: string;
  contact_email?: string;
  pet_count: number;
  ga_proxy_name?: string;
  ga_proxy_relationship?: string;
  created_by?: string;
  status: RecordStatus;
  created_at: string;
  updated_at?: string;
  household_members?: HouseholdMember[];
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}
