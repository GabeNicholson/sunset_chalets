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
      // Step 1: Set up session first
      this.sessionId = await this._ensureSession();
      
      // Step 2: Set up visit second
      this.visitId = await this._ensureVisit();
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 3: Track the page view
      await this._trackPageView();
      
      // Mark as initialized
      this.isInitialized = true;
      
      // Process any actions that were waiting for initialization
      this._processPendingActions();
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
        // Only set cookie after successful database operation
        setCookie('session_id', sessionId, 365); // 1 year
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
    }
    return sessionId;
  }
  
  // STEP 2: Ensure visit is created and tracked
  async _ensureVisit() {
    const lastActivity = getCookie('last_activity');
    const currentTime = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000; // TODO: move to constants file?
    
    // Check if we need a new visit
    const needNewVisit = !lastActivity || 
                        (currentTime - new Date(lastActivity).getTime() > thirtyMinutes);
    
    let visitId = getCookie('current_visit');

    if (needNewVisit || !visitId) {
      visitId = generateUUID();
      
      // Create new visit in database BEFORE setting cookies
      // This ensures we don't set cookies for a visit that fails to be created
      try {
        const {twitterClickId, clickIdSource} = getTwclidInfo();
        // console.log(`twitterClickId: ${twitterClickId}, clickIdSource: ${clickIdSource}`)

        // Get device info
        const deviceInfo = this._getDeviceInfo();

        const payload = {
          visit_id: visitId,
          session_id: this.sessionId,
          visit_timestamp: new Date().toISOString(),
          landing_page_url: window.location.href,
          user_agent: navigator.userAgent,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browserVersion,
          device_type: deviceInfo.deviceType,
          os: deviceInfo.os,
          os_version: deviceInfo.osVersion,
          twitter_click_id: twitterClickId,
          twitter_click_id_source: clickIdSource,
          referrer_url: document.referrer,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight
        };

        const response = await fetch('/api/analytics/create_sitevisit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        // Only set cookies if visit was successfully created
        setCookie('current_visit', visitId, 1); // 1 day
        setCookie('last_activity', new Date().toISOString(), 1);
      } catch (error) {
        console.error('Error creating visit:', error);
        visitId = null;
      }
    } else {
      // For existing visit IDs, verify they exist in the database
      const response = await fetch('/api/analytics/verify_sitevisit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({"visitId": visitId})
      })

      const {visitExists} = await response.json()
        
      if (!visitExists) {
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
    return visitId;
  }
  
  // STEP 3: Track a page view
  async _trackPageView() {
    // Ensure we have valid IDs before proceeding
    if (!this.visitId || !this.sessionId) {
      console.error('Missing required IDs for page view tracking');
      return;
    }

    const {twitterClickId, clickIdSource} = getTwclidInfo();
    
    // Create payload with all required fields
    const payload = {
      page_view_id: this.pageViewId,
      visit_id: this.visitId,
      page_url: window.location.href,
      view_timestamp: new Date().toISOString(),
      twitter_click_id: twitterClickId,
      twitter_click_id_source: clickIdSource
    };

    const response = await fetch('/api/analytics/create_pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
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
    }
}

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

function getTwclidInfo() {
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
  } else if (cookieTwitterClickId) {
    clickId = cookieTwitterClickId;
    clickIdSource = 2; // Cookie source
  }
  return {
    twitterClickId: clickId,
    clickIdSource: clickIdSource
  }
}

// Create and export singleton instance
const analytics = new Analytics();

// Also expose on window for non-module access
window.OceanSunsetAnalytics = analytics;

export default analytics;