/**
 * Check database schema status
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkSchema() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        return;
    }

    const sql = neon(connectionString);

    try {
        console.log('📊 Checking database schema...\n');

        // Check tables
        const tables = await sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
        console.log('Tables:', tables.length > 0 ? tables.map((r: any) => r.tablename).join(', ') : '(none)');

        // Check views
        const views = await sql`
      SELECT viewname FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY viewname
    `;
        console.log('Views:', views.length > 0 ? views.map((r: any) => r.viewname).join(', ') : '(none)');

        // Check functions
        const functions = await sql`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY proname
    `;
        console.log('Functions:', functions.length > 0 ? functions.map((r: any) => r.proname).join(', ') : '(none)');

        // Check extensions
        const extensions = await sql`
      SELECT extname FROM pg_extension
      ORDER BY extname
    `;
        console.log('Extensions:', extensions.map((r: any) => r.extname).join(', '));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkSchema();
