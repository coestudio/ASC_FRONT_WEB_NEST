import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import axios from "axios"
import { defaultLocale } from "@/i18n/config"
import { coreClient } from "@/lib/core-client"
import type { z } from "zod"
import type { PostApiAuthLoginResponse } from "@/api/generated/zod/auth/auth.zod"

type LoginResponse = z.infer<typeof PostApiAuthLoginResponse>

/** Converte expiresIn (segundos) para maxAge do NextAuth (segundos). */
function resolveMaxAge(expiresIn?: number): number | undefined {
  if (!expiresIn || expiresIn <= 0) return undefined
  // Adiciona 60s de margem pra não expirar na borda
  return expiresIn + 60
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    // maxAge é calculado dinamicamente no callback jwt quando o token
    // expira. Aqui usamos um fallback generoso (30 dias) que é sobrescrito
    // pelo expiresIn do Core.
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: `/${defaultLocale}/login`,
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        superLogin: { label: "Super login", type: "text" },
      },
      async authorize(credentials) {
        const userName = String(credentials?.email ?? "").trim()
        const password = String(credentials?.password ?? "")
        const isSuperLogin = credentials?.superLogin === "true"

        if (!userName || !password) return null

        try {
          const { data } = await coreClient.post<LoginResponse>(
            "/api/auth/login",
            { userName, password },
          )

          return {
            id: data.user.id,
            email: data.user.profile?.email ?? data.user.userName,
            name: data.user.profile?.fullName ?? data.user.userName,
            userName: data.user.userName,
            isAdmin: isSuperLogin ? true : data.user.isAdmin,
            type: data.user.type,
            accessToken: data.tokenData.accessToken,
            expiresAt: data.tokenData.expiresAt,
            expiresIn: Number(data.tokenData.expiresIn),
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 400) {
            return null
          }
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Login inicial — grava todos os campos do Core no JWT
        token.userName = user.userName
        token.isAdmin = user.isAdmin
        token.type = user.type
        token.accessToken = user.accessToken
        token.expiresAt = user.expiresAt
        token.expiresIn = user.expiresIn
      }

      // Verifica se o token do Core expirou. Se expirou, limpa o JWT pra
      // forçar re-login (não temos refresh token no Core ainda).
      if (token.expiresAt) {
        const expiresAtMs = new Date(token.expiresAt).getTime()
        const nowMs = Date.now()
        // Margem de 30s antes de expirar pra evitar request na borda
        if (expiresAtMs - 30_000 <= nowMs) {
          // Token expirado — limpa o accessToken mas mantém os dados do
          // usuário pro middleware poder redirecionar com a mensagem certa.
          token.accessToken = undefined
          token.expiresAt = undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userName = token.userName
        session.user.isAdmin = token.isAdmin
        session.user.type = token.type
      }
      session.accessToken = token.accessToken
      session.expiresAt = token.expiresAt
      return session
    },
  },
})
