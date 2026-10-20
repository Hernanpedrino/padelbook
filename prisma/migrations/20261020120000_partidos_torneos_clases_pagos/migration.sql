-- AlterTable
ALTER TABLE `complejos` ADD COLUMN `pagos_habilitados` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `categoria` ENUM('PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA') NULL,
    ADD COLUMN `genero` ENUM('MASCULINO', 'FEMENINO') NULL;

-- CreateTable
CREATE TABLE `partidos` (
    `id` VARCHAR(191) NOT NULL,
    `turno_id` VARCHAR(191) NOT NULL,
    `creador_id` VARCHAR(191) NOT NULL,
    `categoria` ENUM('PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA') NOT NULL,
    `rama` ENUM('MASCULINO', 'FEMENINO', 'MIXTO') NOT NULL,
    `jugadores_buscados` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `estado` ENUM('ABIERTO', 'COMPLETO', 'CANCELADO') NOT NULL DEFAULT 'ABIERTO',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `partidos_turno_id_idx`(`turno_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partido_jugadores` (
    `id` VARCHAR(191) NOT NULL,
    `partido_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `partido_jugadores_partido_id_usuario_id_key`(`partido_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `torneos` (
    `id` VARCHAR(191) NOT NULL,
    `complejo_id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `categoria` ENUM('PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA') NOT NULL,
    `rama` ENUM('MASCULINO', 'FEMENINO', 'MIXTO') NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `cierre_inscripcion` DATETIME(3) NOT NULL,
    `cupo_parejas` INTEGER NOT NULL,
    `precio_inscripcion` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('BORRADOR', 'PUBLICADO', 'INSCRIPCION_CERRADA', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'BORRADOR',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripciones_torneo` (
    `id` VARCHAR(191) NOT NULL,
    `torneo_id` VARCHAR(191) NOT NULL,
    `jugador1_id` VARCHAR(191) NOT NULL,
    `jugador2_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inscripciones_torneo_torneo_id_idx`(`torneo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clases` (
    `id` VARCHAR(191) NOT NULL,
    `complejo_id` VARCHAR(191) NOT NULL,
    `cancha_id` VARCHAR(191) NOT NULL,
    `profesor` VARCHAR(191) NOT NULL,
    `nivel` ENUM('PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA') NULL,
    `descripcion` VARCHAR(191) NULL,
    `fecha_hora_inicio` DATETIME(3) NOT NULL,
    `fecha_hora_fin` DATETIME(3) NOT NULL,
    `cupo` INTEGER NOT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('PUBLICADA', 'CANCELADA') NOT NULL DEFAULT 'PUBLICADA',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripciones_clase` (
    `id` VARCHAR(191) NOT NULL,
    `clase_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inscripciones_clase_clase_id_usuario_id_key`(`clase_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos` (
    `id` VARCHAR(191) NOT NULL,
    `complejo_id` VARCHAR(191) NOT NULL,
    `reserva_id` VARCHAR(191) NULL,
    `inscripcion_torneo_id` VARCHAR(191) NULL,
    `inscripcion_clase_id` VARCHAR(191) NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `metodo` ENUM('EFECTIVO', 'TRANSFERENCIA', 'MERCADOPAGO', 'OTRO') NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `referencia` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partidos` ADD CONSTRAINT `partidos_turno_id_fkey` FOREIGN KEY (`turno_id`) REFERENCES `turnos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidos` ADD CONSTRAINT `partidos_creador_id_fkey` FOREIGN KEY (`creador_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partido_jugadores` ADD CONSTRAINT `partido_jugadores_partido_id_fkey` FOREIGN KEY (`partido_id`) REFERENCES `partidos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partido_jugadores` ADD CONSTRAINT `partido_jugadores_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `torneos` ADD CONSTRAINT `torneos_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones_torneo` ADD CONSTRAINT `inscripciones_torneo_torneo_id_fkey` FOREIGN KEY (`torneo_id`) REFERENCES `torneos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones_torneo` ADD CONSTRAINT `inscripciones_torneo_jugador1_id_fkey` FOREIGN KEY (`jugador1_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones_torneo` ADD CONSTRAINT `inscripciones_torneo_jugador2_id_fkey` FOREIGN KEY (`jugador2_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clases` ADD CONSTRAINT `clases_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clases` ADD CONSTRAINT `clases_cancha_id_fkey` FOREIGN KEY (`cancha_id`) REFERENCES `canchas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones_clase` ADD CONSTRAINT `inscripciones_clase_clase_id_fkey` FOREIGN KEY (`clase_id`) REFERENCES `clases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones_clase` ADD CONSTRAINT `inscripciones_clase_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_reserva_id_fkey` FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_inscripcion_torneo_id_fkey` FOREIGN KEY (`inscripcion_torneo_id`) REFERENCES `inscripciones_torneo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_inscripcion_clase_id_fkey` FOREIGN KEY (`inscripcion_clase_id`) REFERENCES `inscripciones_clase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

