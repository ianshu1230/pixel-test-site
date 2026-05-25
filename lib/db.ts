import { neon } from '@neondatabase/serverless'

function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return neon(url)
}

export async function initTable() {
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id           SERIAL PRIMARY KEY,
      name         TEXT        NOT NULL,
      email        TEXT        NOT NULL,
      service_type TEXT        NOT NULL,
      message      TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function insertSubmission(data: {
  name:        string
  email:       string
  serviceType: string
  message:     string
}) {
  const sql = getSql()
  const result = await sql`
    INSERT INTO submissions (name, email, service_type, message)
    VALUES (${data.name}, ${data.email}, ${data.serviceType}, ${data.message})
    RETURNING id
  `
  return result
}
