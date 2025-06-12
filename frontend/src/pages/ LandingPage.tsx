import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import TrafficGuardianLogo from '../assets/TrafficGuardianLogo1_LightFinal.png';

const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleSmoothScroll = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const element = document.querySelector(target.getAttribute('href')!);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', handleSmoothScroll);
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);

    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const elementsToObserve = document.querySelectorAll(
      '.problem-card, .feature-card, .team-member, .process-step, .impact-card, .detail-card'
    );

    elementsToObserve.forEach(el => {
      observer.observe(el);
    });

    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', handleSmoothScroll);
      });
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleLogin = () => {
    navigate('/account');
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="landing-page">
      <nav className={isScrolled ? 'scrolled' : ''}>
        <div className="nav-container">
          <div className="logo">
            <img src={TrafficGuardianLogo} alt="Traffic Guardian" className="logo-img" />
          </div>
          <button 
            className="hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <ul className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
            <li><a href="#home">Home</a></li>
            <li><a href="#problem">Problem</a></li>
            <li><a href="#solution">Solution</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#team">Team</a></li>
            <li><button className="nav-btn nav-btn-login" onClick={handleLogin}>Login</button></li>
            <li><button className="nav-btn nav-btn-signup" onClick={handleSignUp}>Sign Up</button></li>
          </ul>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <h1 className="floating">AI-Powered Traffic Safety for Gauteng</h1>
          <p className="hero-subtitle">
            Transforming highway monitoring with real-time computer vision to detect incidents instantly and save lives
          </p>
          <div className="cta-buttons">
            <a href="#solution" className="btn btn-primary">Discover Our Solution</a>
            <a href="#features" className="btn btn-secondary">View Features</a>
          </div>
          <div className="auth-section">
            <h3>Get Started Today</h3>
            <div className="auth-buttons">
              <button className="btn btn-login" onClick={handleLogin}>Login</button>
              <button className="btn btn-signup" onClick={handleSignUp}>Sign Up</button>
            </div>
          </div>
          <div className="aws-badge">Powered by AWS</div>
        </div>
      </section>

      <section className="problem" id="problem">
        <div className="container">
          <h2 className="section-title">The <span>Critical Challenge</span> We Address</h2>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">⏱️</div>
              <h3>Response Delays</h3>
              <p>Every second counts. Manual monitoring creates dangerous delays between incidents and emergency response.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">🚗</div>
              <h3>Cascading Congestion</h3>
              <p>Undetected incidents rapidly escalate into major traffic events, impacting thousands of commuters daily.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">👁️</div>
              <h3>Human Limitations</h3>
              <p>Operators cannot effectively monitor multiple camera feeds 24/7, leading to missed critical events.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">💰</div>
              <h3>Economic Impact</h3>
              <p>Traffic incidents cost millions in lost productivity, fuel waste, and secondary accident damages.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="solution" id="solution">
        <div className="container">
          <h2 className="section-title">Introducing <span>Traffic Guardian</span></h2>
          <div className="solution-content">
            <div className="solution-text">
              <h3>Intelligent Incident Detection System</h3>
              <p>Traffic Guardian revolutionises highway monitoring by transforming passive camera networks into active, AI-powered detection systems that never sleep.</p>
              <ul>
                <li>Instant detection of accidents, breakdowns, and hazards</li>
                <li>Automated severity classification for resource optimisation</li>
                <li>Real-time alerts with precise geolocation data</li>
                <li>Comprehensive incident analytics and reporting</li>
                <li>24/7 autonomous monitoring across multiple feeds</li>
              </ul>
            </div>
            <div className="solution-visual">
              <div className="demo-placeholder">
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</p>
                <p>Live Detection Interface</p>
                <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>Computer vision analysing traffic in real-time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title">Advanced <span>Capabilities</span></h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3 className="feature-title">Deep Learning AI</h3>
              <p>State-of-the-art TensorFlow models trained on thousands of traffic scenarios for accurate incident detection</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Real-Time Processing</h3>
              <p>Sub-second detection latency ensures immediate awareness of developing situations on the highway</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3 className="feature-title">3D Traffic Visualisation</h3>
              <p>Interactive digital twin of the highway network with live incident mapping and traffic flow analysis</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Predictive Analytics</h3>
              <p>Historical pattern recognition to identify accident hotspots and predict high-risk conditions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3 className="feature-title">Smart Alert System</h3>
              <p>Intelligent notification routing based on incident severity and available emergency resources</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Enterprise Security</h3>
              <p>Bank-grade encryption with full POPI Act compliance for all captured data and communications</p>
            </div>
          </div>
        </div>
      </section>

        