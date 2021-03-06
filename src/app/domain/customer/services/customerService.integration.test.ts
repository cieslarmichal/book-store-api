import { CustomerService } from './customerService';
import { CustomerTestDataGenerator } from '../testDataGenerators/customerTestDataGenerator';
import { ConfigLoader } from '../../../../configLoader';
import { createDIContainer, dbManager, UnitOfWorkModule } from '../../../shared';
import { DbModule } from '../../../shared';
import { CustomerModule } from '../customerModule';
import { CustomerAlreadyExists, CustomerNotFound } from '../errors';
import { TestTransactionInternalRunner } from '../../../../integration/helpers/unitOfWorkHelper/testTransactionInternalRunner';
import { LoggerModule } from '../../../shared/logger/loggerModule';
import { CUSTOMER_REPOSITORY_FACTORY, CUSTOMER_SERVICE } from '../customerInjectionSymbols';
import { UserTestDataGenerator } from '../../user/testDataGenerators/userTestDataGenerator';
import { USER_REPOSITORY_FACTORY } from '../../user/userInjectionSymbols';
import { UserModule } from '../../user/userModule';
import { CustomerRepositoryFactory } from '../repositories/customerRepositoryFactory';
import { UserRepositoryFactory } from '../../user/repositories/userRepositoryFactory';

describe('CustomerService', () => {
  let customerService: CustomerService;
  let customerRepositoryFactory: CustomerRepositoryFactory;
  let userRepositoryFactory: UserRepositoryFactory;
  let customerTestDataGenerator: CustomerTestDataGenerator;
  let userTestDataGenerator: UserTestDataGenerator;
  let testTransactionRunner: TestTransactionInternalRunner;

  beforeAll(async () => {
    ConfigLoader.loadConfig();

    const container = await createDIContainer([DbModule, CustomerModule, LoggerModule, UserModule, UnitOfWorkModule]);

    customerService = container.resolve(CUSTOMER_SERVICE);
    customerRepositoryFactory = container.resolve(CUSTOMER_REPOSITORY_FACTORY);
    userRepositoryFactory = container.resolve(USER_REPOSITORY_FACTORY);

    testTransactionRunner = new TestTransactionInternalRunner(container);

    customerTestDataGenerator = new CustomerTestDataGenerator();
    userTestDataGenerator = new UserTestDataGenerator();
  });

  afterAll(async () => {
    dbManager.closeConnection();
  });

  describe('Create customer', () => {
    it('creates customer in database', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { entityManager } = unitOfWork;
        const userRepository = userRepositoryFactory.create(entityManager);
        const customerRepository = customerRepositoryFactory.create(entityManager);

        const { email, password, role } = userTestDataGenerator.generateData();

        const user = await userRepository.createOne({ email, password, role });

        const createdCustomerDto = await customerService.createCustomer(unitOfWork, { userId: user.id });

        const customerDto = await customerRepository.findOneById(createdCustomerDto.id);

        expect(customerDto).not.toBeNull();
      });
    });

    it('throws if customer with userId already exists in database', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { entityManager } = unitOfWork;
        const userRepository = userRepositoryFactory.create(entityManager);
        const customerRepository = customerRepositoryFactory.create(entityManager);

        const { email, password, role } = userTestDataGenerator.generateData();

        const user = await userRepository.createOne({ email, password, role });

        await customerRepository.createOne({ userId: user.id });

        try {
          await customerService.createCustomer(unitOfWork, { userId: user.id });
        } catch (error) {
          expect(error).toBeInstanceOf(CustomerAlreadyExists);
        }
      });
    });
  });

  describe('Find customer', () => {
    it('finds customer by id in database', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { entityManager } = unitOfWork;
        const userRepository = userRepositoryFactory.create(entityManager);
        const customerRepository = customerRepositoryFactory.create(entityManager);

        const { email, password, role } = userTestDataGenerator.generateData();

        const user = await userRepository.createOne({ email, password, role });

        const customer = await customerRepository.createOne({ userId: user.id });

        const foundCustomer = await customerService.findCustomer(unitOfWork, { id: customer.id });

        expect(foundCustomer).not.toBeNull();
      });
    });

    it('finds customer by userId in database', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { entityManager } = unitOfWork;
        const userRepository = userRepositoryFactory.create(entityManager);
        const customerRepository = customerRepositoryFactory.create(entityManager);

        const { email, password, role } = userTestDataGenerator.generateData();

        const user = await userRepository.createOne({ email, password, role });

        await customerRepository.createOne({ userId: user.id });

        const foundCustomer = await customerService.findCustomer(unitOfWork, { userId: user.id });

        expect(foundCustomer).not.toBeNull();
      });
    });

    it('should throw if customer with given id does not exist in db', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { id } = customerTestDataGenerator.generateData();

        try {
          await customerService.findCustomer(unitOfWork, { id });
        } catch (error) {
          expect(error).toBeInstanceOf(CustomerNotFound);
        }
      });
    });
  });

  describe('Remove customer', () => {
    it('removes customer from database', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { entityManager } = unitOfWork;
        const userRepository = userRepositoryFactory.create(entityManager);
        const customerRepository = customerRepositoryFactory.create(entityManager);

        const { email, password, role } = userTestDataGenerator.generateData();

        const user = await userRepository.createOne({ email, password, role });

        const customer = await customerRepository.createOne({ userId: user.id });

        await customerService.removeCustomer(unitOfWork, customer.id);

        const customerDto = await customerRepository.findOneById(customer.id);

        expect(customerDto).toBeNull();
      });
    });

    it('should throw if customer with given id does not exist', async () => {
      expect.assertions(1);

      await testTransactionRunner.runInTestTransaction(async (unitOfWork) => {
        const { id } = customerTestDataGenerator.generateData();

        try {
          await customerService.removeCustomer(unitOfWork, id);
        } catch (error) {
          expect(error).toBeInstanceOf(CustomerNotFound);
        }
      });
    });
  });
});
