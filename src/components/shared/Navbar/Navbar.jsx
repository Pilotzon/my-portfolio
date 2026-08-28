import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const links = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Work', to: '/work' },
  { label: 'Contact', to: '/contact' },
];

export default function Navbar() {
  return (
    <header className={styles.navbar}>
      <NavLink className={styles.brand} to="/" aria-label="Portfolio home">
        Portfolio
      </NavLink>
      <nav className={styles.nav} aria-label="Primary navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            className={({ isActive }) => `${styles.link}${isActive ? ` ${styles.active}` : ''}`}
            to={link.to}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
