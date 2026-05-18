import { Test, TestingModule } from '@nestjs/testing';
import { TurnoFijoController } from './turno-fijo.controller';

describe('TurnoFijoController', () => {
  let controller: TurnoFijoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurnoFijoController],
    }).compile();

    controller = module.get<TurnoFijoController>(TurnoFijoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
