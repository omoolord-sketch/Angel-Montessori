import { Link } from "react-router-dom";
import PublicSiteLayout from "../components/PublicSiteLayout";

const storyParagraphs = [
  "The story of Angel Montessori School is one of vision, sacrifice, resilience, and unwavering commitment to the future of children.",
  "It all began in June 2015 as a humble coaching center, born out of a deep desire to groom young minds and provide quality education - especially to children who had been denied access to a sound and structured learning system. At the heart of this mission was our late proprietress, Mrs. Temitope Janet Omoolorun, a woman whose passion for children's welfare and education was both inspiring and transformational.",
  "With dedication and compassion, she took it upon herself to teach these young learners using simple, effective, and impactful methods. Her goal was clear - to create an educational system that combined excellence, affordability, and a nurturing environment where every child could thrive regardless of their background.",
  "As the coaching center grew, so did its impact. Parents began to notice remarkable improvements in their children's learning, confidence, and overall development. Encouraged by these success stories, they urged her to establish a full school. This led to the formal birth of the school in September 2016, originally known as Little Angel Montessori.",
  "The journey, however, was not without challenges. The school faced several obstacles, including financial setbacks and resistance from competing institutions that saw its rapid growth as a threat. These challenges slowed progress at times, but they never weakened the school's purpose. Instead, they became a source of strength.",
  "What sustained the school through these difficult moments was the unwavering support of parents and the visible success of the pupils. Word-of-mouth became the school's strongest form of advertisement, as families shared real testimonies of transformation and academic excellence.",
  "Just as the school was beginning to break through these challenges, tragedy struck. In April 2018, the school lost its beloved founder, Mrs. Temitope Janet Omoolorun, who passed on to glory. Her passing was a profound loss, but her vision and legacy remained alive.",
  "With the continued support of parents, the dedication of staff, and the success of our pupils, the school has continued to grow and thrive. From its beginnings at 152 Okedigbon Road, Owo, Angel Montessori School has remained committed to impacting lives and shaping futures.",
  "Today, the evidence of that vision is clear for all to see. What started as a small coaching center has evolved into a thriving educational institution - one that continues to uphold its founding principles of excellence, affordability, and holistic child development.",
  "Our story is still being written, and with every child we teach, we continue to fulfill the dream of giving quality education to all.",
];

const ctaLinks = [
  { label: "Apply for Admission", to: "/admissions/register" },
  { label: "Schedule a Visit", to: "/book-a-visit" },
  { label: "Admissions Enquiry", to: "/admissions-enquiry" },
  { label: "Contact School", to: "/contact" },
];

const milestones = [
  "June 2015 - began as a coaching center",
  "September 2016 - school formally opened",
  "April 2018 - founder's legacy carried forward",
  "Today - a growing school shaping lives and futures",
];

export default function OurStoryPage() {
  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner public-head-welcome-hero"
        style={{
          backgroundImage: "url('/assets/school-building-3.jpg')",
          backgroundPosition: "center center",
        }}
      >
        <div className="public-page-banner-inner public-head-welcome-hero-inner">
          <div className="public-kicker">About Angel Montessori School</div>
          <h1 className="public-page-banner-title">Our Story</h1>
          <p>The journey of Angel Montessori School from a humble coaching center to a thriving learning community.</p>
        </div>
      </section>

      <section className="public-main-wrap public-head-welcome-wrap">
        <div className="public-head-welcome-breadcrumbs">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <Link to="/about">About</Link>
          <span>&gt;</span>
          <span>Our Story</span>
        </div>

        <div className="public-head-welcome-grid public-story-grid">
          <article className="public-head-welcome-copy public-story-copy">
            <h2>The story of Angel Montessori School is still being written.</h2>
            {storyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <div className="public-story-closing">
              <strong>Angel Montessori School</strong>
              <span>Building Lives, Inspiring Futures.</span>
            </div>
          </article>

          <aside className="public-head-welcome-aside">
            <div className="public-head-portrait-card public-story-aside-card">
              <img
                src="/assets/late-founder.png"
                alt="Mrs. Temitope Janet Omoolorun, late founder of Angel Montessori School"
              />
              <div className="public-head-portrait-copy">
                <div className="public-kicker">Founding Legacy</div>
                <h3>Mrs. Temitope Janet Omoolorun</h3>
                <p className="public-story-founder-role">Late Founder</p>
                <div className="public-story-founder-accent" aria-hidden="true" />
                <p className="public-story-founder-tribute">
                  Her vision of excellence, affordability, and compassionate learning continues to guide every child
                  we nurture.
                </p>
                <ul className="public-story-milestones">
                  {milestones.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="public-head-welcome-cta">
        <div className="public-head-welcome-cta-inner">
          <div>
            <div className="public-kicker">Next Step</div>
            <h2>Become part of the next chapter of our story.</h2>
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
