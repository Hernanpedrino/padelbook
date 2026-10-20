// Campos de Usuario que se pueden exponer; nunca incluir passwordHash en respuestas
export const usuarioPublicoSelect = {
  id: true,
  nombre: true,
  apellido: true,
  categoria: true,
  genero: true,
};

// Filtro de complejos que la app puede mostrar: los de organizaciones suspendidas no aparecen
export const complejoVisible = { organizacion: { estado: 'ACTIVA' as const } };

// Para el panel del admin, que necesita contactar al jugador
export const usuarioContactoSelect = {
  ...usuarioPublicoSelect,
  email: true,
  telefono: true,
};
