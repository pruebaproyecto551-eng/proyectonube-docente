-- =====================================================================
-- Profesora Platform - Datos de desarrollo
-- Hashes generados con bcryptjs (cost 10), verificados con compareSync:
--   admin@profesora.app   -> admin123
--   maria@profesora.app   -> teacher123
--   pedro@profesora.app   -> student123
-- =====================================================================

TRUNCATE TABLE refresh_tokens, oauth_accounts, files, attendance, grades,
               assignments, enrollments, courses, students, teachers, users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, email, password_hash, full_name, role, email_verified_at) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'admin@profesora.app',
   '$2a$10$W/ilmiiho/mpWda2pW48jekXxTsWg8ZvIdso7b71/MRMsp8ZG6MGe',
   'Admin',
   'admin',
   NOW()),
  ('22222222-2222-2222-2222-222222222222',
   'maria@profesora.app',
   '$2a$10$KALlqr4/9qHPOLMBFGb/G.wG2FRj6LQ3gMeXIZPPCUMZAIw20pIX6',
   'María López',
   'teacher',
   NOW()),
  ('33333333-3333-3333-3333-333333333333',
   'pedro@profesora.app',
   '$2a$10$sK3L2ajtjCRoFerxhCuy5eDh4bMY5NRgsb8eZetpPjrXJUBG5V78O',
   'Pedro García',
   'student',
   NOW());

INSERT INTO teachers (id, user_id, employee_number, department, phone) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222',
   'T-001',
   'Matemáticas',
   '+34 600 000 001');

INSERT INTO students (id, user_id, student_number, grade_level, guardian_name) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-3333-3333-3333-333333333333',
   'S-001',
   '10A',
   'Ana García');

INSERT INTO courses (id, teacher_id, name, code, description, color) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Matemáticas 10A',
   'MAT-10A',
   'Curso de matemáticas para 10A',
   '#3b82f6');

INSERT INTO enrollments (course_id, student_id) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

INSERT INTO assignments (id, course_id, title, category, status, max_score, due_date) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Examen inicial',
   'exam',
   'published',
   100,
   NOW() + INTERVAL '7 days');

INSERT INTO grades (course_id, student_id, assignment_id, title, category, score, max_score, weight, graded_on) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'Examen inicial',
   'exam',
   85,
   100,
   1,
   CURRENT_DATE);
