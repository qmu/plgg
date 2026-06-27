-- migrate:up
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL
);

-- migrate:down
DROP TABLE posts;
