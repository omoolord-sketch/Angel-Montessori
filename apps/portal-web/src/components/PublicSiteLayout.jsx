import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { publicMenuSections } from "../content/publicSiteContent";
import DomainAwareLink from "./DomainAwareLink";
import "../pages/PublicSite.css";

const office = {
  phone: "+234 803 506 7767",
  whatsapp: "+234 803 506 7767",
  email: "info@angelmontessori.ng",
};

function FooterContactIcon({ type }) {
  if (type === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.1 4.9A9.85 9.85 0 0 0 12 2a9.97 9.97 0 0 0-8.63 14.97L2 22l5.2-1.36A10 10 0 1 0 19.1 4.9Zm-7.1 15.2a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.08.8.82-3-.2-.31A8.14 8.14 0 1 1 12 20.1Zm4.46-6.1c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06a6.58 6.58 0 0 1-1.94-1.2 7.15 7.15 0 0 1-1.33-1.66c-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.79-.19-.46-.38-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 1.99s.86 2.3.98 2.46c.12.16 1.68 2.56 4.07 3.6.57.25 1.01.4 1.36.51.57.18 1.09.15 1.5.09.46-.07 1.4-.57 1.6-1.13.2-.55.2-1.02.14-1.13-.05-.11-.21-.17-.45-.29Z" />
      </svg>
    );
  }

  if (type === "call") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 3.2-8 5.2-8-5.2V6l8 5.2L20 6v1.2Z" />
    </svg>
  );
}

const desktopDropdownMap = {
  about: [
    {
      label: "Our Story",
      to: "/about/history",
      children: [
        { label: "Our History", to: "/about/history" },
        { label: "Head of School", to: "/about/head-of-school" },
      ],
    },
    {
      label: "Philosophy",
      to: "/about/mission-vision-values",
      children: [
        { label: "Mission, Vision & Values", to: "/about/mission-vision-values" },
      ],
    },
    {
      label: "Governance",
      to: "/about/governance",
      children: [
        { label: "School Leadership", to: "/about/leadership" },
        { label: "School Governance", to: "/about/governance" },
      ],
    },
    {
      label: "Campus",
      to: "/about/campus",
      children: [
        { label: "Our Campus", to: "/about/campus" },
        { label: "Facilities", to: "/about/facilities" },
      ],
    },
    {
      label: "Policies",
      to: "/about/policies",
      children: [
        { label: "Policies", to: "/about/policies" },
        { label: "Contact Us", to: "/contact" },
      ],
    },
  ],
  academics: [
    {
      label: "Academic Journey",
      to: "/academics",
      children: [
        { label: "Crèche", to: "/academics/creche" },
        { label: "Reception", to: "/academics/reception" },
        { label: "Basic School", to: "/academics/basic-school" },
        { label: "Junior Secondary", to: "/academics/junior-secondary" },
        { label: "Senior Secondary", to: "/academics/senior-secondary" },
      ],
    },
    {
      label: "Learning Systems",
      to: "/academics/curriculum",
      children: [
        { label: "Curriculum", to: "/academics/curriculum" },
        { label: "E-Library", to: "/academics/e-library" },
        { label: "CBT & Assessments", to: "/academics/cbt-assessments" },
      ],
    },
    {
      label: "Calendar",
      to: "/academics/calendar",
      children: [
        { label: "Academic Calendar", to: "/academics/calendar" },
      ],
    },
  ],
  "student-life": [
    {
      label: "Student Life",
      to: "/student-life",
      children: [
        { label: "Student Life", to: "/student-life" },
        { label: "Student Support", to: "/student-life/support" },
      ],
    },
    {
      label: "Activities",
      to: "/student-life/clubs",
      children: [
        { label: "Clubs & Societies", to: "/student-life/clubs" },
        { label: "Sports", to: "/student-life/sports" },
        { label: "School Events", to: "/student-life/events" },
      ],
    },
    {
      label: "Leadership",
      to: "/student-life/leadership",
      children: [
        { label: "Leadership Opportunities", to: "/student-life/leadership" },
        { label: "Photo Gallery", to: "/student-life/gallery" },
        { label: "School Transport", to: "/student-life/transport" },
      ],
    },
  ],
  admissions: [
    {
      label: "Why Angel",
      to: "/admissions/why-choose-us",
      children: [
        { label: "Why Choose Our School", to: "/admissions/why-choose-us" },
        { label: "Tuition & Fees", to: "/admissions/fees" },
      ],
    },
    {
      label: "Admission Process",
      to: "/admissions/process",
      children: [
        { label: "Admission Process", to: "/admissions/process" },
        { label: "Admission Requirements", to: "/admissions/requirements" },
      ],
    },
    {
      label: "Visit & Apply",
      to: "/admissions/register",
      children: [
        { label: "Apply for Admission", to: "/admissions/register" },
        { label: "Entrance Exam Login", to: "/cbt/exam" },
        { label: "Book a School Visit", to: "/book-a-visit" },
        { label: "Admission Enquiry", to: "/admissions-enquiry" },
      ],
    },
  ],
  careers: [
    {
      label: "Careers Overview",
      to: "/careers",
      children: [
        { label: "Careers at Angel", to: "/careers" },
        { label: "Current Vacancies", to: "/careers/vacancies" },
        { label: "Interview Test Login", to: "/cbt/exam" },
      ],
    },
    {
      label: "Teaching Roles",
      to: "/careers/vacancies?category=academic_staff",
      children: [
        { label: "Academic Staff", to: "/careers/vacancies?category=academic_staff" },
        { label: "Early Years", to: "/careers/vacancies?category=early_years" },
      ],
    },
    {
      label: "Operations Roles",
      to: "/careers/vacancies?category=support_staff",
      children: [
        { label: "ICT & Operations", to: "/careers/vacancies?category=ict" },
        { label: "Support Staff", to: "/careers/vacancies?category=support_staff" },
      ],
    },
  ],
  enrichment: [
    {
      label: "STEM",
      to: "/enrichment",
      children: [
        { label: "STEM Programs", to: "/enrichment" },
        { label: "Coding & Robotics", to: "/enrichment/coding-robotics" },
      ],
    },
    {
      label: "Creativity",
      to: "/enrichment/arts-creativity",
      children: [
        { label: "Arts & Creativity", to: "/enrichment/arts-creativity" },
        { label: "Competitions & Awards", to: "/enrichment/competitions-awards" },
      ],
    },
    {
      label: "Enterprise",
      to: "/enrichment/entrepreneurship",
      children: [
        { label: "Entrepreneurship", to: "/enrichment/entrepreneurship" },
        { label: "Community Service", to: "/enrichment/community-service" },
        { label: "Educational Trips", to: "/enrichment/educational-trips" },
      ],
    },
  ],
  information: [
    {
      label: "Updates",
      to: "/information",
      children: [
        { label: "News & Announcements", to: "/information" },
        { label: "School Calendar", to: "/information/calendar" },
      ],
    },
    {
      label: "Portals",
      to: "/information/parent-portal",
      children: [
        { label: "Parent Portal", to: "/information/parent-portal" },
        { label: "Student Portal", to: "/information/student-portal" },
        { label: "Staff Portal", to: "/information/staff-portal" },
        { label: "E-Learning / Virtual Classroom", to: "/information/e-learning" },
        { label: "CBT Exam Login", to: "/cbt/exam" },
      ],
    },
    {
      label: "Resources",
      to: "/information/downloads",
      children: [
        { label: "Downloads", to: "/information/downloads" },
        { label: "FAQs", to: "/information/faqs" },
        { label: "Policies & Documents", to: "/information/policies-documents" },
      ],
    },
  ],
};

function normalizePath(value) {
  return String(value || "").split("?")[0];
}

function matchesTarget(currentPath, target) {
  const normalizedCurrent = normalizePath(currentPath);
  const normalizedTarget = normalizePath(target);
  if (!normalizedTarget) return false;
  return normalizedCurrent === normalizedTarget || normalizedCurrent.startsWith(`${normalizedTarget}/`);
}

function getDesktopItems(section) {
  if (desktopDropdownMap[section.key]) return desktopDropdownMap[section.key];
  return section.items.map((item) => ({
    label: item.label,
    to: item.to,
    children: [],
  }));
}

function sectionIsActive(currentPath, section) {
  const entries = [normalizePath(section.to)];
  section.items.forEach((item) => entries.push(normalizePath(item.to)));
  getDesktopItems(section).forEach((item) => {
    entries.push(normalizePath(item.to));
    (item.children || []).forEach((child) => entries.push(normalizePath(child.to)));
  });

  return entries.filter(Boolean).some((path) => matchesTarget(currentPath, path));
}

export default function PublicSiteLayout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const currentPath = `${location.pathname}${location.search || ""}`;
  const [openSection, setOpenSection] = useState("");
  const [openDesktopItem, setOpenDesktopItem] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState("");

  useEffect(() => {
    setOpenSection("");
    setOpenDesktopItem("");
    setMobileMenuOpen(false);
    setMobileSection("");
  }, [location.pathname]);

  const activeDesktopItems = useMemo(() => {
    const section = publicMenuSections.find((item) => item.key === openSection);
    return section ? getDesktopItems(section) : [];
  }, [openSection]);

  const activeDesktopEntry = activeDesktopItems.find((item) => item.label === openDesktopItem) || null;
  const activeDesktopIndex = Math.max(activeDesktopItems.findIndex((item) => item.label === openDesktopItem), 0);

  return (
    <div className={`public-site ${isHome ? "is-home" : ""}`}>
      <header className="public-nav-shell">
        <div className="public-nav-wrap">
          <Link to="/" className="public-brand" aria-label="Angel Montessori home">
            <img src="/logo.png" alt="Angel Montessori logo" />
          </Link>

          <nav className="public-nav" aria-label="Main navigation">
            {publicMenuSections.map((section) => {
              const isOpen = openSection === section.key;
              const isActive = sectionIsActive(currentPath, section);
              const desktopItems = getDesktopItems(section);

              return (
                <div
                  key={section.key}
                  className={`public-nav-section ${isOpen ? "open" : ""}`}
                  onMouseEnter={() => {
                    setOpenSection(section.key);
                    setOpenDesktopItem("");
                  }}
                  onMouseLeave={() => {
                    setOpenSection("");
                    setOpenDesktopItem("");
                  }}
                >
                  <div className={`public-nav-trigger ${isActive ? "active" : ""}`}>
                    <Link to={section.to} className="public-nav-link">
                      {section.label}
                    </Link>
                    <button
                      type="button"
                      className="public-nav-toggle"
                      onClick={() => {
                        setOpenSection((prev) => {
                          const next = prev === section.key ? "" : section.key;
                          setOpenDesktopItem("");
                          return next;
                        });
                      }}
                      aria-expanded={isOpen}
                      aria-haspopup="menu"
                      aria-label={`Toggle ${section.label} menu`}
                    >
                      <span className="public-nav-caret">v</span>
                    </button>
                  </div>

                  <div className="public-nav-dropdown public-nav-dropdown-classic">
                    <div className="public-nav-dropdown-list">
                      {desktopItems.map((item) => {
                        const isItemOpen = openDesktopItem === item.label;
                        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                        return (
                          <div
                            key={`${section.key}-${item.label}`}
                            className="public-nav-dropdown-item"
                            onMouseEnter={() => setOpenDesktopItem(hasChildren ? item.label : "")}
                          >
                            <Link to={item.to} className={`public-nav-dropdown-row ${isItemOpen ? "active" : ""}`}>
                              <span>{item.label}</span>
                              {hasChildren ? <span className="public-nav-subcaret">&gt;</span> : null}
                            </Link>
                          </div>
                        );
                      })}
                    </div>

                    {isOpen && activeDesktopEntry?.children?.length ? (
                      <div className="public-nav-submenu-panel" style={{ "--submenu-offset": `${8 + activeDesktopIndex * 48}px` }}>
                        {activeDesktopEntry.children.map((child) => {
                          const isChildActive = currentPath === child.to || matchesTarget(currentPath, child.to);
                          return (
                            <Link key={child.to} to={child.to} className={`public-nav-submenu-link ${isChildActive ? "active" : ""}`}>
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="public-nav-actions">
            <Link to="/donate" className="public-contact-btn">Donate</Link>
            <Link to="/contact" className="public-contact-btn">Contact</Link>
            <button
              type="button"
              className={`public-mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile navigation"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div className={`public-mobile-nav ${mobileMenuOpen ? "open" : ""}`}>
          <div className="public-mobile-nav-inner">
            <div className="public-mobile-nav-top">
              <div>
                <div className="public-kicker">Angel Montessori School</div>
                <h3>Explore The Website</h3>
              </div>
              <button type="button" className="public-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close mobile navigation">
                x
              </button>
            </div>

            <div className="public-mobile-section-list">
              {publicMenuSections.map((section) => {
                const isActive = sectionIsActive(currentPath, section);
                const isOpen = mobileSection === section.key;

                return (
                  <div key={section.key} className={`public-mobile-section ${isOpen ? "open" : ""}`}>
                    <div className={`public-mobile-section-head ${isActive ? "active" : ""}`}>
                      <Link to={section.to} className="public-mobile-section-link">{section.label}</Link>
                      <button
                        type="button"
                        className="public-mobile-section-toggle"
                        onClick={() => setMobileSection((prev) => (prev === section.key ? "" : section.key))}
                        aria-expanded={isOpen}
                        aria-label={`Toggle ${section.label} mobile menu`}
                      >
                        {isOpen ? "-" : "+"}
                      </button>
                    </div>
                    {isOpen ? (
                      <div className="public-mobile-submenu">
                        <p>{section.summary}</p>
                        {section.items.map((item) => (
                          <Link key={item.to} to={item.to} className="public-mobile-submenu-link">
                            <strong>{item.label}</strong>
                            <span>{item.description}</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="public-mobile-support">
              <Link className="public-btn secondary" to="/donate">Support The School</Link>
              <a className="public-btn secondary" href={`https://wa.me/${String(office.whatsapp).replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp Admissions</a>
              <Link className="public-btn primary" to="/contact">Contact School</Link>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="public-footer">
        <div className="public-footer-main">
          <div className="public-footer-brand-col">
            <img src="/logo.png" alt="Angel Montessori logo" />
          </div>

          <div className="public-footer-col public-footer-contact-col">
            <h4>Contact</h4>
            <p>152 Okedogbon Road, Owo, Ondo State, Nigeria</p>
            <p>{office.phone}</p>
            <p>{office.email}</p>
            <div className="public-footer-contact-actions">
              <a
                href={`https://wa.me/${String(office.whatsapp).replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="public-footer-icon-link whatsapp" aria-label="WhatsApp Angel Montessori"
                title="WhatsApp"
              >
                <FooterContactIcon type="whatsapp" />
              </a>
              <a
                href={`tel:${office.phone}`}
                className="public-footer-icon-link call" aria-label="Call Angel Montessori"
                title="Call"
              >
                <FooterContactIcon type="call" />
              </a>
              <a
                href={`mailto:${office.email}`}
                className="public-footer-icon-link email" aria-label="Email Angel Montessori"
                title="Email"
              >
                <FooterContactIcon type="email" />
              </a>
            </div>
          </div>

          <div className="public-footer-col">
            <h4>Quick Links</h4>
            <Link to="/about">About</Link>
            <Link to="/admissions">Admissions</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/donate">Donate</Link>
            <Link to="/book-a-visit">Schedule a Visit</Link>
            <Link to="/information/faqs">FAQ</Link>
          </div>

          <div className="public-footer-col">
            <h4>Portals</h4>
            <DomainAwareLink to="/login">Portal Login</DomainAwareLink>
            <Link to="/information/parent-portal">Parent Portal</Link>
            <Link to="/information/student-portal">Student Portal</Link>
            <Link to="/information/staff-portal">Staff Portal</Link>
          </div>

          <div className="public-footer-col">
            <h4>Support</h4>
            <Link to="/contact">Contact Us</Link>
            <Link to="/donate">Donate to the School</Link>
            <Link to="/request-callback">Request Callback</Link>
            <Link to="/admissions-enquiry">Admissions Enquiry</Link>
            <Link to="/information/downloads">Downloads</Link>
          </div>
        </div>

        <div className="public-footer-legal">
          <div>� {new Date().getFullYear()} Angel Montessori School. All rights reserved.</div>
          <div className="public-footer-legal-links">
            <Link to="/information/policies-documents">Privacy Policy</Link>
            <Link to="/information/policies-documents">Terms and Conditions</Link>
            <Link to="/information/policies-documents">Cookies Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}













