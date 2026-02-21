/**
 * Migration: Admin & Governance
 * Adds organizations and audit_logs tables.
 * Updates users and sessions table for organization support.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAdminGovernance() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!\n');

        // ============================================
        // STEP 1: Create organizations table
        // ============================================
        console.log('Creating organizations table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS organizations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   organizations table created');

        // ============================================
        // STEP 2: Update users table
        // ============================================
        console.log('Updating users table for organization support...');
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
        `);
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id)`);
        console.log('   users table updated');

        // ============================================
        // STEP 3: Update sessions table
        // ============================================
        console.log('Updating sessions table for organization support...');
        await client.query(`
            ALTER TABLE sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_organization ON sessions(organization_id)`);
        console.log('   sessions table updated');

        // ============================================
        // STEP 4: Create audit_logs table
        // ============================================
        console.log('Creating audit_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
        console.log('   audit_logs table created');

        // ============================================
        // STEP 5: Create a default organization for existing users
        // ============================================
        console.log('Checking for default organization...');
        const orgRes = await client.query("SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1");
        let orgId;
        if (orgRes.rows.length === 0) {
            console.log('Creating Default Organization...');
            const newOrg = await client.query("INSERT INTO organizations (name) VALUES ('Default Organization') RETURNING id");
            orgId = newOrg.rows[0].id;
        } else {
            orgId = orgRes.rows[0].id;
        }

        console.log('Assining existing users to default organization...');
        await client.query(`UPDATE users SET organization_id = $1 WHERE organization_id IS NULL`, [orgId]);

        console.log('   Existing users assigned to default organization');

        console.log('\nMigration complete!');

    } catch (error) {
        console.error('\nMigration error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrateAdminGovernance();
