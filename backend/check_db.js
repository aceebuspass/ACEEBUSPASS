import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function checkDb() {
    const db = await open({
        filename: path.join(process.cwd(), 'buspass.sqlite'),
        driver: sqlite3.Database
    });
    const rows = await db.all('SELECT id, name, status, department FROM student_applications');
    console.log('Total applications:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
    await db.close();
}

checkDb().catch(console.error);
