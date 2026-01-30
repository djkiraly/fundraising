import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { logLogin, logLoginFailed } from '@/lib/audit';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'player';
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'player';
  }
}

/**
 * NextAuth v5 configuration
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        recaptchaToken: { label: 'reCAPTCHA Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          await logLoginFailed({
            email: credentials?.email as string || 'unknown',
            reason: 'Missing credentials',
          });
          throw new Error('Invalid credentials');
        }

        // Verify reCAPTCHA token if provided (it may be null if reCAPTCHA is not configured)
        const recaptchaToken = credentials.recaptchaToken as string | undefined;
        if (recaptchaToken) {
          // Dynamic import to avoid pulling crypto into Edge middleware
          const { verifyRecaptchaWithThreshold } = await import('@/lib/recaptcha');
          const recaptchaResult = await verifyRecaptchaWithThreshold(recaptchaToken, 'login');
          if (!recaptchaResult.success) {
            await logLoginFailed({
              email: credentials.email as string,
              reason: `reCAPTCHA failed: ${recaptchaResult.error}`,
            });
            throw new Error(recaptchaResult.error || 'Security verification failed');
          }
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user) {
          await logLoginFailed({
            email: credentials.email as string,
            reason: 'User not found',
          });
          throw new Error('No user found with this email');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValidPassword) {
          await logLoginFailed({
            email: credentials.email as string,
            reason: 'Invalid password',
          });
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'player';
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Log successful login and update lastLogin timestamp
      if (user.id && user.email) {
        await Promise.all([
          logLogin({
            userId: user.id,
            email: user.email,
          }),
          db.update(users)
            .set({ lastLogin: sql`NOW()` })
            .where(eq(users.id, user.id)),
        ]);
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
