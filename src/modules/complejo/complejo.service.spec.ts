import { Test, TestingModule } from '@nestjs/testing';
import { ComplejoService } from './complejo.service';

describe('ComplejoService', () => {
  let service: ComplejoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplejoService],
    }).compile();

    service = module.get<ComplejoService>(ComplejoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
