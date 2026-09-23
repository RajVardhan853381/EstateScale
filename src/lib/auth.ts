import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimiter } from '@/lib/security/rate-limiter';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = (credentials.email as string).toLowerCase().trim();
        const limit = rateLimiter.check(`login:${normalizedEmail}`, 5, 60000);
        if (!limit.success) {
          console.warn(`[SecurityAudit] Rate limit exceeded for login attempts: ${normalizedEmail}`);
          throw new Error('Too many login attempts. Please wait 1 minute.');
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);

        if (!isValid) {
          return null;
        }

        // Reset rate limiter on successful authentication
        rateLimiter.reset(`login:${normalizedEmail}`);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('Too many login attempts')) {
            throw error;
          }
          console.error("Database or authentication error during login:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});
