import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: {
        kind: 'file',
        path: 'prisma/schema.prisma',
    },
    migrate: {
        url: process.env.DATABASE_URL,
    },
});
