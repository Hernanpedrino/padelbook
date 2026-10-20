-- CreateTable
CREATE TABLE `organizaciones` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cuit` VARCHAR(191) NULL,
    `email_contacto` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `estado` ENUM('ACTIVA', 'SUSPENDIDA') NOT NULL DEFAULT 'ACTIVA',
    `plan_id` VARCHAR(191) NULL,
    `vencimiento` DATETIME(3) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planes` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `precio_mensual` DECIMAL(10, 2) NOT NULL,
    `max_complejos` INTEGER NULL,
    `max_canchas` INTEGER NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `planes_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos_servicio` (
    `id` VARCHAR(191) NOT NULL,
    `organizacion_id` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `metodo` ENUM('EFECTIVO', 'TRANSFERENCIA', 'MERCADOPAGO', 'OTRO') NOT NULL,
    `periodo_desde` DATETIME(3) NOT NULL,
    `periodo_hasta` DATETIME(3) NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Datos existentes: cada complejo pasa a tener su propia organización (id 'org-<id del complejo>')
INSERT INTO `organizaciones` (`id`, `nombre`, `email_contacto`, `telefono`)
SELECT CONCAT('org-', `id`), `nombre`, `email`, `telefono` FROM `complejos`;

-- AlterTable
ALTER TABLE `complejos` ADD COLUMN `organizacion_id` VARCHAR(191) NULL;
UPDATE `complejos` SET `organizacion_id` = CONCAT('org-', `id`);
ALTER TABLE `complejos` MODIFY `organizacion_id` VARCHAR(191) NOT NULL;

-- DropForeignKey
ALTER TABLE `admins` DROP FOREIGN KEY `admins_complejo_id_fkey`;

-- AlterTable: los admins existentes quedan como ADMIN de su complejo
ALTER TABLE `admins` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `organizacion_id` VARCHAR(191) NULL,
    ADD COLUMN `rol` ENUM('MANAGER', 'SUPERADMIN', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    MODIFY `complejo_id` VARCHAR(191) NULL;
UPDATE `admins` SET `organizacion_id` = CONCAT('org-', `complejo_id`) WHERE `complejo_id` IS NOT NULL;

-- AddForeignKey
ALTER TABLE `organizaciones` ADD CONSTRAINT `organizaciones_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `planes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos_servicio` ADD CONSTRAINT `pagos_servicio_organizacion_id_fkey` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complejos` ADD CONSTRAINT `complejos_organizacion_id_fkey` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `admins_organizacion_id_fkey` FOREIGN KEY (`organizacion_id`) REFERENCES `organizaciones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `admins_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
