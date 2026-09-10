import type { ComponentType, SVGProps } from "react";
import type { AreaId } from "@/lib/permissions";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavLeafItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export type NavSection = {
  id: AreaId;
  label: string;
  icon: NavIcon;
  items: NavLeafItem[];
};
