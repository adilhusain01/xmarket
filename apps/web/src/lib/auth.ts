import { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@xmarket/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    TwitterProvider({
      clientId: process.env.NEXT_PUBLIC_X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
      version: '2.0', // Use OAuth 2.0
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Add user ID to session
        session.user.id = user.id;

        // Fetch user data from database
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: user.id },
              { xUserId: user.id },
            ],
          },
        });

        if (dbUser) {
          session.user.xUserId = dbUser.xUserId;
          session.user.xUsername = dbUser.xUsername || undefined;
          session.user.walletAddress = dbUser.walletAddress || undefined;
          session.user.balanceUsdc = dbUser.balanceUsdc.toNumber();
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'twitter' && profile) {
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
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
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
