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