/**
 * Seed Script: System Administrator
 * Creates the initial admin account for Brian.
 */

import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedAdmin() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const email = 'brianmagagula5@gmail.com';
    const password = 'Brian7350$@#';
    const displayName = 'Brian Magagula';

    try {
        console.log('🔌 Connecting to PostgreSQL database...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        console.log(`👤 Creating admin user: ${email}...`);

        // Check if user exists
        const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

        if (userExists.rows.length > 0) {
            console.log('ℹ️ User already exists. Updating to admin and setting password...');
            await client.query(
                `UPDATE users 
                 SET password_hash = $1, role = $2, is_verified = $3, display_name = $4
                 WHERE email = $5`,
                [passwordHash, 'admin', true, displayName, email.toLowerCase()]
            );
            console.log('✅ Admin user updated');
        } else {
            await client.query(
                `INSERT INTO users (email, display_name, password_hash, role, is_verified, auth_provider)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [email.toLowerCase(), displayName, passwordHash, 'admin', true, 'email']
            );
            console.log('✅ Admin user created');
        }

        console.log('\n🎉 Seeding complete!');

    } catch (error) {
        console.error('\n❌ Seeding Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedAdmin();
