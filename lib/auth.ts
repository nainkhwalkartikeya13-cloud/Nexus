import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import type { Provider } from "next-auth/providers";

// Build the providers array dynamically so broken (empty) OAuth providers
// are never registered — calling signIn() for a provider that has empty
// credentials causes NextAuth to fail silently.
const providers: Provider[] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Invalid credentials");
      }

      const email = credentials.email.toString();
      const password = credentials.password.toString();

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        throw new Error("Invalid credentials");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      let member = null;

      // Fallback to the first organization
      member = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        organizationId: member?.organizationId,
        role: member?.role,
      };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
});
