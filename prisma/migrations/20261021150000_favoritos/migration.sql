-- CreateTable
CREATE TABLE `favoritos` (
    `usuario_id` VARCHAR(191) NOT NULL,
    `complejo_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`usuario_id`, `complejo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

