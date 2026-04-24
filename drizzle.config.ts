import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/shared/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './dev.db'
  }
})
