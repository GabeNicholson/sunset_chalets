Development commands

`node server.js` 

`vercel` for development 

`vercel --prod` for production deploy


---

Database schema in supabase. Goal is to track user activity across the website using
session_id. Ideally will record their visits to each page and the timestamp along with
their ip-address and twitter click id cookie value. The landing page is especially important since they will click on ads and be sent there. 

Session Table:
- session_id, 
- landing_page_timestamp (utc),
- twitter_click_id_timestamp (utc),
- twitter_click_id (from href or first party cookies),
- twitter_click_id_source,
- screen size
- referrer url


Landing Page Table:
- session_id,
- landing_page_timestamp,
- twitter_click_id,
- twitter_click_id_source,
- ip_address,
- user_agent,

Contact Us Submission Table
- session_id,
- timestamp
- name
- email (could be null)
- phone (could be null)

Book Now Action Table
- session_id,
- action_timestamp,
- ip_address,
- user_agent,