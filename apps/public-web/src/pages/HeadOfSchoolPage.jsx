import { Link } from "react-router-dom";
import PublicSiteLayout from "../components/PublicSiteLayout";

const welcomeParagraphs = [
  "Dear Parents, Guardians, and Esteemed Visitors,",
  "It is my pleasure to warmly welcome you to Angel Montessori School, a place where every child is valued, nurtured, and inspired to reach their full potential.",
  "At Angel Montessori School, we are driven by a clear vision - to provide a strong educational foundation that combines academic excellence with character development. We believe that education is not just about acquiring knowledge, but about shaping confident, disciplined, and responsible individuals who are prepared to thrive in an ever-changing world.",
  "Our Montessori-inspired approach allows each child to learn at their own pace in a carefully prepared environment that encourages curiosity, independence, and creativity. From our early years through the foundational and advanced levels, we focus on developing the whole child - intellectually, socially, emotionally, and morally.",
  "We are proud of our team of dedicated and experienced educators who are passionate about teaching and committed to nurturing every learner. Through engaging classroom experiences, modern teaching methods, and the integration of technology, we ensure that our pupils receive a well-rounded and relevant education.",
  "At Angel Montessori School, we also recognize the importance of strong collaboration between the school and parents. We believe that when we work together, we can provide the best support system for our children, helping them grow into confident leaders and responsible citizens.",
  "Beyond academics, we offer a variety of enriching activities that foster creativity, teamwork, and leadership skills. Our goal is to create a safe, stimulating, and inclusive environment where every child feels valued and motivated to succeed.",
  "As you explore our website, I invite you to discover what makes Angel Montessori School a unique and inspiring place for learning. We are committed to excellence, and we look forward to welcoming you into our school community.",
  "Thank you for choosing Angel Montessori School.",
];

const ctaLinks = [
  { label: "Apply for Admission", to: "/admissions/register" },
  { label: "Schedule a Visit", to: "/book-a-visit" },
  { label: "Admissions Enquiry", to: "/admissions-enquiry" },
  { label: "Contact School", to: "/contact" },
];

export default function HeadOfSchoolPage() {
  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner public-head-welcome-hero"
        style={{
          backgroundImage: "url('/assets/school-building-2.jpg')",
          backgroundPosition: "center center",
        }}
      >
        <div className="public-page-banner-inner public-head-welcome-hero-inner">
          <div className="public-kicker">About Angel Montessori School</div>
          <h1 className="public-page-banner-title">Head of School's Welcome</h1>
          <p>Welcome message from the Director of Angel Montessori School.</p>
        </div>
      </section>

      <section className="public-main-wrap public-head-welcome-wrap">
        <div className="public-head-welcome-breadcrumbs">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <Link to="/about">About</Link>
          <span>&gt;</span>
          <span>Head of School's Welcome</span>
        </div>

        <div className="public-head-welcome-grid">
          <article className="public-head-welcome-copy">
            <h2>Welcome to Angel Montessori School.</h2>
            {welcomeParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <div className="public-head-signoff">
              <img className="public-head-signature" src="/assets/signature.png" alt="Joseph Samuel Omoolorun signature" />
              <strong>Joseph Samuel Omoolorun</strong>
              <span>Director, Angel Montessori School</span>
            </div>
          </article>

          <aside className="public-head-welcome-aside">
            <div className="public-head-portrait-card">
              <img src="/assets/director.jpg" alt="Joseph Samuel Omoolorun, Director of Angel Montessori School" />
              <div className="public-head-portrait-copy">
                <div className="public-kicker">School Leadership</div>
                <h3>Joseph Samuel Omoolorun</h3>
                <p>Director, Angel Montessori School</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="public-head-welcome-cta">
        <div className="public-head-welcome-cta-inner">
          <div>
            <div className="public-kicker">Next Step</div>
            <h2>Join the Angel Montessori learning community.</h2>
          </div>
          <div className="public-head-welcome-cta-grid">
            {ctaLinks.map((item) => (
              <Link key={item.to} to={item.to} className="public-head-welcome-cta-link">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}

