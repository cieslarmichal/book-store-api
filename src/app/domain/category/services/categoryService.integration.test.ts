import { CategoryRepository } from '../repositories/categoryRepository';
import { CategoryService } from './categoryService';
import { CategoryTestDataGenerator } from '../testDataGenerators/categoryTestDataGenerator';
import { ConfigLoader } from '../../../../configLoader';
import { createDIContainer } from '../../../shared';
import { DbModule } from '../../../shared';
import { CategoryModule } from '../categoryModule';
import { AuthorModule } from '../../author/authorModule';
import { CategoryAlreadyExists, CategoryNotFound } from '../errors';
import { PostgresHelper } from '../../../../integration/helpers/postgresHelper/postgresHelper';
import { LoggerModule } from '../../../shared/logger/loggerModule';
import { CATEGORY_REPOSITORY, CATEGORY_SERVICE } from '../categoryInjectionSymbols';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let categoryRepository: CategoryRepository;
  let categoryTestDataGenerator: CategoryTestDataGenerator;

  beforeAll(async () => {
    ConfigLoader.loadConfig();

    const container = await createDIContainer([DbModule, CategoryModule, AuthorModule, LoggerModule]);

    categoryService = container.resolve(CATEGORY_SERVICE);
    categoryRepository = container.resolve(CATEGORY_REPOSITORY);

    categoryTestDataGenerator = new CategoryTestDataGenerator();
  });

  afterEach(async () => {
    await PostgresHelper.removeDataFromTables();
  });

  describe('Create category', () => {
    it('creates category in database', async () => {
      expect.assertions(1);

      const { name } = categoryTestDataGenerator.generateData();

      const createdCategoryDto = await categoryService.createCategory({
        name,
      });

      const categoryDto = await categoryRepository.findOneById(createdCategoryDto.id);

      expect(categoryDto).not.toBeNull();
    });

    it('should not create category and throw if category with the same name exists', async () => {
      expect.assertions(1);

      const { name } = categoryTestDataGenerator.generateData();

      await categoryRepository.createOne({
        name,
      });

      try {
        await categoryService.createCategory({
          name,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(CategoryAlreadyExists);
      }
    });
  });

  describe('Find category', () => {
    it('finds category by id in database', async () => {
      expect.assertions(1);

      const { name } = categoryTestDataGenerator.generateData();

      const category = await categoryRepository.createOne({
        name,
      });

      const foundCategory = await categoryService.findCategory(category.id);

      expect(foundCategory).not.toBeNull();
    });

    it('should throw if category with given id does not exist in db', async () => {
      expect.assertions(1);

      const { id } = categoryTestDataGenerator.generateData();

      try {
        await categoryService.findCategory(id);
      } catch (error) {
        expect(error).toBeInstanceOf(CategoryNotFound);
      }
    });
  });

  describe('Find categories', () => {
    it('finds categories in database', async () => {
      expect.assertions(2);

      const { name } = categoryTestDataGenerator.generateData();

      const category = await categoryRepository.createOne({
        name,
      });

      const foundCategories = await categoryService.findCategories({}, { page: 1, limit: 5 });

      expect(foundCategories.length).toBe(1);
      expect(foundCategories[0]).toStrictEqual(category);
    });
  });

  describe('Remove category', () => {
    it('removes category from database', async () => {
      expect.assertions(1);

      const { name } = categoryTestDataGenerator.generateData();

      const category = await categoryRepository.createOne({
        name,
      });

      await categoryService.removeCategory(category.id);

      const categoryDto = await categoryRepository.findOneById(category.id);

      expect(categoryDto).toBeNull();
    });

    it('should throw if category with given id does not exist', async () => {
      expect.assertions(1);

      const { id } = categoryTestDataGenerator.generateData();

      try {
        await categoryService.removeCategory(id);
      } catch (error) {
        expect(error).toBeInstanceOf(CategoryNotFound);
      }
    });
  });
});
