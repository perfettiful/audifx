/**
 * Breadcrumb Navigation Component
 * Shows hierarchical navigation path with links
 */

import { Link } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  currentPage: string;
  currentIcon?: string;
}

export function Breadcrumb({ items, currentPage, currentIcon }: BreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={index} className={styles.item}>
            {item.href ? (
              <Link to={item.href} className={styles.link}>
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className={styles.text}>
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span>{item.label}</span>
              </span>
            )}
            <span className={styles.separator} aria-hidden="true">›</span>
          </li>
        ))}
        <li className={styles.item}>
          <span className={styles.current}>
            {currentIcon && <span className={styles.icon}>{currentIcon}</span>}
            <span>{currentPage}</span>
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default Breadcrumb;
