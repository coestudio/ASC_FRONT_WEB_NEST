"use client";

import Link from "next/link";
import { ChevronRight } from "react-bootstrap-icons";
import type { NavSection } from "@/types/nav";
import styles from "./app-shell.module.css";

type SidebarSectionProps = {
  section: NavSection;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
};

export function SidebarSection({
  section,
  pathname,
  isOpen,
  onToggle,
  onNavigate,
}: SidebarSectionProps) {
  const isActive = section.items.some((item) => item.href === pathname);
  const Icon = section.icon;

  return (
    <div className={styles.navSection}>
      <button
        type="button"
        className={[styles.navItemToggle, isActive ? styles.active : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className={styles.navItemLabel}>
          <Icon aria-hidden className={styles.navItemIcon} />
          {section.label}
        </span>
        <ChevronRight
          aria-hidden
          className={[styles.chevron, isOpen ? styles.chevronOpen : ""]
            .filter(Boolean)
            .join(" ")}
        />
      </button>

      <div
        className={[
          styles.navSubWrapper,
          isOpen ? styles.navSubWrapperOpen : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.navSubInner}>
          <ul className={styles.navSub}>
            {section.items.map((item) => {
              const itemActive = item.href === pathname;
              const ItemIcon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={itemActive ? styles.active : ""}
                    onClick={onNavigate}
                    aria-current={itemActive ? "page" : undefined}
                    tabIndex={isOpen ? undefined : -1}
                  >
                    <ItemIcon aria-hidden className={styles.navItemIcon} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
