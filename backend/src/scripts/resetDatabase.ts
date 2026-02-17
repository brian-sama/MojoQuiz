/**
 * Database Reset Script using Neon Serverless Driver
 * Drops all tables and recreates schema from scratch
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Parse SQL statements, handling function bodies with $$ delimiters
function splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let dollarQuoteCount = 0;

    const lines = sql.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip pure comment lines
        if (trimmed.startsWith('--') && !current.trim()) continue;

        // Count $$ occurrences to track function bodies
        const matches = line.match(/\$\$/g);
        if (matches) {
            dollarQuoteCount += matches.length;
        }

        current += line + '\n';

        // Only split on semicolons when not inside a function body (even $$ count)
        if (dollarQuoteCount % 2 === 0 && trimmed.endsWith(';')) {
            const stmt = current.trim();
            if (stmt && stmt !== ';' && !stmt.startsWith('--')) {
                statements.push(stmt);
            }
            current = '';
        }
    }

    if (current.trim() && current.trim() !== ';') {
        statements.push(current.trim());
    }

    return statements;
}

async function resetDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔌 Connecting to PostgreSQL database...');
        await client.connect();

        // Test connection
        const timeResult = await client.query('SELECT NOW() as time');
        console.log('✅ Connected! Server time:', timeResult.rows[0].time);
        console.log('');

        console.log('🗑️  Dropping existing schema...');

        // Drop all tables by cascading the public schema
        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');
        // Standard PostgreSQL doesn't have neondb_owner by default, usually it's the current user
        // We'll grant all on public to the current session user
        await client.query('GRANT ALL ON SCHEMA public TO public');

        console.log('✅ Schema dropped successfully\n');

        // Read the schema file
        const schemaPath = path.join(__dirname, '../../../database/schema_full.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        console.log('📝 Creating new schema...');

        // Split into individual statements
        const statements = splitSqlStatements(schema);
        console.log(`   Found ${statements.length} SQL statements to execute\n`);

        let successCount = 0;
        for (const stmt of statements) {
            try {
                // Use query for DDL statements
                await client.query(stmt);
                successCount++;
                // Show progress every 10 statements
                if (successCount % 10 === 0) {
                    console.log(`   ✓ Executed ${successCount}/${statements.length} statements...`);
                }
            } catch (error: any) {
                console.error(`\n❌ Error executing statement:`);
                console.error(`   ${stmt.substring(0, 80)}...`);
                console.error(`   Error: ${error.message}`);
                throw error;
            }
        }

        console.log(`\n✅ Executed all ${successCount} statements successfully!\n`);

        // Verify tables were created
        const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        console.log('📊 Created tables:');
        tablesResult.rows.forEach((row: any) => {
            console.log(`   - ${row.table_name}`);
        });

        // Check views
        const viewsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log('\n📈 Created views:');
        viewsResult.rows.forEach((row: any) => {
            console.log(`   - ${row.table_name}`);
        });

        console.log('\n🎉 Database reset complete!');

    } catch (error) {
        console.error('\n❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

resetDatabase();


resetDatabase();
