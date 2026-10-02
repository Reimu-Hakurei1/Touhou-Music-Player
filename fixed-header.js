// Fixed Header Scroll Behavior
document.addEventListener('DOMContentLoaded', function() {
    const fixedHeader = document.getElementById('fixedHeader');
    const contentSpacer = document.querySelector('.content-spacer');
    
    if (!fixedHeader) return;
    
    // Calculate initial header height for spacer
    function updateContentSpacer() {
        if (contentSpacer) {
            const headerHeight = fixedHeader.offsetHeight;
            contentSpacer.style.height = headerHeight + 20 + 'px'; // Add some extra space
        }
    }
    
    const filterDisclosures = fixedHeader.querySelectorAll('.mobile-filter-disclosure');
    const mobileFilters = window.matchMedia('(max-width: 768px)');
    let isMobile = mobileFilters.matches;

    // Keep filters expanded on desktops, but start compact on phones.
    filterDisclosures.forEach(function(disclosure) {
        disclosure.open = !isMobile;
        disclosure.addEventListener('toggle', updateContentSpacer);
    });

    updateContentSpacer();
    window.addEventListener('resize', function() {
        updateContentSpacer();
        if (mobileFilters.matches !== isMobile) {
            isMobile = mobileFilters.matches;
            filterDisclosures.forEach(function(disclosure) {
                disclosure.open = !isMobile;
            });
            updateContentSpacer();
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
