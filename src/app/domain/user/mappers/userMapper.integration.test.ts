import { EntityManager } from 'typeorm';
import { User } from '../entities/user';
import { UserMapper } from './userMapper';
import { UserTestDataGenerator } from '../testDataGenerators/userTestDataGenerator';
import { ConfigLoader } from '../../../../configLoader';
import { createDIContainer } from '../../../shared';
import { DbModule } from '../../../shared';
import { UserModule } from '../userModule';
import { PostgresHelper } from '../../../../integration/helpers/postgresHelper/postgresHelper';
import { LoggerModule } from '../../../shared/logger/loggerModule';
import { USER_MAPPER } from '../userInjectionSymbols';
import { ENTITY_MANAGER } from '../../../shared/db/dbInjectionSymbols';

describe('UserMapper', () => {
  let userMapper: UserMapper;
  let userTestDataGenerator: UserTestDataGenerator;
  let entityManager: EntityManager;

  beforeAll(async () => {
    ConfigLoader.loadConfig();

    const container = await createDIContainer([DbModule, UserModule, LoggerModule]);

    userMapper = container.resolve(USER_MAPPER);
    entityManager = container.resolve(ENTITY_MANAGER);

    userTestDataGenerator = new UserTestDataGenerator();
  });

  afterEach(async () => {
    await PostgresHelper.removeDataFromTables();
  });

  describe('Map user', () => {
    it('map user from entity to dto', async () => {
      expect.assertions(1);

      const { email, password, phoneNumber } = userTestDataGenerator.generateData();

      const createdUser = entityManager.create(User, {
        email,
        password,
        phoneNumber,
      });

      const savedUser = await entityManager.save(createdUser);

      const userDto = userMapper.mapEntityToDto(savedUser);

      expect(userDto).toEqual({
        id: savedUser.id,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
        email: savedUser.email,
        phoneNumber: savedUser.phoneNumber,
        password: savedUser.password,
        role: savedUser.role,
      });
    });
  });
});
