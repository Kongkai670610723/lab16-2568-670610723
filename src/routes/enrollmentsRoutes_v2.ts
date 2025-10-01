//ทำการ import Router, Request, Response
import { Router, type Request, type Response } from "express";

//
import { jwt } from "jsonwebtoken";
import { dontenv } from "dotenv";
dotenv.config();

//import type
import type { User, Student, UserPayload, CustomRequest, Enrollment } from "../libs/types.js";

// import database
import { users, reset_users } from "../db/db.js";
import { students } from "../db/db.js";
import { courses } from "../db/db.js";
import { enrollments, reset_enrollments } from "../db/db.js";

import { success } from "zod"; 
import { error } from "console";
import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.js";            //Admin Roles
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.js";        //Student Roles
import { checkAllRoles } from "../middlewares/checkAllRolesMiddleware.js";              //All Roles
import { zStudentId } from "../libs/zodValidators.js";
import { zEnrollmentBody } from "../libs/zodValidators.js";


const router = Router();

//GET   /api/v2/enrollments
router.get("/", authenticateToken, checkRoleAdmin, (req: CustomRequest,res: Response) => {
    try {
        const user_id = students.map((s: Student) =>{
            const students_Enrollments = enrollments
            .filter((ent: Enrollment) => ent.studentId === s.studentId)
            .map((ent: Enrollment) => ({ courseId: ent.courseId}));
            

            return {
                studentId: s.studentId,
                courses: students_Enrollments,
            };
        });

            return res.status(200).json({ 
                success: false,
                message: "Enrollments Information",
                data: user_id,
            });

    } catch (err) {
        return res.status(200).json({
            success: false,
            message: "Something is wrong, please try again",
            error: err,
        });
    }
});





// POST /api/v2/enrollments/login
router.post("/login", (req: Request, res: Response) => {
    try {
        // 1. get username and password from body
        const { username, password } = req.body;          //เพราะข้อมูลเราอยู่ใน body ทั้ง 2 ตัว
        const user = users.find(
            (u: User) => u.username === username && u.password === password         
            //ดึง Users มาดูทีละคน โดยแต่ละคนเราจะดูว่าค่าที่ส่งมามันตรงกับค่าที่ส่งมาใน request ไหม 

        );

        // 2. check if user exists (search with username & password in DB)      (เช็ก user ว่า คนที่คุณค้นมามันมีค่าจริงหรือป่าว)
        // ในกรณีที่ไม่มี user
        if (!user) {
            return res.status(401).json ({
                success: false,
                message: "Invalid username or password!"
            });
        }


        // 3. create JWT token (with user info object as payload) using JWT_SECRET_KEY
        //    (optional: save the token as part of User data)

        // ในกรณีที่มี user
        //ขั้นแรกต้องไปดึง secret มาก่อน
        const jwt_secret = process.env.JWT_SECRET || "forget_secret";


        //มีค่า key แล้ว
        //นำ key ไปใช้ในการเข้ารหัส

        //สร้าง Token
        const token = jwt.sign({                //ต้องการ playload (ข้อมูลที่ server อยากจะฝากฝังเข้าไปเก็บไว้ใน token ด้วย)
            //create JWT playload               // playload เอาไว้เพิ่มชื่อ บลาๆ~~ (แนบข้อมูลเท่าที่จำเป็น เผื่อมีคนเอาไปแกะ)
            username: user.username,
            studentId: user.studentId,
            role: user.role,
        },jwt_secret, { expiresIn: "5m" });     // jwt_secret เอาไว้ใช้เข้ารหัส && ฟังก์ชันเพิ่มเติม (Ex. { expiresIn: "5m" })



        // 4. send HTTP response with JWT token         //ทำการส่ง response กลับไป
        res.status(200).json({
            success: true,
            message: "Login successful",
            token                                       //อย่าลืมใส่ token
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
            error: error
        })
    }
  

  return res.status(500).json({
    success: false,
    message: "POST /api/v2/users/login has not been implemented yet",
  });
});





// POST /api/v2/enrollments/reset
router.post("/reset", (req: Request, res: Response) => {
  try {
    reset_enrollments();
    return res.status(200).json({
      success: true,
      message: "enrollments database has been reset",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});







// GET  /api/v2/enrollments/:studentId
// GET /api/v2/enrollments/:studentID
router.get(
  "/:studentId",
  authenticateToken,
  checkAllRoles,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const user = req.user;
      const result = zStudentId.safeParse(studentId);

      const foundIndex = students.findIndex(
        (s: Student) => s.studentId === studentId
      );

      const student = students.find(
        (sd: Student) => sd.studentId === studentId
      );

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exist",
        });
      }

      if (user?.role === "STUDENT" && user.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          massage: "Forbidden access",
        });
      }

      res.status(200).json({
        success: true,
        data: students[foundIndex],
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);







// POST /api/v2/enrollments/:studentID
router.post(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const { studentId: paramStudentId } = req.params;
      const { courseId } = req.body;
      const user = req.user;

      const result = zStudentId.safeParse(paramStudentId);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const student = students.find(
        (std: Student) => std.studentId === paramStudentId
      );
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exist",
        });
      }

      if (user?.role === "ADMIN" || user?.studentId !== paramStudentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const alreadyEnrolled = enrollments.find(
        (enr) =>
          enr.studentId === paramStudentId && enr.courseId === courseId
      );
      if (alreadyEnrolled) {
        return res.status(409).json({
          success: false,
          message: "studentId && courseId is already exists",
        });
      }

      const new_Enrollment = { studentId: paramStudentId, courseId };
      enrollments.push(new_Enrollment);

      return res.status(201).json({
        success: true,
        message: `Student ${paramStudentId} && Course ${courseId} has been added successfully`,
        data: new_Enrollment,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong, please try again",
        error: err,
      });
    }
  }
);









// DELETE /api/v2/enrollments/:studentID
router.delete(
  "/:studentId",
  authenticateToken,
  (req: CustomRequest, res: Response) => {
    try {
      const { studentId: paramStudentId } = req.params;
      const { courseId } = req.body;
      const user = req.user;

      if (user?.role !== "STUDENT" || user.studentId !== paramStudentId) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to modify another student's data",
        });
      }

      const index = enrollments.findIndex(
        (enr) => enr.studentId === paramStudentId && enr.courseId === courseId
      );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: "Enrollment does not exists",
        });
      }

      enrollments.splice(index, 1);

      return res.status(200).json({
        success: true,
        message: `Student ${paramStudentId} && Course ${courseId} has been deleted successfully`,
        data: enrollments.filter((enr) => enr.studentId === paramStudentId),
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong, please try again",
        error: err,
      });
    }
  }
);


export default router;