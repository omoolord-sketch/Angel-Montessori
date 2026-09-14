import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getPublicSiteOverview } from "../api/services";
import DomainAwareLink from "../components/DomainAwareLink";
import PublicSiteLayout from "../components/PublicSiteLayout";

const HERO_ROTATION_MS = 5000;

const heroSlides = [
  {
    image: "/assets/school-building.jpg",
    fallback: "https://source.unsplash.com/2400x1400/?school-building,campus,greenery",
  },
  {
    image: "/assets/school-building-2.jpg",
    fallback: "https://source.unsplash.com/2400x1400/?school-campus,school-environment",
  },
  {
    image: "/assets/school-building-3.jpg",
    fallback: "https://source.unsplash.com/2400x1400/?school-yard,school-building",
  },
  {
    image: "/assets/school-building-4.jpg",
    fallback: "https://source.unsplash.com/2400x1400/?education-campus,school",
  },
];

const stats = [
  { value: "Since 2015", label: "Growing from a coaching vision" },
  { value: "Crèche - SS3", label: "Complete learning pathway" },
  { value: "NERDC + Montessori", label: "Blended curriculum model" },
  { value: "CBT & E-Library", label: "Technology-supported learning" },
  { value: "Owo, Ondo State", label: "Rooted in community" },
];

const testimonials = [
  {
    quote:
      "Families value the way Angel Montessori combines careful teaching, disciplined routines, and a warm environment where children are known and supported.",
    name: "Strong Academic Guidance",
    tone: "rose",
  },
  {
    quote:
      "The school experience is shaped by parent partnership, moral instruction, and steady encouragement that helps children grow in confidence.",
    name: "Character And Care",
    tone: "gold",
  },
  {
    quote:
      "Technology-supported learning, clear communication, and structured school systems help families stay connected to progress every step of the way.",
    name: "Clear Family Support",
    tone: "sky",
  },
];

const activities = [
  {
    title: "Public Speaking",
    image: "/assets/home-activity-1.jpg",
    fallback: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Student Clubs",
    image: "/assets/home-activity-2.jpg",
    fallback: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "School Events",
    image: "/assets/home-activity-3.jpg",
    fallback: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
  },
];

const pathways = [
  {
    title: "Academics",
    copy: "Follow the learning path from Crèche to Senior Secondary, including curriculum, E-Library, CBT, and academic support.",
    to: "/academics",
  },
  {
    title: "Admissions",
    copy: "Understand visits, requirements, fees, application steps, and the help available before enrolment.",
    to: "/admissions",
  },
  {
    title: "Student Life",
    copy: "See clubs, sports, events, leadership, support, and transport as part of the wider school experience.",
    to: "/student-life",
  },
  {
    title: "Careers",
    copy: "Explore teaching and support opportunities in a school that values professionalism, structure, and child development.",
    to: "/careers",
  },
  {
    title: "Information",
    copy: "Access school calendar, portal guidance, downloads, FAQs, and practical family resources.",
    to: "/information",
  },
];

const schoolStrengths = [
  "Founded on a 2015 vision",
  "Formal school opened in 2016",
  "Crèche to Senior Secondary pathway",
  "Montessori and NERDC blend",
  "Character, discipline, and care",
  "Portal-supported family communication",
  "Building Lives, Inspiring Futures",
];

const featuredPost = {
  image: "/assets/home-featured-post.jpg",
  fallback: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1600&q=80",
};

const fallbackAnnouncements = [
  {
    id: "admissions",
    title: "Admissions support is open",
    summary: "Families can begin the admission journey, request visits, and send questions directly from the website.",
    date: "",
    link: "/admissions",
  },
  {
    id: "calendar",
    title: "School calendar information",
    summary: "Term dates, admissions windows, and planning guidance are easy to find across the website.",
    date: "",
    link: "/information/calendar",
  },
  {
    id: "academics",
    title: "CBT and digital learning guidance",
    summary: "Families can now see how assessments, CBT, and digital learning support fit into the school experience.",
    date: "",
    link: "/academics/cbt-assessments",
  },
];

const fallbackDownloads = [
  {
    id: "handbook",
    title: "School Handbook",
    category: "Family Guide",
    type: "PDF",
    description: "Policies, routines, and key school guidance for families.",
    url: "",
  },
  {
    id: "calendar",
    title: "Academic Calendar",
    category: "Calendar",
    type: "PDF",
    description: "A planning guide for terms, holidays, and school events.",
    url: "",
  },
  {
    id: "admissions",
    title: "Admission Guidance",
    category: "Admissions",
    type: "Guide",
    description: "Requirements, visit booking, and enquiry support.",
    url: "",
  },
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Date to be confirmed";
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function deriveAcademicFocus(eventTitle, activeTermName) {
  const title = String(eventTitle || "").toLowerCase();

  if (title.includes("revision")) return "Revision and examination readiness";
  if (title.includes("exam")) return "Assessment and performance preparation";
  if (title.includes("assessment") || title.includes("ca")) return "Continuous assessment and classroom follow-up";
  if (title.includes("resumption") || title.includes("orientation")) return "Settling into the school routine";
  if (title.includes("holiday") || title.includes("break")) return "Teaching flow and family planning";
  if (title.includes("sports")) return "Balanced learning and school participation";
  if (activeTermName && activeTermName !== "Current Term") return `${activeTermName} teaching and pupil progress`;
  return "Steady teaching, support, and progress tracking";
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [heroIndex, setHeroIndex] = useState(0);
  const [siteOverview, setSiteOverview] = useState(null);

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, HERO_ROTATION_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await getPublicSiteOverview();
        setSiteOverview(res?.data || null);
      } catch {
        setSiteOverview(null);
      }
    };

    loadOverview();
  }, []);

  const applyFallback = (event, fallback) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallback;
  };

  const liveAnnouncements = useMemo(
    () => (siteOverview?.announcements?.length ? siteOverview.announcements : fallbackAnnouncements),
    [siteOverview],
  );
  const liveCalendar = useMemo(() => siteOverview?.calendar || [], [siteOverview]);
  const liveDownloads = useMemo(
    () => (siteOverview?.downloads?.length ? siteOverview.downloads : fallbackDownloads),
    [siteOverview],
  );
  const upcomingCalendarEvents = useMemo(() => {
    const publishedCalendar = siteOverview?.publishedCalendar;
    const publishedEvents = Array.isArray(publishedCalendar?.terms)
      ? publishedCalendar.terms.flatMap((term) =>
          (term.events || []).map((item) => ({
            id: item.id,
            title: item.eventTitle,
            subtitle: `${term.termName} - ${item.eventTypeLabel || "School event"}`,
            description: item.description || `${term.termName} calendar event.`,
            startDate: item.startDate,
            endDate: item.endDate,
            isFeatured: Boolean(item.isFeatured),
            link: "/academic-calendar",
          }))
        )
      : [];

    const getTime = (value) => {
      const date = new Date(value || "");
      return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
    };

    const sortedPublishedEvents = [...publishedEvents].sort(
      (left, right) => getTime(left.startDate || left.endDate) - getTime(right.startDate || right.endDate)
    );
    const now = Date.now();
    const upcomingPublishedEvents = sortedPublishedEvents.filter((item) => {
      const end = new Date(item.endDate || item.startDate || "");
      return !Number.isNaN(end.getTime()) && end.getTime() >= now;
    });

    if (upcomingPublishedEvents.length) return upcomingPublishedEvents.slice(0, 3);
    if (sortedPublishedEvents.length) return sortedPublishedEvents.slice(0, 3);

    return liveCalendar.slice(0, 3).map((item, index) => ({
      id: item.id || `calendar-${index}`,
      title: item.title,
      subtitle: item.subtitle || "Published school calendar event",
      description: item.subtitle || "Key term date from the Angel Montessori academic calendar.",
      startDate: item.startDate,
      endDate: item.endDate,
      isFeatured: false,
      link: "/academic-calendar",
    }));
  }, [liveCalendar, siteOverview]);
  const activeTermName = siteOverview?.activeTerm?.termName || "Current Term";
  const activeTermWindow = siteOverview?.activeTerm?.startDate || siteOverview?.activeTerm?.endDate
    ? formatDateRange(siteOverview.activeTerm.startDate, siteOverview.activeTerm.endDate)
    : "Dates in school calendar";
  const nextCalendarEvent = upcomingCalendarEvents[0] || null;
  const currentAcademicFocus = deriveAcademicFocus(nextCalendarEvent?.title, activeTermName);
  const termAtGlanceItems = [
    {
      label: "Active Term",
      title: activeTermName,
      copy: siteOverview?.activeTerm?.termName
        ? "Teaching, assessment, and pupil support are currently running within this term."
        : "The current term will appear here once the calendar is fully published.",
    },
    {
      label: "Term Window",
      title: activeTermWindow,
      copy: "Published dates help families plan around lessons, breaks, and key school activities.",
    },
    {
      label: "Current Focus",
      title: currentAcademicFocus,
      copy: nextCalendarEvent
        ? `The next major calendar milestone is ${nextCalendarEvent.title}, so pupils and families can prepare early.`
        : "School routines, classroom delivery, and family communication stay aligned around the active session.",
    },
    {
      label: "Parent Reminder",
      title: "Stay aligned this term",
      copy: "Check portal updates, attendance, fee guidance, and key dates so nothing important is missed.",
    },
  ];
  const featuredAnnouncement = liveAnnouncements[0] || null;
  const secondaryAnnouncements = liveAnnouncements.slice(1, 4);

  return (
    <PublicSiteLayout>
      <section className="public-hero-landing">
        <div className="public-hero-slides" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.image}
              className={index === heroIndex ? "public-hero-slide active" : "public-hero-slide"}
              src={slide.image}
              onError={(event) => applyFallback(event, slide.fallback)}
              alt=""
            />
          ))}
        </div>

        <div className="public-hero-inner">
          <h1 className="public-hero-title">
            <span>Angel Montessori</span>
            <span>School</span>
          </h1>
          <p className="public-hero-tagline">Honesty, Service and Honour</p>

          <div className="public-hero-actions">
            <Link to="/admissions/register" className="public-btn primary">Apply for admission</Link>
            <Link to="/book-a-visit" className="public-btn secondary">Book a school visit</Link>
            <Link to="/donate" className="public-btn secondary">Donate</Link>
            <Link to="/information/e-learning" className="public-btn secondary">E-Learning</Link>
            {isAuthenticated ? (
              <DomainAwareLink to="/portal" className="public-btn secondary">Open Portal</DomainAwareLink>
            ) : (
              <DomainAwareLink to="/login" className="public-btn secondary">Portal Login</DomainAwareLink>
            )}
          </div>
        </div>
      </section>

      <section className="public-metric-strip">
        <div className="public-metric-grid">
          {stats.map((item) => (
            <article className="public-metric" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="public-home-layer public-home-intel-layer">
        <div className="public-home-wrap">
          <div className="public-home-intel-grid">
            <article className="public-home-intel-card feature">
              <div className="public-kicker">Current School Focus</div>
              <h3>{siteOverview?.activeSession?.sessionName ? `${siteOverview.activeSession.sessionName} Academic Session` : "Academic Session"}</h3>
              <p>
                {siteOverview?.activeTerm?.termName
                  ? `${siteOverview.activeTerm.termName} is the current active term in the school system.`
                  : "School planning, classroom teaching, and family communication stay aligned around the active session and term."}
              </p>
              <div className="public-actions">
                <Link className="public-btn secondary" to="/academic-calendar">Academic Calendar</Link>
                <Link className="public-btn secondary" to="/information/faqs">FAQs</Link>
              </div>

              <div className="public-home-focus-grid">
                {termAtGlanceItems.map((item) => (
                  <div key={item.label} className="public-home-focus-item">
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.copy}</p>
                  </div>
                ))}
              </div>

              <div className="public-home-focus-note">
                <span>Next major date</span>
                <strong>{nextCalendarEvent?.title || "Published calendar updates"}</strong>
                <p>
                  {nextCalendarEvent
                    ? `${formatDateRange(nextCalendarEvent.startDate, nextCalendarEvent.endDate)}. ${nextCalendarEvent.description}`
                    : "Keep an eye on the calendar and parent portal for the next confirmed school activity."}
                </p>
              </div>
            </article>

            <div className="public-home-intel-side">
              {upcomingCalendarEvents.map((item) => (
                <article key={item.id || item.title} className="public-home-intel-card mini">
                  <div className="public-kicker">{item.isFeatured ? "Featured Event" : "Upcoming Event"}</div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <div className="public-home-intel-date-row">
                    <span>{item.subtitle}</span>
                    <span>{formatDateRange(item.startDate, item.endDate)}</span>
                  </div>
                  <Link to={item.link || "/academic-calendar"} className="public-home-intel-link">View full calendar</Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-home-layer public-pathways-layer">
        <div className="public-home-wrap">
          <div className="public-section-heading">
            <div>
              <div className="public-kicker">Explore Angel Montessori</div>
              <h2 className="public-layer-title text-left">Find the part of school life that matters most to your family</h2>
            </div>
            <p className="public-section-copy">
              Use these main sections to see how Angel Montessori supports academics, admissions, student development, and everyday family communication.
            </p>
          </div>

          <div className="public-pathways-grid">
            {pathways.map((item) => (
              <Link key={item.title} to={item.to} className="public-pathway-card">
                <div className="public-kicker">Section</div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <span>Open section</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="public-about-shell">
        <div className="public-about-grid">
          <article className="public-about-copy">
            <div className="public-kicker">About Us</div>
            <h2>A private school community built on strong structure and care</h2>
            <p>
              Angel Montessori School grew from a coaching vision that began in 2015 and formally became a school in
              2016. Today the school continues that founding purpose by giving children access to structured,
              affordable, values-driven education in a nurturing environment.
            </p>
            <p>
              From Crèche, Nursery and Reception through Basic School, Junior Secondary, and Senior Secondary, the school blends
              Montessori principles, the NERDC curriculum, and technology-supported learning so pupils are prepared
              both for examinations and for life.
            </p>
            <p>
              Families experience that structure through clear communication, purposeful teaching, student support,
              transport visibility, enquiries, payments, and portal tools that help school and home work together.
            </p>

            <div className="public-actions">
              <Link className="public-btn primary" to="/about">About the School</Link>
              <Link className="public-btn secondary" to="/about/head-of-school">Head of School Welcome</Link>
            </div>
          </article>

          <img
            className="public-about-media"
            src="/assets/home-about.jpg"
            onError={(event) =>
              applyFallback(
                event,
                "https://images.unsplash.com/photo-1588072432904-843af37f03ed?auto=format&fit=crop&w=1200&q=80",
              )
            }
            alt="Students and staff at school event"
          />
        </div>
      </section>

      <section className="public-home-layer public-announcements-layer">
        <div className="public-home-wrap">
          <div className="public-section-heading">
            <div>
              <div className="public-kicker">Information</div>
              <h2 className="public-layer-title text-left">Current announcements and school timeline</h2>
            </div>
            <p className="public-section-copy">
              Families can quickly see current notices, admissions updates, and term planning information from the homepage.
            </p>
          </div>

          <div className="public-announcement-grid">
            <article className="public-announcement-feature">
              <div className="public-kicker">Featured Update</div>
              <h3>{featuredAnnouncement?.title || "Admissions and school updates"}</h3>
              <p>{featuredAnnouncement?.summary || "Important school information, admissions timing, and public guidance will appear here."}</p>
              <div className="public-home-intel-date-row">
                <span>{formatDate(featuredAnnouncement?.date) || "Current"}</span>
              </div>
              <div className="public-actions">
                <Link className="public-btn primary" to={featuredAnnouncement?.link || "/information"}>Read More</Link>
                <Link className="public-btn secondary" to="/information/calendar">Open Calendar</Link>
              </div>
            </article>

            <div className="public-announcement-list">
              {secondaryAnnouncements.map((item) => (
                <article key={item.id} className="public-announcement-item">
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                  <div className="public-home-intel-date-row">
                    <span>{formatDate(item.date) || "Current"}</span>
                    <Link to={item.link}>Open</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-home-layer public-resources-layer">
        <div className="public-home-wrap">
          <div className="public-section-heading">
            <div>
              <div className="public-kicker">Downloads & Resources</div>
              <h2 className="public-layer-title text-left">Useful school materials in one cleaner place</h2>
            </div>
            <p className="public-section-copy">
              Core school documents, calendars, and guidance are kept within easy reach for parents and visitors.
            </p>
          </div>

          <div className="public-resources-grid">
            {liveDownloads.slice(0, 3).map((item) => (
              <article key={item.id} className="public-resource-card">
                <div className="public-resource-meta">
                  <span>{item.category}</span>
                  <span>{item.type}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description || "Helpful Angel Montessori resource for families and visitors."}</p>
                <div className="public-actions">
                  {item.url ? (
                    <a className="public-btn secondary" href={item.url} target="_blank" rel="noreferrer">Open Resource</a>
                  ) : (
                    <Link className="public-btn secondary" to="/information/downloads">View Downloads</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-home-layer public-testimonials-layer">
        <div className="public-home-wrap">
          <h2 className="public-layer-title">Why Families Choose Angel Montessori</h2>
          <div className="public-testimonial-grid">
            {testimonials.map((item) => (
              <article className={`public-testimonial-card ${item.tone}`} key={item.name}>
                <p>{item.quote}</p>
                <div className="public-testimonial-name">{item.name}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-home-layer public-activities-layer">
        <div className="public-home-wrap">
          <h2 className="public-layer-title">Extracurricular Activities</h2>
          <div className="public-activity-grid">
            {activities.map((item) => (
              <article className="public-activity-card" key={item.title}>
                <img src={item.image} onError={(event) => applyFallback(event, item.fallback)} alt={item.title} />
                <div className="public-activity-card-copy">
                  <h3>{item.title}</h3>
                  <Link to="/student-life">Explore Student Life</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="public-home-layer public-latest-layer"
        style={{
          backgroundImage:
            "linear-gradient(rgba(4,46,56,0.86), rgba(4,46,56,0.9)), url('/assets/home-latest-bg.jpg'), url('https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=2200&q=80')",
        }}
      >
        <div className="public-home-wrap">
          <h2 className="public-layer-title latest">Academic & Digital Learning Highlights</h2>
          <p className="public-latest-subtitle">See how CBT, E-Library access, and school systems support learning and communication.</p>

          <div className="public-latest-grid">
            <article className="public-featured-post">
              <img
                src={featuredPost.image}
                onError={(event) => applyFallback(event, featuredPost.fallback)}
                alt="Featured school post"
              />
              <h3>CBT, E-Library, and digital classroom support</h3>
              <p>{siteOverview?.activeSession?.sessionName ? `${siteOverview.activeSession.sessionName} session focus` : "Technology-supported learning at Angel Montessori"}</p>
              <Link to="/academics/cbt-assessments" className="public-btn latest-btn">Read More</Link>
            </article>

            <div className="public-latest-list">
              {(siteOverview?.latestExams || []).map((item) => (
                <article key={item.id} className="public-latest-item">
                  <img src="/assets/home-post-3.jpg" alt={item.title} />
                  <div>
                    <h4>{item.title}</h4>
                    <p>{formatDate(item.createdAt) || "Assessment item"}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-home-layer public-affiliations-layer">
        <div className="public-home-wrap">
          <div className="public-section-heading">
            <div>
              <div className="public-kicker">School Strengths</div>
              <h2 className="public-layer-title text-left">What families can expect from Angel Montessori</h2>
            </div>
            <p className="public-section-copy">
              These school priorities reflect the kind of experience Angel Montessori is building for pupils and parents.
            </p>
          </div>
          <div className="public-affiliation-row">
            {schoolStrengths.map((item) => (
              <div key={item} className="public-affiliation-badge public-affiliation-text-badge">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-home-layer public-cta-layer">
        <div className="public-home-wrap public-cta-grid">
          <h2>Enroll your Child Today!</h2>
          <div className="public-cta-actions">
            <Link to="/admissions/register" className="public-cta-action">Apply for Admission</Link>
            <Link to="/book-a-visit" className="public-cta-action">Schedule a Visit</Link>
            <Link to="/donate" className="public-cta-action">Support the School</Link>
            <Link to="/information/downloads" className="public-cta-action">Downloads</Link>
            <Link to="/request-callback" className="public-cta-action">Request a Callback</Link>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}





