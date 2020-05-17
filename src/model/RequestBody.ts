export interface LoginRequest {
  username: string;
  password: string;
  sessionHours?: number;
  app?: string;
}