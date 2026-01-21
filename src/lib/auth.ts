import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          await logLoginFailed({
            email: credentials?.email as string || 'unknown',
            reason: 'Missing credentials',
          });
          throw new Error('Invalid credentials');
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
      // Log successful login
      if (user.id && user.email) {
        await logLogin({
          userId: user.id,
          email: user.email,
        });
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
