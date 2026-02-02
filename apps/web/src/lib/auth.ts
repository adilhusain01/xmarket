import { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@xmarket/db';

export const authOptions: NextAuthOptions = {
  adapter: process.env.DATABASE_URL ? PrismaAdapter(prisma) : undefined,
  providers: [
    TwitterProvider({
      clientId: process.env.NEXT_PUBLIC_X_CLIENT_ID || 'dummy',
      clientSecret: process.env.X_CLIENT_SECRET || 'dummy',
      version: '2.0', // Use OAuth 2.0
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        // For JWT strategy, use token, for database strategy use user
        const userId = user?.id || (token?.sub as string);
        session.user.id = userId;

        // Fetch user data from database if available
        if (process.env.DATABASE_URL && userId) {
          try {
            const dbUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { id: userId },
                  { xUserId: userId },
                ],
              },
            });

            if (dbUser) {
              session.user.xUserId = dbUser.xUserId;
              session.user.xUsername = dbUser.xUsername || undefined;
              session.user.walletAddress = dbUser.walletAddress || undefined;
              session.user.balanceUsdc = dbUser.balanceUsdc.toNumber();
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (process.env.DATABASE_URL && account?.provider === 'twitter' && profile) {
        try {
          // Update or create user in our custom users table
          const twitterProfile = profile as any;

          await prisma.user.upsert({
            where: { xUserId: twitterProfile.data?.id || user.id },
            create: {
              xUserId: twitterProfile.data?.id || user.id,
              xUsername: twitterProfile.data?.username || user.name,
            },
            update: {
              xUsername: twitterProfile.data?.username || user.name,
            },
          });
        } catch (error) {
          console.error('Error creating/updating user:', error);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: process.env.DATABASE_URL ? 'database' : 'jwt',
  },
};

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      xUserId?: string;
      xUsername?: string;
      walletAddress?: string;
      balanceUsdc?: number;
    };
  }
}
