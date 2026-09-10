import type { DefaultSession } from "next-auth";

/**
 * Module augmentation do next-auth v5 — expõe os campos vindos do Core
 * (login real, ver src/auth.ts) através do JWT e da Session, além dos
 * campos padrão (`name`, `email`, `image`).
 *
 * Os tipos `User`/`Session`/`JWT` do `next-auth` são apenas re-exports de
 * `@auth/core` (`export type { Session } from "@auth/core/types"`), então a
 * merge de declaração precisa acontecer no módulo de origem, não em
 * "next-auth"/"next-auth/jwt" (que não têm efeito de merge sobre um
 * `export type {...} from`).
 */
declare module "@auth/core/types" {
  interface User {
    userName?: string;
    isAdmin?: boolean;
    /** UserType do Core: 0 = Internal, 1 = External. */
    type?: number;
    accessToken?: string;
    /** Data/hora de expiração do accessToken (ISO string). */
    expiresAt?: string;
    /** Tempo de vida do token em segundos. */
    expiresIn?: number;
  }

  interface Session {
    user: {
      userName?: string;
      isAdmin?: boolean;
      /** UserType do Core: 0 = Internal, 1 = External. */
      type?: number;
    } & DefaultSession["user"];
    accessToken?: string;
    /** Data/hora de expiração do accessToken (ISO string). */
    expiresAt?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userName?: string;
    isAdmin?: boolean;
    type?: number;
    accessToken?: string;
    /** Data/hora de expiração do accessToken (ISO string). */
    expiresAt?: string;
    /** Tempo de vida do token em segundos. */
    expiresIn?: number;
  }
}
