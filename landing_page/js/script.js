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