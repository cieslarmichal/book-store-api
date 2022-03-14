import { IsNumber } from 'class-validator';
import { RecordToInstanceTransformer } from '../../../shared';

export class PaginationData {
  @IsNumber()
  public limit: number;

  @IsNumber()
  public offset: number;

  public static readonly create = RecordToInstanceTransformer.transformFactory(PaginationData);
}
