import { ConfigLoader } from '../../../configLoader';
import { UserTestDataGenerator } from '../../domain/user/testDataGenerators/userTestDataGenerator';
import request from 'supertest';
import { App } from '../../../app';
import { createDIContainer } from '../../shared';
import { DbModule } from '../../shared';
import { UserModule } from '../../domain/user/userModule';
import { ControllersModule } from '../controllersModule';
import { Server } from '../../../server';
import { UserRepository } from '../../domain/user/repositories/userRepository';
import { StatusCodes } from 'http-status-codes';
import { PostgresHelper } from '../../../integration/helpers/postgresHelper/postgresHelper';
import { HashService } from '../../domain/user/services/hashService';
import { AuthHelper } from '../../../integration/helpers';
import { BookModule } from '../../domain/book/bookModule';
import { AuthorModule } from '../../domain/author/authorModule';
import { CategoryModule } from '../../domain/category/categoryModule';
import { AuthorBookModule } from '../../domain/authorBook/authorBookModule';
import { LoggerModule } from '../../shared/logger/loggerModule';
import { HASH_SERVICE, USER_REPOSITORY } from '../../domain/user/userInjectionSymbols';
import { BookCategoryModule } from '../../domain/bookCategory/bookCategoryModule';
import { AddressModule } from '../../domain/address/addressModule';
import { CustomerModule } from '../../domain/customer/customerModule';

const baseUrl = '/users';
const registerUrl = `${baseUrl}/register`;
const loginUrl = `${baseUrl}/login`;
const setPasswordUrl = `${baseUrl}/set-password`;

describe(`UserController (${baseUrl})`, () => {
  let userRepository: UserRepository;
  let hashService: HashService;
  let userTestDataGenerator: UserTestDataGenerator;
  let server: Server;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    ConfigLoader.loadConfig();

    userTestDataGenerator = new UserTestDataGenerator();
  });

  beforeEach(async () => {
    const container = await createDIContainer([
      DbModule,
      CategoryModule,
      BookModule,
      AuthorModule,
      UserModule,
      ControllersModule,
      AuthorBookModule,
      LoggerModule,
      BookCategoryModule,
      AddressModule,
      CustomerModule,
    ]);

    userRepository = container.resolve(USER_REPOSITORY);
    hashService = container.resolve(HASH_SERVICE);

    const app = new App(container);

    authHelper = new AuthHelper(container);

    server = new Server(app.instance);

    server.listen();
  });

  afterEach(async () => {
    server.close();

    await PostgresHelper.removeDataFromTables();
  });

  describe('Register user', () => {
    it('returns bad request when not all required properties in body are provided', async () => {
      expect.assertions(1);

      const { email } = userTestDataGenerator.generateData();

      const response = await request(server.instance).post(registerUrl).send({
        email,
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('returns unprocessable entity when user with given email already exists', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      await userRepository.createOne({ email, password });

      const response = await request(server.instance).post(registerUrl).send({
        email,
        password,
      });

      expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
    });

    it('returns created when all required body properties are provided', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const response = await request(server.instance).post(registerUrl).send({
        email,
        password,
      });

      expect(response.statusCode).toBe(StatusCodes.CREATED);
    });
  });

  describe('Login user', () => {
    it('returns bad request when not all required properties in body are provided', async () => {
      expect.assertions(1);

      const { email } = userTestDataGenerator.generateData();

      const response = await request(server.instance).post(loginUrl).send({
        email,
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('returns not found when user with given email does not exist', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const response = await request(server.instance).post(loginUrl).send({
        email,
        password,
      });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('returns ok when existing credentials are provided', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const hashedPassword = await hashService.hash(password);

      await userRepository.createOne({ email, password: hashedPassword });

      const response = await request(server.instance).post(loginUrl).send({
        email,
        password,
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
    });
  });

  describe('Set password', () => {
    it('returns bad request when not all required properties in body are provided', async () => {
      expect.assertions(1);

      const { id: userId, password, role } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .post(setPasswordUrl)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password,
        });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('returns not found when user with given id does not exist', async () => {
      expect.assertions(1);

      const { id: userId, password, role } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .post(setPasswordUrl)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId,
          password,
        });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('returns unauthorized when access token is not provided', async () => {
      expect.assertions(1);

      const { id: userId, password } = userTestDataGenerator.generateData();

      const response = await request(server.instance).post(setPasswordUrl).send({
        userId,
        password,
      });

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('returns forbidden when user id from access token does not match target user id', async () => {
      expect.assertions(1);

      const { id: userId, password, role } = userTestDataGenerator.generateData();

      const { id: targetUserId } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .post(setPasswordUrl)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: targetUserId,
          password,
        });

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('returns no content when all required fields provided and user with given id exists', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const user = await userRepository.createOne({ email, password });

      const accessToken = authHelper.mockAuth({ userId: user.id, role: user.role });

      const response = await request(server.instance)
        .post(setPasswordUrl)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: user.id,
          password,
        });

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT);
    });
  });

  describe('Find user', () => {
    it('returns bad request the userId param is not uuid', async () => {
      expect.assertions(1);

      const userId = 'abc';

      const { role } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .get(`${baseUrl}/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('returns not found when user with given userId does not exist', async () => {
      expect.assertions(1);

      const { id: userId, role } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .get(`${baseUrl}/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('returns unauthorized when access token is not provided', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const user = await userRepository.createOne({ email, password });

      const response = await request(server.instance).get(`${baseUrl}/${user.id}`);

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('returns forbidden when user id from access token does not match target user id', async () => {
      expect.assertions(1);

      const { id: userId, role } = userTestDataGenerator.generateData();

      const { id: targetUserId } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .get(`${baseUrl}/${targetUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('accepts a request and returns ok when userId is uuid and have corresponding user', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const user = await userRepository.createOne({ email, password });

      const accessToken = authHelper.mockAuth({ userId: user.id, role: user.role });

      const response = await request(server.instance)
        .get(`${baseUrl}/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(StatusCodes.OK);
    });
  });

  describe('Remove user', () => {
    it('returns bad request when the userId param is not uuid', async () => {
      expect.assertions(1);

      const userId = 'abc';

      const { role } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .delete(`${baseUrl}/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('returns not found when user with given userId does not exist', async () => {
      expect.assertions(1);

      const { id: userId, role } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .delete(`${baseUrl}/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('returns unauthorized when access token is not provided', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const user = await userRepository.createOne({ email, password });

      const response = await request(server.instance).delete(`${baseUrl}/${user.id}`);

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('returns forbidden when user id from access token does not match target user id', async () => {
      expect.assertions(1);

      const { id: userId, role } = userTestDataGenerator.generateData();

      const { id: targetUserId } = userTestDataGenerator.generateData();

      const accessToken = authHelper.mockAuth({ userId, role });

      const response = await request(server.instance)
        .delete(`${baseUrl}/${targetUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('accepts a request and returns no content when userId is uuid and corresponds to existing user', async () => {
      expect.assertions(1);

      const { email, password } = userTestDataGenerator.generateData();

      const user = await userRepository.createOne({ email, password });

      const accessToken = authHelper.mockAuth({ userId: user.id, role: user.role });

      const response = await request(server.instance)
        .delete(`${baseUrl}/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT);
    });
  });
});
