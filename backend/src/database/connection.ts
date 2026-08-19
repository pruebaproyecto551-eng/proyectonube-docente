import { Pool, type PoolClient, type QueryResult } from 'pg';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

// Estado de conexión
let isPgAvailable = false;
let pgTested = false;

// Pool estándar de PostgreSQL
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 500,
});

pool.on('error', (err) => {
  // Manejo silencioso para no tirar el proceso si cae la BD externa
  if (isPgAvailable) {
    console.warn('[DB] Error en cliente PostgreSQL en reposo:', err.message);
  }
});

// =========================================================================
// MOTOR DE ALMACENAMIENTO EMBEBIDO LOCAL (FALLBACK RESILIENTE PARA DEV/DEMO)
// =========================================================================
interface LocalDBState {
  users: any[];
  teachers: any[];
  students: any[];
  courses: any[];
  enrollments: any[];
  assignments: any[];
  submissions: any[];
  grades: any[];
  attendance: any[];
  announcements: any[];
  files: any[];
  refresh_tokens: any[];
  justifications?: any[];
  teacher_documents?: any[];
}

const LOCAL_DB_PATH = path.resolve(__dirname, '../../data_store.json');

function getInitialSeedData(): LocalDBState {
  const teacherUserId = '11111111-1111-4111-a111-111111111111';
  const teacherId = '22222222-2222-4222-a222-222222222222';
  const student1UserId = '33333333-3333-4333-a333-333333333331';
  const student1Id = '44444444-4444-4444-a444-444444444441';
  const student2UserId = '33333333-3333-4333-a333-333333333332';
  const student2Id = '44444444-4444-4444-a444-444444444442';
  const student3UserId = '33333333-3333-4333-a333-333333333333';
  const student3Id = '44444444-4444-4444-a444-444444444443';
  const course1Id = '55555555-5555-4555-a555-555555555551';
  const course2Id = '55555555-5555-4555-a555-555555555552';

  return {
    users: [
      {
        id: teacherUserId,
        email: 'diana@mep.go.cr',
        password_hash: '$2a$12$e68Y2kYV.7k6q3a9a1wB6OI6VvMkW3WJm9k6q3a9a1wB6OI6VvMkW',
        full_name: 'Prof. Diana Chavarría (Teacher)',
        role: 'teacher',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '88888888-8888-4888-a888-888888888888',
        email: 'pruebaproyecto551@gmail.com',
        password_hash: '$2a$12$e68Y2kYV.7k6q3a9a1wB6OI6VvMkW3WJm9k6q3a9a1wB6OI6VvMkW',
        full_name: 'Prof. Diana Chavarría (Google Cloud)',
        role: 'teacher',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '99999999-9999-4999-a999-999999999999',
        email: 'maria@profesora.app',
        password_hash: '$2a$12$e68Y2kYV.7k6q3a9a1wB6OI6VvMkW3WJm9k6q3a9a1wB6OI6VvMkW',
        full_name: 'María Docente CINDEA',
        role: 'teacher',
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: student1UserId,
        email: '501230456@est.mep.go.cr',
        password_hash: '$2a$10$R1Nw0sm7QQiro0x2Nf6M3OLmuAKjf6Q/RLBxV6t14DpoqaCtusRIm',
        full_name: 'Pamela Leiva',
        role: 'student',
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    teachers: [
      {
        id: teacherId,
        user_id: teacherUserId,
        employee_number: 'MEP-70231',
        department: 'Departamento de Lenguas Extranjeras (Inglés) - CINDEA',
        phone: '+506 8899-1122',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    students: [
      {
        id: student1Id,
        user_id: student1UserId,
        student_number: '501230456',
        grade_level: 'Inglés CINDEA (10° y 11° Año)',
        birth_date: '2005-06-15',
        guardian_name: 'Familia Leiva (Contacto Principal)',
        guardian_phone: '+506 8899-7711',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    courses: [
      {
        id: course1Id,
        teacher_id: teacherId,
        name: 'Módulo 56: Inglés - Nivel Intermedio (CINDEA 10-A)',
        code: 'ENG-CINDEA-56',
        description: 'Grammar, Oral Communication & Reading Comprehension - CINDEA MEP 2026',
        color: '#2563EB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: course2Id,
        teacher_id: teacherId,
        name: 'Módulo 72: Inglés Técnico & Conversacional (CINDEA 11-B)',
        code: 'ENG-CINDEA-72',
        description: 'Technical English, Job Interviews & Listening Skills - CINDEA MEP 2026',
        color: '#059669',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    enrollments: [
      { id: 'e1', course_id: course1Id, student_id: student1Id, enrolled_at: new Date().toISOString() },
      { id: 'e2', course_id: course1Id, student_id: student2Id, enrolled_at: new Date().toISOString() },
      { id: 'e3', course_id: course1Id, student_id: student3Id, enrolled_at: new Date().toISOString() },
      { id: 'e4', course_id: course2Id, student_id: student1Id, enrolled_at: new Date().toISOString() },
      { id: 'e5', course_id: course2Id, student_id: student2Id, enrolled_at: new Date().toISOString() },
    ],
    assignments: [
      {
        id: 'a1111111-1111-4111-a111-111111111111',
        course_id: course1Id,
        title: 'Task 1: Reading Comprehension & Personal Goals Essay',
        description: 'Read the short story "Overcoming Challenges as an Adult Learner" and answer the 5 questions. Attach your Word document, PDF, or a voice audio recording reading paragraph 3.',
        category: 'Tareas (10%)',
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        status: 'published',
        max_score: 100,
        google_calendar_event_id: 'cal_evt_eng_t1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'a2222222-2222-4222-a222-222222222222',
        course_id: course1Id,
        title: 'Classwork 1: English Dialogue & Oral Presentation',
        description: 'In pairs, roleplay a conversation ordering food in a restaurant or introducing a classmate. Pronunciation and fluency evaluation.',
        category: 'Trabajo Cotidiano (50%)',
        due_date: new Date(Date.now() - 86400000).toISOString(),
        status: 'published',
        max_score: 100,
        google_calendar_event_id: 'cal_evt_eng_c1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'a3333333-3333-4333-a333-333333333333',
        course_id: course1Id,
        title: 'I Partial Exam: Grammar & Listening Comprehension',
        description: 'Evaluation covering Simple Past vs Present Perfect, vocabulary in context and audio listening section.',
        category: 'Pruebas / Exámenes (30%)',
        due_date: new Date(Date.now() + 86400000 * 10).toISOString(),
        status: 'published',
        max_score: 100,
        google_calendar_event_id: 'cal_evt_eng_p1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    submissions: [
      {
        id: 'sub-1',
        assignment_id: 'a1111111-1111-4111-a111-111111111111',
        student_id: student1Id,
        file_name: 'Reading_Essay_PedroRamirez.docx',
        file_url: '/Drive/2026/Ingles_CINDEA_56/Task_1/Reading_Essay_PedroRamirez.docx',
        file_size: 1450000,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        grade: 92,
        feedback: 'Great vocabulary and clear grammar structures! Keep practicing past irregular verbs.',
      },
      {
        id: 'sub-2',
        assignment_id: 'a1111111-1111-4111-a111-111111111111',
        student_id: student2Id,
        file_name: 'English_Task1_ValeriaCastro.pdf',
        file_url: '/Drive/2026/Ingles_CINDEA_56/Task_1/English_Task1_ValeriaCastro.pdf',
        file_size: 950000,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        grade: 98,
        feedback: 'Excellent writing and accurate syntax. Well done!',
      },
    ],
    grades: [
      {
        id: 'g1',
        course_id: course1Id,
        student_id: student1Id,
        assignment_id: 'a2222222-2222-4222-a222-222222222222',
        title: 'Classwork 1: English Dialogue & Oral Presentation',
        category: 'Trabajo Cotidiano (50%)',
        score: 90,
        max_score: 100,
        weight: 50,
        graded_on: new Date().toISOString().slice(0, 10),
        notes: 'Good pronunciation and active participation in class.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g2',
        course_id: course1Id,
        student_id: student2Id,
        assignment_id: 'a2222222-2222-4222-a222-222222222222',
        title: 'Classwork 1: English Dialogue & Oral Presentation',
        category: 'Trabajo Cotidiano (50%)',
        score: 95,
        max_score: 100,
        weight: 50,
        graded_on: new Date().toISOString().slice(0, 10),
        notes: 'Very natural conversation and wide vocabulary range.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g3',
        course_id: course1Id,
        student_id: student3Id,
        assignment_id: 'a2222222-2222-4222-a222-222222222222',
        title: 'Classwork 1: English Dialogue & Oral Presentation',
        category: 'Trabajo Cotidiano (50%)',
        score: 65,
        max_score: 100,
        weight: 50,
        graded_on: new Date().toISOString().slice(0, 10),
        notes: 'Needs additional practice with irregular verbs pronunciation.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    attendance: [
      {
        id: 'att-1',
        course_id: course1Id,
        student_id: student1Id,
        date: new Date().toISOString().slice(0, 10),
        status: 'present',
        lessons_count: 2,
        points_deducted: 0,
        notes: 'Presente en ambas lecciones de inglés',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'att-2',
        course_id: course1Id,
        student_id: student2Id,
        date: new Date().toISOString().slice(0, 10),
        status: 'present',
        lessons_count: 2,
        points_deducted: 0,
        notes: 'Presente y participativa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'att-3',
        course_id: course1Id,
        student_id: student3Id,
        date: new Date().toISOString().slice(0, 10),
        status: 'late_unexcused',
        lessons_count: 2,
        points_deducted: 0.5,
        notes: 'Llegó 15 minutos tarde por horario laboral CINDEA',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    announcements: [
      {
        id: 'ann-1',
        course_id: course1Id,
        title: '📢 English Task #1 Reminder & Next Speaking Exam',
        content: 'Dear CINDEA students: Please remember that Task #1 (Reading & Essay) is due this Friday on the Cloud Platform. Also, review the irregular verbs list for our oral practice next lesson.',
        channels: ['email', 'whatsapp'],
        created_at: new Date().toISOString(),
        sent_by: 'Docente de Inglés CINDEA',
      },
    ],
    files: [],
    refresh_tokens: [],
    justifications: [
      {
        id: 'just-demo-1',
        student_id: student1Id,
        student_name: 'Pamela Leiva',
        student_number: '501230456',
        course_id: course1Id,
        course_name: 'Inglés Módulo 52 (Intermedio)',
        absence_date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
        reason: 'Cita médica odontológica en la CCSS y reposo justificado de 24 horas.',
        file_name: 'Comprobante_Medico_CCSS.pdf',
        file_type: 'application/pdf',
        file_data: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
        status: 'pending',
        teacher_comment: null,
        reviewed_at: null,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  };
}

let localDb: LocalDBState = (() => {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
      if (!data.justifications) {
        data.justifications = [
          {
            id: 'just-demo-1',
            student_id: '44444444-4444-4444-a444-444444444441',
            student_name: 'Pamela Leiva',
            student_number: '501230456',
            course_id: '55555555-5555-4555-a555-555555555551',
            course_name: 'Inglés Módulo 52 (Intermedio)',
            absence_date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
            reason: 'Cita médica odontológica en la CCSS y reposo justificado de 24 horas.',
            file_name: 'Comprobante_Medico_CCSS.pdf',
            file_type: 'application/pdf',
            file_data: '',
            status: 'pending',
            teacher_comment: null,
            reviewed_at: null,
            created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
            updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
        ];
        try {
          fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
        } catch (_) {}
      }
      return data;
    }
  } catch (e) {
    console.warn('[DB] Creando nuevo almacenamiento local...');
  }
  const seed = getInitialSeedData();
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(seed, null, 2));
  } catch (_) {}
  return seed;
})();

export function saveLocalDb() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDb, null, 2));
  } catch (e) {
    console.error('[DB] Error guardando almacenamiento local:', e);
  }
}

export function getLocalDb() {
  if (!localDb.justifications) {
    localDb.justifications = [];
  }
  if (!localDb.teacher_documents) {
    localDb.teacher_documents = [];
  }
  return localDb;
}

// =========================================================================
// INTERFAZ DB HÍBRIDA (POSTGRESQL EN CLOUD O FALLBACK LOCAL TRANSPARENTE)
// =========================================================================
export async function testConnection(): Promise<boolean> {
  if (pgTested) return isPgAvailable;
  pgTested = true;
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    isPgAvailable = true;
    console.log('✅ [Cloud DB] Conexión exitosa a base de datos PostgreSQL.');
    return true;
  } catch (err: any) {
    isPgAvailable = false;
    console.log('⚡ [Hybrid DB] Modo Cloud Local Activo: Utilizando motor persistente de datos (Resiliente, sin necesidad de Docker local).');
    return false;
  }
}

// Wrapper unificado para transacciones
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pgReady = await testConnection();
  if (pgReady) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // En modo local simulamos la transacción
  const dummyClient: any = {
    query: async (text: string, params: any[]) => {
      // Mock de query para transacciones locales
      return { rows: [], rowCount: 1 };
    },
  };
  return fn(dummyClient);
}
