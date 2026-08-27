import React from 'react';
import './HeroNavbar.css';

const HeroNavbar = ({ visible }) => (
    <nav className={`hero-navbar ${visible ? 'visible' : ''}`}>
        <div className="hero-navbar-left">
            <div className="hero-navbar-logo">
                Portfolio<span>2025</span>
            </div>
            <ul className="hero-navbar-links">
                <li><a href="#work">Work</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </div>
        <div className="hero-navbar-right">
            <a href="#resume" className="hero-navbar-link">Resume</a>
            <button className="hero-navbar-cta">Let's Talk</button>
        </div>
    </nav>
);

export default HeroNavbar;