/**
 * Role Permission Matrix for Legacy Logic Pro
 * Roles: firm_owner_admin, senior_associate, junior_associate
 * Single Source of Truth
 */

export type UserRole = 'firm_owner_admin' | 'senior_associate' | 'junior_associate';

export type PermissionAction =
  | 'invite_remove_users'
  | 'change_roles'
  | 'view_seat_usage'
  | 'create_delete_clients'
  | 'upload_process_files'
  | 'edit_ledger_mapping'
  | 'mark_entries_reviewed'
  | 'view_all_reports'
  | 'export_reports'
  | 'create_assign_tasks'
  | 'view_update_own_tasks'
  | 'view_audit_trail'
  | 'finalize_brs'
  | 'create_edit_invoices'
  | 'add_fixed_assets';

export const ROLE_PERMISSIONS: Record<PermissionAction, Record<UserRole, boolean>> = {
  invite_remove_users: {
    firm_owner_admin: true,
    senior_associate: false,
    junior_associate: false,
  },
  change_roles: {
    firm_owner_admin: true,
    senior_associate: false,
    junior_associate: false,
  },
  view_seat_usage: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: true,
  },
  create_delete_clients: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
  upload_process_files: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: true,
  },
  edit_ledger_mapping: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
  mark_entries_reviewed: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
  view_all_reports: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: true,
  },
  export_reports: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: true,
  },
  create_assign_tasks: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
  view_update_own_tasks: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: true,
  },
  view_audit_trail: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: true,
  },
  finalize_brs: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
  create_edit_invoices: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
  add_fixed_assets: {
    firm_owner_admin: true,
    senior_associate: true,
    junior_associate: false,
  },
};

export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  return !!ROLE_PERMISSIONS[action]?.[role];
}

export function getRoleBadgeLabel(role: UserRole): string {
  switch (role) {
    case 'firm_owner_admin':
      return 'Firm Owner / Admin';
    case 'senior_associate':
      return 'Senior Associate (CA)';
    case 'junior_associate':
      return 'Junior Associate / Article';
  }
}
