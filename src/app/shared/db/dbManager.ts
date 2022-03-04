import { Book } from '../../domain/book/entities/book';
import { Author } from '../../domain/author/entities/author';
import { Connection, createConnection } from 'typeorm';
import { User } from '../../domain/user/entities/user';

class DbManager {
  private connection: Connection;

  public async getConnection(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT as string),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Book, Author, User],
      synchronize: true,
    });

    return this.connection;
  }

  public async closeConnection(): Promise<void> {
    await this.connection.close();
  }
}

export const dbManager = new DbManager();
