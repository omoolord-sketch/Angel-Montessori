import { Link } from "react-router-dom";
import DomainAwareLink from "../components/DomainAwareLink";
import PublicSiteLayout from "../components/PublicSiteLayout";

export default function VirtualClassroomPage() {
  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{
          backgroundImage: "url('/assets/home-featured-post.jpg')",
          backgroundPosition: "center center",
        }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">E-Learning / Virtual Classroom</div>
          <h1 className="public-page-banner-title">Learning without limits</h1>
          <p>
            At Angel Montessori School, learning goes beyond the physical classroom. Our Virtual Classroom system helps
            pupils and teachers connect, learn, and stay engaged from anywhere.
          </p>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-2 public-stage-overview-grid">
          <article className="public-card public-stage-card">
            <div className="public-kicker">What Pupils Can Do</div>
            <h3>One learning flow from live teaching to follow-up work</h3>
            <ul className="public-stage-list">
              <li>Join live online classes</li>
              <li>Access recorded lessons</li>
              <li>Download study materials</li>
              <li>Submit assignments</li>
              <li>Take online tests and CBT activities</li>
            </ul>
          </article>

          <article className="public-card public-stage-card">
            <div className="public-kicker">What Teachers Can Do</div>
            <h3>Teach, share, assess, and keep pupils engaged</h3>
            <ul className="public-stage-list">
              <li>Schedule and conduct live classes</li>
              <li>Share learning resources and recordings</li>
              <li>Assign and grade tasks</li>
              <li>Monitor participation and progress</li>
              <li>Keep classroom learning connected with the LMS</li>
            </ul>
          </article>
        </div>

        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Flexible and Accessible Learning</div>
          <h3>Built into the school portal, not separated from it</h3>
          <p>
            Our online learning system is connected with the Angel Montessori LMS, assignments, recorded lessons,
            learning materials, and CBT support. That means pupils can move from live class to follow-up work in one
            structured system.
          </p>
          <p>
            For live delivery, the school can use practical meeting tools such as Google Meet or Zoom while keeping the
            class schedule, access flow, recordings, and role-based access inside the portal.
          </p>
        </article>

        <div className="public-grid-2 public-stage-detail-grid">
          <article className="public-card public-stage-card">
            <div className="public-kicker">Student Journey</div>
            <h3>Login, open class, join, continue learning</h3>
            <ul className="public-stage-list">
              <li>Login to the portal</li>
              <li>Open the LMS</li>
              <li>Go to Virtual Classes</li>
              <li>Join the scheduled lesson</li>
              <li>Return later for recordings, assignments, and tests</li>
            </ul>
          </article>

          <article className="public-card public-stage-card">
            <div className="public-kicker">Teacher Journey</div>
            <h3>Schedule, teach live, and support follow-up</h3>
            <ul className="public-stage-list">
              <li>Login to the portal</li>
              <li>Open the LMS</li>
              <li>Create or update a virtual class session</li>
              <li>Start the live lesson</li>
              <li>Upload recordings and continue with assignments or quizzes</li>
            </ul>
          </article>
        </div>

        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Access The Virtual Classroom</div>
          <h3>Secure role-based access for Angel Montessori users</h3>
          <p>
            The virtual classroom is available through the protected school portal, with role-based access for pupils,
            teachers, and school staff.
          </p>
          <div className="public-stage-link-row">
            <DomainAwareLink className="public-stage-link" to="/login">Student Login</DomainAwareLink>
            <DomainAwareLink className="public-stage-link" to="/login">Teacher Login</DomainAwareLink>
            <Link className="public-stage-link" to="/information/student-portal">Student Portal Guide</Link>
            <Link className="public-stage-link" to="/information/staff-portal">Staff Portal Guide</Link>
          </div>
        </article>
      </section>
    </PublicSiteLayout>
  );
}
