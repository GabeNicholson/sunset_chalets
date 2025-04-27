Development commands

`nvm use` ensure using the correct node 22 version

`node server.js` 

`vercel` for development 

`vercel --prod` for production deploy
---

The postgres database is hosted in supabase and can be accessed via the [supabase dashboard link](https://supabase.com/dashboard/project/scwovajbhelvqmxztzdj)

Goal is to track user activity across the website using session_id as the primary key. This is tracked in the `user_sessions` table. 

The `site_visits` table creates a new site visit entry for a given session_id every 30 minutes (assuming the user returns to the website). This is to track different site visits a user might have. It is responsible for tracking twitter click id and other device/browser information. 

`page_views` tracks whenever a user visits a page. It also logs twitter click id information and scroll information.