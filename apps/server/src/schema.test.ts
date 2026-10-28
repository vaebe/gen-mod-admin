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
