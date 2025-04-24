import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase client
const supabase = createClient('https://scwovajbhelvqmxztzdj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjd292YWpiaGVsdnFteHp0emRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNzM0NDcsImV4cCI6MjA2MDk0OTQ0N30.YAlG55-pUtHqWCQ33ovE477suFHMAqf3tB5wuh-NLK0');

// Helper functions
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

// Main Analytics class
class Analytics {
  constructor() {
    this.pageViewId = generateUUID();
    this.pageLoadTime = new Date();
    this.maxScrollDepth = 0;
    this.isInitialized = false;
    this.pendingActions = [];
    
    // Initialize with proper sequence
    this.init().catch(err => console.error('Analytics initialization error:', err));
    
    // Set up event listeners right away as they don't depend on initialization
    this._setupEventListeners();
  }
  
  // Main async initialization sequence
  async init() {
    try {
      console.log('Analytics initialization starting...');
      
      // Step 1: Set up session first
      this.sessionId = await this._ensureSession();
      console.log('Session established:', this.sessionId);
      
      // Step 2: Set up visit second
      this.visitId = await this._ensureVisit();
      console.log('Visit established:', this.visitId);
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 3: Track the page view
      await this._trackPageView();
      console.log('Page view tracked successfully');
      
      // Mark as initialized
      this.isInitialized = true;
      
      // Process any actions that were waiting for initialization
      this._processPendingActions();
      console.log('Analytics initialization complete');
    } catch (error) {
      console.error('Analytics initialization failed:', error);
      
      // Even if initialization fails, set initialized to true so the site continues to function
      this.isInitialized = true;
      this._processPendingActions();
    }
  }
  
  // Process actions that were called before initialization completed
  async _processPendingActions() {
    for (const action of this.pendingActions) {
      try {
        await action();
      } catch (error) {
        console.error('Error processing pending action:', error);
      }
    }
    this.pendingActions = [];
  }
  
  // Ensure the action is only performed once initialized
  async _ensureInitialized(actionFn) {
    if (this.isInitialized) {
      return actionFn();
    } else {
      return new Promise((resolve, reject) => {
        this.pendingActions.push(async () => {
          try {
            const result = await actionFn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }
  
  // STEP 1: Ensure session exists and is tracked
  async _ensureSession() {
    let sessionId = getCookie('session_id');
    
    if (!sessionId) {
      sessionId = generateUUID();
      
      // Create new session in database BEFORE setting cookies
      try {
        const timestamp = new Date().toISOString();
        const payload = {
          session_id: sessionId,
          first_seen_timestamp: timestamp,
          last_seen_timestamp: timestamp
        }
        const response = await fetch('/api/analytics/user_session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`user_session insert response: ${response}`)

        // Only set cookie after successful database operation
        setCookie('session_id', sessionId, 365); // 1 year
        console.log('New session created:', sessionId);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    } else {
      // For existing sessions, verify they exist in the database
      const payload = {
        session_id: sessionId,
        last_seen_timestamp: new Date().toISOString()
      }
      const response = await fetch('/api/analytics/update_user_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`user_session insert response: ${response}`) 
    }
    return sessionId;
  }
  
  // STEP 2: Ensure visit is created and tracked
  async _ensureVisit() {
    const lastActivity = getCookie('last_activity');
    const currentTime = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    
    // Check if we need a new visit
    const needNewVisit = !lastActivity || 
                        (currentTime - new Date(lastActivity).getTime() > thirtyMinutes);
    
    let visitId = getCookie('current_visit');
    
    if (needNewVisit || !visitId) {
      visitId = generateUUID();
      
      // Create new visit in database BEFORE setting cookies
      // This ensures we don't set cookies for a visit that fails to be created
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Twitter click ID handling
        const twitterClickId = urlParams.get('twclid');
        const cookieTwitterClickId = getCookie('twclid');
        
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
        console.log(`serverInfo: ${serverInfo}`)

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

        const response = await fetch('/api/analytics/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log(`response: ${response}`)
        // Only set cookies if visit was successfully created
        setCookie('current_visit', visitId, 1); // 1 day
        setCookie('last_activity', new Date().toISOString(), 1);
      } catch (error) {
        console.error('Error creating visit:', error);
        visitId = null;
      }
    } else {
      // For existing visit IDs, verify they exist in the database
      const { data, error } = await supabase
        .from('site_visits')
        .select('visit_id')
        .eq('visit_id', visitId)
        .maybeSingle();
        
      if (error || !data) {
        console.error('Existing visit ID not found in database:', visitId);
        // Clear the cookie and create a new visit
        visitId = null;
        setCookie('current_visit', '', -1); // Expire the cookie
        return this._ensureVisit(); // Recursive call to create a new visit
      } else {
        // Update last activity time for valid visits
        setCookie('last_activity', new Date().toISOString(), 1);
      }
    }
  }
  
  // STEP 3: Track a page view
  async _trackPageView() {
    try {
      // Ensure we have valid IDs before proceeding
      if (!this.visitId || !this.sessionId) {
        console.error('Missing required IDs for page view tracking');
        return;
      }
      
      // First, explicitly verify the visit exists in the database
      // This is crucial to avoid foreign key constraint violations
      const { data: visitExists, error: visitCheckError } = await supabase
        .from('site_visits')
        .select('visit_id')
        .eq('visit_id', this.visitId)
        .maybeSingle();
      
      if (visitCheckError || !visitExists) {
        console.warn('Visit ID does not exist in database, creating new visit first');
        
        // Force a new visit creation with explicit wait
        this.visitId = await this._ensureVisit();
        
        // Double-check the new visit was created successfully
        const { data: newVisitExists, error: newVisitCheckError } = await supabase
          .from('site_visits')
          .select('visit_id')
          .eq('visit_id', this.visitId)
          .maybeSingle();
          
        if (newVisitCheckError || !newVisitExists) {
          console.error('Failed to create valid visit for page view, aborting');
          return;
        }
      }
      
      // Create payload with all required fields
      const payload = {
        page_view_id: this.pageViewId,
        visit_id: this.visitId,
        page_url: window.location.href,
        view_timestamp: new Date().toISOString()
      };
      
      // Insert with detailed error handling
      const { error } = await supabase.from('page_views').insert(payload);
      
      if (error) {
        console.error('Error tracking page view:', error);
        
        // If there's still a foreign key violation despite our checks
        if (error.code === '23503' && error.message.includes('visit_id')) {
          console.error('Foreign key violation despite visit verification - database inconsistency');
          
          // Last resort: create a completely new visit with immediate insert
          const emergencyVisitId = generateUUID();
          const visitPayload = {
            visit_id: emergencyVisitId,
            session_id: this.sessionId,
            visit_timestamp: new Date().toISOString(),
            landing_page_url: window.location.href,
            user_agent: navigator.userAgent,
            emergency_fallback: true
          };
          
          const { data: emergencyVisit, error: emergencyVisitError } = await supabase
            .from('site_visits')
            .insert(visitPayload)
            .select();
            
          if (!emergencyVisitError && emergencyVisit) {
            // Update visit ID and retry page view
            this.visitId = emergencyVisitId;
            payload.visit_id = emergencyVisitId;
            
            const { retryError } = await supabase.from('page_views').insert(payload);
            if (retryError) {
              console.error('Final retry error tracking page view:', retryError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }
  
  // Update page view with exit time and scroll depth
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
  
  // Get server-side info (IP address)
  async _getServerSideInfo() {
    try {
      // Simplify the fetch request
      const response = await fetch('/api/analytics/client-info');
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting client info:', error);
      // Return a valid object structure even on error
      return { ip: null, timestamp: new Date().toISOString() };
    }
  }
  
  // Get device and browser info
  _getDeviceInfo() {
    const userAgent = navigator.userAgent;
    
    // Device type detection
    let deviceType = 'desktop';
    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      deviceType = 'tablet';
    }
    
    // Basic browser detection
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
    // Throttle scroll events for better performance
    let scrollTimeout;
    
    // Track scroll depth
    window.addEventListener('scroll', () => {
      // Clear the timeout if it's been set
      if (scrollTimeout) clearTimeout(scrollTimeout);
      
      // Set a new timeout
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        const scrollPercent = Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100);
        if (scrollPercent > this.maxScrollDepth) {
          this.maxScrollDepth = scrollPercent;
        }
      }, 100); // 100ms throttle
    });
    
    // Track page exits with better handling
    let exitTracked = false;
    
    const trackExit = () => {
      if (!exitTracked) {
        exitTracked = true;
        this._updatePageView();
      }
    };
    
    // Use various events to track page exit
    window.addEventListener('beforeunload', trackExit);
    window.addEventListener('pagehide', trackExit);
    
    // Track tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this._updatePageView();
      }
    });
    
    // Track performance metrics
    window.addEventListener('load', () => {
      if (window.performance && window.performance.timing) {
        setTimeout(() => {
          this._capturePerformanceMetrics();
        }, 0);
      }
    }); 
  }
  
  // Capture page performance metrics
  async _capturePerformanceMetrics() {
    if (!this.isInitialized || !window.performance || !window.performance.timing) return;
    
    try {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domInteractive = perfData.domInteractive - perfData.navigationStart;
      const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const firstPaint = perfData.responseEnd - perfData.navigationStart;
      
      await supabase.from('page_views').update({
        page_load_time: pageLoadTime,
        dom_interactive_time: domInteractive,
        dom_content_loaded_time: domContentLoaded,
        first_paint_time: firstPaint
      }).eq('page_view_id', this.pageViewId);
    } catch (error) {
      console.error('Error capturing performance metrics:', error);
    }
  }
  
  // Track booking actions
  async trackBookNow() {
    return this._ensureInitialized(async () => {
      try {
        const payload = {
          session_id: this.sessionId,
          visit_id: this.visitId,
          action_timestamp: new Date().toISOString(),
          page_url: window.location.href,
        }
        await fetch('/api/analytics/track_book_now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Error tracking booking action:', error);
      }
    });
  }
  
  // Track contact form submissions
  async trackContactSubmission(formData) {
    return this._ensureInitialized(async () => {
      try {
        const payload = {
          session_id: this.sessionId,
          visit_id: this.visitId,
          submission_timestamp: new Date().toISOString(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null
        }

        await fetch('/api/analytics/track_contact_submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Error tracking contact submission:', error);
      }
    });
  }
}

// Create and export singleton instance
const analytics = new Analytics();

// Also expose on window for non-module access
window.OceanSunsetAnalytics = analytics;

export default analytics;