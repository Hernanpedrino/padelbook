import { Test, TestingModule } from '@nestjs/testing';
import { TurnoFijoService } from './turno-fijo.service';

describe('TurnoFijoService', () => {
  let service: TurnoFijoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TurnoFijoService],
    }).compile();

    service = module.get<TurnoFijoService>(TurnoFijoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
