// AUTO-GENERATED from MapaTelas.md. Do not edit by hand.
export type ItemKind = 'button'|'link'|'checkbox'|'field'|'grid'|'panel'|'select'|'item';
export interface ScreenItem { kind: ItemKind; label: string; desc: string; }
export interface Screen { title: string; filename: string; slug: string; description: string; items: ScreenItem[]; }
export interface ModuleDef { title: string; slug: string; screens: Screen[]; }
import raw from './screens.json';
export const modules = (raw as { modules: ModuleDef[] }).modules;
export const moduleBySlug = (slug: string) => modules.find(m => m.slug === slug);
export const screenBySlug = (mSlug: string, sSlug: string) => moduleBySlug(mSlug)?.screens.find(s => s.slug === sSlug);
