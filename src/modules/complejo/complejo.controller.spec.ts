import { Test, TestingModule } from '@nestjs/testing';
import { ComplejoController } from './complejo.controller';

describe('ComplejoController', () => {
  let controller: ComplejoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplejoController],
    }).compile();

    controller = module.get<ComplejoController>(ComplejoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
