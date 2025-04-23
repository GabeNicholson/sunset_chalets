import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient('https://scwovajbhelvqmxztzdj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd292YWpiaGVsdnFteHp0emRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNzM0NDcsImV4cCI6MjA2MDk0OTQ0N30.YAlG55-pUtHqWCQ33ovE477suFHMAqf3tB5wuh-NLK0')

function generateUUID() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
}


function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}


console.log("initializing analytics class...")

// Analytics class
class Analytics {
  constructor() {
    this.sessionId = this._getOrCreateSessionId();
    this.visitId = this._getOrCreateVisitId();
    this.pageViewId = generateUUID();
    this.pageLoadTime = new Date();
    this.maxScrollDepth = 0;
    
    // Initialize tracking in the correct sequence
    this._initializeTracking();
    this._setupEventListeners();
  }
  
  // Sequential async initialization
  async _initializeTracking() {
    try {
      // First create/get session
      await this._ensureUserSession();
      
      // Then create/get visit - store the result
      this.visitId = await this._getOrCreateVisitId();
      
      // Only track page view after visit is confirmed created
      await this._trackPageView();
    } catch (error) {
      console.error('Error initializing tracking:', error);
    }
  }
  // Ensure user session exists
  async _ensureUserSession() {
    let sessionId = getCookie('session_id');
    if (!sessionId) {
      sessionId = generateUUID();
      setCookie('session_id', sessionId, 365); // 1 year
      
      // Record new user session
      await this._recordNewUserSession(sessionId);
    }
    return sessionId;
  }

  // Ensure user session exists
  async _getOrCreateSessionId() {
    let sessionId = getCookie('session_id');
    if (!sessionId) {
      sessionId = generateUUID();
      setCookie('session_id', sessionId, 365); // 1 year
      
      // Record new user session
      this._recordNewUserSession(sessionId);
    }
    return sessionId;
  }
  
  // Create or update visit ID
  _getOrCreateVisitId() {
    const lastActivity = getCookie('last_activity');
    const currentTime = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    
    // Check if we need a new visit
    const needNewVisit = !lastActivity || 
                        (currentTime - new Date(lastActivity).getTime() > thirtyMinutes);
    
    let visitId;
    
    if (needNewVisit) {
      visitId = generateUUID();
      setCookie('current_visit', visitId, 1); // 1 day
      setCookie('last_activity', new Date().toISOString(), 1);
      
      console.log("before recording a new visit...")
      // Record new visit
      this._recordNewVisit(visitId);
    } else {
      visitId = getCookie('current_visit');
      setCookie('last_activity', new Date().toISOString(), 1);
    }
    
    return visitId;
  }
  
  // Create new user session
  async _recordNewUserSession(sessionId) {
    try {
      const timestamp = new Date().toISOString();
      await supabase.from('user_sessions').insert({
        session_id: sessionId,
        first_seen_timestamp: timestamp,
        last_seen_timestamp: timestamp
      });
    } catch (error) {
      console.error('Error recording user session:', error);
    }
  }
  
  // Update session last seen time
  async _updateUserSessionLastSeen() {
    try {
      await supabase.from('user_sessions').update({
        last_seen_timestamp: new Date().toISOString()
      }).eq('session_id', this.sessionId);
    } catch (error) {
      console.error('Error updating session last seen:', error);
    }
  }
  
  // Record a new site visit
  async _recordNewVisit(visitId) {
    try {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      
      // Twitter click ID handling
      const twitterClickId = urlParams.get('twclid');
      console.log(`twitterClickId retrieved from url: ${twitterClickId}`)
      const cookieTwitterClickId = getCookie('twclid');
      console.log(`twitterClickId retrieved from cookies: ${cookieTwitterClickId}`)
      
      let clickId = null;
      let clickIdSource = null;
      
      if (twitterClickId) {
        clickId = twitterClickId;
        clickIdSource = 1; // URL source
        setCookie('twclid', twitterClickId, 30); // Store for 30 days
      } else if (cookieTwitterClickId) {
        clickId = cookieTwitterClickId;
        clickIdSource = 2; // Cookie source
      }
      
      // Get device info
      const deviceInfo = this._getDeviceInfo();
      
      // Get server-side info (IP address)
      const serverInfo = await this._getServerSideInfo();

      // In the _recordNewVisit method
      const payload = {
        visit_id: visitId,
        session_id: this.sessionId,
        visit_timestamp: new Date().toISOString(),
        landing_page_url: window.location.href,
        ip_address: serverInfo.ip,
        user_agent: navigator.userAgent,
        browser: deviceInfo.browser,
        browser_version: deviceInfo.browserVersion,
        device_type: deviceInfo.deviceType,
        os: deviceInfo.os,
        os_version: deviceInfo.osVersion,
        twitter_click_id: clickId,
        twitter_click_id_source: clickIdSource,
        referrer_url: document.referrer,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight
      };

      console.log('Sending to site_visits:', payload);

      // Insert visit record
      await supabase.from('site_visits').insert(payload);
    } catch (error) {
      console.error('Error recording visit:', error);
    }
  }
  
  // Track a page view
  async _trackPageView() {
    console.log("tracking page view...")
    try {
      // Create payload with explicit values
      const payload = {
        page_view_id: this.pageViewId,
        visit_id: this.visitId,
        page_url: window.location.href || '',
        view_timestamp: new Date().toISOString()
      };
      
      console.log('Inserting page_view with payload:', payload);
      
      // Insert with detailed error handling
      const { data, error } = await supabase.from('page_views').insert(payload);

      console.log("data: ", data)
      
      if (error) {
        console.error('Supabase page_view error details:', error);
        
        // Check common error types
        if (error.code === '23502') {
          console.error('Missing NOT NULL column - check your schema');
        } else if (error.code === '23503') {
          console.error('Foreign key violation - visit_id may not exist yet');
        }
      } else {
        console.log('Page view inserted successfully');
        // Update session last seen timestamp
        this._updateUserSessionLastSeen();
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }
  
  // Update page view with exit time and time on page
  async _updatePageView() {
    try {
      const exitTime = new Date();
      const timeOnPage = Math.floor((exitTime - this.pageLoadTime) / 1000); // seconds
      
      await supabase.from('page_views').update({
        exit_timestamp: exitTime.toISOString(),
        time_on_page: timeOnPage,
        scroll_depth_percentage: this.maxScrollDepth
      }).eq('page_view_id', this.pageViewId);
    } catch (error) {
      console.error('Error updating page view:', error);
    }
  }
  
  // Get server-side info (IP address)
  async _getServerSideInfo() {
    try {
      const response = await fetch('/api/analytics/client-info');
      if (!response.ok) throw new Error('Failed to get client info');
      return await response.json();
    } catch (error) {
      console.error('Error getting client info:', error);
      return { ip: null };
    }
  }
  
  // Get device and browser info
  _getDeviceInfo() {
    // Very basic detection - in production use a library like UAParser.js
    const userAgent = navigator.userAgent;
    
    // Device type detection
    let deviceType = 'desktop';
    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      deviceType = 'tablet';
    }
    
    // Very simple browser detection
    let browser = 'unknown';
    let browserVersion = '';
    let os = 'unknown';
    let osVersion = '';
    
    if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
      browser = 'Internet Explorer';
    } else if (userAgent.indexOf('Edge') > -1) {
      browser = 'Edge';
    }
    
    // OS detection
    if (userAgent.indexOf('Windows') > -1) {
      os = 'Windows';
    } else if (userAgent.indexOf('Mac') > -1) {
      os = 'MacOS';
    } else if (userAgent.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (userAgent.indexOf('Android') > -1) {
      os = 'Android';
    } else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
      os = 'iOS';
    }
    
    return {
      deviceType,
      browser,
      browserVersion,
      os,
      osVersion
    };
  }
  
  // Set up event listeners for tracking
  _setupEventListeners() {
    // Track scroll depth
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      const scrollPercent = Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100);
      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercent);
    });
    
    // Track page exits
    window.addEventListener('beforeunload', () => {
      this._updatePageView();
    });
    
    // Track tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this._updatePageView();
      }
    });
    
    // Track performance metrics
    window.addEventListener('load', () => {
      if (window.performance) {
        setTimeout(() => {
          const perfData = window.performance.timing;
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
          const domInteractive = perfData.domInteractive - perfData.navigationStart;
          
          supabase.from('page_views').update({
            page_load_time: pageLoadTime,
            dom_interactive_time: domInteractive
          }).eq('page_view_id', this.pageViewId);
        }, 0);
      }
    });
    
    // Error tracking
    window.addEventListener('error', (event) => {
      const { message, filename, lineno, colno, error } = event;
      
      supabase.from('error_events').insert({
        session_id: this.sessionId,
        visit_id: this.visitId,
        error_timestamp: new Date().toISOString(),
        error_message: message,
        error_stack: error?.stack || '',
        page_url: window.location.href
      });
    });
  }
  
  // Track booking actions
  async trackBookNow(elementId) {
    try {
      await supabase.from('book_now_actions').insert({
        session_id: this.sessionId,
        visit_id: this.visitId,
        action_timestamp: new Date().toISOString(),
        page_url: window.location.href
      });
    } catch (error) {
      console.error('Error tracking booking action:', error);
    }
  }
  
  // Track contact form submissions
  async trackContactSubmission(formData) {
    try {
      await supabase.from('contact_submissions').insert({
        session_id: this.sessionId,
        visit_id: this.visitId,
        submission_timestamp: new Date().toISOString(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
    } catch (error) {
      console.error('Error tracking contact submission:', error);
    }
  }
}

// Create and export singleton instance
const analytics = new Analytics();
export default analytics;

// Also expose on window for non-module access
window.OceanSunsetAnalytics = analytics;