-- CreateTable
CREATE TABLE `notificaciones` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `cuerpo` VARCHAR(191) NOT NULL,
    `ref_id` VARCHAR(191) NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificaciones_usuario_id_creado_en_idx`(`usuario_id`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispositivos` (
    `token` VARCHAR(512) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `plataforma` VARCHAR(191) NOT NULL,
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `dispositivos_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispositivos` ADD CONSTRAINT `dispositivos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

