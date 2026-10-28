import { expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { readFileSync } from 'node:fs'

test('schema persists records and rejects duplicate versions and invalid references', () => {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  expect(db.query("SELECT name FROM sqlite_master WHERE type='table'").all()).toHaveLength(6)
  db.run("INSERT INTO games VALUES ('duckov','Duckov','desc','now')")
  db.run("INSERT INTO skills(id,name,description,kind,game_id,created_at) VALUES ('s','duckov-mod','desc','game','duckov','now')")
  db.run("INSERT INTO skill_versions VALUES ('v','s','1','hash','file','now','{}')")
  expect(() => db.run("INSERT INTO skill_versions VALUES ('v2','s','1','hash','file2','now','{}')")).toThrow()
  expect(() => db.run("DELETE FROM games WHERE id='duckov'")).toThrow()
  expect(() => db.run("INSERT INTO skills(id,name,description,kind,created_at) VALUES ('bad','bad','desc','other','now')")).toThrow()
  db.close()
})

test('role migration preserves existing accounts and defaults them to users', () => {
  const db = new Database(':memory:')
  db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)')
  db.run("INSERT INTO users VALUES ('existing','a@b.c','stored-hash','before')")
  db.exec(readFileSync(new URL('../migrations/0001_persist_user_role.sql', import.meta.url), 'utf8'))
  expect(db.query('SELECT * FROM users').get()).toEqual({ id: 'existing', email: 'a@b.c', password_hash: 'stored-hash', created_at: 'before', role: 'user' })
  db.close()
})
