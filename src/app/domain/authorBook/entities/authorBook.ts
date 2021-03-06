import { IsOptional, IsDate, IsUUID } from 'class-validator';
import { Entity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Author } from '../../author/entities/author';
import { Book } from '../../book/entities/book';

export const AUTHOR_BOOK_TABLE_NAME = 'authorBooks';

@Entity({
  name: AUTHOR_BOOK_TABLE_NAME,
})
@Unique('unique_index_authorId_bookId', ['authorId', 'bookId'])
export class AuthorBook {
  @IsOptional()
  @IsUUID('4')
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @IsOptional()
  @IsDate()
  @CreateDateColumn({ type: 'timestamp' })
  public createdAt: Date;

  @IsOptional()
  @IsDate()
  @UpdateDateColumn({ type: 'timestamp' })
  public updatedAt: Date;

  @ManyToOne(() => Author, (author) => author.authorBooks, { onDelete: 'CASCADE' })
  public author?: Author;

  @IsOptional()
  @IsUUID('4')
  @Column({ type: 'uuid' })
  public authorId: string;

  @ManyToOne(() => Book, (book) => book.authorBooks, { onDelete: 'CASCADE' })
  public book?: Book;

  @IsOptional()
  @IsUUID('4')
  @Column({ type: 'uuid' })
  public bookId: string;
}
