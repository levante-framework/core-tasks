/**
 * Utility to prevent scroll-to-refresh functionality on tablets and mobile devices
 * This prevents users from accidentally refreshing the tasks by pulling down
 */

export class ScrollRefreshPrevention {
  private startY: number = 0;
  private isAtTop: boolean = false;
  private isPulling: boolean = false;
  private pullThreshold: number = 50; // Minimum pull distance to trigger prevention
  private isEnabled: boolean = true;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Prevent default touch behaviors that could trigger refresh
    this.preventTouchBehaviors();
    
    // Add touch event listeners
    this.addTouchListeners();
    
    // Prevent context menu on long press
    this.preventContextMenu();
    
    // Prevent zoom gestures
    this.preventZoom();
    
    // Add scroll event listener to track position
    this.addScrollListener();
  }

  private preventTouchBehaviors(): void {
    // Prevent default touch behaviors
    document.addEventListener('touchstart', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  private addTouchListeners(): void {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;

    document.addEventListener('touchstart', (e) => {
      if (!this.isEnabled) return;
      
      startY = e.touches[0].clientY;
      currentY = startY;
      isPulling = false;
      
      // Check if we're at the top of the page
      this.isAtTop = window.scrollY === 0;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!this.isEnabled || !this.isAtTop) return;
      
      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      // If pulling down from the top, prevent the default behavior
      if (pullDistance > 0) {
        isPulling = true;
        e.preventDefault();
        
        // Add visual feedback if needed (optional)
        if (pullDistance > this.pullThreshold) {
          this.showPullFeedback();
        }
      }
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!this.isEnabled) return;
      
      if (isPulling && this.isAtTop) {
        // Reset any visual feedback
        this.hidePullFeedback();
      }
      
      isPulling = false;
    }, { passive: true });
  }

  private addScrollListener(): void {
    let ticking = false;
    
    const updateScrollPosition = () => {
      this.isAtTop = window.scrollY === 0;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    }, { passive: true });
  }

  private preventContextMenu(): void {
    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    });
  }

  private preventZoom(): void {
    // Prevent zoom gestures
    document.addEventListener('gesturestart', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    });

    document.addEventListener('gesturechange', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    });

    document.addEventListener('gestureend', (e) => {
      if (this.isEnabled) {
        e.preventDefault();
      }
    });
  }

  private showPullFeedback(): void {
    // Optional: Add visual feedback when user tries to pull to refresh
    // This could be a subtle indicator that refresh is disabled
    const body = document.body;
    if (!body.classList.contains('pull-feedback')) {
      body.classList.add('pull-feedback');
    }
  }

  private hidePullFeedback(): void {
    // Remove visual feedback
    const body = document.body;
    body.classList.remove('pull-feedback');
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public destroy(): void {
    // Remove all event listeners if needed
    this.isEnabled = false;
  }
}

// CSS for pull feedback (optional visual indicator)
export const pullFeedbackCSS = `
  .pull-feedback {
    position: relative;
  }
  
  .pull-feedback::before {
    content: "Pull to refresh disabled";
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
    animation: fadeInOut 2s ease-in-out;
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

// Initialize the prevention system
let scrollRefreshPrevention: ScrollRefreshPrevention | null = null;

export function initScrollRefreshPrevention(): ScrollRefreshPrevention {
  if (typeof window === 'undefined') {
    return null as any;
  }
  
  if (!scrollRefreshPrevention) {
    scrollRefreshPrevention = new ScrollRefreshPrevention();
    
    // Add CSS for feedback
    const style = document.createElement('style');
    style.textContent = pullFeedbackCSS;
    document.head.appendChild(style);
  }
  
  return scrollRefreshPrevention;
}

export function destroyScrollRefreshPrevention(): void {
  if (scrollRefreshPrevention) {
    scrollRefreshPrevention.destroy();
    scrollRefreshPrevention = null;
  }
}
