Development commands

`nvm use` ensure using the correct node 22 version

`node server.js` 

`vercel` for development 

`vercel --prod` for production deploy

---

Future work
1. Make the pictures on the front page clickable.
2. Add a constants file for easier finding?
3. what are the advantages to logging errors and using try blocks or instead of using .then().catch() etc?
4. simplify the analytics setup now that we fixed the bug and if the initalization checks are really necessary?
5. Adding twclid logging in page views (monitor twclid drop)
6. I should save commonly used join queries somewhere.
7. What to do with the responses like here? 
  async _updatePageView() {
    if (!this.isInitialized) return;
    
    try {
      const exitTime = new Date();
      const timeOnPage = Math.floor((exitTime - this.pageLoadTime) / 1000); // seconds
      
      // Only update if we have a valid page view ID
      if (this.pageViewId) {
        const payload = {
          page_view_id: this.pageViewId,
          exit_timestamp: exitTime.toISOString(),
          time_on_page: timeOnPage,
          scroll_depth_percentage: this.maxScrollDepth
        }
        const response = await fetch('/api/analytics/update_pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (error) {
      console.error('Error updating page view:', error);
    }
  }

---

The postgres database is hosted in supabase and can be accessed via the [supabase dashboard link](https://supabase.com/dashboard/project/scwovajbhelvqmxztzdj)

Goal is to track user activity across the website using session_id as the primary key. This is tracked in the `user_sessions` table. 

The `site_visits` table creates a new site visit entry for a given session_id every 30 minutes (assuming the user returns to the website). This is to track different site visits a user might have. It is responsible for tracking twitter click id and other device/browser information. 

`page_views` tracks whenever a user visits a page. It also logs twitter click id information and scroll information.


Currently there are 5 tables with the following teardown and creation commands:

```
insert code here
```