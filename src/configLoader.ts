import dotenv from 'dotenv';

export class ConfigLoader {
  public static loadConfig() {
    dotenv.config();
  }
}
