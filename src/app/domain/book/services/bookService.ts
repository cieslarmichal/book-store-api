import { NotFoundError } from '../../../shared';
import { Service } from 'typedi';
import { BookDto } from '../dtos';
import { BookRepository } from '../repositories/bookRepository';
import { CreateBookData, UpdateBookData } from './types';

@Service()
export class BookService {
  public constructor(private readonly bookRepository: BookRepository) {}

  public async createBook(bookData: CreateBookData): Promise<BookDto> {
    console.log('Creating book...');

    const book = await this.bookRepository.createOne(bookData);

    console.log('Book created.');

    return book;
  }

  public async findBook(bookId: number): Promise<BookDto> {
    const book = await this.bookRepository.findOneById(bookId);

    if (!book) {
      throw new NotFoundError(`Book with id ${bookId} not found`);
    }

    return book;
  }

  public async updateBook(bookId: number, bookData: UpdateBookData): Promise<BookDto> {
    console.log(`Updating book with id ${bookId}...`);

    const book = await this.bookRepository.updateOne(bookId, bookData);

    console.log(`Book with id ${bookId} updated.`);

    return book;
  }

  public async removeBook(bookId: number): Promise<void> {
    console.log(`Removing book with id ${bookId}...`);

    await this.bookRepository.removeOne(bookId);

    console.log(`Book with id ${bookId} removed.`);
  }
}
