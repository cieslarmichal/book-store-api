import { IsDate, IsUUID } from 'class-validator';
import { RecordToInstanceTransformer } from '../../../shared';

export class BookCategoryDto {
  @IsUUID('4')
  public readonly id: string;

  @IsDate()
  public readonly createdAt: Date;

  @IsDate()
  public readonly updatedAt: Date;

  @IsUUID('4')
  public bookId: string;

  @IsUUID('4')
  public categoryId: string;

  public static readonly create = RecordToInstanceTransformer.transformFactory(BookCategoryDto);
}
