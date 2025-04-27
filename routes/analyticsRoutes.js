require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const router = express.Router();
const supabase = createClient(process.env.DATABASE_URL, process.env.DATABASE_KEY);

router.post("/user_session", async (req, res) => {
    const payload = req.body;
    const { data, error } = await supabase.from('user_sessions').insert(payload);
    res.json({ success: true });
})

router.post("/update_user_session", async (req, res) => {
    const { session_id, ...updateData } = req.body;
    await supabase.from('user_sessions').update(updateData).eq('session_id', session_id);
    res.json({ success: true });
})

router.post("/create_sitevisit", async (req, res) => {
    const payload = req.body;
    ip_address = get_ip(req)
    payload['ip_address'] = ip_address
    await supabase.from('site_visits').insert(payload);
    res.json({ success: true });
})

router.post("/create_pageview", async (req, res) => {
    const payload = req.body;
    const { error } = await supabase.from('page_views').insert(payload)
    if (error) {
        console.error('Error tracking page view:', error);
        // If there's still a foreign key violation despite our checks
        if (error.code === '23503' && error.message.includes('visit_id')) {
            console.error('Foreign key violation despite visit verification - database inconsistency');
        }
    }
    res.json({ success: !error }); 
})

router.post("/update_pageview", async (req, res) => {
    const { page_view_id, ...updateData } = req.body;
    await supabase
        .from('page_views')
        .update(updateData)
        .eq('page_view_id', page_view_id);
    res.json({ success: true });
})

router.post("/verify_sitevisit", async (req, res) => {
    const { visitId } = req.body;
    const { data, error } = await supabase
        .from('site_visits')
        .select('visit_id')
        .eq('visit_id', visitId)
        .maybeSingle();
    const visitExists = !error && data
    res.json({success: true, visitExists: visitExists})
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


function get_ip(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
    req.socket?.remoteAddress ||
    null;
    return ip
}

module.exports = router;