import { Link } from "react-router-dom";
import PublicSiteLayout from "../components/PublicSiteLayout";

const coreValues = [
  {
    title: "Excellence",
    body: "We strive for the highest standards in teaching, learning, and character development so every child can reach full potential.",
  },
  {
    title: "Integrity & Discipline",
    body: "We promote honesty, strong moral principles, and self-discipline so pupils grow into responsible and accountable individuals.",
  },
  {
    title: "Compassion & Respect",
    body: "We nurture kindness, empathy, and respect for others in a safe, inclusive, and supportive school environment.",
  },
  {
    title: "Innovation & Growth",
    body: "We embrace creativity, modern teaching methods, and continuous improvement to prepare pupils for lifelong learning and success.",
  },
];

const trustSignals = [
  "Founded on a coaching vision in 2015",
  "Formal school opened in 2016",
  "Crèche to Senior Secondary pathway",
  "Montessori and NERDC learning blend",
  "Strong parent partnership and child-centred care",
  "Building Lives, Inspiring Futures",
];

export default function AboutPage() {
  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{
          backgroundImage: "url('/assets/home-about.jpg')",
        }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">About</div>
          <h1 className="public-page-banner-title">A structured learning community built on vision, care, and growth</h1>
          <p>
            Angel Montessori School combines purposeful teaching, disciplined guidance, and nurturing support so
            children can grow in confidence from the earliest years to Senior Secondary.
          </p>
        </div>
      </section>

      <section className="public-about-shell">
        <div className="public-about-grid">
          <article className="public-about-copy">
            <h2>Who We Are</h2>
            <p>
              The story of Angel Montessori School began in June 2015 as a humble coaching centre born out of a deep
              desire to give children access to quality, structured learning. In September 2016, that vision grew into
              a full school and has continued to shape the institution ever since.
            </p>
            <p>
              Today, Angel Montessori School provides a full pathway from Crèche, Nursery and Reception through Basic School,
              Junior Secondary, and Senior Secondary. Our approach blends Montessori principles, the Nigerian curriculum,
              and technology-supported learning to develop the whole child intellectually, morally, socially, and
              emotionally.
            </p>
            <p>
              We believe strong education is built through purposeful teaching, visible care, family partnership, and a
              school environment where pupils are known, encouraged, and challenged to grow in both learning and
              character.
            </p>

            <h3>Our Vision</h3>
            <p>
              To be a leading Montessori-based institution recognized for academic excellence, strong moral values, and
              the holistic development of children, raising future leaders who are equipped to succeed and make positive
              contributions to society.
            </p>

            <h3>Our Mission</h3>
            <p>
              To provide a high-quality, affordable, and well-structured educational system that nurtures every child
              intellectually, morally, and socially through effective teaching methods, a supportive environment, and
              strong collaboration with parents.
            </p>
          </article>

          <img
            className="public-about-media"
            src="/assets/school-building.jpg"
            alt="Angel Montessori School building"
          />
        </div>
      </section>

      <section className="public-main-wrap">
        <article className="public-card" style={{ marginBottom: "16px" }}>
          <div className="public-kicker">Why Families Trust Us</div>
          <div className="public-pill-row">
            {trustSignals.map((item) => (
              <span key={item} className="public-pill">{item}</span>
            ))}
          </div>
        </article>

        <h2 className="public-section-title">Core Values</h2>
        <div className="public-grid-2">
          {coreValues.map((value) => (
            <article key={value.title} className="public-card">
              <h3>{value.title}</h3>
              <p>{value.body}</p>
            </article>
          ))}
        </div>

        <article className="public-card">
          <h3>Explore Next</h3>
          <p className="public-note">
            If you are exploring Angel Montessori School for your family, the next best step is to read the Head of
            School welcome, learn the admissions process, or speak directly with the school team.
          </p>
          <div className="public-actions">
            <Link className="public-btn primary" to="/about/head-of-school">Head of School Welcome</Link>
            <Link className="public-btn secondary" to="/admissions">Admissions Overview</Link>
            <Link className="public-btn secondary" to="/contact">Contact School Office</Link>
          </div>
        </article>
      </section>
    </PublicSiteLayout>
  );
}
