import {neon} from '@neondatabase/serverless';import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required. Use the ignored .env.local environment.');
const sql=neon(process.env.DATABASE_URL),migration=await readFile(new URL('../migrations/001_account_progress.sql',import.meta.url),'utf8');
// Keep dollar-quoted function bodies intact while batching separate statements.
const parts=migration.split('$$'),head=parts[0],start=head.lastIndexOf('CREATE OR REPLACE FUNCTION');
const statements=[...head.slice(0,start).split(';').filter(s=>s.trim()),head.slice(start)+'$$'+parts[1]+'$$',...parts[2].split(';').filter(s=>s.trim())];
const originMigration=await readFile(new URL('../migrations/002_account_origin.sql',import.meta.url),'utf8');
await sql.transaction([...statements.map(statement=>sql.query(statement)),sql.query(originMigration)]);
console.log('Account progress schema and canonical Auth origin are ready. Existing progress is preserved.');
