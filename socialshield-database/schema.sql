-- =====================================================================
--  Social Shield: PostgreSQL schema
--  The Flask app creates these tables automatically through SQLAlchemy;
--  this file documents the same design as plain SQL, plus useful views,
--  a trigger and example queries for the DBMS report.
--
--  Run manually:   psql -U postgres -d social_shield -f database/schema.sql
-- =====================================================================

-- ---------- Users & personalisation ----------
CREATE TABLE IF NOT EXISTS users (
    id                 SERIAL PRIMARY KEY,
    username           VARCHAR(40)  NOT NULL UNIQUE,
    email              VARCHAR(120) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
    full_name          VARCHAR(100),
    introversion_level VARCHAR(20)  DEFAULT 'medium'
                       CHECK (introversion_level IN ('low','medium','high','extreme')),
    city               VARCHAR(60)  DEFAULT 'Dhaka',
    bio                TEXT,
    avatar             VARCHAR(8)   DEFAULT '🌸',
    social_battery     INTEGER      DEFAULT 70 CHECK (social_battery BETWEEN 0 AND 100),
    created_at         TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triggers (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    icon VARCHAR(8)
);

-- M:N  users <-> triggers (trigger zones such as "Loud crowds")
CREATE TABLE IF NOT EXISTS user_triggers (
    user_id    INTEGER REFERENCES users(id)    ON DELETE CASCADE,
    trigger_id INTEGER REFERENCES triggers(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, trigger_id)
);

CREATE TABLE IF NOT EXISTS user_goals (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(150) NOT NULL,
    target     INTEGER DEFAULT 1 CHECK (target > 0),
    progress   INTEGER DEFAULT 0 CHECK (progress >= 0),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  VARCHAR(255) NOT NULL,          -- 6-digit code, hashed
    expires_at TIMESTAMP NOT NULL,             -- 15 minutes after creation
    attempts   INTEGER DEFAULT 0,              -- locked after 5
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- Events, reviews, creep alerts ----------
CREATE TABLE IF NOT EXISTS events (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(150) NOT NULL,
    description      TEXT,
    category         VARCHAR(40),
    emoji            VARCHAR(8) DEFAULT '🌿',
    venue            VARCHAR(120),
    area             VARCHAR(60),
    city             VARCHAR(60) DEFAULT 'Dhaka',
    start_time       TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    crowd_size       VARCHAR(20) CHECK (crowd_size IN ('tiny','small','medium','large')),
    noise_level      INTEGER DEFAULT 2 CHECK (noise_level BETWEEN 1 AND 5),
    price            INTEGER DEFAULT 0 CHECK (price >= 0),
    organizer        VARCHAR(100),
    quiet_zone       BOOLEAN DEFAULT FALSE,
    easy_exit        BOOLEAN DEFAULT TRUE,
    structured       BOOLEAN DEFAULT FALSE,
    capacity         INTEGER DEFAULT 30,
    created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

CREATE TABLE IF NOT EXISTS event_reviews (
    id             SERIAL PRIMARY KEY,
    event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    comfort_rating INTEGER NOT NULL CHECK (comfort_rating BETWEEN 1 AND 5),
    creep_risk     INTEGER NOT NULL CHECK (creep_risk BETWEEN 1 AND 5),
    crowd_type     VARCHAR(40),
    comment        TEXT,
    created_at     TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_review_once UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_reports (          -- creep alerts
    id            SERIAL PRIMARY KEY,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reporter_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    severity      VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
    description   TEXT NOT NULL,
    location_hint VARCHAR(120),
    anonymous     BOOLEAN DEFAULT TRUE,
    status        VARCHAR(12) DEFAULT 'open' CHECK (status IN ('open','verified','resolved')),
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rsvps (
    user_id      INTEGER REFERENCES users(id)  ON DELETE CASCADE,
    event_id     INTEGER REFERENCES events(id) ON DELETE CASCADE,
    status       VARCHAR(12) DEFAULT 'going' CHECK (status IN ('going','maybe')),
    buddy_wanted BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, event_id)
);

-- ---------- Toolkit content ----------
CREATE TABLE IF NOT EXISTS fake_calls (
    id           SERIAL PRIMARY KEY,
    caller_name  VARCHAR(60) NOT NULL,
    caller_emoji VARCHAR(8) DEFAULT '📞',
    category     VARCHAR(30),
    script       TEXT NOT NULL,
    urgency      INTEGER DEFAULT 3 CHECK (urgency BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS templates (             -- conversation starters
    id         SERIAL PRIMARY KEY,
    category   VARCHAR(30) NOT NULL,               -- Party, Classroom, Bus Queue, ...
    text       TEXT NOT NULL,
    follow_up  TEXT,
    difficulty VARCHAR(10) DEFAULT 'easy'
);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

CREATE TABLE IF NOT EXISTS exit_excuses (
    id            SERIAL PRIMARY KEY,
    category      VARCHAR(30),
    text          TEXT NOT NULL,
    believability INTEGER DEFAULT 4 CHECK (believability BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS tips (
    id       SERIAL PRIMARY KEY,
    category VARCHAR(40),
    icon     VARCHAR(8),
    title    VARCHAR(120) NOT NULL,
    content  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS self_defense (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(120) NOT NULL,
    category         VARCHAR(30),                  -- verbal / body-language / physical / awareness
    icon             VARCHAR(8),
    summary          TEXT,
    steps            TEXT,
    media_url        VARCHAR(300),
    duration_minutes INTEGER DEFAULT 5,
    difficulty       VARCHAR(12) DEFAULT 'beginner'
);

-- ---------- Learning resources ----------
CREATE TABLE IF NOT EXISTS books (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    author      VARCHAR(100),
    category    VARCHAR(40),
    year        INTEGER,
    pages       INTEGER,
    description TEXT,
    takeaways   TEXT,
    read_url    VARCHAR(300),
    free        BOOLEAN DEFAULT FALSE,
    cover       VARCHAR(60)
);

CREATE TABLE IF NOT EXISTS user_books (            -- reading list
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id    INTEGER REFERENCES books(id) ON DELETE CASCADE,
    status     VARCHAR(12) DEFAULT 'want' CHECK (status IN ('want','reading','finished')),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS skills (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    icon       VARCHAR(8),
    category   VARCHAR(40),
    difficulty VARCHAR(12),
    summary    TEXT,
    details    TEXT,
    steps      TEXT,
    practice   TEXT,
    best_for   VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS resources (
    id          SERIAL PRIMARY KEY,
    kind        VARCHAR(20),                       -- article / video / podcast / app / helpline / worksheet
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    url         VARCHAR(300),
    icon        VARCHAR(8)
);

-- ---------- Games & progress ----------
CREATE TABLE IF NOT EXISTS games (
    id           SERIAL PRIMARY KEY,
    slug         VARCHAR(40) NOT NULL UNIQUE,
    title        VARCHAR(80) NOT NULL,
    icon         VARCHAR(8),
    category     VARCHAR(30),
    description  TEXT,
    instructions TEXT,
    colors       VARCHAR(40)
);

CREATE TABLE IF NOT EXISTS game_progress (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id   INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    score     INTEGER DEFAULT 0,
    level     INTEGER DEFAULT 1,
    played_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_game_score ON game_progress(game_id, score DESC);

-- ---------- Reflection & mood ----------
CREATE TABLE IF NOT EXISTS user_feedback (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id       INTEGER REFERENCES events(id) ON DELETE SET NULL,
    situation      VARCHAR(120),
    comfort_level  INTEGER CHECK (comfort_level BETWEEN 1 AND 10),
    anxiety_before INTEGER CHECK (anxiety_before BETWEEN 1 AND 10),
    anxiety_after  INTEGER CHECK (anxiety_after BETWEEN 1 AND 10),
    people_talked  INTEGER DEFAULT 0,
    used_tools     VARCHAR(200),
    went_well      TEXT,
    challenges     TEXT,
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mood_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood       INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
    energy     INTEGER NOT NULL CHECK (energy BETWEEN 0 AND 100),
    note       VARCHAR(280),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- Chatbot & contact ----------
CREATE TABLE IF NOT EXISTS chat_messages (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_key VARCHAR(40),
    role        VARCHAR(10),                       -- user / model
    content     TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_key);

CREATE TABLE IF NOT EXISTS contact_messages (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(80),
    email      VARCHAR(120),
    subject    VARCHAR(150),
    message    TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
--  Views
-- =====================================================================

-- Average comfort / creep rating and alert count per event
CREATE OR REPLACE VIEW v_event_safety AS
SELECT e.id, e.title, e.area, e.start_time, e.noise_level, e.crowd_size,
       ROUND(AVG(r.comfort_rating)::numeric, 1) AS avg_comfort,
       ROUND(AVG(r.creep_risk)::numeric, 1)     AS avg_creep_risk,
       COUNT(DISTINCT r.id)                     AS review_count,
       COUNT(DISTINCT a.id) FILTER (WHERE a.status <> 'resolved') AS active_alerts
FROM events e
LEFT JOIN event_reviews r ON r.event_id = e.id
LEFT JOIN user_reports  a ON a.event_id = e.id
GROUP BY e.id;

-- Best score per user per game (leaderboard)
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT g.slug, g.title, u.username, u.avatar, MAX(p.score) AS best_score,
       RANK() OVER (PARTITION BY g.id ORDER BY MAX(p.score) DESC) AS rank
FROM game_progress p
JOIN games g ON g.id = p.game_id
JOIN users u ON u.id = p.user_id
GROUP BY g.id, g.slug, g.title, u.id, u.username, u.avatar;

-- Each user's improvement: average anxiety drop across reflections
CREATE OR REPLACE VIEW v_user_progress AS
SELECT u.id, u.username,
       COUNT(f.id)                                        AS reflections,
       ROUND(AVG(f.anxiety_before - f.anxiety_after), 2)  AS avg_anxiety_drop,
       COALESCE(SUM(f.people_talked), 0)                  AS people_talked,
       (SELECT ROUND(AVG(m.mood), 2) FROM mood_logs m WHERE m.user_id = u.id
          AND m.created_at > NOW() - INTERVAL '7 days')   AS mood_last_7_days
FROM users u
LEFT JOIN user_feedback f ON f.user_id = u.id
GROUP BY u.id;

-- =====================================================================
--  Trigger: keep users.social_battery in sync with the latest mood log
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_sync_battery() RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET social_battery = NEW.energy WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_battery ON mood_logs;
CREATE TRIGGER trg_sync_battery
AFTER INSERT ON mood_logs
FOR EACH ROW EXECUTE FUNCTION fn_sync_battery();

-- =====================================================================
--  Example queries (for the report / viva)
-- =====================================================================

-- 1. Calm upcoming events: comfort >= 4, creep risk <= 2, noise <= 2
-- SELECT * FROM v_event_safety
--  WHERE start_time > NOW() AND avg_comfort >= 4 AND avg_creep_risk <= 2 AND noise_level <= 2
--  ORDER BY avg_comfort DESC;

-- 2. Events that match a user's trigger zones (avoid loud events for 'Loud crowds')
-- SELECT e.title FROM events e
--  WHERE NOT EXISTS (SELECT 1 FROM user_triggers ut JOIN triggers t ON t.id = ut.trigger_id
--                    WHERE ut.user_id = 1 AND t.name = 'Loud crowds' AND e.noise_level >= 4);

-- 3. Random conversation starter for a context
-- SELECT text, follow_up FROM templates WHERE category = 'Party' ORDER BY RANDOM() LIMIT 1;

-- 4. Top 3 players per game
-- SELECT * FROM v_leaderboard WHERE rank <= 3 ORDER BY slug, rank;

-- 5. Events with the most active creep alerts
-- SELECT title, active_alerts FROM v_event_safety WHERE active_alerts > 0 ORDER BY active_alerts DESC;

-- 6. Users who want a quiet buddy for the same event (buddy matching)
-- SELECT e.title, STRING_AGG(u.username, ', ') AS buddies
--   FROM rsvps r JOIN users u ON u.id = r.user_id JOIN events e ON e.id = r.event_id
--  WHERE r.buddy_wanted GROUP BY e.title HAVING COUNT(*) >= 2;

-- 7. Most popular categories by RSVP count
-- SELECT e.category, COUNT(*) AS rsvps FROM rsvps r JOIN events e ON e.id = r.event_id
--  GROUP BY e.category ORDER BY rsvps DESC;
