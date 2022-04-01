import { AuthorRepository } from '../repositories/authorRepository';
import { ConfigLoader } from '../../../../configLoader';
import { createDIContainer, EqualFilter, UnitOfWorkModule } from '../../../shared';
import { DbModule } from '../../../shared';
import { AuthorTestDataGenerator } from '../testDataGenerators/authorTestDataGenerator';
import { AuthorService } from './authorService';
import { AuthorModule } from '../authorModule';
import { BookModule } from '../../book/bookModule';
import { AuthorNotFound } from '../errors';
import { PostgresHelper } from '../../../../integration/helpers/postgresHelper/postgresHelper';
import { BookRepository } from '../../book/repositories/bookRepository';
import { AuthorBookModule } from '../../authorBook/authorBookModule';
import { AuthorBookRepository } from '../../authorBook/repositories/authorBookRepository';
import { BookTestDataGenerator } from '../../book/testDataGenerators/bookTestDataGenerator';
import { LoggerModule } from '../../../shared/logger/loggerModule';
import { AUTHOR_REPOSITORY_FACTORY, AUTHOR_SERVICE } from '../authorInjectionSymbols';
import { BOOK_REPOSITORY_FACTORY } from '../../book/bookInjectionSymbols';
import { AUTHOR_BOOK_REPOSITORY_FACTORY } from '../../authorBook/authorBookInjectionSymbols';
import { ENTITY_MANAGER } from '../../../shared/db/dbInjectionSymbols';

describe('AuthorService', () => {
  let authorService: AuthorService;
  let authorRepository: AuthorRepository;
  let bookRepository: BookRepository;
  let authorBookRepository: AuthorBookRepository;
  let authorTestDataGenerator: AuthorTestDataGenerator;
  let bookTestDataGenerator: BookTestDataGenerator;
  let postgresHelper: PostgresHelper;

  beforeAll(async () => {
    ConfigLoader.loadConfig();

    const container = await createDIContainer([
      DbModule,
      BookModule,
      AuthorModule,
      AuthorBookModule,
      LoggerModule,
      UnitOfWorkModule,
    ]);

    const entityManager = container.resolve(ENTITY_MANAGER);
    authorService = container.resolve(AUTHOR_SERVICE);
    authorRepository = container.resolve(AUTHOR_REPOSITORY_FACTORY).create(entityManager);
    bookRepository = container.resolve(BOOK_REPOSITORY_FACTORY).create(entityManager);
    authorBookRepository = container.resolve(AUTHOR_BOOK_REPOSITORY_FACTORY).create(entityManager);

    postgresHelper = new PostgresHelper(container);

    authorTestDataGenerator = new AuthorTestDataGenerator();
    bookTestDataGenerator = new BookTestDataGenerator();
  });

  describe('Create author', () => {
    it('creates author in database', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName } = authorTestDataGenerator.generateData();

        const createdAuthorDto = await authorService.createAuthor(unitOfWork, { firstName, lastName });

        const authorDto = await authorRepository.findOneById(createdAuthorDto.id);

        expect(authorDto).not.toBeNull();
      });
    });
  });

  describe('Find author', () => {
    it('finds author by id in database', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName } = authorTestDataGenerator.generateData();

        const author = await authorRepository.createOne({ firstName, lastName });

        const foundAuthor = await authorService.findAuthor(unitOfWork, author.id);

        expect(foundAuthor).not.toBeNull();
      });
    });

    it('should throw if author with given id does not exist in db', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { id } = authorTestDataGenerator.generateData();

        try {
          await authorService.findAuthor(unitOfWork, id);
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorNotFound);
        }
      });
    });
  });

  describe('Find authors', () => {
    it('finds authors by one condition in database', async () => {
      expect.assertions(2);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName } = authorTestDataGenerator.generateData();

        const author = await authorRepository.createOne({ firstName, lastName });

        const { firstName: otherFirstName, lastName: otherLastName } = authorTestDataGenerator.generateData();

        await authorRepository.createOne({ firstName: otherFirstName, lastName: otherLastName });

        const foundAuthors = await authorService.findAuthors(unitOfWork, [new EqualFilter('firstName', [firstName])], {
          page: 1,
          limit: 5,
        });

        expect(foundAuthors.length).toBe(1);
        expect(foundAuthors[0]).toStrictEqual(author);
      });
    });

    it('finds authors by two conditions in database', async () => {
      expect.assertions(2);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName } = authorTestDataGenerator.generateData();

        const author = await authorRepository.createOne({ firstName, lastName });

        const { firstName: otherFirstName, lastName: otherLastName } = authorTestDataGenerator.generateData();

        await authorRepository.createOne({ firstName: otherFirstName, lastName: otherLastName });

        const foundAuthors = await authorService.findAuthors(
          unitOfWork,
          [new EqualFilter('firstName', [firstName]), new EqualFilter('lastName', [lastName])],
          {
            page: 1,
            limit: 5,
          },
        );

        expect(foundAuthors.length).toBe(1);
        expect(foundAuthors[0]).toStrictEqual(author);
      });
    });

    it('finds authors in database limited by pagination', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName } = authorTestDataGenerator.generateData();

        await authorRepository.createOne({ firstName, lastName });

        const { lastName: otherLastName } = authorTestDataGenerator.generateData();

        await authorRepository.createOne({ firstName, lastName: otherLastName });

        const { lastName: anotherLastName } = authorTestDataGenerator.generateData();

        await authorRepository.createOne({ firstName, lastName: anotherLastName });

        const foundAuthors = await authorService.findAuthors(unitOfWork, [new EqualFilter('firstName', [firstName])], {
          page: 1,
          limit: 2,
        });

        expect(foundAuthors.length).toBe(2);
      });
    });
  });

  describe('Find authors by book id', () => {
    it('finds authors by book id with filtering in database', async () => {
      expect.assertions(4);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { title, releaseYear, language, format, price } = bookTestDataGenerator.generateData();

        const book = await bookRepository.createOne({
          title,
          releaseYear,
          language,
          format,
          price,
        });

        const firstAuthorData = authorTestDataGenerator.generateData();

        const firstAuthor = await authorRepository.createOne({
          firstName: firstAuthorData.firstName,
          lastName: firstAuthorData.lastName,
        });

        const secondAuthorData = authorTestDataGenerator.generateData();

        const secondAuthor = await authorRepository.createOne({
          firstName: secondAuthorData.firstName,
          lastName: secondAuthorData.lastName,
        });

        const thirdAuthorData = authorTestDataGenerator.generateData();

        await authorRepository.createOne({
          firstName: thirdAuthorData.firstName,
          lastName: thirdAuthorData.lastName,
        });

        await authorBookRepository.createOne({ bookId: book.id, authorId: firstAuthor.id });
        await authorBookRepository.createOne({ bookId: book.id, authorId: secondAuthor.id });

        const foundAuthors = await authorService.findAuthorsByBookId(
          unitOfWork,
          book.id,
          [new EqualFilter('firstName', [firstAuthor.firstName])],
          { page: 1, limit: 5 },
        );

        expect(foundAuthors).not.toBeNull();
        expect(foundAuthors.length).toBe(1);
        expect(foundAuthors[0].firstName).toBe(firstAuthor.firstName);
        expect(foundAuthors[0].lastName).toBe(firstAuthor.lastName);
      });
    });
  });

  describe('Update author', () => {
    it('updates author in database', async () => {
      expect.assertions(2);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName, about } = authorTestDataGenerator.generateData();

        const author = await authorRepository.createOne({ firstName, lastName });

        const updatedAuthor = await authorService.updateAuthor(unitOfWork, author.id, { about });

        expect(updatedAuthor).not.toBeNull();
        expect(updatedAuthor.about).toBe(about);
      });
    });

    it('should not update author and throw if author with given id does not exist', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { id, about } = authorTestDataGenerator.generateData();

        try {
          await authorService.updateAuthor(unitOfWork, id, { about });
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorNotFound);
        }
      });
    });
  });

  describe('Remove author', () => {
    it('removes author from database', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { firstName, lastName } = authorTestDataGenerator.generateData();

        const author = await authorRepository.createOne({ firstName, lastName });

        await authorService.removeAuthor(unitOfWork, author.id);

        const authorDto = await authorRepository.findOneById(author.id);

        expect(authorDto).toBeNull();
      });
    });

    it('should throw if author with given id does not exist', async () => {
      expect.assertions(1);

      await postgresHelper.runInTestTransaction(async (unitOfWork) => {
        const { id } = authorTestDataGenerator.generateData();

        try {
          await authorService.removeAuthor(unitOfWork, id);
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorNotFound);
        }
      });
    });
  });
});
