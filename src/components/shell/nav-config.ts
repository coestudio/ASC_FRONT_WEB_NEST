import {
  ShieldLock,
  ShieldCheck,
  Grid1x2,
  Diagram3,
  Flask,
  FlaskFill,
  PersonBadge,
  House,
  People,
  ClipboardData,
  BoxSeam,
  Building,
  GeoAlt,
  Box2,
  JournalText,
  ExclamationTriangle,
  FileEarmarkText,
  GraphUpArrow,
} from "react-bootstrap-icons";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { AreaId } from "@/lib/permissions";
import type { NavIcon, NavSection } from "@/types/nav";
import { ShipIcon } from "./ship-icon";

// Ícones e rotas espelham exatamente warren/Portal
// (src/Layouts/SideBar/index.tsx) — mesma estrutura de menu, mesmos paths
// relativos (algumas rotas ficam fora do prefixo da própria seção, ex.
// "Operações" do Administrativo é /operacoes, não /administrativo/operacoes
// — isso é assim no Portal também, não é engano nosso). Ícones na versão
// outline (não "-fill"), igual ao Portal (bi-shield-lock, bi-house, etc. —
// nenhum usa o sufixo "-fill" lá, com a única exceção do item-folha
// "Laboratório", que usa bi-flask-fill enquanto o header da seção usa
// bi-flask sem fill — mantido assim de propósito).
const SECTION_ICONS: Record<AreaId, NavIcon> = {
  admin: ShieldLock,
  administrativo: Grid1x2,
  operacional: Diagram3,
  laboratorio: Flask,
  client: PersonBadge,
};

export function getNavSections(
  dict: Dictionary,
  areas: AreaId[],
  lang: Locale
): NavSection[] {
  const nav = dict.nav;
  const p = (path: string) => `/${lang}${path}`;

  const all: Record<AreaId, NavSection> = {
    admin: {
      id: "admin",
      label: nav.admin,
      icon: SECTION_ICONS.admin,
      items: [
        {
          href: p("/admin/acesso"),
          label: nav.adminAccess,
          icon: ShieldLock,
        },
        {
          href: p("/admin/acessos"),
          label: nav.adminAccessProfiles,
          icon: ShieldCheck,
        },
      ],
    },
    administrativo: {
      id: "administrativo",
      label: nav.administrativo,
      icon: SECTION_ICONS.administrativo,
      items: [
        {
          href: p("/administrativo"),
          label: nav.administrativoHome,
          icon: House,
        },
        {
          href: p("/administrativo/clientes"),
          label: nav.administrativoClients,
          icon: People,
        },
        {
          href: p("/operacoes"),
          label: nav.administrativoOperations,
          icon: ClipboardData,
        },
        {
          href: p("/administrativo/cadastro/navio"),
          label: nav.administrativoVessel,
          icon: ShipIcon,
        },
        {
          href: p("/administrativo/cadastro/container"),
          label: nav.administrativoContainer,
          icon: BoxSeam,
        },
        {
          href: p("/administrativo/cadastro/terminal"),
          label: nav.administrativoTerminal,
          icon: Building,
        },
        {
          href: p("/administrativo/cadastro/porto"),
          label: nav.administrativoHarbor,
          icon: GeoAlt,
        },
        {
          href: p("/administrativo/cadastro/produto"),
          label: nav.administrativoProduct,
          icon: Box2,
        },
        {
          href: p("/administrativo/log"),
          label: nav.administrativoLog,
          icon: JournalText,
        },
        {
          href: p("/administrativo/ocorrencias"),
          label: nav.administrativoOccurrences,
          icon: ExclamationTriangle,
        },
      ],
    },
    operacional: {
      id: "operacional",
      label: nav.operacional,
      icon: SECTION_ICONS.operacional,
      items: [
        {
          href: p("/operacional"),
          label: nav.operacionalHome,
          icon: House,
        },
        {
          href: p("/operacional/operacoes"),
          label: nav.operacionalOptions,
          icon: ClipboardData,
        },
      ],
    },
    laboratorio: {
      id: "laboratorio",
      label: nav.laboratorio,
      icon: SECTION_ICONS.laboratorio,
      items: [{ href: p("/laboratorio"), label: nav.laboratorio, icon: FlaskFill }],
    },
    client: {
      id: "client",
      label: nav.client,
      icon: SECTION_ICONS.client,
      items: [
        { href: p("/client"), label: nav.clientHome, icon: House },
        {
          href: p("/client/relatorio-final"),
          label: nav.clientFinalReport,
          icon: FileEarmarkText,
        },
        {
          href: p("/client/acompanhamento"),
          label: nav.clientTracking,
          icon: GraphUpArrow,
        },
        {
          href: p("/client/colaboradores"),
          label: nav.clientCollaborators,
          icon: People,
        },
      ],
    },
  };

  return areas.map((area) => all[area]);
}
