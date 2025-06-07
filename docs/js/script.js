document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

window.addEventListener('scroll', function() {
    const nav = document.querySelector('nav');
    if (window.scrollY > 100) {
        nav.style.background = 'rgba(44, 62, 80, 1)';
        nav.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.5)';
    } else {
        nav.style.background = 'rgba(44, 62, 80, 0.98)';
        nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    }
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 1s ease-out';
            entry.target.style.opacity = '1';
        }
    });
}, observerOptions);

document.querySelectorAll('.problem-card, .feature-card, .team-member, .process-step, .impact-card, .detail-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

document.querySelectorAll('.problem-card, .feature-card, .team-member, .impact-card, .tech-item').forEach(card => {
    card.addEventListener('mouseenter', function(e) {
        this.style.boxShadow = '0 20px 40px rgba(243, 156, 18, 0.3)';
    });
    card.addEventListener('mouseleave', function(e) {
        this.style.boxShadow = '';
    });
});

function createMobileMenu() {
    const nav = document.querySelector('nav');
    const navContainer = document.querySelector('.nav-container');
    
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    hamburger.style.display = 'none';
    
    const style = document.createElement('style');
    style.textContent = `
        .hamburger {
            display: none;
            flex-direction: column;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
        }
        
        .hamburger span {
            width: 25px;
            height: 3px;
            background: var(--accent-orange);
            margin: 3px 0;
            transition: 0.3s;
        }
        
        @media (max-width: 768px) {
            .hamburger {
                display: flex !important;
            }
            
            .nav-links {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background: var(--secondary-dark);
                flex-direction: column;
                padding: 1rem 0;
                display: none;
            }
            
            .nav-links.active {
                display: flex;
            }
        }
    `;
    document.head.appendChild(style);
    
    navContainer.appendChild(hamburger);
    
    hamburger.addEventListener('click', function() {
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
    });
}

document.addEventListener('DOMContentLoaded', createMobileMenu);

function lazyLoadMedia() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

document.addEventListener('DOMContentLoaded', lazyLoadMedia);

let scrollTimeout;
function throttleScroll(callback, delay) {
    if (scrollTimeout) return;
    
    scrollTimeout = setTimeout(() => {
        callback();
        scrollTimeout = null;
    }, delay);
}

window.addEventListener('scroll', () => {
    throttleScroll(() => {
        const nav = document.querySelector('nav');
        if (window.scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, 100);
});