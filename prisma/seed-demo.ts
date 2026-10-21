import { Categoria, Genero, PrismaClient, Rama } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Datos de demostración para probar la app y el panel: complejos, jugadores, turnos,
// partidos, torneos y clases. Se puede correr varias veces: no duplica y agrega los turnos
// de los días que falten. Requiere haber corrido antes el seed base (npm run seed).
const prisma = new PrismaClient();

const PASSWORD_PANEL = 'demo1234';
const PASSWORD_JUGADOR = 'jugador123';
const DIAS_DE_TURNOS = 7;
const HORARIOS = [9, 10, 18, 19, 20, 21, 22];

interface DemoComplejo {
  slug: string;
  nombre: string;
  direccion: string;
  telefono: string;
  precio: number;
  canchas: { nombre: string; tipo: string }[];
}

interface DemoOrganizacion {
  slug: string;
  nombre: string;
  plan: 'Básico' | 'Pro';
  complejos: DemoComplejo[];
}

const ORGANIZACIONES: DemoOrganizacion[] = [
  {
    slug: 'rosariopadel',
    nombre: 'Grupo Rosario Padel',
    plan: 'Pro',
    complejos: [
      {
        slug: 'centro',
        nombre: 'Rosario Padel Centro',
        direccion: 'Corrientes 1450, Rosario',
        telefono: '3414200100',
        precio: 24000,
        canchas: [
          { nombre: 'Cancha 1', tipo: 'cristal' },
          { nombre: 'Cancha 2', tipo: 'cristal' },
          { nombre: 'Cancha 3', tipo: 'indoor' },
        ],
      },
      {
        slug: 'norte',
        nombre: 'Rosario Padel Norte',
        direccion: 'Av. Alberdi 980, Rosario',
        telefono: '3414200200',
        precio: 21000,
        canchas: [
          { nombre: 'Cancha 1', tipo: 'cristal' },
          { nombre: 'Cancha 2', tipo: 'cemento' },
        ],
      },
    ],
  },
  {
    slug: 'lacancha',
    nombre: 'La Cancha Club',
    plan: 'Básico',
    complejos: [
      {
        slug: 'lacancha',
        nombre: 'La Cancha Club',
        direccion: 'Bv. Oroño 3200, Rosario',
        telefono: '3414300300',
        precio: 20000,
        canchas: [
          { nombre: 'Central', tipo: 'cristal' },
          { nombre: 'Cancha 2', tipo: 'pasto_sintetico' },
        ],
      },
    ],
  },
  {
    slug: 'blindex',
    nombre: 'Blindex Padel',
    plan: 'Básico',
    complejos: [
      {
        slug: 'blindex',
        nombre: 'Blindex Padel',
        direccion: 'Mendoza 5600, Rosario',
        telefono: '3414400400',
        precio: 22000,
        canchas: [
          { nombre: 'Cancha A', tipo: 'indoor' },
          { nombre: 'Cancha B', tipo: 'indoor' },
          { nombre: 'Cancha C', tipo: 'cristal' },
        ],
      },
    ],
  },
  {
    slug: 'puntodeoro',
    nombre: 'Punto de Oro Padel',
    plan: 'Básico',
    complejos: [
      {
        slug: 'puntodeoro',
        nombre: 'Punto de Oro Padel',
        direccion: 'Av. Pellegrini 2100, Rosario',
        telefono: '3414500500',
        precio: 18000,
        canchas: [
          { nombre: 'Cancha 1', tipo: 'cemento' },
          { nombre: 'Cancha 2', tipo: 'cemento' },
        ],
      },
    ],
  },
];

const JUGADORES: { nombre: string; apellido: string; genero: Genero; categoria: Categoria }[] = [
  { nombre: 'Martín', apellido: 'Gómez', genero: 'MASCULINO', categoria: 'CUARTA' },
  { nombre: 'Lucas', apellido: 'Fernández', genero: 'MASCULINO', categoria: 'QUINTA' },
  { nombre: 'Diego', apellido: 'López', genero: 'MASCULINO', categoria: 'SEXTA' },
  { nombre: 'Facundo', apellido: 'Martínez', genero: 'MASCULINO', categoria: 'SEXTA' },
  { nombre: 'Nicolás', apellido: 'Rodríguez', genero: 'MASCULINO', categoria: 'SEXTA' },
  { nombre: 'Matías', apellido: 'Sánchez', genero: 'MASCULINO', categoria: 'SEPTIMA' },
  { nombre: 'Agustín', apellido: 'Pérez', genero: 'MASCULINO', categoria: 'OCTAVA' },
  { nombre: 'Sofía', apellido: 'García', genero: 'FEMENINO', categoria: 'CUARTA' },
  { nombre: 'Valentina', apellido: 'Romero', genero: 'FEMENINO', categoria: 'QUINTA' },
  { nombre: 'Camila', apellido: 'Díaz', genero: 'FEMENINO', categoria: 'QUINTA' },
  { nombre: 'Lucía', apellido: 'Torres', genero: 'FEMENINO', categoria: 'SEXTA' },
  { nombre: 'Martina', apellido: 'Ruiz', genero: 'FEMENINO', categoria: 'SEXTA' },
  { nombre: 'Julieta', apellido: 'Álvarez', genero: 'FEMENINO', categoria: 'SEPTIMA' },
  { nombre: 'Florencia', apellido: 'Benítez', genero: 'FEMENINO', categoria: 'OCTAVA' },
];

// 'Martín Gómez' -> 'martin.gomez@demo.com'
const emailDe = (nombre: string, apellido: string) =>
  `${nombre}.${apellido}@demo.com`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Fecha a N días de hoy a la hora indicada (hora local de la PC)
function enDias(dias: number, hora: number, minutos = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minutos, 0, 0);
  return d;
}

async function main() {
  const passwordPanel = await bcrypt.hash(PASSWORD_PANEL, 10);
  const passwordJugador = await bcrypt.hash(PASSWORD_JUGADOR, 10);

  const planes = {
    Básico: await prisma.plan.upsert({
      where: { nombre: 'Básico' },
      update: {},
      create: { nombre: 'Básico', precioMensual: 20000, maxComplejos: 1, maxCanchas: 4 },
    }),
    Pro: await prisma.plan.upsert({
      where: { nombre: 'Pro' },
      update: {},
      create: { nombre: 'Pro', descripcion: 'Hasta 3 sedes', precioMensual: 45000, maxComplejos: 3, maxCanchas: 12 },
    }),
  };

  // --- Organizaciones, complejos, canchas y usuarios del panel ---
  const complejos: { id: string; nombre: string; precio: number; canchas: { id: string }[] }[] = [];
  const vencimiento = enDias(30, 23, 59);

  for (const org of ORGANIZACIONES) {
    const emailSuperadmin = `superadmin.${org.slug}@demo.com`;
    const existente = await prisma.admin.findUnique({ where: { email: emailSuperadmin } });
    const organizacionId =
      existente?.organizacionId ??
      (
        await prisma.organizacion.create({
          data: {
            nombre: org.nombre,
            emailContacto: `contacto@${org.slug}.demo.com`,
            planId: planes[org.plan].id,
            vencimiento,
            admins: {
              create: { rol: 'SUPERADMIN', nombre: `Dueño ${org.nombre}`, email: emailSuperadmin, passwordHash: passwordPanel },
            },
          },
        })
      ).id;

    for (const c of org.complejos) {
      const email = `${c.slug}@${org.slug}.demo.com`;
      const complejo =
        (await prisma.complejo.findUnique({ where: { email } })) ??
        (await prisma.complejo.create({
          data: { organizacionId, nombre: c.nombre, direccion: c.direccion, telefono: c.telefono, email },
        }));

      if ((await prisma.cancha.count({ where: { complejoId: complejo.id } })) === 0) {
        await prisma.cancha.createMany({ data: c.canchas.map((k) => ({ ...k, complejoId: complejo.id })) });
      }

      await prisma.admin.upsert({
        where: { email: `admin.${c.slug}@demo.com` },
        update: {},
        create: {
          rol: 'ADMIN',
          organizacionId,
          complejoId: complejo.id,
          nombre: `Admin ${c.nombre}`,
          email: `admin.${c.slug}@demo.com`,
          passwordHash: passwordPanel,
        },
      });

      const canchas = await prisma.cancha.findMany({ where: { complejoId: complejo.id }, orderBy: { nombre: 'asc' } });
      complejos.push({ id: complejo.id, nombre: complejo.nombre, precio: c.precio, canchas });
    }
  }
  // El complejo del seed base también recibe turnos, partidos y clases
  const demo = await prisma.complejo.findUnique({ where: { email: 'demo@padel.com' } });
  if (demo) {
    const canchas = await prisma.cancha.findMany({ where: { complejoId: demo.id }, orderBy: { nombre: 'asc' } });
    complejos.push({ id: demo.id, nombre: demo.nombre, precio: 19000, canchas });
  }
  console.log(`✅ ${ORGANIZACIONES.length} organizaciones y ${complejos.length} complejos (panel: contraseña ${PASSWORD_PANEL})`);

  // --- Turnos libres para los próximos días (solo los que falten) ---
  let turnosCreados = 0;
  for (const complejo of complejos) {
    for (const cancha of complejo.canchas) {
      const existentes = await prisma.turno.findMany({
        where: { canchaId: cancha.id, fechaHoraInicio: { gte: enDias(0, 0) } },
        select: { fechaHoraInicio: true },
      });
      const ocupados = new Set(existentes.map((t) => t.fechaHoraInicio.getTime()));
      const nuevos: { canchaId: string; fechaHoraInicio: Date; fechaHoraFin: Date; precio: number }[] = [];
      for (let dia = 0; dia < DIAS_DE_TURNOS; dia++) {
        for (const hora of HORARIOS) {
          const inicio = enDias(dia, hora);
          if (inicio <= new Date() || ocupados.has(inicio.getTime())) continue;
          // A la noche el turno es más caro
          const precio = hora >= 19 ? complejo.precio : Math.round(complejo.precio * 0.8);
          nuevos.push({ canchaId: cancha.id, fechaHoraInicio: inicio, fechaHoraFin: enDias(dia, hora + 1), precio });
        }
      }
      if (nuevos.length) await prisma.turno.createMany({ data: nuevos });
      turnosCreados += nuevos.length;
    }
  }
  console.log(`✅ ${turnosCreados} turnos libres nuevos`);

  // --- Jugadores ---
  const jugadores: Record<string, { id: string; nombre: string }> = {};
  for (const j of JUGADORES) {
    const email = emailDe(j.nombre, j.apellido);
    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: {
        nombre: j.nombre,
        apellido: j.apellido,
        email,
        telefono: `341555${String(Object.keys(jugadores).length).padStart(4, '0')}`,
        categoria: j.categoria,
        genero: j.genero,
        passwordHash: passwordJugador,
      },
    });
    jugadores[j.nombre] = usuario;
  }
  console.log(`✅ ${JUGADORES.length} jugadores (contraseña ${PASSWORD_JUGADOR})`);

  // --- Partidos buscando jugadores: el creador reserva un turno y publica el partido ---
  const partidos: { creador: string; complejo: number; dia: number; hora: number; categoria: Categoria; rama: Rama; buscados: number; descripcion: string; solicitudes: string[] }[] = [
    { creador: 'Diego', complejo: 0, dia: 1, hora: 20, categoria: 'SEXTA', rama: 'MASCULINO', buscados: 2, descripcion: 'Partido picante, nivel parejo', solicitudes: ['Facundo'] },
    { creador: 'Lucía', complejo: 1, dia: 2, hora: 19, categoria: 'SEXTA', rama: 'FEMENINO', buscados: 1, descripcion: 'Nos falta una para el cuarteto', solicitudes: ['Martina'] },
    { creador: 'Valentina', complejo: 3, dia: 1, hora: 21, categoria: 'QUINTA', rama: 'MIXTO', buscados: 3, descripcion: 'Mixto tranqui después del trabajo', solicitudes: ['Lucas', 'Camila'] },
    { creador: 'Matías', complejo: 5, dia: 3, hora: 18, categoria: 'SEPTIMA', rama: 'MASCULINO', buscados: 3, descripcion: 'Para principiantes, se divide la cancha', solicitudes: [] },
    { creador: 'Martín', complejo: 2, dia: 4, hora: 22, categoria: 'CUARTA', rama: 'MASCULINO', buscados: 1, descripcion: 'Buscamos cuarto jugador de 4ta', solicitudes: [] },
  ];
  let partidosCreados = 0;
  for (const p of partidos) {
    const complejo = complejos[p.complejo];
    if (!complejo) continue;
    const creador = jugadores[p.creador];
    const ya = await prisma.partido.findFirst({ where: { creadorId: creador.id, descripcion: p.descripcion, estado: { in: ['ABIERTO', 'COMPLETO'] } } });
    if (ya) continue;
    const turno = await prisma.turno.findFirst({
      where: { canchaId: complejo.canchas[0].id, fechaHoraInicio: enDias(p.dia, p.hora), estado: 'DISPONIBLE' },
    });
    if (!turno) continue;
    await prisma.$transaction(async (tx) => {
      await tx.turno.update({ where: { id: turno.id }, data: { estado: 'RESERVADO' } });
      await tx.reserva.create({ data: { turnoId: turno.id, usuarioId: creador.id } });
      await tx.partido.create({
        data: {
          turnoId: turno.id,
          creadorId: creador.id,
          categoria: p.categoria,
          rama: p.rama,
          jugadoresBuscados: p.buscados,
          descripcion: p.descripcion,
          jugadores: { create: p.solicitudes.map((nombre) => ({ usuarioId: jugadores[nombre].id })) },
        },
      });
    });
    partidosCreados++;
  }
  console.log(`✅ ${partidosCreados} partidos buscando jugadores`);

  // --- Torneos ---
  const torneos: { complejo: number; nombre: string; categoria: Categoria; rama: Rama; inicio: number; cupo: number; precio: number; parejas: [string, string][] }[] = [
    { complejo: 0, nombre: 'Torneo de Primavera 6ta', categoria: 'SEXTA', rama: 'MASCULINO', inicio: 12, cupo: 16, precio: 30000, parejas: [['Diego', 'Nicolás']] },
    { complejo: 2, nombre: 'Copa Femenina 5ta', categoria: 'QUINTA', rama: 'FEMENINO', inicio: 15, cupo: 12, precio: 28000, parejas: [['Valentina', 'Camila']] },
    { complejo: 3, nombre: 'Mixto Blindex 7ma', categoria: 'SEPTIMA', rama: 'MIXTO', inicio: 9, cupo: 8, precio: 25000, parejas: [] },
    { complejo: 4, nombre: 'Americano Punto de Oro 8va', categoria: 'OCTAVA', rama: 'MASCULINO', inicio: 6, cupo: 8, precio: 15000, parejas: [] },
  ];
  let torneosCreados = 0;
  for (const t of torneos) {
    const complejo = complejos[t.complejo];
    if (!complejo || (await prisma.torneo.findFirst({ where: { nombre: t.nombre, complejoId: complejo.id } }))) continue;
    await prisma.torneo.create({
      data: {
        complejoId: complejo.id,
        nombre: t.nombre,
        descripcion: 'Zona de grupos y eliminación directa. Pelotas nuevas y premios para los finalistas.',
        categoria: t.categoria,
        rama: t.rama,
        fechaInicio: enDias(t.inicio, 0),
        fechaFin: enDias(t.inicio + 2, 23, 59),
        cierreInscripcion: enDias(t.inicio - 2, 23, 59),
        cupoParejas: t.cupo,
        precioInscripcion: t.precio,
        estado: 'PUBLICADO',
        inscripciones: {
          create: t.parejas.map(([a, b]) => ({ jugador1Id: jugadores[a].id, jugador2Id: jugadores[b].id, estado: 'CONFIRMADA' as const })),
        },
      },
    });
    torneosCreados++;
  }
  console.log(`✅ ${torneosCreados} torneos publicados`);

  // --- Clases (en canchas y horarios sin turnos: a la tarde) ---
  const clases: { complejo: number; profesor: string; nivel: Categoria | null; dia: number; hora: number; cupo: number; precio: number; descripcion: string }[] = [
    { complejo: 0, profesor: 'Pablo Lima', nivel: null, dia: 2, hora: 16, cupo: 4, precio: 12000, descripcion: 'Iniciación: golpes básicos y posición en la cancha' },
    { complejo: 1, profesor: 'Carla Sosa', nivel: 'SEXTA', dia: 3, hora: 15, cupo: 4, precio: 14000, descripcion: 'Bandeja y víbora' },
    { complejo: 3, profesor: 'Juan Mieres', nivel: 'QUINTA', dia: 1, hora: 17, cupo: 6, precio: 15000, descripcion: 'Juego de red y definición' },
  ];
  let clasesCreadas = 0;
  for (const c of clases) {
    const complejo = complejos[c.complejo];
    if (!complejo || (await prisma.clase.findFirst({ where: { profesor: c.profesor, complejoId: complejo.id, estado: 'PUBLICADA', fechaHoraInicio: { gte: new Date() } } }))) continue;
    await prisma.clase.create({
      data: {
        complejoId: complejo.id,
        canchaId: complejo.canchas[complejo.canchas.length - 1].id,
        profesor: c.profesor,
        nivel: c.nivel,
        descripcion: c.descripcion,
        fechaHoraInicio: enDias(c.dia, c.hora),
        fechaHoraFin: enDias(c.dia, c.hora + 1),
        cupo: c.cupo,
        precio: c.precio,
      },
    });
    clasesCreadas++;
  }
  console.log(`✅ ${clasesCreadas} clases publicadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
