import { db } from './db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  const { username, password } = JSON.parse(req.body);
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.execute({
      sql: 'INSERT INTO users (username, password) VALUES (?, ?)',
      args: [username, hashedPassword]
    });
    return res.status(201).json({ message: 'User created' });
  } catch (err) {
    return res.status(400).json({ error: 'Username likely taken' });
  }
}