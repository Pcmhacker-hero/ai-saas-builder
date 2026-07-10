import { z } from "zod";

export const promptSchema = z.string()
  .min(10, "Prompt must be at least 10 characters long")
  .max(1000, "Prompt cannot exceed 1000 characters");

export const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const taskSchema = z.object({
  title: z.string()
    .min(3, "Task title must be at least 3 characters long")
    .max(100, "Task title cannot exceed 100 characters"),
});
