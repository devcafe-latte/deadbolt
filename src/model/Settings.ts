export class Settings {
  debug: boolean = (process.env.NODE_ENV !== "production");

  port: number = Number(process.env.PORT) || 3000;
  dbHost: string = process.env.DB_HOST || 'localhost';
  dbUser: string = process.env.DB_USER || 'root';
  dbPass: string = process.env.DB_PASS || '';
  dbPort: number = Number(process.env.DB_PORT) || 3306;
  dbName: string = process.env.DB_NAME || 'deadbolt';

  //All in hours
  sessionExpires: number = Number(process.env.SESSION_HOURS) || 24 * 14;
  confirmTokenExpires: number = Number(process.env.CONFIRM_TOKEN_EXPIRES_HOURS) || 24 * 7;
  resetTokenExpires: number = Number(process.env.RESET_TOKEN_EXPIRES_HOURS) || 24;
}