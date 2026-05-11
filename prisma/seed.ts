import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const complejo = await prisma.complejo.create({
    data: {
      nombre: 'Complejo Padel Demo',
      direccion: 'Av. Siempre Viva 123',
      telefono: '3414000000',
      email: 'demo@padel.com',
    },
  });

  console.log('✅ Complejo creado:', complejo.nombre);

  const admin = await prisma.admin.create({
    data: {
      nombre: 'Admin',
      email: 'admin@padel.com',
      passwordHash,
      complejoId: complejo.id,
    },
  });

  console.log('✅ Admin creado:', admin.email);

  const canchas = await Promise.all([
    prisma.cancha.create({
      data: {
        nombre: 'Cancha 1',
        tipo: 'cristal',
        complejoId: complejo.id,
      },
    }),
    prisma.cancha.create({
      data: {
        nombre: 'Cancha 2',
        tipo: 'cemento',
        complejoId: complejo.id,
      },
    }),
  ]);

  console.log(`✅ ${canchas.length} canchas creadas`);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'juan@gmail.com',
      telefono: '3414111111',
      passwordHash: await bcrypt.hash('usuario123', 10),
    },
  });

  console.log('✅ Usuario de prueba creado:', usuario.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });