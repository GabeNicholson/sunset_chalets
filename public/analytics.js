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
        const { data, error } = await supabase.from('user_sessions').insert({
          session_id: sessionId,
          first_seen_timestamp: timestamp,
          last_seen_timestamp: timestamp
        }).select();
        
        if (error) {
          console.error('Error creating session:', error);
          // Try a simpler insert with just the essential fields
          const { retryError } = await supabase.from('user_sessions').insert({
            session_id: sessionId,
            first_seen_timestamp: timestamp
          });
          
          if (retryError) {
            console.error('Retry error creating session:', retryError);
            // Generate a new session ID as a last resort
            sessionId = generateUUID();
            const { lastError } = await supabase.from('user_sessions').insert({
              session_id: sessionId,
              first_seen_timestamp: new Date().toISOString()
            });
            
            if (lastError) {
              console.error('Final attempt to create session failed:', lastError);
            }
          }
        }
        
        // Only set cookie after successful database operation
        setCookie('session_id', sessionId, 365); // 1 year
        console.log('New session created:', sessionId);
      } catch (error) {
        console.error('Error creating session:', error);
        // Still set cookie even if DB operation fails
        setCookie('session_id', sessionId, 365);
      }
    } else {
      // For existing sessions, verify they exist in the database
      try {
        const { data, error } = await supabase
          .from('user_sessions')
          .select('session_id')
          .eq('session_id', sessionId)
          .maybeSingle();
          
        if (error || !data) {
          console.warn('Existing session ID not found in database:', sessionId);
          
          // Create the session in the database
          const timestamp = new Date().toISOString();
          await supabase.from('user_sessions').insert({
            session_id: sessionId,
            first_seen_timestamp: timestamp,
            last_seen_timestamp: timestamp
          });
        } else {
          // Update last seen timestamp in the background for valid sessions
          this._updateSessionLastSeen(sessionId).catch(err => 
            console.error('Error updating session last seen:', err)
          );
        }
      } catch (error) {
        console.error('Error verifying session:', error);
        // Continue with existing session ID despite the error
      }
    }
    
    return sessionId;
  }
  
  // Update session last seen timestamp
  async _updateSessionLastSeen(sessionId) {
    try {
      await supabase.from('user_sessions').update({
        last_seen_timestamp: new Date().toISOString()
      }).eq('session_id', sessionId || this.sessionId);
    } catch (error) {
      console.error('Error updating session last seen:', error);
    }
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

        // Insert visit record
        const { data, error } = await supabase.from('site_visits').insert(payload).select();
        
        if (error) {
          console.error('Error creating visit:', error);
          
          // If there's a foreign key violation, ensure the session exists
          if (error.code === '23503' && error.message.includes('session_id')) {
            // Try to fix by re-creating the session
            await this._ensureSession();
            
            // Retry the visit creation with the updated session ID
            payload.session_id = this.sessionId;
            const { retryData, retryError } = await supabase.from('site_visits').insert(payload).select();
            
            if (retryError) {
              console.error('Retry error creating visit:', retryError);
              // If retry fails, generate a fallback visit ID
              visitId = null;
            } else {
              // Only set cookies if visit was successfully created
              setCookie('current_visit', visitId, 1); // 1 day
              setCookie('last_activity', new Date().toISOString(), 1);
            }
          } else {
            // For other errors, do not set cookies yet
            visitId = null;
          }
        } else {
          // Only set cookies if visit was successfully created
          setCookie('current_visit', visitId, 1); // 1 day
          setCookie('last_activity', new Date().toISOString(), 1);
        }
      } catch (error) {
        console.error('Error creating visit:', error);
        visitId = null;
      }
    } else {
      // For existing visit IDs, verify they exist in the database
      try {
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
      } catch (error) {
        console.error('Error verifying visit:', error);
        // Continue with the existing visit ID despite the error
      }
    }
    
    // If we couldn't create or verify a visit, create a temporary one just for this pageview
    // This ensures we don't break the flow even if database operations fail
    if (!visitId) {
      console.warn('Creating temporary visit ID for this page view only');
      visitId = generateUUID();
      // Don't set cookies for temporary IDs
    }
    
    return visitId;
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
        await supabase.from('page_views').update({
          exit_timestamp: exitTime.toISOString(),
          time_on_page: timeOnPage,
          scroll_depth_percentage: this.maxScrollDepth
        }).eq('page_view_id', this.pageViewId);
      }
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
    
    // Error tracking with better async handling
    window.addEventListener('error', (event) => {
      const { message, filename, lineno, colno, error } = event;
      
      // Use _ensureInitialized to make sure we have valid session and visit IDs
      this._ensureInitialized(async () => {
        try {
          await supabase.from('error_events').insert({
            session_id: this.sessionId,
            visit_id: this.visitId,
            error_timestamp: new Date().toISOString(),
            error_message: message,
            error_stack: error?.stack || '',
            page_url: window.location.href
          });
        } catch (err) {
          console.error('Failed to log error event:', err);
        }
      });
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
  
  // PUBLIC METHODS
  
  // Track booking actions
  async trackBookNow(elementId) {
    return this._ensureInitialized(async () => {
      try {
        await supabase.from('book_now_actions').insert({
          session_id: this.sessionId,
          visit_id: this.visitId,
          action_timestamp: new Date().toISOString(),
          page_url: window.location.href,
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
        await supabase.from('contact_submissions').insert({
          session_id: this.sessionId,
          visit_id: this.visitId,
          submission_timestamp: new Date().toISOString(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null
        });
      } catch (error) {
        console.error('Error tracking contact submission:', error);
      }
    });
  }
  
  // Generic event tracking method
  async trackEvent(eventName, eventData = {}) {
    return this._ensureInitialized(async () => {
      try {
        await supabase.from('custom_events').insert({
          session_id: this.sessionId,
          visit_id: this.visitId,
          event_timestamp: new Date().toISOString(),
          event_name: eventName,
          event_data: eventData,
          page_url: window.location.href
        });
      } catch (error) {
        console.error(`Error tracking event ${eventName}:`, error);
      }
    });
  }
}

// Create and export singleton instance
const analytics = new Analytics();

// Also expose on window for non-module access
window.OceanSunsetAnalytics = analytics;

export default analytics;