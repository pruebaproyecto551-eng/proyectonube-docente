export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Student {
  id: string;
  userId: string;
  studentNumber: string | null;
  gradeLevel: string | null;
  birthDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  fullName?: string;
  email?: string;
  courseId?: string | null;
  courseName?: string | null;
}

export interface Course {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
}

export interface Enrollment {
  courseId: string;
  studentId: string;
  enrolledAt: string;
}

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  category: string | null;
  dueDate: string | null;
  status: AssignmentStatus;
  maxScore: number;
  googleCalendarEventId?: string | null;
  driveFolderUrl?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentData?: string | null;
  submissionType?: 'in_class' | 'digital' | null;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileData?: string | null;
  submittedAt: string;
  status: 'submitted' | 'late' | 'graded';
  grade: number | null;
  feedback: string | null;
}

export interface Grade {
  id: string;
  courseId: string;
  studentId: string;
  assignmentId: string | null;
  title: string;
  category: string | null;
  score: number;
  maxScore: number;
  weight: number;
  gradedOn: string;
  notes: string | null;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentUrl?: string | null;
}

export interface TeacherDocument {
  id: string;
  teacherId: string;
  courseId?: string | null;
  courseName?: string | null;
  title: string;
  category: 'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro';
  period?: string | null;
  fileName: string;
  fileData?: string | null;
  fileUrl?: string | null;
  driveLink?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'absent_unexcused'
  | 'absent_excused'
  | 'late_unexcused'
  | 'late_excused';

export interface AttendanceRecord {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  lessonsCount?: number;
  pointsDeducted?: number;
  notes: string | null;
}

export interface AttendanceSummaryItem {
  totalDays: number;
  totalLessonsTaught?: number;
  presentLessons?: number;
  present: number;
  unexcusedAbsences: number;
  excusedAbsences: number;
  unexcusedTardies: number;
  excusedTardies: number;
  totalPointsDeducted: number;
  attendancePercentage?: number;
  calculatedAttendanceScore: number;
}

export interface Announcement {
  id: string;
  courseId: string | null;
  title: string;
  content: string;
  channels: string[];
  sentBy: string;
  createdAt: string;
}

export interface AIDiagnosticStudent {
  id: string;
  name: string;
  avgGrade: number;
  totalGrades: number;
  unexcusedAbsences: number;
  tardies: number;
  pointsDeducted: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  recommendations: string[];
}

export interface AIDiagnosticReport {
  summary: {
    totalStudents: number;
    groupAverage: number;
    highRiskCount: number;
    mediumRiskCount: number;
    overallHealth: string;
  };
  diagnostics: AIDiagnosticStudent[];
}

export interface AIRubricCriteria {
  name: string;
  points: number;
  levels: {
    advanced: string;
    intermediate: string;
    initial: string;
  };
}

export interface AIRubric {
  title: string;
  subject: string;
  gradeLevel: string;
  evaluationType: string;
  totalPoints: number;
  criteria: AIRubricCriteria[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export type JustificationStatus = 'pending' | 'approved' | 'rejected';

export interface Justification {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber?: string;
  courseId: string;
  courseName?: string;
  absenceDate: string;
  reason: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  status: JustificationStatus;
  teacherComment?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

