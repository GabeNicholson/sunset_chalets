const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const router = express.Router();

const supabase = createClient('https://scwovajbhelvqmxztzdj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd292YWpiaGVsdnFteHp0emRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNzM0NDcsImV4cCI6MjA2MDk0OTQ0N30.YAlG55-pUtHqWCQ33ovE477suFHMAqf3tB5wuh-NLK0');

router.post("/user_session", async (req, res) => {
    const payload = req.body;
    console.log(`payload: ${payload}`);
    const { data, error } = await supabase.from('user_sessions').insert(payload);
    console.log(`data: ${data}`)
    console.log(`error: ${error}`)
    res.json({ success: true });
})

router.post("/update_user_session", async (req, res) => {
    const { session_id, ...updateData } = req.body;
    console.log('Update session payload:', updateData);
    await supabase.from('user_sessions').update(updateData).eq('session_id', session_id);
    res.json({ success: true });
})

router.post("/pageview", async (req, res) => {
    const payload = req.body;
    console.log(`payload: ${payload}`);
    await supabase.from('site_visits').insert(payload);
    res.json({ success: true });
})

router.post("/update_pageview", async (req, res) => {
    const { page_view_id, ...updateData } = req.body;
    console.log(`updateData for update page view: ${updateData}`);
    await supabase
        .from('page_views')
        .update(updateData)
        .eq('page_view_id', page_view_id);
    res.json({ success: true });
})


router.post("/track_contact_submission", async (req, res) => {
    const payload = req.body;
    await supabase.from('contact_submissions').insert(payload);
    res.json({ success: true });
})

router.post("/track_book_now", async (req, res) => {
    const payload = req.body;
    await supabase.from('book_now_actions').insert(payload);
    res.json({ success: true });
})

module.exports = router;