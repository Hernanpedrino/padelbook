import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Datos de desarrollo. Se puede correr más de una vez: busca antes de crear.
async function main() {
  const hash = (password: string) => bcrypt.hash(password, 10);

  const manager = await prisma.admin.upsert({
    where: { email: 'manager@padel.com' },
    update: {},
    create: { rol: 'MANAGER', nombre: 'Manager', email: 'manager@padel.com', passwordHash: await hash('manager123') },
  });
  console.log('✅ Manager:', manager.email);

  const plan = await prisma.plan.upsert({
    where: { nombre: 'Básico' },
    update: {},
    create: { nombre: 'Básico', precioMensual: 20000, maxComplejos: 1, maxCanchas: 4 },
  });
  console.log('✅ Plan:', plan.nombre);

  let complejo = await prisma.complejo.findUnique({ where: { email: 'demo@padel.com' } });
  if (!complejo) {
    const organizacion = await prisma.organizacion.create({
      data: { nombre: 'Padel Demo SRL', emailContacto: 'demo@padel.com', planId: plan.id },
    });
    complejo = await prisma.complejo.create({
      data: {
        organizacionId: organizacion.id,
        nombre: 'Complejo Padel Demo',
        direccion: 'Av. Siempre Viva 123',
        telefono: '3414000000',
        email: 'demo@padel.com',
      },
    });
  }
  const organizacionId = complejo.organizacionId;
  await prisma.organizacion.update({ where: { id: organizacionId }, data: { planId: plan.id } });
  console.log('✅ Complejo:', complejo.nombre);

  const superadmin = await prisma.admin.upsert({
    where: { email: 'superadmin@padel.com' },
    update: {},
    create: {
      rol: 'SUPERADMIN',
      organizacionId,
      nombre: 'Dueño Demo',
      email: 'superadmin@padel.com',
      passwordHash: await hash('superadmin123'),
    },
  });
  console.log('✅ Superadmin:', superadmin.email);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@padel.com' },
    update: { rol: 'ADMIN', organizacionId, complejoId: complejo.id },
    create: {
      rol: 'ADMIN',
      organizacionId,
      complejoId: complejo.id,
      nombre: 'Admin',
      email: 'admin@padel.com',
      passwordHash: await hash('admin123'),
    },
  });
  console.log('✅ Admin:', admin.email);

  if ((await prisma.cancha.count({ where: { complejoId: complejo.id } })) === 0) {
    await prisma.cancha.createMany({
      data: [
        { nombre: 'Cancha 1', tipo: 'cristal', complejoId: complejo.id },
        { nombre: 'Cancha 2', tipo: 'cemento', complejoId: complejo.id },
      ],
    });
    console.log('✅ 2 canchas creadas');
  }

  const usuario = await prisma.usuario.upsert({
    where: { email: 'juan@gmail.com' },
    update: {},
    create: {
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'juan@gmail.com',
      telefono: '3414111111',
      categoria: 'SEXTA',
      genero: 'MASCULINO',
      passwordHash: await hash('usuario123'),
    },
  });
  console.log('✅ Usuario de prueba:', usuario.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
