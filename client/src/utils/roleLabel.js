// src/utils/roleLabel.js
// The database stores 'admin', 'manager', or 'staff'. The UI shows
// friendlier labels - keeping this mapping in one place means every page
// displays roles consistently.

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Accountant/Manager',
  staff: 'Staff',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
