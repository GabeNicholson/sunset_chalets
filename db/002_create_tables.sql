CREATE TABLE user_sessions (
  session_id UUID PRIMARY KEY, -- persistent ID stored in cookie
  first_seen_timestamp TIMESTAMPTZ NOT NULL,
  last_seen_timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE site_visits (
  visit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES user_sessions(session_id),
  visit_timestamp TIMESTAMPTZ NOT NULL,
  landing_page_url TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  twitter_click_id TEXT,
  twitter_click_id_source SMALLINT, -- 1 for URL, 2 for cookies
  referrer_url text,
  browser TEXT,
  browser_version TEXT,
  device_type TEXT,
  os TEXT,
  os_version text,
  screen_height INTEGER,
  screen_width INTEGER
);


CREATE TABLE page_views (
  page_view_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES site_visits(visit_id),
  page_url TEXT NOT NULL,
  view_timestamp TIMESTAMPTZ NOT NULL,
  twitter_click_id TEXT,
  twitter_click_id_source SMALLINT, -- 1 for URL, 2 for cookies
  exit_timestamp TIMESTAMPTZ,
  time_on_page INTEGER, -- in seconds
  scroll_depth_percentage INTEGER,
  ip_address TEXT
);


CREATE TABLE book_now_actions (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(session_id),
  visit_id UUID REFERENCES site_visits(visit_id),
  action_timestamp TIMESTAMPTZ NOT NULL,
  page_url TEXT NOT NULL
);


CREATE TABLE contact_submissions (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(session_id),
  visit_id UUID REFERENCES site_visits(visit_id),
  submission_timestamp TIMESTAMPTZ NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT
);