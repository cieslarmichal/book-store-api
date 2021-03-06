import { Mapper } from '../../../shared/mapper';
import { CategoryDto } from '../dtos';
import { Category } from '../entities/category';

export class CategoryMapper implements Mapper<Category, CategoryDto> {
  public mapEntityToDto(entity: Category): CategoryDto {
    const { id, createdAt, updatedAt, name } = entity;

    return CategoryDto.create({
      id,
      createdAt,
      updatedAt,
      name,
    });
  }
}
