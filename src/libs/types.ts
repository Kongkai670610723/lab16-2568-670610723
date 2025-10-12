//D:\workspace\lab16-2568-670610723\src\libs\types.ts
interface Student {
  studentId: string;
  firstName: string;
  lastName: string;
  program: "CPE" | "ISNE";
  courses?: string[];
}
export type { Student };

interface Course {
  courseId: string;
  courseTitle: string;
  instructors: string[];
}
export type { Course };

interface Enrollment {
  studentId: string;
  courseId: string;
}
export type { Enrollment };

interface User {
  username: string;
  password: string;
  studentId?: string | null;
  role: "STUDENT" | "ADMIN";
  tokens?: string[];
}
export type { User };

// JWT Payload interface
interface UserPayload {
  username: string;
  studentId?: string;
  role: "STUDENT" | "ADMIN";
}
export type { UserPayload };

// Custom HTTP Request interface
import { type Request } from "express";
interface CustomRequest extends Request {
  user?: UserPayload; // Define the user property
  token?: string; // Define the token property
}
export type { CustomRequest };
