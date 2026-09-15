import type { IUser } from '../models/User.js';
import type { IBusiness } from '../models/Business.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: IUser;
      business?: IBusiness;
    }
  }
}

export {};

