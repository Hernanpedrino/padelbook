import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Alta del MANAGER de la plataforma (no hay registro público para este rol).
// Uso: npm run crear-manager -- <email> <password> "<nombre>"
const prisma = new PrismaClient();

async function main() {
  const [email, password, nombre = 'Manager'] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error('Uso: npm run crear-manager -- <email> <password> "<nombre>"');
  }
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  const existe = await prisma.admin.findUnique({ where: { email } });
  if (existe) throw new Error(`Ya existe un usuario del panel con el email ${email}`);

  const manager = await prisma.admin.create({
    data: { rol: 'MANAGER', nombre, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log('✅ Manager creado:', manager.email);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
