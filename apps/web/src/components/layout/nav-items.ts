import type { LucideIcon } from "lucide-react";
import {
  Home,
  Users,
  Truck,
  Package,
  Boxes,
  FileText,
  Landmark,
  Wallet,
  BookOpen,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string; // sin href: todavía no tiene pantalla propia (F1-F8)
}

// Mismo orden que 02-navegacion-y-ux.md §1: refleja dependencias reales
// entre módulos (Catálogo antes que Stock, Tesorería antes que Caja/Bancos).
export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", icon: Home, href: "inicio" },
  { label: "Clientes", icon: Users, href: "clientes" },
  { label: "Proveedores", icon: Truck, href: "proveedores" },
  { label: "Catálogo", icon: Package, href: "catalogo/productos" },
  { label: "Stock", icon: Boxes, href: "stock/general" },
  { label: "Comprobantes", icon: FileText, href: "comprobantes" },
  { label: "Tesorería", icon: Landmark, href: "tesoreria" },
  { label: "Caja y Bancos", icon: Wallet, href: "caja-bancos/caja" },
  { label: "Contabilidad", icon: BookOpen, href: "contabilidad/configuracion" },
];

export const CONFIG_NAV_ITEM: NavItem = {
  label: "Configuración",
  icon: Settings,
  href: "configuracion/empresa",
};
