import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.ativo) return null;
        const valid = await bcryptjs.compare(password, user.senhaHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          nome: user.nome,
          role: user.role,
          firstLogin: user.firstLogin,
          onboardingConcluido: user.onboardingConcluido,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.nome = user.nome ?? user.name;
        token.firstLogin = user.firstLogin;
        token.onboardingConcluido = user.onboardingConcluido;
      }
      if (trigger === 'update' && session) {
        if (session.nome !== undefined) token.nome = session.nome;
        if (session.firstLogin !== undefined) token.firstLogin = session.firstLogin;
        if (session.onboardingConcluido !== undefined) token.onboardingConcluido = session.onboardingConcluido;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.nome = token.nome as string;
        session.user.firstLogin = token.firstLogin as boolean;
        session.user.onboardingConcluido = token.onboardingConcluido as boolean;
      }
      return session;
    },
  },
});
