-- migrate:up
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

-- migrate:down
DROP TABLE users;
