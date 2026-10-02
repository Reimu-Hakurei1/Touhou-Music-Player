// Fixed Header Scroll Behavior
document.addEventListener('DOMContentLoaded', function() {
    const fixedHeader = document.getElementById('fixedHeader');
    const contentSpacer = document.querySelector('.content-spacer');
    
    if (!fixedHeader) return;
    
    // Keep the first track below the fixed header as fonts, filters, and the
    // responsive layout change its actual height.
    function updateContentSpacer() {
        if (contentSpacer) {
            const headerHeight = Math.ceil(fixedHeader.getBoundingClientRect().height);
            contentSpacer.style.height = headerHeight + 32 + 'px';
        }
    }

    let spacerFrame = 0;
    function scheduleSpacerUpdate() {
        cancelAnimationFrame(spacerFrame);
        spacerFrame = requestAnimationFrame(updateContentSpacer);
    }
    
    const filterDisclosures = fixedHeader.querySelectorAll('.mobile-filter-disclosure');
    const mobileFilters = window.matchMedia('(max-width: 768px)');
    let isMobile = mobileFilters.matches;

    // Keep filters expanded on desktops, but start compact on phones.
    filterDisclosures.forEach(function(disclosure) {
        disclosure.open = !isMobile;
        disclosure.addEventListener('toggle', scheduleSpacerUpdate);
    });

    scheduleSpacerUpdate();
    if ('ResizeObserver' in window) {
        const headerObserver = new ResizeObserver(scheduleSpacerUpdate);
        headerObserver.observe(fixedHeader);
    }
    window.addEventListener('load', scheduleSpacerUpdate, { once: true });
    if (document.fonts?.ready) document.fonts.ready.then(scheduleSpacerUpdate);
    window.addEventListener('resize', function() {
        scheduleSpacerUpdate();
        if (mobileFilters.matches !== isMobile) {
            isMobile = mobileFilters.matches;
            filterDisclosures.forEach(function(disclosure) {
                disclosure.open = !isMobile;
            });
            scheduleSpacerUpdate();
        }
    });
    
    // Scroll event listener for header effects
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
            fixedHeader.classList.add('scrolled');
        } else {
            fixedHeader.classList.remove('scrolled');
        }
    });
    
    // Adjust profile container position on scroll
    window.addEventListener('scroll', function() {
        const profileContainer = document.getElementById('profileContainer');
        if (profileContainer) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 50) {
                profileContainer.style.top = '15px';
            } else {
                profileContainer.style.top = '20px';
            }
        }
    });
});
