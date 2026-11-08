import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_ACCOUNT_EMAIL!;
  const password = process.env.TEST_ACCOUNT_PASSWORD!;
  console.log(`Fixing test account: ${email}`);
  
  const hash = await bcrypt.hash(password, 10);
  
  // Delete old fallback test account (single record)
  const old = await prisma.user.findUnique({ where: { email: 'test@test.com' } });
  if (old) {
    await prisma.user.delete({ where: { email: 'test@test.com' } });
    console.log('Deleted old test@test.com');
  }
  
  // Upsert correct test account
  await prisma.user.upsert({
    where: { email },
    create: { nome: 'Test Admin', email, role: 'GESTOR', senhaHash: hash, ativo: true },
    update: { senhaHash: hash, ativo: true },
  });
  
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
