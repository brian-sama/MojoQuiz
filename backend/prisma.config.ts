import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrate: {
        url: env('DATABASE_URL'),
    },
});
