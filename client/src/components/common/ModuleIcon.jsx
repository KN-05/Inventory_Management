// src/components/common/ModuleIcon.jsx
// Maps an ActivityLog `module` value (the exact set the backend logs - see
// the logActivity() call sites) to a lucide icon. Replaces the emoji that
// used to be duplicated in RecentActivity.jsx and ActivityLogs.jsx.
// Unknown modules fall back to a neutral activity icon so nothing is blank.

import {
  Package,
  Tags,
  Truck,
  ShoppingBag,
  ShoppingCart,
  Users,
  CalendarCheck,
  Boxes,
  UserRound,
  Lock,
  Activity,
} from 'lucide-react';
import { ICON_SM } from '../../utils/iconProps';

const MODULE_ICON = {
  product: Package,
  category: Tags,
  supplier: Truck,
  purchase: ShoppingBag,
  sale: ShoppingCart,
  customer: Users,
  attendance: CalendarCheck,
  stock: Boxes,
  user: UserRound,
  auth: Lock,
};

function ModuleIcon({ module }) {
  const Icon = MODULE_ICON[module] || Activity;
  return <Icon {...ICON_SM} />;
}

export default ModuleIcon;
