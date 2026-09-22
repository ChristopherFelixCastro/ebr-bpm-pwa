import { z } from 'zod';

export const newPasswordSchema = z.string().min(12).max(1024);
