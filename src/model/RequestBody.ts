import { twoFactorType } from './twoFactor/2faHelper';

export interface LoginRequest {
  username: string;
  password: string;
  sessionHours?: number;
  app?: string;
  twoFactorType?: twoFactorType;
}