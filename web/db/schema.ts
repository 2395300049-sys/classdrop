// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(),
  course: text('course').notNull(), description: text('description').notNull(),
  expected: integer('expected').notNull(), deadline: text('deadline').notNull(),
  roster: text('roster').notNull(), closed: integer('closed').notNull().default(0), created: text('created').notNull(),
  mode: text('mode').notNull().default('homework'),
});
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(), taskId: text('task_id').notNull().references(()=>tasks.id),
  studentId: text('student_id').notNull(), name: text('name').notNull(),
  receiptHash: text('receipt_hash').notNull(), files: text('files').notNull(), updated: text('updated').notNull(),
  contact: text('contact').notNull().default(''), note: text('note').notNull().default(''),
  printOptions: text('print_options').notNull().default('{}'), status: text('status').notNull().default('new'),
  receivedAt: text('received_at'), expiresAt: text('expires_at'), deletedAt: text('deleted_at'), purgedAt: text('purged_at'),
}, t=>[uniqueIndex('task_student_unique').on(t.taskId,t.studentId),index('submission_expiry').on(t.expiresAt)]);
export const uploadReservations = sqliteTable('upload_reservations',{
  id:text('id').primaryKey(), taskId:text('task_id').notNull(), bytes:integer('bytes').notNull(), created:text('created').notNull(),
},t=>[index('reservation_task').on(t.taskId)]);
export const accounts = sqliteTable('accounts',{
 id:text('id').primaryKey(),username:text('username').notNull(),displayName:text('display_name').notNull(),
 passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),recoveryHash:text('recovery_hash').notNull(),created:text('created').notNull(),
},t=>[uniqueIndex('account_username').on(t.username)]);
export const accountSessions = sqliteTable('account_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id),expires:text('expires').notNull(),
},t=>[index('account_session_user').on(t.userId)]);
export const authAttempts = sqliteTable('auth_attempts',{
 key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expires:text('expires').notNull(),
});
