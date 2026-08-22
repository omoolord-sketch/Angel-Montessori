import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicAcademicCalendar, getPublicSchoolFeeTemplate, getPublicSiteOverview, getPublicSiteRoleProfiles } from "../api/services";
import DomainAwareLink from "../components/DomainAwareLink";
import PublicSiteLayout from "../components/PublicSiteLayout";
import { getConfiguredApiBaseUrl } from "../config/runtimeConfig";
import { publicContentPages, publicMenuSections } from "../content/publicSiteContent";
import { getFixedSiteRoleProfiles } from "../content/siteRoleProfiles";
import { downloadSchoolFeeTemplate } from "../utils/schoolFeeTemplate";

function findSectionForPath(path) {
  return publicMenuSections.find((section) => section.to === path || section.items.some((item) => item.to === path)) || null;
}

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

function describePoint(pageKey, page, point, index) {
  const custom = {
    eLibrary: [
      "Pupils and teachers can draw from curated digital texts, reference materials, and reading support that strengthen classwork, revision, and independent study.",
      "The E-Library gives learners a clearer place to find materials for homework, project work, and guided research beyond the physical shelf.",
      "Because it connects with the portal and LMS, reading support stays close to lessons, assignments, and the wider school learning system.",
    ],
    cbtAssessments: [
      "Computer-based testing helps pupils build confidence with digital exam formats while giving the school a more structured way to manage assessment.",
      "Progress data and performance analytics make it easier for staff and families to see how learning is developing over time.",
      "Portal visibility helps pupils and parents follow assessment outcomes with more clarity instead of waiting on scattered updates.",
    ],
    academicsCalendar: [
      "Term dates help families, staff, and pupils plan school life with clearer structure from opening week to holiday break.",
      "Assessment windows give families better visibility into when tests, examinations, and revision pressure are likely to increase.",
      "Academic event planning keeps the wider school rhythm visible, from classroom milestones to school-wide learning activities.",
    ],
    studentLifeHome: [
      "School culture at Angel Montessori is shaped by values, discipline, encouragement, and the daily habits that help children grow well.",
      "Clubs and co-curricular programmes give pupils room to explore interests, build confidence, and discover strengths outside core lessons.",
      "Support systems help pupils feel guided, known, and encouraged as they move through the demands of school life.",
    ],
    clubs: [
      "Clubs such as debate, coding, science, press, and arts give pupils structured spaces to speak up, collaborate, and explore new interests.",
      "Many pupils grow in confidence and communication when they are given regular opportunities to present, create, and participate beyond class.",
      "Club life helps children practise teamwork, curiosity, and creative thinking in ways that feel active rather than theoretical.",
    ],
    sports: [
      "Sports programmes give pupils regular opportunities to build fitness, skill, and healthy discipline through organised activity.",
      "Inter-house sports strengthen house spirit, teamwork, resilience, and the joy of representing a wider school community.",
      "These activities support whole-child growth by building confidence, stamina, and healthy habits alongside academic work.",
    ],
    studentEvents: [
      "Cultural days and exhibitions help pupils celebrate identity, creativity, and the wider life of the school community.",
      "Inter-house events create memorable moments of teamwork, performance, and healthy competition across the school year.",
      "Graduation and prize-giving ceremonies help families celebrate progress, effort, and important school milestones with pride.",
    ],
    studentLeadership: [
      "The prefect system gives selected pupils real responsibility, helping them practise service, order, and visible leadership.",
      "Student council opportunities help pupils learn how to represent others, communicate respectfully, and contribute to school life.",
      "Leadership training helps children grow into responsibility gradually, with guidance that keeps character and service at the centre.",
    ],
    studentSupport: [
      "Counselling and mentoring help pupils feel heard, supported, and guided when they need encouragement or direction.",
      "Academic support gives learners extra guidance where understanding, confidence, or study habits need strengthening.",
      "Wellbeing and behaviour guidance help the school respond to challenges in ways that are clear, caring, and constructive.",
    ],
    studentTransport: [
      "Routes and pickup points are organised to help transport run with more order, predictability, and daily family trust.",
      "Safety policies set the expectations that guide bus conduct, supervision, and transport planning across the school day.",
      "For assigned families, parent visibility adds reassurance by keeping key transport details easier to follow through the school system.",
    ],
    gallery: [
      "The gallery helps families see real classroom moments, celebrations, and activity snapshots from life at Angel Montessori.",
      "School events captured in photos give visitors a stronger feel for the rhythm, warmth, and public life of the community.",
      "Sports and creative programmes show pupils learning, competing, performing, and expressing themselves beyond the timetable.",
    ],
    admissionsWhy: [
      "A balanced curriculum helps families see that Angel Montessori combines structure, independence, and modern learning rather than relying on one narrow approach.",
      "Technology, academic excellence, and character development show that the school is preparing pupils for both examinations and life with discipline and confidence.",
      "Student support, parent partnership, and affordable quality education reassure families that growth, communication, and value are taken seriously across the whole school experience.",
    ],
    admissionsProcess: [
      "Enquiry and visit support help families ask questions early and understand the school before they commit to an application.",
      "Application and document review bring order to the admissions journey so records, class fit, and requirements are handled properly.",
      "Screening, decision, and enrolment guidance help families move forward with fewer surprises and clearer next steps.",
    ],
    admissionsFees: [
      "Fee structure by learning level helps families understand how charges are organized from early years through secondary school.",
      "What tuition covers and which items may attract separate charges gives parents clearer planning visibility before enrolment.",
      "Payment options, discounts, and fee-detail support help families ask the right questions and make informed school decisions.",
    ],
    scholarships: [
      "Sibling discount guidance helps families understand when reduced-fee support may apply within school policy.",
      "School-approved support conversations make space for careful clarification rather than assumptions about what the school offers.",
      "Admissions follow-up on eligibility helps families know what to ask, what documents may be needed, and how decisions are handled.",
    ],
    informationHome: [
      "News and announcements help families stay close to school updates, achievements, and important public information.",
      "Portal access guidance makes it easier for parents, pupils, and staff to know where to log in and what each portal supports.",
      "Downloads, FAQs, and policies bring the practical documents families need into one easier place to use.",
    ],
    informationCalendar: [
      "Term dates help the whole school community plan with better timing around opening, closing, and holiday periods.",
      "Events and ceremonies keep families informed about important public moments in the school year.",
      "Exam timing supports stronger preparation by making key academic pressure points easier to anticipate.",
    ],
    parentPortalInfo: [
      "Results and attendance visibility help parents follow academic progress and everyday school consistency more closely.",
      "Payments and receipts give families a clearer way to track invoices, balances, and school payment history.",
      "Transport and family support tools make it easier for parents to stay informed about practical day-to-day school matters.",
    ],
    studentPortalInfo: [
      "LMS access keeps lessons, materials, and structured learning tasks close to the pupil's everyday workspace.",
      "Homework and submission tools help pupils keep track of what must be done and how work should be returned.",
      "CBT readiness gives learners a familiar place to practise and complete digital assessments with more confidence.",
    ],
    staffPortalInfo: [
      "Teaching workflows help staff manage classroom tasks, records, and learning support with more consistency.",
      "Assessment systems keep grading, subject tracking, and student performance work in one connected school platform.",
      "Operations tools support the behind-the-scenes coordination that helps school teams work with better clarity each day.",
    ],
    eLearning: [
      "Live class access keeps pupils connected to scheduled teaching sessions when learning needs to continue beyond the physical classroom.",
      "Recorded lessons help pupils revisit instruction, catch up after absence, or revise key points at a steadier pace.",
      "Assignments and CBT support keep online learning connected to the wider LMS rather than turning live classes into isolated events.",
    ],
    downloads: [
      "Admission forms make it easier for families to start enquiries and applications with the right information in hand.",
      "The school handbook gives parents and guardians a clearer picture of expectations, routines, and school culture.",
      "Calendar and policy summaries help families find essential planning and guidance documents without unnecessary delays.",
    ],
    faqs: [
      "Admissions questions help families move faster through common concerns about entry points, requirements, and school visits.",
      "Fees questions give quicker clarity on school charges, payment expectations, and where to seek follow-up support.",
      "Transport and portal questions cover the practical topics families often need sorted early in the school relationship.",
    ],
    policiesDocuments: [
      "Family guidance and handbooks help the school communicate everyday expectations with more consistency and less confusion.",
      "Student protection and safeguarding guidance make the school's duty of care more visible and easier for families to trust.",
      "Attendance and transport rules help daily school life run with clearer expectations for pupils, parents, and staff.",
    ],
    leadership: [
      "Head of School leadership gives families a clearer sense of the vision, standards, and direction shaping school life.",
      "The wider leadership team supports academics, operations, staff coordination, and smooth daily school management.",
      "Leadership approach and accountability help parents see how excellence, discipline, and improvement are being upheld.",
      "Support for students, staff, and families shows that leadership is active in daily school life, not only administrative.",
    ],
    governance: [
      "Governance philosophy explains the responsibility, transparency, and improvement standards guiding school oversight.",
      "Governance structure shows how ownership, school leadership, and operational units work together with clearer accountability.",
      "Policy, finance, and academic oversight help the school maintain standards across teaching, welfare, and sustainability.",
      "Trust, accountability, and safe practice reassure families that school systems are being managed responsibly.",
    ],
    campus: [
      "Learning spaces shape how pupils settle, focus, and move through their day, so environment matters as much as layout.",
      "An accessible campus layout helps routines, movement, supervision, and school life feel more orderly and reassuring.",
      "School identity is strengthened when the environment reflects purpose, belonging, and the values families expect to see.",
      "A school visit often helps families understand the campus more clearly by connecting the physical environment to real daily school life.",
    ],
    facilities: [
      "Academic spaces such as classrooms, reading areas, and ICT support zones help learning feel practical and well supported.",
      "Sports and activity areas give pupils room to move, compete, and develop beyond the classroom timetable.",
      "Operational support systems keep the practical side of school life running in ways families may not always see but still rely on.",
      "Facilities matter most when they strengthen the wider daily school experience, from classroom work to supervision and pupil development.",
    ],
    aboutPolicies: [
      "Child protection guidance shows the seriousness with which the school approaches safety, care, and safeguarding responsibilities.",
      "Attendance and conduct policies help families understand the standards that support order, discipline, and school trust.",
      "Transport rules and code of conduct expectations make everyday responsibilities clearer for pupils, parents, and staff alike.",
    ],
  };

  return (
    custom[pageKey]?.[index] ||
    `This part of the ${page.kicker.toLowerCase()} page shows how Angel Montessori turns ${point.toLowerCase()} into something families can understand in practical school terms.`
  );
}

function buildKeyHighlightsIntro(pageKey, page) {
  if (["academicsHome", "creche", "reception", "basicSchool", "juniorSecondary", "seniorSecondary", "curriculum", "eLibrary", "cbtAssessments", "academicsCalendar"].includes(pageKey)) {
    return "These highlights give families a quick picture of the academic structure, learner support, and stage-by-stage progression explained on this page.";
  }

  if (["studentLifeHome", "clubs", "sports", "studentEvents", "studentLeadership", "studentSupport", "studentTransport", "gallery"].includes(pageKey)) {
    return "These highlights bring together the main parts of pupil experience, belonging, growth, and support covered on this part of student life.";
  }

  if (pageKey === "admissionsWhy") {
    return "These highlights summarize the main reasons families choose Angel Montessori School, from curriculum strength and teacher quality to character development and parent partnership.";
  }

  if (pageKey === "admissionsFees") {
    return "These highlights pull together the main fee-structure, value, and payment-planning points families are likely to need before taking the next admissions step.";
  }

  if (pageKey === "leadership") {
    return "These highlights bring together the core leadership themes on this page, from strategic direction and team structure to staff support and parent partnership.";
  }

  if (pageKey === "governance") {
    return "These highlights summarize the governance areas that help Angel Montessori School operate with accountability, policy clarity, and long-term stability.";
  }

  if (["admissionsProcess", "scholarships"].includes(pageKey)) {
    return "These highlights bring out the main admissions steps, support points, or policy guidance families should understand before moving forward.";
  }

  if (["enrichmentHome", "codingRobotics", "artsCreativity", "entrepreneurship", "communityService", "educationalTrips", "competitionsAwards"].includes(pageKey)) {
    return "These highlights show the main enrichment experiences, skills, and wider-development focus described on this page.";
  }

  if (["informationHome", "informationCalendar", "parentPortalInfo", "studentPortalInfo", "staffPortalInfo", "eLearning", "downloads", "faqs", "policiesDocuments"].includes(pageKey)) {
    return "These highlights gather the key practical tools, access points, planning details, or guidance resources families and staff can expect from this page.";
  }

  if (["headOfSchool", "history", "missionVision", "leadership", "governance", "campus", "facilities", "aboutPolicies"].includes(pageKey)) {
    return "These highlights draw out the main leadership, school identity, environment, or policy themes explained on this page.";
  }

  return "These highlights give a quick view of the main ideas visitors should take away from the " + page.kicker.toLowerCase() + " page.";
}

function buildWhyItMatters(pageKey, page) {
  const custom = {
    academicsHome:
      "Families want confidence that a school can carry a child from early years through senior classes with consistency. This overview shows how Angel Montessori structures teaching, progress, and academic support across the full journey.",
    creche:
      "Early years decisions matter because families want reassurance that a child's first school experience will feel safe, nurturing, and developmentally appropriate. This page helps show how Angel Montessori supports comfort, routine, expression, and early growth at the Creche stage.",
    reception:
      "Reception matters because it builds the bridge between early childhood care and formal learning. This page helps families see how Angel Montessori develops school readiness, phonics, numeracy, confidence, and routine with joy and structure.",
    basicSchool:
      "The Basic School years matter because they form the academic habits children will rely on for years to come. This page helps families see how Angel Montessori builds literacy, numeracy, discipline, creativity, and digital readiness from Basic 1 to Basic 6.",
    juniorSecondary:
      "Junior Secondary matters because it is the point where pupils begin to handle broader subjects, deeper thinking, and stronger academic independence. This page helps show how Angel Montessori prepares learners for that transition with structure and growing confidence.",
    seniorSecondary:
      "Senior Secondary matters because families want to know how students are being prepared for WAEC, NECO, higher education, and future choices. This page helps explain how Angel Montessori combines specialization, exam readiness, and academic maturity at that stage.",
    curriculum:
      "Curriculum matters because it shows what kind of learner a school is truly shaping. This page helps families see how Angel Montessori blends NERDC, Montessori principles, technology, and character formation into one purposeful learning journey.",
    eLibrary:
      "Library support matters because strong reading habits and good research access influence performance across the whole school journey. This page helps families see how Angel Montessori supports that work digitally as well as in the classroom.",
    cbtAssessments:
      "Assessment systems matter because families want clarity about how progress is measured and how pupils are prepared for digital testing. This page helps explain how Angel Montessori handles that more visibly and more confidently.",
    academicsCalendar:
      "Academic timing matters because families plan around exams, holidays, and important school milestones. This page helps Angel Montessori present those planning windows more clearly for the whole school community.",
    enrichmentHome:
      "A strong enrichment programme shows whether a school is preparing pupils only for tests or for life. This page helps families see how Angel Montessori develops curiosity, innovation, confidence, and practical thinking beyond core classroom lessons.",
    codingRobotics:
      "Families want to know whether technology learning is practical, age-appropriate, and future-facing. This page shows how Angel Montessori helps pupils move from digital familiarity to confident understanding and creation.",
    artsCreativity:
      "Creative development matters because children need room to express themselves, build confidence, and discover talent. This page shows how Angel Montessori treats arts as a meaningful part of whole-child growth, not an afterthought.",
    entrepreneurship:
      "Entrepreneurship education matters because pupils need initiative, responsibility, and practical thinking as well as academic knowledge. This page shows how Angel Montessori introduces those habits in ways children can grow into with confidence.",
    communityService:
      "Service learning helps families see whether a school is shaping character as seriously as academics. This page shows how Angel Montessori builds empathy, responsibility, and leadership through meaningful acts of care and contribution.",
    educationalTrips:
      "Educational trips matter because some lessons become clearer when pupils can see and experience them in the real world. This page shows how Angel Montessori uses guided exposure to deepen understanding, curiosity, and wider awareness.",
    competitionsAwards:
      "Healthy competition helps pupils discover strengths, grow in courage, and learn how to pursue excellence well. This page shows how Angel Montessori uses competitions and recognition to build confidence, discipline, and school pride.",
    studentLifeHome:
      "Parents are choosing more than classrooms. They are choosing the environment that shapes confidence, discipline, relationships, and belonging. This section helps them see that wider student experience clearly.",
    clubs:
      "Clubs matter because they help children discover interests, practise confidence, and grow beyond the formal timetable. This page shows how Angel Montessori uses co-curricular life to strengthen curiosity, speaking, teamwork, and creative development.",
    sports:
      "Sports pages should show more than activity lists. They should help families see how discipline, healthy habits, resilience, and teamwork are being built through structured participation. This page gives that picture more clearly.",
    studentEvents:
      "School events help families understand the life and rhythm of a school community. This page shows how Angel Montessori marks learning, celebration, culture, and milestones in ways that strengthen belonging and shared memory.",
    studentLeadership:
      "Leadership opportunities matter because children grow when responsibility is practised, not only discussed. This page shows how Angel Montessori helps pupils build confidence, service, and maturity through guided leadership roles.",
    studentSupport:
      "Support systems matter because no child should be left to struggle without guidance. This page helps families see how Angel Montessori provides mentoring, encouragement, wellbeing care, and academic support around the learner.",
    studentTransport:
      "Transport is often a daily trust issue for families. This page helps parents understand how Angel Montessori approaches routes, stops, safety expectations, and visibility around pickup and dropoff arrangements.",
    gallery:
      "A gallery should do more than decorate a website. It should give families and visitors a real feel for school life. This page helps Angel Montessori show that wider story visually through activities, events, and everyday moments.",
    admissionsWhy:
      "Families need more than promises when choosing a school. They need a clear picture of curriculum strength, teacher quality, pupil support, school culture, and long-term value. This page helps Angel Montessori show why the school is a strong place for children to grow with confidence and purpose.",
    admissionsProcess:
      "A strong admissions process makes families feel guided from the first question to final enrolment. That clarity builds trust and helps enquiries become confident applications.",
    admissionsFees:
      "Fee guidance matters because families need clarity, value, and trust before they commit. This page helps Angel Montessori explain tuition structure, what fees cover, payment expectations, and where parents can request class-specific details with confidence.",
    scholarships:
      "Where discounts or school-approved support options exist, families need careful guidance rather than assumptions. This page helps Angel Montessori explain those conversations more clearly and responsibly.",
    informationHome:
      "Families and visitors often need quick access to dates, portal guidance, downloads, and school updates. This section keeps those practical resources easy to find and easier to trust.",
    informationCalendar:
      "Planning information matters because families, staff, and pupils depend on clear dates to stay organised. This page helps Angel Montessori present important calendar windows in a way that supports better preparation.",
    parentPortalInfo:
      "Portal guidance matters because families need to know what visibility they will have after enrolment. This page shows how Angel Montessori supports parents with clearer access to results, homework, payments, transport, and school communication.",
    studentPortalInfo:
      "A student portal should help learners work more independently, not just store links. This page shows how Angel Montessori brings lessons, assignments, assessments, and resources together for student use.",
    staffPortalInfo:
      "Staff portal pages should show how teaching and school operations are supported behind the scenes. This page helps explain how Angel Montessori uses digital tools to support teaching, records, assessment, and daily workflow.",
    eLearning:
      "Online learning matters when families need confidence that teaching can continue beyond the physical classroom in a protected, structured way. This page helps Angel Montessori explain how live classes, recordings, assignments, and lesson support work together inside the virtual classroom system.",
    downloads:
      "Downloads matter because families often need key school documents without delay. This page helps Angel Montessori bring forms, calendars, guides, and reference materials into one more dependable place.",
    faqs:
      "A good FAQ reduces uncertainty and saves families time. This page helps Angel Montessori answer the questions parents and visitors are most likely to ask before making contact.",
    policiesDocuments:
      "Policies and documents matter because trust grows when expectations are clear. This page helps families see the guidance, rules, and safeguarding commitments that support school life at Angel Montessori.",
    leadership:
      "Leadership pages matter because families want to know who is setting standards, guiding staff, supporting pupils, and shaping the culture of the school. This page helps make Angel Montessori's leadership vision, structure, and commitment more visible and reassuring.",
    governance:
      "Governance matters because strong schools need more than daily administration. They need oversight, policy clarity, and responsible structures that protect standards over time. This page helps explain how Angel Montessori approaches that responsibility.",
    campus:
      "The campus matters because environment shapes routine, belonging, confidence, and daily school experience. This page helps families picture the setting in which Angel Montessori pupils learn, move, and grow each day.",
    facilities:
      "Facilities matter because they show how the school supports teaching, supervision, reading, technology, movement, and wider pupil development in practice. This page helps families see the spaces and systems that support life at Angel Montessori.",
    aboutPolicies:
      "Policies matter because trust grows when families know the standards guiding safety, conduct, attendance, and daily school life. This page helps make those expectations more visible and easier to understand.",
    headOfSchool:
      "Leadership tone matters. This page helps families understand the values, standards, and care expectations that shape the school from the top.",
    history:
      "The school story matters because parents want to know what shaped the institution they are trusting with their children. This page shows the vision, sacrifice, and resilience behind Angel Montessori School.",
    missionVision:
      "A school's mission, vision, and values should not be hidden behind slogans. This page makes the guiding beliefs of Angel Montessori School visible and practical for families.",
  };

  return (
    custom[pageKey] ||
    `Families, pupils, and visitors should be able to understand how Angel Montessori School handles ${page.kicker.toLowerCase()} before they need to ask. This page gives that clarity in a way that supports trust, planning, and confident decisions.`
  );
}

function normalizeRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function RoleProfileGrid({ profiles = [], kicker = "Role Profile" }) {
  if (!profiles.length) return null;

  return (
    <div className="public-grid-2 public-profile-grid">
      {profiles.map((profile) => (
        <article
          key={profile.id || `${profile.name}-${profile.roleTitle || profile.role}`}
          className="public-card public-stage-card public-profile-card"
        >
          <img
            src={profile.imagePath || profile.image || "/assets/logo.png"}
            alt={`${profile.name}, ${profile.roleTitle || profile.role}`}
            className="public-profile-image"
          />
          <div className="public-profile-copy">
            <div className="public-kicker">{kicker}</div>
            <h3>{profile.name}</h3>
            <p className="public-profile-role">{profile.roleTitle || profile.role}</p>
            <p>{profile.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

const SCHOOL_FEE_TERM_OPTIONS = ["First Term", "Second Term", "Third Term"];
const ABOUT_PAGE_KEYS = ["headOfSchool", "history", "missionVision", "leadership", "governance", "campus", "facilities", "aboutPolicies"];

const SCHOOL_FEE_CLASS_GROUPS = {
  earlyYears: [
    { id: "creche", label: "Creche" },
    { id: "nursery-1", label: "Nursery 1" },
    { id: "nursery-2", label: "Nursery 2" },
    { id: "reception", label: "Reception" },
  ],
  basicSchool: [
    { id: "basic-1", label: "Basic 1" },
    { id: "basic-2", label: "Basic 2" },
    { id: "basic-3", label: "Basic 3" },
    { id: "basic-4", label: "Basic 4" },
    { id: "basic-5", label: "Basic 5" },
    { id: "basic-6", label: "Basic 6" },
  ],
  secondarySchool: [
    { id: "jss1", label: "JSS 1" },
    { id: "jss2", label: "JSS 2" },
    { id: "jss3", label: "JSS 3" },
    { id: "ss1", label: "SS 1" },
    { id: "ss2", label: "SS 2" },
    { id: "ss3", label: "SS 3" },
  ],
};

function SchoolFeeTemplateCard({
  kicker = "School Fees",
  title = "Download the class fee template for this term",
  description,
  items = [],
  classOptions = [],
  hint,
  buttonLabel = "Download School Fees",
  className = "",
}) {
  const [selectedClassId, setSelectedClassId] = useState(classOptions?.[0]?.id || "");
  const [selectedTermName, setSelectedTermName] = useState("First Term");
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeError, setFeeError] = useState("");

  useEffect(() => {
    setSelectedClassId(classOptions?.[0]?.id || "");
    setSelectedTermName("First Term");
    setFeeError("");
  }, [classOptions]);

  const handleTemplateDownload = async () => {
    if (!selectedClassId) {
      setFeeError("Select a class before downloading the school fee template.");
      return;
    }

    try {
      setFeeBusy(true);
      setFeeError("");
      const response = await getPublicSchoolFeeTemplate({ classId: selectedClassId, termName: selectedTermName });
      const template = response?.data?.template;
      if (!template) throw new Error("No school fee template is available for that class and term yet.");
      downloadSchoolFeeTemplate(template);
    } catch (error) {
      setFeeError(error?.response?.data?.message || error?.message || "Unable to download school fee template right now.");
    } finally {
      setFeeBusy(false);
    }
  };

  return (
    <article className={`public-card public-stage-card public-stage-fee-card ${className}`.trim()}>
      <div className="public-kicker">{kicker}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {items.length ? (
        <ul className="public-stage-list public-stage-fee-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="public-stage-fee-controls">
        <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
          {classOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <select value={selectedTermName} onChange={(e) => setSelectedTermName(e.target.value)}>
          {SCHOOL_FEE_TERM_OPTIONS.map((term) => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>
        <button
          type="button"
          className="public-stage-link public-stage-download-button"
          onClick={handleTemplateDownload}
          disabled={feeBusy}
        >
          {feeBusy ? "Preparing Template..." : buttonLabel}
        </button>
      </div>
      {hint ? <p className="public-stage-fee-hint">{hint}</p> : null}
      {feeError ? <p className="public-stage-fee-error">{feeError}</p> : null}
    </article>
  );
}

function LiveContentPanel({ title, items, type }) {
  if (!items.length) return null;

  return (
    <article className="public-card public-live-card">
      <div className="public-kicker">Live School Data</div>
      <h3>{title}</h3>
      <div className={type === "calendar" ? "public-calendar-stack" : "public-live-list-stack"}>
        {items.map((item) => (
          <div key={item.id || item.title} className="public-live-list-item">
            <div>
              <strong>{item.title}</strong>
              <p>
                {type === "calendar"
                  ? `${item.subtitle || "School timeline"}${item.startDate ? ` - ${formatDate(item.startDate)}` : ""}${item.endDate ? ` to ${formatDate(item.endDate)}` : ""}`
                  : item.summary || item.description || `${item.category || "School resource"}${item.type ? ` - ${item.type}` : ""}`}
              </p>
            </div>
            {type === "announcements" && item.link ? <Link to={item.link}>Open</Link> : null}
            {type === "downloads" ? (
              item.url ? <a href={item.url} target="_blank" rel="noreferrer">Open</a> : <Link to="/contact">Request</Link>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function AcademicJourneyPanel() {
  const journeyStages = [
    {
      title: "Creche & Reception",
      focus: "A gentle start that builds routine, confidence, communication, and school readiness through nurturing early guidance.",
    },
    {
      title: "Basic School",
      focus: "Strong literacy, numeracy, science, creativity, and disciplined study habits are built steadily from Basic 1 to Basic 6.",
    },
    {
      title: "Junior Secondary",
      focus: "Learners move into broader subject exposure, stronger independence, digital confidence, and readiness for national assessment expectations.",
    },
    {
      title: "Senior Secondary",
      focus: "Students begin to specialize, prepare for WAEC and NECO, and receive support that helps them move confidently into higher education and future opportunities.",
    },
  ];
  const supportAreas = [
    {
      title: "Assessment, Homework & Reporting",
      description:
        "Progress is supported through classwork, homework, tests, examinations, and clearer reporting that helps families understand how learning is developing over time.",
    },
    {
      title: "Digital Learning & Academic Support",
      description:
        "CBT readiness, E-Library access, ICT-driven instruction, and teacher guidance all work together to keep learning practical, modern, and measurable.",
    },
  ];
  const pathwayLinks = [
    { label: "Creche", to: "/academics/creche" },
    { label: "Reception", to: "/academics/reception" },
    { label: "Basic School", to: "/academics/basic-school" },
    { label: "Junior Secondary", to: "/academics/junior-secondary" },
    { label: "Senior Secondary", to: "/academics/senior-secondary" },
    { label: "Curriculum", to: "/academics/curriculum" },
  ];
  return (
    <>
      <div className="public-grid-2 public-academic-overview">
        <article className="public-card public-academic-card">
          <div className="public-kicker">Academic Journey</div>
          <h3>A clear academic pathway from Creche to Senior Secondary</h3>
          <p>
            Angel Montessori School serves learners from Creche through Senior Secondary with a structured academic
            journey that combines caring teachers, disciplined classroom practice, modern learning tools, and steady
            academic growth at every stage.
          </p>
        </article>
        <article className="public-card public-academic-card">
          <div className="public-kicker">What Families Can Expect</div>
          <h3>Consistency, progression, and support along the way</h3>
          <p>
            Families can expect purposeful teaching, age-appropriate progression, technology-enhanced learning,
            structured assessment, and the kind of academic guidance that helps children grow with confidence over time.
          </p>
        </article>
      </div>
      <div className="public-academic-journey-grid">
        {journeyStages.map((stage, index) => (
          <article key={stage.title} className="public-card public-academic-card public-academic-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{stage.title}</h3>
            <p>{stage.focus}</p>
          </article>
        ))}
      </div>
      <article className="public-card public-academic-card public-academic-pathway-card">
        <div className="public-kicker">Explore Each Stage</div>
        <h3>Move through the academic journey in more detail</h3>
        <div className="public-academic-pathway-links">
          {pathwayLinks.map((item) => (
            <Link key={item.to} to={item.to} className="public-academic-pathway-link">
              {item.label}
            </Link>
          ))}
        </div>
      </article>
      <div className="public-grid-2 public-academic-support-grid">
        {supportAreas.map((item, index) => (
          <article key={item.title} className="public-card public-academic-card">
            <div className="public-feature-index">0{index + 5}</div>
            <div className="public-kicker">Academic Support</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function AcademicStagePanel({ pageKey }) {
  const stages = {
    creche: {
      section: "Early Years",
      classOptions: [{ id: "creche", label: "Creche" }],
      overviewTitle: "A warm first school experience built around care, routine, and confidence",
      overview:
        "Our Creche programme supports early language, movement, routine, and emotional security in a warm, supervised environment designed for the youngest learners.",
      approachTitle: "How learning begins at this stage",
      approach:
        "Children are introduced to school life through safe routines, practical guidance, sensory play, and caring adult support that helps them feel secure enough to explore and grow.",
      listTitle: "Key Development Areas",
      items: [
        "Language and communication development",
        "Movement and coordination",
        "Practical life habits and independence",
        "Sensory exploration",
        "Social and emotional comfort",
        "Creative play and guided discovery",
      ],
      growthTitle: "What this stage helps children build",
      growthItems: [
        "Confidence in a school environment",
        "Comfort with daily routines",
        "Early curiosity and expression",
        "Readiness for Reception learning",
      ],
      nextTitle: "Where this stage leads",
      nextCopy:
        "The Creche stage helps children settle into structured learning gently, creating the confidence and readiness needed for Reception.",
      links: [
        { label: "Reception", to: "/academics/reception" },
        { label: "Book a Visit", to: "/book-a-visit" },
      ],
    },
    reception: {
      section: "Early Years",
      classOptions: [{ id: "reception", label: "Reception" }],
      overviewTitle: "School readiness with phonics, numeracy, and joyful structure",
      overview:
        "The Reception stage prepares children for formal learning through phonics, early numeracy, creativity, social development, and classroom habits.",
      approachTitle: "How learning is shaped here",
      approach:
        "Reception builds the bridge between early exploration and more formal classroom learning, helping pupils develop focus, expression, confidence, and the habits needed for the Basic School years.",
      listTitle: "Key Learning Areas",
      items: [
        "Phonics and early literacy",
        "Early numeracy and number confidence",
        "Creativity and expressive work",
        "Social development and classroom cooperation",
        "Listening, speaking, and confidence-building",
        "Routine, independence, and school readiness",
      ],
      growthTitle: "What families should expect",
      growthItems: [
        "Stronger readiness for formal classwork",
        "Confidence with letters, sounds, and numbers",
        "Improved social interaction and participation",
        "A smoother transition into Basic School",
      ],
      nextTitle: "Where this stage leads",
      nextCopy:
        "Reception gives children the confidence, habits, and foundational skills they need to move successfully into Basic School learning.",
      links: [
        { label: "Basic School", to: "/academics/basic-school" },
        { label: "Admissions Enquiry", to: "/admissions-enquiry" },
      ],
    },
    basicSchool: {
      section: "Basic School",
      classOptions: [
        { id: "basic-1", label: "Basic 1" },
        { id: "basic-2", label: "Basic 2" },
        { id: "basic-3", label: "Basic 3" },
        { id: "basic-4", label: "Basic 4" },
        { id: "basic-5", label: "Basic 5" },
        { id: "basic-6", label: "Basic 6" },
      ],
      overviewTitle: "Strong foundational learning from Basic 1 to Basic 6",
      overview:
        "The Basic School years strengthen literacy, numeracy, science, social understanding, creativity, and digital readiness while building steady study habits.",
      approachTitle: "How teaching works in the Basic School",
      approach:
        "At this stage, pupils build confidence through structured teaching, steady reinforcement, guided practice, and the use of Montessori techniques that help deepen understanding and retention.",
      listTitle: "Core Subjects",
      items: [
        "English Studies",
        "Mathematics",
        "Basic Science & Technology",
        "Social & Citizenship Education",
        "Nigerian Language",
        "Cultural & Creative Arts",
        "Religious Studies (CRS/IRS)",
        "Physical & Health Education",
        "Digital Literacy / Computer Studies",
      ],
      growthTitle: "What pupils develop at this stage",
      growthItems: [
        "Literacy and communication confidence",
        "Numeracy and problem-solving ability",
        "Study discipline and homework habits",
        "Growing digital readiness and classroom participation",
      ],
      nextTitle: "Where this stage leads",
      nextCopy:
        "Basic School gives pupils the academic grounding and learning habits required for success in Junior Secondary School.",
      links: [
        { label: "Junior Secondary", to: "/academics/junior-secondary" },
        { label: "E-Library", to: "/academics/e-library" },
      ],
    },
    juniorSecondary: {
      section: "Junior Secondary",
      classOptions: [
        { id: "jss1", label: "JSS 1" },
        { id: "jss2", label: "JSS 2" },
        { id: "jss3", label: "JSS 3" },
      ],
      overviewTitle: "Broader subjects, deeper thinking, and stronger independence",
      overview:
        "JSS 1 to JSS 3 develops stronger subject understanding, STEM orientation, digital literacy, and disciplined study practices.",
      approachTitle: "How learning expands at JSS level",
      approach:
        "Learners are exposed to a broader curriculum that supports academic competence, practical thinking, national assessment readiness, and the confidence to begin exploring future strengths.",
      listTitle: "Key Subjects",
      items: [
        "English Language",
        "Mathematics",
        "Integrated Science",
        "Social Studies / Civic Education",
        "Basic Technology",
        "Business Studies",
        "Agricultural Science",
        "Computer Studies / Digital Technology",
        "Cultural & Creative Arts",
        "Religious Studies",
        "Trade & Entrepreneurship Subjects",
      ],
      growthTitle: "What pupils develop at this stage",
      growthItems: [
        "Broader subject awareness and stronger study habits",
        "Digital confidence and STEM readiness",
        "Practical reasoning and early specialization awareness",
        "Preparation for Senior Secondary expectations",
      ],
      nextTitle: "Where this stage leads",
      nextCopy:
        "Junior Secondary builds the academic maturity and subject breadth pupils need before moving into Senior Secondary specialization.",
      links: [
        { label: "Senior Secondary", to: "/academics/senior-secondary" },
        { label: "CBT & Assessments", to: "/academics/cbt-assessments" },
      ],
    },
    seniorSecondary: {
      section: "Senior Secondary",
      classOptions: [
        { id: "ss1", label: "SS 1" },
        { id: "ss2", label: "SS 2" },
        { id: "ss3", label: "SS 3" },
      ],
      overviewTitle: "Focused preparation for WAEC, NECO, and life after school",
      overview:
        "SSS 1 to SSS 3 supports students through exam preparation, track specialization, subject mastery, and stronger academic maturity.",
      approachTitle: "How learning becomes more specialized",
      approach:
        "Students begin to focus on subject combinations that align with their strengths and career interests, while receiving structured academic guidance, exam preparation, and future-planning support.",
      listTitle: "Core Subjects",
      items: [
        "English Language",
        "Mathematics",
        "Civic Education",
      ],
      tracks: [
        {
          title: "Science Track",
          items: ["Physics", "Chemistry", "Biology", "Further Mathematics", "Geography"],
        },
        {
          title: "Commercial Track",
          items: ["Financial Accounting", "Commerce", "Economics"],
        },
        {
          title: "Arts Track",
          items: ["Literature in English", "Government", "CRS / IRS", "Languages"],
        },
      ],
      growthTitle: "What students develop at this stage",
      growthItems: [
        "Exam readiness and subject mastery",
        "Career-direction awareness and stronger academic maturity",
        "Independent study habits and disciplined preparation",
        "Confidence for higher education and future opportunities",
      ],
      nextTitle: "What this stage prepares students for",
      nextCopy:
        "Senior Secondary equips students for external examinations, higher education, and the confidence to pursue future goals with clarity.",
      links: [
        { label: "Admissions", to: "/admissions" },
        { label: "Academic Calendar", to: "/academics/calendar" },
      ],
    },
  };
  const stage = stages[pageKey];
  if (!stage) return null;

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">{stage.section}</div>
          <h3>{stage.overviewTitle}</h3>
          <p>{stage.overview}</p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Teaching Approach</div>
          <h3>How learning is supported at this stage</h3>
          <p>{stage.approach}</p>
        </article>
      </div>
      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-feature-index">01</div>
          <div className="public-kicker">{stage.listTitle}</div>
          <h3>The main learning focus for this stage</h3>
          <ul className="public-stage-list">
            {stage.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {stage.tracks ? (
            <div className="public-stage-track-grid">
              {stage.tracks.map((track) => (
                <div key={track.title} className="public-stage-track-card">
                  <strong>{track.title}</strong>
                  <ul>
                    {track.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </article>
        <article className="public-card public-stage-card">
          <div className="public-feature-index">02</div>
          <div className="public-kicker">Growth & Progress</div>
          <h3>What learners are expected to develop here</h3>
          <ul className="public-stage-list">
            {stage.growthItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Next Step</div>
        <h3>{stage.nextTitle}</h3>
        <p>{stage.nextCopy}</p>
        <div className="public-stage-link-row">
          {stage.links.map((item) => (
            <Link key={item.to} to={item.to} className="public-stage-link">
              {item.label}
            </Link>
          ))}
        </div>
      </article>
      <SchoolFeeTemplateCard
        classOptions={stage.classOptions}
        hint={`Available classes here: ${stage.classOptions.map((item) => item.label).join(", ")}.`}
      />
    </>
  );
}
function CurriculumPanel() {
  const stageSections = [
    {
      index: "01",
      title: "Early Years (Creche, Nursery & Reception)",
      tagline: "Building the Foundation for Lifelong Learning",
      intro:
        "Our Early Years program focuses on nurturing curiosity, independence, and confidence through a child-centered Montessori environment.",
      listTitle: "Key Learning Areas",
      items: [
        "Phonics and Early Literacy",
        "Basic Numeracy",
        "Practical Life Activities",
        "Sensory Development",
        "Social and Emotional Growth",
        "Creative Arts and Play-Based Learning",
      ],
      closing:
        "At this stage, learning is interactive, hands-on, and designed to help children develop a love for learning from an early age.",
    },
    {
      index: "02",
      title: "Basic School (Basic 1 - 6)",
      tagline: "Developing Strong Academic Foundations",
      intro:
        "In the Basic School, we follow the NERDC curriculum while incorporating Montessori techniques to deepen understanding and retention.",
      listTitle: "Core Subjects",
      items: [
        "English Studies",
        "Mathematics",
        "Basic Science & Technology",
        "Social & Citizenship Education",
        "Nigerian Language",
        "Cultural & Creative Arts",
        "Religious Studies (CRS/IRS)",
        "Physical & Health Education",
        "Digital Literacy / Computer Studies",
      ],
      closing:
        "We emphasize critical thinking, problem-solving, and effective communication, ensuring pupils are well-prepared for the next stage of their education.",
    },
    {
      index: "03",
      title: "Junior Secondary School (JSS 1 - 3)",
      tagline: "Expanding Knowledge and Skills",
      intro:
        "At this level, pupils are introduced to a broader curriculum that prepares them for national assessments and future specialization.",
      listTitle: "Key Subjects",
      items: [
        "English Language",
        "Mathematics",
        "Integrated Science",
        "Social Studies / Civic Education",
        "Basic Technology",
        "Business Studies",
        "Agricultural Science",
        "Computer Studies / Digital Technology",
        "Cultural & Creative Arts",
        "Religious Studies",
        "Trade & Entrepreneurship Subjects",
      ],
      closing:
        "Our approach ensures that pupils develop both academic competence and practical skills relevant to real-life situations.",
    },
    {
      index: "04",
      title: "Senior Secondary School (SSS 1 - 3)",
      tagline: "Preparing for Excellence and Future Opportunities",
      intro:
        "At the Senior Secondary level, pupils begin to specialize based on their strengths and career interests, while preparing for external examinations such as WAEC and NECO.",
      listTitle: "Core Subjects",
      items: [
        "English Language",
        "Mathematics",
        "Civic Education",
      ],
      tracks: [
        {
          title: "Science Track",
          subjects: ["Physics", "Chemistry", "Biology", "Further Mathematics", "Geography"],
        },
        {
          title: "Commercial Track",
          subjects: ["Financial Accounting", "Commerce", "Economics"],
        },
        {
          title: "Arts Track",
          subjects: ["Literature in English", "Government", "CRS / IRS", "Languages"],
        },
      ],
      closing:
        "We provide strong academic support, exam preparation, and career guidance to ensure our students excel and transition successfully into higher education.",
    },
  ];
  return (
    <>
      <div className="public-grid-2 public-curriculum-overview">
        <article className="public-card public-curriculum-card">
          <div className="public-kicker">Our Curriculum</div>
          <h3>A blended curriculum for strong academics, practical skills, and sound values</h3>
          <p>
            At Angel Montessori School, our curriculum is thoughtfully designed to provide every child with a strong
            academic foundation, practical life skills, and sound moral values. We operate a blended curriculum that
            combines the Nigerian National Curriculum (NERDC) with the Montessori approach and modern
            technology-driven learning.
          </p>
          <p>
            This unique combination allows us to deliver education that is structured, engaging, and relevant -
            preparing our pupils not only for examinations but for life.
          </p>
        </article>
        <article className="public-card public-curriculum-card">
          <div className="public-kicker">Learning Model</div>
          <h3>Structured, engaging, and relevant at every stage</h3>
          <p>
            Our academic pathway is built to grow with the learner - from Montessori-based early exploration to strong
            subject grounding, digital literacy, exam readiness, and future-facing confidence in the senior years.
          </p>
        </article>
      </div>
      <div className="public-curriculum-stage-stack">
        {stageSections.map((section) => (
          <article key={section.title} className="public-card public-curriculum-card public-curriculum-stage-detail">
            <div className="public-feature-index">{section.index}</div>
            <div className="public-kicker">{section.title}</div>
            <h3>{section.tagline}</h3>
            <p>{section.intro}</p>
            <div className="public-curriculum-list-title">{section.listTitle}</div>
            <ul className="public-curriculum-area-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {section.tracks ? (
              <div className="public-curriculum-track-grid">
                {section.tracks.map((track) => (
                  <div key={track.title} className="public-curriculum-track-card">
                    <strong>{track.title}</strong>
                    <ul>
                      {track.subjects.map((subject) => (
                        <li key={subject}>{subject}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="public-curriculum-stage-closing">{section.closing}</p>
          </article>
        ))}
      </div>
      <div className="public-grid-2 public-curriculum-detail-grid">
        <article className="public-card public-curriculum-card">
          <div className="public-feature-index">05</div>
          <div className="public-kicker">Technology-Enhanced Learning</div>
          <h3>Digital readiness is built into everyday learning</h3>
          <p>Technology is fully integrated into our curriculum through:</p>
          <ul className="public-curriculum-area-list">
            <li>Computer-Based Testing (CBT)</li>
            <li>E-Library and Digital Learning Resources</li>
            <li>ICT-Driven Classroom Instruction</li>
          </ul>
          <p className="public-curriculum-stage-closing">
            This ensures our pupils are digitally literate, innovative, and prepared for the demands of the modern
            world.
          </p>
        </article>
        <article className="public-card public-curriculum-card">
          <div className="public-feature-index">06</div>
          <div className="public-kicker">Character and Values Integration</div>
          <h3>Academic excellence is matched with strong character</h3>
          <p>Beyond academics, we intentionally develop character through:</p>
          <ul className="public-curriculum-area-list">
            <li>Discipline and responsibility</li>
            <li>Respect and integrity</li>
            <li>Leadership and teamwork</li>
            <li>Moral and social values</li>
          </ul>
          <p className="public-curriculum-stage-closing">
            At Angel Montessori School, we believe that true success is achieved when academic excellence is combined
            with strong character.
          </p>
        </article>
      </div>
      <article className="public-card public-curriculum-card public-curriculum-commitment">
        <div className="public-kicker">Our Commitment</div>
        <h3>We teach for impact, not only for coverage</h3>
        <p>
          Our curriculum is not just about what we teach - it is about how we teach and the impact it creates. Through
          a balanced and holistic approach, we are committed to raising confident, capable, and responsible individuals
          who are ready to succeed in school and beyond.
        </p>
        <p className="public-curriculum-closing">Angel Montessori School - Building Lives, Inspiring Futures.</p>
      </article>
    </>
  );
}
function AcademicCalendarPanel({ calendar }) {
  const publicCalendarPdfUrl = `${getConfiguredApiBaseUrl().replace(/\/$/, "")}/academic-calendar/public/current/pdf`;
  const fallbackTermSections = [
    {
      index: "01",
      title: "First Term",
      intro:
        "The first term sets the tone for the new session with orientation, steady assessment, revision, and end-of-term examinations.",
      items: [
        "Resumption - Monday, 15th September 2025",
        "Orientation (New Pupils) - Tuesday, 16th - Wednesday, 17th September 2025",
        "Full Academic Activities Begin - Thursday, 18th September 2025",
        "Continuous Assessment (CA 1) - Monday, 13th - Friday, 17th October 2025",
        "Mid-Term Break - Thursday, 30th October - Friday, 31st October 2025",
        "Continuous Assessment (CA 2) - Monday, 10th - Friday, 14th November 2025",
        "Revision Week - Monday, 1st - Friday, 5th December 2025",
        "Examinations - Monday, 8th - Friday, 12th December 2025",
        "End of Term / Closing - Friday, 12th December 2025",
        "Holiday - Monday, 15th December 2025 - Friday, 9th January 2026",
      ],
    },
    {
      index: "02",
      title: "Second Term",
      intro:
        "The second term balances regular classwork with sport, assessment, revision, and a clear holiday break before the final term.",
      items: [
        "Resumption - Monday, 12th January 2026",
        "Full Academic Activities Begin - Tuesday, 13th January 2026",
        "Continuous Assessment (CA 1) - Monday, 9th - Friday, 13th February 2026",
        "Mid-Term Break - Thursday, 26th - Friday, 27th February 2026",
        "Inter-House Sports - Saturday, 7th March 2026",
        "Continuous Assessment (CA 2) - Monday, 9th - Friday, 13th March 2026",
        "Revision Week - Monday, 30th March - Friday, 3rd April 2026",
        "Examinations - Monday, 6th - Friday, 10th April 2026",
        "End of Term / Closing - Friday, 10th April 2026",
        "Holiday - Monday, 13th April - Friday, 1st May 2026",
      ],
    },
    {
      index: "03",
      title: "Third Term",
      intro:
        "The final term prepares pupils for end-of-session examinations, graduation activities, and the close of the school year.",
      items: [
        "Resumption - Monday, 4th May 2026",
        "Full Academic Activities Begin - Tuesday, 5th May 2026",
        "Continuous Assessment (CA 1) - Monday, 1st - Friday, 5th June 2026",
        "Mid-Term Break - Thursday, 18th - Friday, 19th June 2026",
        "Continuous Assessment (CA 2) - Monday, 22nd - Friday, 26th June 2026",
        "Revision Week - Monday, 6th - Friday, 10th July 2026",
        "Examinations - Monday, 13th - Friday, 17th July 2026",
        "End of Session / Closing - Friday, 17th July 2026",
        "Graduation / Prize Giving Day - Saturday, 25th July 2026",
      ],
    },
  ];

  const fallbackAdditionalActivities = [
    "Open Day / PTA Meetings - Once every term",
    "Cultural Day - Second Term",
    "Career Day - Third Term",
    "Excursions / Educational Trips - Scheduled per term",
    "CBT Assessments - Conducted during CA and exams",
  ];

  const fallbackImportantNotes = [
    "All dates are subject to minor adjustments if necessary.",
    "Parents will be notified in advance of any changes.",
    "Pupils are expected to resume promptly on all resumption dates.",
    "Continuous Assessment forms part of the final grading system.",
  ];

  const renderEventRange = (startDate, endDate) => {
    if (!startDate && !endDate) return "Date to be confirmed";
    if (!endDate || startDate === endDate) {
      return formatDate(startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    return `${formatDate(startDate, { day: "numeric", month: "long", year: "numeric" })} - ${formatDate(endDate, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  };

  const dynamicTermSections = Array.isArray(calendar?.terms)
    ? calendar.terms.map((term, index) => ({
        index: String(index + 1).padStart(2, "0"),
        title: term.termName,
        intro: `${term.termName} runs from ${formatDate(term.startDate)} to ${formatDate(term.endDate)} and includes ${term.events?.length || 0} scheduled activities, assessments, and school milestones.`,
        items: (term.events || []).map((calendarEvent) => `${calendarEvent.eventTitle} - ${renderEventRange(calendarEvent.startDate, calendarEvent.endDate)}`),
      }))
    : [];

  const featuredEvents = Array.isArray(calendar?.terms)
    ? calendar.terms.flatMap((term) =>
        (term.events || [])
          .filter((calendarEvent) => calendarEvent.isFeatured)
          .map((calendarEvent) => ({
            id: calendarEvent.id,
            title: calendarEvent.eventTitle,
            termName: term.termName,
            dateLabel: renderEventRange(calendarEvent.startDate, calendarEvent.endDate),
          }))
      )
    : [];

  const termSections = dynamicTermSections.length ? dynamicTermSections : fallbackTermSections;
  const additionalActivities = calendar?.additionalActivities?.length ? calendar.additionalActivities : fallbackAdditionalActivities;
  const importantNotes = calendar?.importantNotes?.length ? calendar.importantNotes : fallbackImportantNotes;
  const sessionTitle = calendar?.title || "2025/2026 Academic Session";
  const sessionDescription =
    calendar?.description ||
    "The Angel Montessori School academic calendar keeps term dates, assessments, holidays, and important events in one structured place for families and staff.";

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Published Session</div>
          <h3>{sessionTitle}</h3>
          <p>{sessionDescription}</p>
          <p>
            This calendar is now connected to the academic calendar desk in the admin portal, so updates can be
            created, previewed, published, and archived without rewriting the public page by hand.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Planning Support</div>
          <h3>Helping families prepare term by term</h3>
          <p>
            Clear dates give families better visibility into resumption, assessments, holidays, examinations, and key
            school events across the session.
          </p>
          <p>
            The same published calendar also supports staff planning, internal previews, and future archive history in
            one connected school workflow.
          </p>
        </article>
      </div>

      {featuredEvents.length ? (
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Featured Events</div>
          <h3>Highlighted dates from the published school calendar</h3>
          <div className="public-grid-2 public-stage-detail-grid">
            {featuredEvents.slice(0, 6).map((calendarEvent) => (
              <div key={calendarEvent.id} className="public-card public-stage-card">
                <div className="public-kicker">{calendarEvent.termName}</div>
                <h3>{calendarEvent.title}</h3>
                <p>{calendarEvent.dateLabel}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <div className="public-grid-3 public-stage-detail-grid">
        {termSections.map((section) => (
          <article key={section.title} className="public-card public-stage-card">
            <div className="public-feature-index">{section.index}</div>
            <div className="public-kicker">Academic Term</div>
            <h3>{section.title}</h3>
            <p>{section.intro}</p>
            <ul className="public-stage-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Additional School Activities</div>
          <h3>School-wide programmes that shape the wider session</h3>
          <ul className="public-stage-list">
            {additionalActivities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Important Notes</div>
          <h3>Key reminders for families and school planning</h3>
          <ul className="public-stage-list">
            {importantNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>A balanced school year for learning, assessment, rest, and growth</h3>
        <p>
          At Angel Montessori School, our academic calendar is structured to ensure a balanced blend of learning,
          assessment, rest, and extracurricular activities, supporting the overall development of every pupil.
        </p>
        <p><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></p>
        <div className="public-stage-link-row">
          <a href={publicCalendarPdfUrl} className="public-stage-link">Download Calendar PDF</a>
          <Link to="/information/calendar" className="public-stage-link">School Calendar</Link>
          <Link to="/contact" className="public-stage-link">Contact School</Link>
        </div>
      </article>
    </>
  );
}
function StemProgramsPanel() {
  const stageSections = [
    {
      title: "Early Years (Creche & Reception)",
      intro: "At this stage, pupils are introduced to STEM through playful exploration that sparks curiosity and confidence.",
      items: [
        "exploration and discovery",
        "simple experiments",
        "building and construction activities",
        "pattern recognition and sorting",
        "observation of nature",
      ],
      closing: "Learning is play-based and designed to spark curiosity.",
    },
    {
      title: "Basic School (Basic 1 - 6)",
      intro: "Pupils begin structured STEM learning that helps them understand concepts by doing, not memorizing.",
      items: [
        "simple science experiments",
        "practical mathematics",
        "basic engineering tasks",
        "problem-solving activities",
        "introduction to digital tools",
      ],
      closing: "They learn by doing, not memorizing.",
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      intro: "At this level, pupils deepen their understanding through structured practical learning and project work.",
      items: [
        "deeper scientific understanding",
        "structured experiments",
        "project-based STEM learning",
        "basic engineering concepts",
        "critical thinking development",
      ],
      closing: "The focus here is stronger reasoning, experimentation, and applied understanding.",
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      intro: "Students are prepared for more advanced learning and science-related future pathways through applied thinking and project work.",
      items: [
        "practical science applications",
        "analytical thinking",
        "project-based learning",
        "preparation for science-related careers",
      ],
      closing: "This stage supports exam readiness while widening future academic and career possibilities.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">STEM Education</div>
          <h3>Raising thinkers, problem solvers, and innovators</h3>
          <p>
            At Angel Montessori School, our STEM program is designed to help pupils understand the world around them through
            practical, hands-on learning. We combine Science, Technology, Engineering, and Mathematics to develop critical
            thinking, creativity, and problem-solving skills from an early age.
          </p>
          <p>
            Our approach goes beyond theory. We engage pupils in activities that allow them to explore, experiment, and
            discover solutions in meaningful ways.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What STEM Means</div>
          <h3>Integrated learning that makes education practical and relevant</h3>
          <ul className="public-stage-list">
            <li><strong>Science</strong> - Understanding the natural world through observation and experiments</li>
            <li><strong>Technology</strong> - Using tools and systems to solve problems</li>
            <li><strong>Engineering</strong> - Designing and building solutions</li>
            <li><strong>Mathematics</strong> - Applying numbers, patterns, and logic</li>
          </ul>
          <p>
            At Angel Montessori School, these areas are integrated into everyday learning to make education practical,
            engaging, and relevant.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {stageSections.map((section) => (
          <article key={section.title} className="public-card public-stage-card">
            <div className="public-kicker">STEM by Learning Stage</div>
            <h3>{section.title}</h3>
            <p>{section.intro}</p>
            <ul className="public-stage-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{section.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">How We Teach STEM</div>
          <h3>A practical, child-centered learning approach</h3>
          <ul className="public-stage-list">
            <li>hands-on activities</li>
            <li>experiments and demonstrations</li>
            <li>project-based learning</li>
            <li>collaborative tasks</li>
            <li>guided discovery</li>
          </ul>
          <p>
            This ensures pupils understand concepts deeply and can apply them in real life.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Benefits of Our STEM Program</div>
          <h3>What pupils develop through STEM learning</h3>
          <ul className="public-stage-list">
            <li>critical thinking skills</li>
            <li>problem-solving ability</li>
            <li>creativity and innovation</li>
            <li>confidence in learning</li>
            <li>teamwork and collaboration</li>
            <li>real-world understanding</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Learning Environment</div>
          <h3>Tools and experiences that support STEM growth</h3>
          <ul className="public-stage-list">
            <li>science learning materials</li>
            <li>practical activity tools</li>
            <li>interactive classroom experiences</li>
            <li>digital learning support</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Preparing pupils for life in a modern world</h3>
          <p>
            At Angel Montessori School, we are committed to raising learners who are curious, confident, and capable of
            solving problems in a modern world.
          </p>
          <p>
            <strong>STEM education is not just what we teach - it is how we prepare our pupils for life.</strong>
          </p>
          <div className="public-stage-link-row">
            <Link to="/enrichment/coding-robotics" className="public-stage-link">Coding & Robotics</Link>
            <Link to="/admissions-enquiry" className="public-stage-link">Admissions Enquiry</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function CodingRoboticsPanel() {
  const codingStages = [
    {
      title: "Early Levels",
      items: [
        "basic digital awareness",
        "simple instructions and patterns",
        "interactive learning tools",
      ],
    },
    {
      title: "Basic School (Basic 1 - 6)",
      items: [
        "introduction to coding concepts",
        "block-based programming",
        "simple digital projects",
        "problem-solving through guided tasks",
      ],
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      items: [
        "structured coding concepts",
        "algorithms and logic",
        "interactive coding projects",
        "teamwork and digital creativity",
      ],
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      items: [
        "advanced digital thinking",
        "real-world problem-solving",
        "project-based development",
        "preparation for future technology learning",
      ],
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Coding & Robotics</div>
          <h3>Building digital skills for the future</h3>
          <p>
            At Angel Montessori School, we prepare our pupils for a technology-driven world through our Coding and Robotics
            program. We introduce pupils to the logic behind technology, helping them move from simply using devices to
            understanding and creating with them.
          </p>
          <p>
            Our program develops digital confidence, creativity, and problem-solving skills in a structured and engaging way.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Coding Program</div>
          <h3>We teach coding as a way of thinking</h3>
          <p>What pupils learn:</p>
          <ul className="public-stage-list">
            <li>logical thinking</li>
            <li>problem-solving</li>
            <li>sequencing and instructions</li>
            <li>computational thinking</li>
            <li>creativity through digital projects</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {codingStages.map((stage) => (
          <article key={stage.title} className="public-card public-stage-card">
            <div className="public-kicker">Progression</div>
            <h3>{stage.title}</h3>
            <ul className="public-stage-list">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Robotics Program</div>
          <h3>Bringing ideas to life through building and design</h3>
          <p>Our robotics program allows pupils to bring ideas to life through building and design.</p>
          <ul className="public-stage-list">
            <li>build simple robotic models</li>
            <li>understand movement and control</li>
            <li>participate in guided design challenges</li>
            <li>work on team-based projects</li>
            <li>explore innovation through hands-on tasks</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Skills Developed</div>
          <h3>What pupils gain through coding and robotics</h3>
          <ul className="public-stage-list">
            <li>logical reasoning</li>
            <li>creativity</li>
            <li>innovation</li>
            <li>teamwork</li>
            <li>patience and resilience</li>
            <li>confidence with technology</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Learning Approach</div>
          <h3>Practical, guided, and engaging learning</h3>
          <ul className="public-stage-list">
            <li>step-by-step guided learning</li>
            <li>hands-on projects</li>
            <li>interactive tools</li>
            <li>collaborative activities</li>
            <li>real-life problem-solving</li>
          </ul>
          <p>This ensures pupils learn in a practical and engaging way.</p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Coding & Robotics Matter</div>
          <h3>Preparing pupils to understand and create with technology</h3>
          <p>
            Technology is shaping the future, and we believe our pupils should be prepared not just to use it - but to
            understand and create with it.
          </p>
          <p>Our program helps pupils:</p>
          <ul className="public-stage-list">
            <li>think independently</li>
            <li>solve problems creatively</li>
            <li>build confidence in digital environments</li>
            <li>prepare for future careers</li>
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Raising thinkers, creators, and innovators for tomorrow</h3>
        <p>
          At Angel Montessori School, we are raising a new generation of thinkers, creators, and innovators who are ready
          for the opportunities of tomorrow.
        </p>
        <p><strong>We do not just teach technology - we empower pupils to create with it.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/enrichment" className="public-stage-link">STEM Programs</Link>
          <Link to="/admissions-enquiry" className="public-stage-link">Admissions Enquiry</Link>
        </div>
      </article>
    </>
  );
}

function ArtsCreativityPanel() {
  const learningStages = [
    {
      title: "Early Years (Creche & Reception)",
      items: [
        "coloring and simple crafts",
        "music and movement",
        "storytelling and imaginative play",
        "basic drawing and expression",
      ],
      closing: "Learning is playful and designed to build confidence.",
    },
    {
      title: "Basic School (Basic 1 - 6)",
      items: [
        "drawing and painting",
        "craft projects",
        "music and performance",
        "creative writing and storytelling",
      ],
      closing: "They develop both skill and confidence in expression.",
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      items: [
        "advanced creative projects",
        "drama and stage performance",
        "artistic development",
        "creative presentations",
      ],
      closing: "They begin to refine their creative talents.",
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      items: [
        "develop personal creative style",
        "participate in exhibitions and performances",
        "explore arts as a skill and potential career path",
      ],
      closing: "Students are encouraged to grow in confidence, originality, and creative purpose.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Arts & Creativity</div>
          <h3>Inspiring expression, imagination, and talent</h3>
          <p>
            At Angel Montessori School, we believe that creativity is an essential part of a child&apos;s development. Our
            Arts & Creativity program provides pupils with opportunities to explore their imagination, express themselves
            freely, and develop their unique talents.
          </p>
          <p>
            We create a supportive environment where every child is encouraged to think creatively, build confidence, and
            appreciate the beauty of artistic expression.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Approach to Creative Learning</div>
          <h3>Creative learning as an integral part of development</h3>
          <p>
            We do not see arts as just an extra activity. It is an integral part of learning. Through structured and guided
            experiences, pupils are exposed to various forms of creative expression that support both academic and personal
            development.
          </p>
          <ul className="public-stage-list">
            <li>self-expression</li>
            <li>creativity and imagination</li>
            <li>confidence building</li>
            <li>appreciation of arts and culture</li>
            <li>development of fine motor and communication skills</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Visual Arts</div>
          <h3>Developing imagination through drawing, color, and design</h3>
          <p>Pupils explore creativity through:</p>
          <ul className="public-stage-list">
            <li>drawing and sketching</li>
            <li>painting and coloring</li>
            <li>craft and design</li>
            <li>creative projects</li>
          </ul>
          <p>These activities help develop imagination, attention to detail, and artistic confidence.</p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Music and Performing Arts</div>
          <h3>Building expression through voice, rhythm, drama, and performance</h3>
          <p>We encourage pupils to express themselves through:</p>
          <ul className="public-stage-list">
            <li>singing and rhythm</li>
            <li>drama and role play</li>
            <li>storytelling and recitation</li>
            <li>stage performances</li>
          </ul>
          <p>These activities build confidence, communication skills, and stage presence.</p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Creative Expression and Imagination</div>
          <h3>Helping pupils think independently and create with confidence</h3>
          <p>Pupils are encouraged to:</p>
          <ul className="public-stage-list">
            <li>think independently</li>
            <li>create original ideas</li>
            <li>express emotions through art</li>
            <li>explore storytelling and creativity</li>
          </ul>
          <p>This helps them develop originality and a love for creative thinking.</p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Benefits of Our Arts & Creativity Program</div>
          <h3>What pupils gain through artistic development</h3>
          <ul className="public-stage-list">
            <li>creativity and imagination</li>
            <li>confidence and self-expression</li>
            <li>communication skills</li>
            <li>emotional intelligence</li>
            <li>appreciation for arts and culture</li>
            <li>teamwork and collaboration</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {learningStages.map((stage) => (
          <article key={stage.title} className="public-card public-stage-card">
            <div className="public-kicker">Arts by Learning Stage</div>
            <h3>{stage.title}</h3>
            <ul className="public-stage-list">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{stage.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Learning Environment</div>
          <h3>An encouraging space for creativity and artistic confidence</h3>
          <p>We provide an encouraging and inspiring environment where pupils can:</p>
          <ul className="public-stage-list">
            <li>explore their creativity freely</li>
            <li>experiment with different forms of art</li>
            <li>participate in performances and exhibitions</li>
            <li>express themselves without fear</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Beyond the Classroom</div>
          <h3>Showcasing talent through events, displays, and competitions</h3>
          <p>We also provide opportunities for pupils to showcase their talents through:</p>
          <ul className="public-stage-list">
            <li>school events and performances</li>
            <li>cultural celebrations</li>
            <li>art displays and exhibitions</li>
            <li>creative competitions</li>
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Nurturing creativity, expression, and confidence in every child</h3>
        <p>
          At Angel Montessori School, we believe that every child is creative. Our role is to nurture that creativity,
          build confidence, and help each pupil discover and develop their unique talents.
        </p>
        <p><strong>We don&apos;t just teach arts - we inspire creativity, expression, and confidence.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/student-life/gallery" className="public-stage-link">Photo Gallery</Link>
          <Link to="/student-life/events" className="public-stage-link">School Events</Link>
        </div>
      </article>
    </>
  );
}


function EntrepreneurshipPanel() {
  const learningStages = [
    {
      title: "Early Years (Creche & Reception)",
      intro: "At this stage, pupils begin to grow in confidence, initiative, and simple decision-making through playful guided experiences.",
      items: [
        "role play and imaginative enterprise activities",
        "simple responsibility and classroom participation",
        "sharing ideas with confidence",
        "basic awareness of choice, value, and exchange",
      ],
      closing: "Learning is playful, practical, and designed to build confidence from an early age.",
    },
    {
      title: "Basic School (Basic 1 - 6)",
      intro: "Pupils begin to understand enterprise through practical class tasks, teamwork, and age-appropriate money and value awareness.",
      items: [
        "simple enterprise awareness",
        "money and value concepts",
        "guided classroom projects",
        "creative problem-solving tasks",
        "team-based responsibility",
      ],
      closing: "They learn to connect effort, creativity, and responsibility in meaningful ways.",
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      intro: "At this level, pupils grow in planning, presentation, and independent thinking through more structured entrepreneurship activities.",
      items: [
        "practical entrepreneurship tasks",
        "idea planning and presentation",
        "problem-solving through projects",
        "creative solutions for real-life situations",
        "collaboration and leadership practice",
      ],
      closing: "The focus shifts toward initiative, planning, and confidence in presenting ideas clearly.",
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      intro: "Students are prepared for future pathways through project-based enterprise thinking, leadership, and practical life readiness.",
      items: [
        "project-based enterprise development",
        "financial awareness and decision-making",
        "leadership and responsibility",
        "real-world relevance and career awareness",
      ],
      closing: "This stage helps students see how creativity, planning, and responsibility connect to future success.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Entrepreneurship</div>
          <h3>Growing initiative, creativity, and practical thinking</h3>
          <p>
            At Angel Montessori School, we believe entrepreneurship is about more than business. It is about helping
            pupils learn to think independently, solve problems, take responsibility, and create value with confidence.
          </p>
          <p>
            Through practical experiences, guided projects, and everyday opportunities to lead and contribute, pupils
            grow in initiative, confidence, and real-world awareness.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Approach</div>
          <h3>Teaching enterprise as a mindset for life</h3>
          <p>
            We introduce entrepreneurship in a structured and age-appropriate way so pupils begin to see ideas,
            responsibility, creativity, and problem-solving as part of everyday learning.
          </p>
          <ul className="public-stage-list">
            <li>initiative and responsibility</li>
            <li>creativity and value creation</li>
            <li>financial awareness</li>
            <li>confidence in presenting ideas</li>
            <li>decision-making and practical thinking</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Pupils Learn</div>
          <h3>Practical habits that build confident, capable learners</h3>
          <ul className="public-stage-list">
            <li>creative thinking and idea development</li>
            <li>opportunity awareness and initiative</li>
            <li>problem-solving in practical situations</li>
            <li>basic money and value understanding</li>
            <li>communication and presentation confidence</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Skills Developed</div>
          <h3>What entrepreneurship learning strengthens in every child</h3>
          <ul className="public-stage-list">
            <li>leadership and responsibility</li>
            <li>confidence and self-belief</li>
            <li>creativity and innovation</li>
            <li>teamwork and collaboration</li>
            <li>communication and decision-making</li>
            <li>financial awareness and practical thinking</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {learningStages.map((stage) => (
          <article key={stage.title} className="public-card public-stage-card">
            <div className="public-kicker">Entrepreneurship by Learning Stage</div>
            <h3>{stage.title}</h3>
            <p>{stage.intro}</p>
            <ul className="public-stage-list">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{stage.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Learning Approach</div>
          <h3>Practical, guided, and connected to real life</h3>
          <ul className="public-stage-list">
            <li>guided classroom projects</li>
            <li>group tasks and collaboration</li>
            <li>real-life examples and discussion</li>
            <li>idea presentation and reflection</li>
            <li>school-based opportunities to create and contribute</li>
          </ul>
          <p>This helps pupils understand that entrepreneurship is not abstract. It is something they can practice.</p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why It Matters</div>
          <h3>Preparing pupils to create value and face the future with confidence</h3>
          <p>
            We want our pupils to be ready not only for examinations, but also for life. Entrepreneurship learning helps
            them think independently, act responsibly, and approach challenges with creativity and confidence.
          </p>
          <p>
            It supports the growth of learners who can recognise opportunities, contribute meaningfully, and adapt well
            in a changing world.
          </p>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Raising learners who can think, lead, and create responsibly</h3>
        <p>
          At Angel Montessori School, we are committed to helping pupils grow into confident, creative, and
          solution-minded young people who understand the value of responsibility, initiative, and purposeful work.
        </p>
        <p><strong>We do not just teach enterprise concepts - we help pupils build a mindset for life.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/admissions-enquiry" className="public-stage-link">Admissions Enquiry</Link>
          <Link to="/enrichment/community-service" className="public-stage-link">Community Service</Link>
        </div>
      </article>
    </>
  );
}

function CommunityServicePanel() {
  const serviceStages = [
    {
      title: "Early Years (Creche & Reception)",
      items: [
        "sharing and kindness in everyday routines",
        "simple acts of care within the classroom",
        "learning to help others with guidance",
        "developing empathy through stories and role play",
      ],
      closing: "At this stage, service begins with kindness, sharing, and learning to care for others.",
    },
    {
      title: "Basic School (Basic 1 - 6)",
      items: [
        "class-based service activities",
        "care for school spaces and shared materials",
        "participation in giving and support projects",
        "developing responsibility through teamwork",
      ],
      closing: "Pupils begin to understand that service is a practical way to contribute and lead.",
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      items: [
        "structured service projects",
        "group outreach participation",
        "leadership through responsibility",
        "reflection on the impact of serving others",
      ],
      closing: "Learners begin to connect service with leadership, responsibility, and school values.",
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      items: [
        "student-led support initiatives",
        "community-minded leadership opportunities",
        "practical contribution through projects and outreach",
        "preparation for responsible citizenship beyond school",
      ],
      closing: "Students grow in purpose and learn that leadership is strengthened through service.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Community Service</div>
          <h3>Growing empathy, responsibility, and leadership through service</h3>
          <p>
            At Angel Montessori School, we believe pupils should learn not only how to succeed personally, but also how
            to contribute meaningfully to others. Our Community Service program helps learners grow in empathy,
            responsibility, and practical leadership.
          </p>
          <p>
            Through guided acts of service, school-based projects, and outreach opportunities, pupils learn that
            character is strengthened when they serve with kindness and purpose.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Service Approach</div>
          <h3>Helping pupils understand that leadership includes care for others</h3>
          <p>
            Community service at Angel Montessori School is woven into character formation. We guide pupils to see
            service as part of everyday school life and as a practical expression of compassion, discipline, and
            responsibility.
          </p>
          <ul className="public-stage-list">
            <li>empathy and kindness</li>
            <li>responsibility and accountability</li>
            <li>leadership through action</li>
            <li>teamwork and cooperation</li>
            <li>respect for people and community</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Pupils Experience</div>
          <h3>Practical service opportunities that support character growth</h3>
          <ul className="public-stage-list">
            <li>charity and giving activities</li>
            <li>school support projects</li>
            <li>community-minded outreach</li>
            <li>shared responsibility in teams</li>
            <li>reflection on helping others</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Service Matters</div>
          <h3>Building values that stay with pupils beyond the classroom</h3>
          <p>
            Community service teaches pupils that success should be matched with compassion, integrity, and a willingness
            to make a positive difference. It helps them understand that leadership is not only about influence, but also
            about service.
          </p>
          <p>
            These experiences help pupils grow into thoughtful, responsible young people who can contribute positively to
            society.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {serviceStages.map((stage) => (
          <article key={stage.title} className="public-card public-stage-card">
            <div className="public-kicker">Service by Learning Stage</div>
            <h3>{stage.title}</h3>
            <ul className="public-stage-list">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{stage.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Learning Environment</div>
          <h3>Encouraging service as part of school culture</h3>
          <ul className="public-stage-list">
            <li>guided school-based projects</li>
            <li>teacher-supported reflection</li>
            <li>opportunities for teamwork and responsibility</li>
            <li>service experiences connected to school values</li>
          </ul>
          <p>
            We create an environment where service is understood not as an occasional task, but as part of daily character
            formation.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Beyond the Classroom</div>
          <h3>Extending learning into meaningful contribution</h3>
          <p>Where appropriate, pupils are exposed to service experiences that strengthen real-world awareness through:</p>
          <ul className="public-stage-list">
            <li>outreach support activities</li>
            <li>giving initiatives</li>
            <li>community-minded projects</li>
            <li>leadership through action and example</li>
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Raising pupils who lead with empathy and serve with purpose</h3>
        <p>
          At Angel Montessori School, we are committed to developing learners who understand that strong character
          includes kindness, responsibility, and service to others.
        </p>
        <p><strong>We do not just teach leadership - we help pupils practise it through service.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/student-life/leadership" className="public-stage-link">Leadership Opportunities</Link>
          <Link to="/contact" className="public-stage-link">Contact School</Link>
        </div>
      </article>
    </>
  );
}

function EducationalTripsPanel() {
  const tripStages = [
    {
      title: "Early Years (Creche & Reception)",
      items: [
        "guided short visits and supervised exploration",
        "simple observation of the world around them",
        "sensory learning through new environments",
        "curiosity-building experiences linked to classroom themes",
      ],
      closing: "At this stage, trips are designed to be safe, joyful, and memorable introductions to learning beyond the classroom.",
    },
    {
      title: "Basic School (Basic 1 - 6)",
      items: [
        "structured visits linked to class topics",
        "observation and note-taking in practical settings",
        "guided questions and reflective discussion",
        "broader exposure to community and learning spaces",
      ],
      closing: "Pupils begin to connect what they learn in class with what they can see and experience for themselves.",
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      items: [
        "subject-linked field learning",
        "deeper investigation and guided inquiry",
        "reflection on real-life applications of school subjects",
        "wider exposure to institutions, culture, and society",
      ],
      closing: "Trips at this level support stronger critical thinking, practical understanding, and intellectual curiosity.",
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      items: [
        "career-linked visits and academic exposure",
        "real-world observation connected to subject pathways",
        "broader preparation for higher education and future choices",
        "reflection on learning, opportunity, and responsibility",
      ],
      closing: "These experiences help students see clearer connections between present learning and future possibilities.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Educational Trips</div>
          <h3>Learning through exploration, exposure, and real experience</h3>
          <p>
            At Angel Montessori School, we believe learning should not be limited to the four walls of the classroom.
            Educational trips give pupils the opportunity to see, explore, and experience ideas in real settings.
          </p>
          <p>
            These journeys widen understanding, strengthen curiosity, and help pupils connect classroom lessons with the
            world around them in meaningful ways.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Approach</div>
          <h3>Using guided visits to deepen understanding and widen perspective</h3>
          <p>
            We plan educational trips to support learning outcomes, broaden exposure, and give pupils practical contact
            with the subjects they study. Each trip is designed with purpose, structure, and age-appropriate guidance.
          </p>
          <ul className="public-stage-list">
            <li>learning connected to real places and experiences</li>
            <li>guided observation and reflection</li>
            <li>curiosity and wider awareness</li>
            <li>practical understanding beyond textbooks</li>
            <li>safe, supervised educational exposure</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Pupils Gain</div>
          <h3>Experiences that make learning clearer and more memorable</h3>
          <ul className="public-stage-list">
            <li>stronger understanding of class topics</li>
            <li>greater curiosity and engagement</li>
            <li>improved observation and reflection</li>
            <li>broader cultural and environmental awareness</li>
            <li>confidence in exploring new learning spaces</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Educational Trips Matter</div>
          <h3>Helping pupils connect knowledge with the real world</h3>
          <p>
            Educational trips make learning more practical and memorable. They help pupils see that knowledge is not only
            something to study for examinations, but something that helps them understand life, community, culture, and
            future opportunities.
          </p>
          <p>
            These experiences also build confidence, independence, and a stronger sense of connection between school and
            the wider world.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {tripStages.map((stage) => (
          <article key={stage.title} className="public-card public-stage-card">
            <div className="public-kicker">Trips by Learning Stage</div>
            <h3>{stage.title}</h3>
            <ul className="public-stage-list">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{stage.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Learning Environment</div>
          <h3>Well-planned trips that support safe and purposeful learning</h3>
          <ul className="public-stage-list">
            <li>structured teacher guidance</li>
            <li>clear learning objectives</li>
            <li>age-appropriate destinations and activities</li>
            <li>post-trip reflection and discussion</li>
          </ul>
          <p>
            This helps pupils return from each trip with clearer understanding, stronger memories, and fresh insight.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Beyond the Classroom</div>
          <h3>Broadening exposure through meaningful destinations</h3>
          <p>Educational trips may include visits that expose pupils to:</p>
          <ul className="public-stage-list">
            <li>museums and historical sites</li>
            <li>science and learning centres</li>
            <li>cultural and civic spaces</li>
            <li>environments that connect learning to life</li>
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Helping pupils learn with wider vision and deeper understanding</h3>
        <p>
          At Angel Montessori School, we are committed to giving pupils learning experiences that stretch their thinking,
          build curiosity, and connect school knowledge with real-world understanding.
        </p>
        <p><strong>We do not just teach lessons - we help pupils experience learning more fully.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/student-life/events" className="public-stage-link">School Events</Link>
          <Link to="/contact" className="public-stage-link">Contact School</Link>
        </div>
      </article>
    </>
  );
}

function CompetitionsAwardsPanel() {
  const competitionStages = [
    {
      title: "Early Years (Creche & Reception)",
      items: [
        "gentle class-based participation",
        "confidence-building presentations and recitations",
        "simple creative showcases",
        "encouragement through positive recognition",
      ],
      closing: "At this stage, the goal is to help children participate joyfully and build confidence.",
    },
    {
      title: "Basic School (Basic 1 - 6)",
      items: [
        "academic and creative competitions",
        "reading, spelling, and class-based contests",
        "sports participation and house activities",
        "recognition for effort, discipline, and improvement",
      ],
      closing: "Pupils begin to understand healthy competition, teamwork, and the value of preparation.",
    },
    {
      title: "Junior Secondary (JSS 1 - 3)",
      items: [
        "subject competitions and quizzes",
        "debate, public speaking, and expression",
        "sports representation and team events",
        "innovation and talent-based showcases",
      ],
      closing: "At this level, competitions help pupils sharpen confidence, skill, and school spirit.",
    },
    {
      title: "Senior Secondary (SSS 1 - 3)",
      items: [
        "advanced academic competitions",
        "leadership in school representation",
        "talent and performance showcases",
        "recognition for excellence, effort, and discipline",
      ],
      closing: "Students are encouraged to compete with maturity, represent the school well, and aim for excellence.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Competitions & Awards</div>
          <h3>Celebrating excellence, confidence, and healthy achievement</h3>
          <p>
            At Angel Montessori School, we see competitions and awards as important opportunities for pupils to stretch
            themselves, discover their strengths, and grow in confidence. They help learners prepare well, perform with
            purpose, and represent the school with pride.
          </p>
          <p>
            Through academic, creative, sporting, and talent-based opportunities, pupils learn that excellence is built
            through discipline, courage, and steady effort.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Approach</div>
          <h3>Encouraging healthy competition with strong values</h3>
          <p>
            We guide pupils to see competition as a healthy way to learn, improve, and grow. Recognition is not only for
            winning, but also for effort, discipline, teamwork, creativity, and consistent progress.
          </p>
          <ul className="public-stage-list">
            <li>confidence through participation</li>
            <li>discipline and preparation</li>
            <li>team spirit and school pride</li>
            <li>recognition of excellence and growth</li>
            <li>courage to learn and improve</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Competition Areas</div>
          <h3>Ways pupils are challenged and celebrated</h3>
          <ul className="public-stage-list">
            <li>academic competitions and quizzes</li>
            <li>debate, recitation, and public speaking</li>
            <li>sports and inter-house activities</li>
            <li>innovation and talent showcases</li>
            <li>creative and cultural presentations</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Recognition Matters</div>
          <h3>Helping pupils value effort, progress, and excellence</h3>
          <p>
            Recognition helps pupils see that hard work, discipline, and courage matter. It builds motivation, encourages
            improvement, and reminds learners that growth is worth celebrating.
          </p>
          <p>
            Awards also strengthen school culture by showing that excellence is something to be pursued with humility,
            integrity, and gratitude.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {competitionStages.map((stage) => (
          <article key={stage.title} className="public-card public-stage-card">
            <div className="public-kicker">Competition by Learning Stage</div>
            <h3>{stage.title}</h3>
            <ul className="public-stage-list">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{stage.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Skills Developed</div>
          <h3>What pupils build through competition and recognition</h3>
          <ul className="public-stage-list">
            <li>confidence and resilience</li>
            <li>discipline and preparation</li>
            <li>communication and presentation skills</li>
            <li>teamwork and leadership</li>
            <li>healthy ambition and self-improvement</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">School Representation</div>
          <h3>Preparing pupils to represent themselves and the school well</h3>
          <p>
            When pupils take part in competitions, they learn to carry themselves with confidence, discipline, and respect.
            These opportunities strengthen both personal growth and the school&apos;s culture of excellence.
          </p>
          <p>
            We want pupils to compete well, grow through the experience, and return stronger whether they win or continue
            learning for the next opportunity.
          </p>
        </article>
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Raising pupils who strive well and grow through challenge</h3>
        <p>
          At Angel Montessori School, we are committed to creating opportunities where pupils can discover their gifts,
          build courage, and pursue excellence with the right values.
        </p>
        <p><strong>We do not just celebrate success - we help pupils grow into it.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/student-life/sports" className="public-stage-link">Sports</Link>
          <Link to="/student-life/clubs" className="public-stage-link">Clubs & Societies</Link>
        </div>
      </article>
    </>
  );
}
function StudentLifeHomePanel() {
  const lifeCards = [
    {
      title: "Learning with Joy",
      description:
        "Pupils learn in an environment that feels active, encouraging, and full of discovery rather than dry or mechanical.",
    },
    {
      title: "Building Friendships",
      description:
        "Daily school life gives children room to form healthy relationships, work with others, and feel part of a supportive community.",
    },
    {
      title: "Exploring Talents",
      description:
        "Clubs, performances, exhibitions, and activities help pupils discover interests and strengths beyond formal lessons.",
    },
    {
      title: "Growing in Confidence",
      description:
        "Through participation, responsibility, and celebration, pupils build self-belief and learn how to express themselves well.",
    },
  ];

  const galleryHighlights = [
    {
      kicker: "Events",
      title: "Celebrations and school moments",
      text: "Cultural day, prize giving, literacy activities, and shared school celebrations.",
      image: "/assets/home-post-1.jpg",
    },
    {
      kicker: "Activities",
      title: "Clubs and co-curricular life",
      text: "Spaces where pupils speak up, create, build, and work together with confidence.",
      image: "/assets/home-activity-2.jpg",
    },
    {
      kicker: "Sports",
      title: "Movement, teamwork, and healthy competition",
      text: "Sporting moments that help pupils grow in resilience, energy, and school spirit.",
      image: "/assets/home-activity-3.jpg",
    },
    {
      kicker: "Community",
      title: "Friendship and belonging",
      text: "Everyday school life shaped by warmth, discipline, and a clear sense of community.",
      image: "/assets/home-activity-1.jpg",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">A School Experience Beyond the Classroom</div>
          <h3>Warm, active, and student-centered school life</h3>
          <p>
            At Angel Montessori School, we believe that education goes beyond the classroom. Student life is an
            important part of our commitment to raising well-rounded children who are confident, disciplined,
            creative, and socially responsible.
          </p>
          <p>
            Through a rich blend of activities, events, leadership opportunities, and community experiences, our
            pupils enjoy an engaging school environment that supports their total development.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Student Life Builds</div>
          <h3>Confidence, creativity, discipline, and belonging</h3>
          <ul className="public-stage-list">
            <li>confidence and self-expression</li>
            <li>friendship and social development</li>
            <li>leadership and responsibility</li>
            <li>creativity and talent discovery</li>
            <li>discipline and good conduct</li>
            <li>a healthy sense of belonging</li>
          </ul>
          <p>
            Student life should feel vibrant, but it should also reflect the values and structure families expect from
            a purposeful school community.
          </p>
        </article>
      </div>

      <div className="public-grid-4">
        {lifeCards.map((card, index) => (
          <article key={card.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Clubs and Co-Curricular Activities</div>
          <h3>Spaces where interests, confidence, and collaboration can grow</h3>
          <p>
            Clubs help pupils explore interests beyond the timetable while strengthening communication, curiosity,
            teamwork, and creativity.
          </p>
          <ul className="public-stage-list">
            <li><strong>Debate & Press Club</strong> - building speaking confidence, expression, and student voice</li>
            <li><strong>Coding Club</strong> - introducing digital creativity and practical problem-solving</li>
            <li><strong>JET / Science Club</strong> - encouraging curiosity, discovery, and science-minded thinking</li>
            <li><strong>Literary & Reading Club</strong> - growing reading culture, comprehension, and imagination</li>
            <li><strong>Music & Drama Club</strong> - supporting performance, confidence, and creativity</li>
            <li><strong>Arts & Craft Club</strong> - helping pupils create, design, and express ideas visually</li>
            <li><strong>Social / Cultural Club</strong> - encouraging belonging, cultural awareness, and school participation</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Sports and Physical Development</div>
          <h3>Movement, teamwork, resilience, and healthy competition</h3>
          <p>
            We encourage active lifestyles and healthy competition through structured sports and physical activities.
            From daily exercise to special sporting events, our pupils develop teamwork, resilience, discipline, and
            confidence.
          </p>
          <ul className="public-stage-list">
            <li>football and athletics</li>
            <li>indoor and outdoor games</li>
            <li>physical and health education</li>
            <li>inter-house sports participation</li>
            <li>teamwork and school spirit through activity</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Events, Celebrations, and Special Activities</div>
          <h3>Moments that make school life memorable and meaningful</h3>
          <p>
            Student life becomes more meaningful when pupils can participate, celebrate, and see themselves as part of
            something bigger than routine class periods.
          </p>
          <ul className="public-stage-list">
            <li>Cultural Day</li>
            <li>Inter-House Sports</li>
            <li>End-of-Year Party</li>
            <li>Prize Giving Day</li>
            <li>Excursions and educational trips</li>
            <li>STEM exhibitions and arts performances</li>
            <li>Literacy Day and school showcases</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Raising Confident Young Leaders</div>
          <h3>Leadership through responsibility, service, and guided confidence</h3>
          <p>
            At Angel Montessori School, we intentionally nurture leadership from an early age. Pupils are given
            responsibilities and opportunities to build confidence, make decisions, and develop a sense of
            accountability and service.
          </p>
          <ul className="public-stage-list">
            <li>prefect system and guided leadership roles</li>
            <li>classroom responsibilities and visible trust</li>
            <li>public speaking and representation opportunities</li>
            <li>group leadership and team coordination</li>
            <li>service-minded responsibility within school life</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">A Culture of Respect, Discipline, and Belonging</div>
          <h3>School life that feels warm, structured, and values-driven</h3>
          <p>
            Student life at Angel Montessori School is designed to feel energetic without becoming disorderly. Our
            culture is shaped by clear values that support good conduct, healthy relationships, and a strong sense of
            belonging.
          </p>
          <ul className="public-stage-list">
            <li>respect for others</li>
            <li>discipline and self-control</li>
            <li>kindness and empathy</li>
            <li>responsibility and good conduct</li>
            <li>confidence with humility</li>
            <li>belonging within a caring school community</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Safe and Reliable School Transport</div>
          <h3>Daily travel support that strengthens parent confidence</h3>
          <p>
            School transport is part of the wider student-life experience because families value consistency, safety,
            and clear coordination beyond the school gate.
          </p>
          <ul className="public-stage-list">
            <li>organized routes and pickup planning</li>
            <li>safety-focused bus routines</li>
            <li>supervised transport environment</li>
            <li>clear expectations for conduct and punctuality</li>
            <li>stronger visibility for assigned families</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-4 public-student-gallery-grid">
        {galleryHighlights.map((item) => (
          <article
            key={item.title}
            className="public-card public-student-photo-card"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(8, 18, 34, 0.08) 0%, rgba(8, 18, 34, 0.78) 100%), url('${item.image}')` }}
          >
            <div className="public-kicker">{item.kicker}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Give Your Child a Rich and Rewarding School Experience</div>
        <h3>A school journey that develops joy, confidence, discipline, and talent</h3>
        <p>
          Student life is one of the clearest ways families can understand what daily experience feels like for a child.
          At Angel Montessori School, that experience is designed to be engaging, values-driven, and full of healthy
          opportunities for growth.
        </p>
        <div className="public-stage-link-row">
          <Link to="/admissions/register" className="public-stage-link">Apply for Admission</Link>
          <Link to="/book-a-visit" className="public-stage-link">Book a School Visit</Link>
          <Link to="/student-life/support" className="public-stage-link">Student Support</Link>
        </div>
      </article>
    </>
  );
}

function StudentSupportPanel() {
  const academicSupportBlocks = [
    {
      title: "Classroom Support",
      description:
        "Attentive teaching, explanation, and reinforcement help pupils stay engaged and better understand what they are learning.",
    },
    {
      title: "Academic Monitoring",
      description:
        "Continuous assessment and teacher follow-up help the school see when more support, clarity, or encouragement may be needed.",
    },
    {
      title: "Progress Follow-Up",
      description:
        "Where necessary, pupils receive added guidance to strengthen confidence, improve understanding, and remain on track.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Supporting the Whole Child</div>
          <h3>A caring and structured support system for every learner</h3>
          <p>
            At Angel Montessori School, we understand that every child learns differently and grows at their own pace.
            That is why we provide a supportive environment that goes beyond academics.
          </p>
          <p>
            Our student support system is designed to help pupils thrive intellectually, emotionally, socially, and
            morally, while feeling safe, encouraged, and understood.
          </p>
        </article>
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Academic Guidance and Learning Support</div>
          <h3>Clear teaching, structured follow-up, and support where needed</h3>
          <p>
            We provide academic support through attentive teaching, class guidance, continuous assessment, and
            structured follow-up. Where needed, pupils receive additional support to strengthen understanding,
            improve confidence, and stay on track academically.
          </p>
          <ul className="public-stage-list">
            <li>teacher guidance in class</li>
            <li>learning reinforcement and follow-up</li>
            <li>additional support where understanding needs strengthening</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {academicSupportBlocks.map((block, index) => (
          <article key={block.title} className="public-card public-stage-card public-student-support-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{block.title}</h3>
            <p>{block.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Emotional and Social Development</div>
          <h3>Helping pupils feel seen, valued, and respected</h3>
          <p>
            We create an environment where pupils feel seen, valued, and respected. Through daily interaction,
            positive reinforcement, and guided support, we help children develop healthy confidence, social
            awareness, and emotional balance.
          </p>
          <ul className="public-stage-list">
            <li>confidence building</li>
            <li>respectful relationships</li>
            <li>positive school environment</li>
            <li>social awareness and belonging</li>
            <li>guided emotional support</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Guidance and Care</div>
          <h3>Mentoring and school support that respond early and thoughtfully</h3>
          <p>
            Our pupils receive guidance and care through attentive teachers and school support systems that help
            address concerns related to behaviour, adjustment, confidence, and general well-being.
          </p>
          <p>
            We believe early support makes a lasting difference in a child&apos;s development.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">A Safe and Respectful Environment</div>
          <h3>Learning without fear in a structured school culture</h3>
          <p>
            We are committed to maintaining a safe, structured, and respectful school environment where every pupil can
            learn without fear. We promote discipline, kindness, and mutual respect while addressing misconduct with
            care and responsibility.
          </p>
          <ul className="public-stage-list">
            <li>clear anti-bullying expectations</li>
            <li>daily supervision and guidance</li>
            <li>discipline with care and responsibility</li>
            <li>a respectful child-protection mindset</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Every Child Matters</div>
          <h3>Individual attention shaped by the child&apos;s pace and strengths</h3>
          <p>
            We recognize the uniqueness of every child. Our approach allows us to observe, guide, and support pupils
            according to their individual needs, strengths, and pace of development.
          </p>
          <ul className="public-stage-list">
            <li>child-centered support</li>
            <li>attention to individual progress</li>
            <li>encouragement of strengths</li>
            <li>support that respects different learning pace</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Working Together with Parents</div>
          <h3>Support is strongest when school and home stay connected</h3>
          <p>
            We believe that the best outcomes are achieved when school and home work together. We encourage open
            communication with parents and value their role as essential partners in every child&apos;s growth and success.
          </p>
          <ul className="public-stage-list">
            <li>regular communication</li>
            <li>progress updates and shared follow-up</li>
            <li>joint support around wellbeing and learning</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">An Inclusive and Nurturing Environment</div>
          <h3>Helping every child feel accepted, encouraged, and supported</h3>
          <p>
            We strive to create a school environment where every child feels accepted, encouraged, and supported. We
            value individual differences and work to ensure that each pupil feels a sense of belonging within the
            school community.
          </p>
          <ul className="public-stage-list">
            <li>welcoming school culture</li>
            <li>respect for individual differences</li>
            <li>supportive care and belonging</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card public-student-support-card">
          <div className="public-kicker">Support Through Digital Learning Tools</div>
          <h3>Academic visibility and connected support through school systems</h3>
          <p>
            Our digital learning systems also support pupil progress by providing structured access to lessons,
            assignments, assessments, and communication. This helps teachers, pupils, and parents stay connected and
            informed.
          </p>
          <ul className="public-stage-list">
            <li>LMS access and lesson visibility</li>
            <li>assignment tracking and follow-up</li>
            <li>CBT preparation and assessment visibility</li>
            <li>communication systems that keep parents informed</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card public-student-support-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Helping every child feel safe, guided, and empowered to succeed</h3>
          <p>
            At Angel Montessori School, student support is not treated as an extra. It is part of how we help children
            learn well, settle confidently, and grow with strong character.
          </p>
          <p>
            <strong>We want families to know that their child will be known, guided, and supported here.</strong>
          </p>
          <div className="public-stage-link-row">
            <Link to="/admissions-enquiry" className="public-stage-link">Speak to Admissions</Link>
            <Link to="/information/parent-portal" className="public-stage-link">Parent Portal</Link>
            <Link to="/contact" className="public-stage-link">Contact School</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function ClubsSocietiesPanel() {
  const clubGroups = [
    {
      title: "Communication and Expression",
      items: [
        "Debate & Press Club",
        "Literary & Reading Club",
        "public speaking and guided expression",
      ],
      closing: "These spaces help pupils speak clearly, think independently, and grow in confidence when sharing ideas.",
    },
    {
      title: "Innovation and Discovery",
      items: [
        "Coding Club",
        "JET / Science Club",
        "guided projects and practical problem-solving",
      ],
      closing: "Pupils are encouraged to ask questions, explore ideas, and build curiosity beyond the classroom timetable.",
    },
    {
      title: "Creativity and Culture",
      items: [
        "Music & Drama Club",
        "Arts & Craft Club",
        "Social / Cultural Club",
      ],
      closing: "Creative club life helps children express themselves, appreciate culture, and enjoy collaborative school experiences.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Clubs and Co-Curricular Activities</div>
          <h3>Helping pupils grow beyond the regular timetable</h3>
          <p>
            At Angel Montessori School, clubs and societies are designed to give pupils opportunities to explore
            interests, build confidence, and enjoy school life beyond formal lessons.
          </p>
          <p>
            Club participation helps children discover strengths, practise teamwork, and develop communication,
            creativity, and curiosity in active and enjoyable ways.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Club Life Matters</div>
          <h3>Structured opportunities for confidence, skill, and curiosity</h3>
          <ul className="public-stage-list">
            <li>confidence in speaking and participation</li>
            <li>creative problem-solving and innovation</li>
            <li>healthy collaboration and teamwork</li>
            <li>deeper interest in reading, science, arts, and technology</li>
            <li>school enjoyment beyond lessons and examinations</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {clubGroups.map((group) => (
          <article key={group.title} className="public-card public-stage-card">
            <div className="public-kicker">Club Focus</div>
            <h3>{group.title}</h3>
            <ul className="public-stage-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{group.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">How Participation Works</div>
          <h3>Guided involvement that matches pupil readiness and interest</h3>
          <p>
            Club participation is designed to feel encouraging and well guided. Pupils are introduced to activities in
            ways that help them settle in, contribute confidently, and enjoy steady progress over time.
          </p>
          <ul className="public-stage-list">
            <li>age-appropriate participation by level</li>
            <li>teacher guidance and encouragement</li>
            <li>regular opportunities to present, create, or collaborate</li>
            <li>space for pupils to discover emerging strengths</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Helping pupils discover interests that strengthen the whole child</h3>
          <p>
            We want club life to do more than fill time. It should help pupils think, create, collaborate, and grow in
            ways that support confidence and lifelong curiosity.
          </p>
          <div className="public-stage-link-row">
            <Link to="/enrichment" className="public-stage-link">Enrichment Programmes</Link>
            <Link to="/student-life/events" className="public-stage-link">School Events</Link>
            <Link to="/student-life/gallery" className="public-stage-link">Photo Gallery</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function SportsPanel() {
  const sportsPillars = [
    {
      title: "Daily Movement and Fitness",
      description:
        "Regular physical activity helps pupils build healthy habits, energy, coordination, and confidence in movement.",
    },
    {
      title: "Team Sports and Games",
      description:
        "Structured games teach pupils how to work with others, follow rules, and compete with discipline and respect.",
    },
    {
      title: "Inter-House Sports",
      description:
        "Special sports days strengthen house spirit, resilience, excitement, and the joy of school-wide participation.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Sports and Physical Development</div>
          <h3>Raising active, disciplined, and confident pupils</h3>
          <p>
            We encourage active lifestyles and healthy competition through structured sports and physical activities.
            Sport is part of how pupils learn teamwork, resilience, and discipline alongside academic growth.
          </p>
          <ul className="public-stage-list">
            <li>football and athletics</li>
            <li>indoor and outdoor games</li>
            <li>physical and health education</li>
            <li>school-wide sporting events</li>
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Sport Builds</div>
          <h3>Whole-child growth through movement and healthy competition</h3>
          <ul className="public-stage-list">
            <li>teamwork and cooperation</li>
            <li>resilience and perseverance</li>
            <li>healthy confidence</li>
            <li>discipline and self-control</li>
            <li>school spirit and belonging</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {sportsPillars.map((pillar, index) => (
          <article key={pillar.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{pillar.title}</h3>
            <p>{pillar.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Sports in School Life</div>
          <h3>Activity that keeps pupils engaged beyond the classroom</h3>
          <p>
            Sports help pupils experience school in a fuller way. They learn to enjoy movement, support each other,
            represent their house or class, and develop habits that strengthen physical well-being.
          </p>
          <p>
            The goal is not only competition, but balanced development through participation, effort, and good conduct.
          </p>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Healthy competition in a well-guided school culture</h3>
          <p>
            At Angel Montessori School, sport is part of character formation. We want pupils to compete well, move
            well, and learn how to handle both challenge and teamwork with maturity.
          </p>
          <div className="public-stage-link-row">
            <Link to="/student-life/events" className="public-stage-link">School Events</Link>
            <Link to="/student-life/gallery" className="public-stage-link">Photo Gallery</Link>
            <Link to="/book-a-visit" className="public-stage-link">Book a Visit</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function StudentEventsPanel() {
  const eventGroups = [
    {
      title: "Celebrations and Culture",
      items: ["Cultural Day", "Literacy Day", "arts performances", "end-of-year celebrations"],
      closing: "These moments help pupils celebrate identity, creativity, and shared school joy.",
    },
    {
      title: "School-Wide Activities",
      items: ["Inter-House Sports", "STEM exhibitions", "excursions", "class and house activities"],
      closing: "Events make school life memorable by turning learning and participation into shared experiences.",
    },
    {
      title: "Milestones and Recognition",
      items: ["Prize Giving Day", "graduation ceremonies", "special assemblies", "community celebrations"],
      closing: "Milestone events help families and pupils celebrate growth, effort, and achievement with pride.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Events, Celebrations, and Special Activities</div>
          <h3>School life that feels alive, shared, and memorable</h3>
          <p>
            School events help parents imagine their child actively participating in the wider life of the school.
            They show that learning is supported by celebration, creativity, community, and school pride.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Events Matter</div>
          <h3>Turning school culture into visible shared experience</h3>
          <p>
            Events help strengthen belonging, confidence, and family connection. They also give pupils opportunities to
            perform, present, represent, and celebrate progress in front of others.
          </p>
        </article>
      </div>

      <div className="public-grid-3">
        {eventGroups.map((group) => (
          <article key={group.title} className="public-card public-stage-card">
            <div className="public-kicker">Event Focus</div>
            <h3>{group.title}</h3>
            <ul className="public-stage-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{group.closing}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">The Rhythm of School Life</div>
          <h3>Moments that keep the school year rich and engaging</h3>
          <p>
            A vibrant school is not defined only by what happens in class. It is also shaped by the events that bring
            pupils, staff, and families together around learning, celebration, and shared memory.
          </p>
          <ul className="public-stage-list">
            <li>cultural expression and participation</li>
            <li>sporting moments and school spirit</li>
            <li>academic and creative showcases</li>
            <li>celebration of milestones and progress</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Creating a school experience families can feel, not just read about</h3>
          <p>
            We want school events to reflect the warmth, discipline, and vibrancy of Angel Montessori School. They are
            part of how pupils build confidence, community, and lasting memories.
          </p>
          <div className="public-stage-link-row">
            <Link to="/student-life/gallery" className="public-stage-link">Photo Gallery</Link>
            <Link to="/student-life/sports" className="public-stage-link">Sports</Link>
            <Link to="/contact" className="public-stage-link">Contact School</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function StudentLeadershipPanel() {
  const leadershipAreas = [
    {
      title: "Prefect System",
      description:
        "Selected pupils learn visible service, order, and responsibility through leadership roles that support school life.",
    },
    {
      title: "Classroom Responsibilities",
      description:
        "Small daily responsibilities help children learn accountability, initiative, and the value of contributing well.",
    },
    {
      title: "Representation and Expression",
      description:
        "Public speaking, guided representation, and student voice help pupils build courage, maturity, and confidence.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Raising Confident Young Leaders</div>
          <h3>Leadership that grows through service, trust, and responsibility</h3>
          <p>
            At Angel Montessori School, we intentionally nurture leadership from an early age. Pupils are given
            responsibilities and opportunities to build confidence, make decisions, and develop a sense of
            accountability and service.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Leadership Looks Like Here</div>
          <h3>Guided opportunities to practise confidence and accountability</h3>
          <ul className="public-stage-list">
            <li>prefect roles and school representation</li>
            <li>classroom and team responsibilities</li>
            <li>public speaking and leadership presence</li>
            <li>service-minded decision making</li>
            <li>confidence built through real participation</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {leadershipAreas.map((area, index) => (
          <article key={area.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{area.title}</h3>
            <p>{area.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Leadership and Character</div>
          <h3>Confidence is strongest when it is matched with discipline and service</h3>
          <p>
            Leadership at Angel Montessori School is not presented as status alone. It is connected to character,
            accountability, and the willingness to serve others well.
          </p>
          <p>
            Pupils are helped to understand that leadership includes respect, good conduct, initiative, and the ability
            to guide others positively.
          </p>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Helping pupils lead with confidence, humility, and responsibility</h3>
          <p>
            We want leadership opportunities to prepare pupils for life, not only for titles. The aim is to raise
            confident young people who can communicate well, take responsibility, and serve with maturity.
          </p>
          <div className="public-stage-link-row">
            <Link to="/enrichment/community-service" className="public-stage-link">Community Service</Link>
            <Link to="/student-life/support" className="public-stage-link">Student Support</Link>
            <Link to="/admissions-enquiry" className="public-stage-link">Admissions Enquiry</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function StudentTransportPanel() {
  const transportSteps = [
    {
      title: "Route Planning",
      description:
        "School transport is organized around clear route planning, assigned stops, and practical daily coordination that helps families prepare confidently.",
    },
    {
      title: "Safety Expectations",
      description:
        "Pupil safety, punctuality, and bus conduct are guided by clear transport rules so that travel remains orderly and well supervised.",
    },
    {
      title: "Parent Visibility",
      description:
        "For assigned families, school systems can provide clearer visibility into transport details, helping parents stay informed about daily arrangements.",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Safe and Reliable School Transport</div>
          <h3>Daily travel support that strengthens family confidence</h3>
          <p>
            School transport is an important part of daily school life for many families. At Angel Montessori School,
            we approach transport with a focus on safety, clear organization, and dependable routine.
          </p>
          <p>
            The aim is to make pickup and drop-off arrangements easier to follow while helping pupils travel in a
            supervised and respectful environment.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Families Need to Know</div>
          <h3>Organized transport with structure, safety, and clear expectations</h3>
          <ul className="public-stage-list">
            <li>organized routes and assigned stops</li>
            <li>punctual pickup and drop-off expectations</li>
            <li>safety-focused bus conduct and supervision</li>
            <li>clear communication around transport planning</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {transportSteps.map((step, index) => (
          <article key={step.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">A Supervised Transport Environment</div>
          <h3>Travel arrangements that reflect school standards</h3>
          <p>
            Transport should reflect the same discipline and care families expect inside the school itself. That is why
            conduct, supervision, and respect remain central to how the transport system is managed.
          </p>
          <ul className="public-stage-list">
            <li>respectful behaviour on school transport</li>
            <li>punctuality and route consistency</li>
            <li>daily travel shaped by safety and order</li>
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Transport support that helps families plan with more peace of mind</h3>
          <p>
            We understand that transport is often a daily trust decision for families. Our goal is to keep it clearer,
            safer, and more structured for pupils who use the school transport service.
          </p>
          <div className="public-stage-link-row">
            <Link to="/admissions/fees" className="public-stage-link">Tuition & Fees</Link>
            <Link to="/contact" className="public-stage-link">Contact School</Link>
            <Link to="/information/parent-portal" className="public-stage-link">Parent Portal</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function StudentGalleryPanel() {
  const galleryItems = [
    {
      kicker: "Play",
      title: "Joyful activity and outdoor life",
      text: "Moments of play, friendship, and freedom that make school life feel lively and human.",
      image: "/assets/home-activity-1.jpg",
    },
    {
      kicker: "Friendship",
      title: "Belonging and pupil interaction",
      text: "Pupils learning to connect, laugh, participate, and grow together in community.",
      image: "/assets/home-activity-2.jpg",
    },
    {
      kicker: "Movement",
      title: "Sport, energy, and participation",
      text: "Active experiences that build teamwork, confidence, and healthy school spirit.",
      image: "/assets/home-activity-3.jpg",
    },
    {
      kicker: "Classroom",
      title: "Real learning moments",
      text: "Images that show lessons, guidance, and everyday classroom engagement across the school.",
      image: "/assets/home-post-1.jpg",
    },
    {
      kicker: "Campus",
      title: "The school environment",
      text: "A look at the spaces, movement, and surroundings that shape daily life at Angel Montessori School.",
      image: "/assets/school-building.jpg",
    },
    {
      kicker: "Growth",
      title: "School life in one wider story",
      text: "Snapshots of school culture, activity, creativity, and pupil development beyond academics alone.",
      image: "/assets/home-latest-bg.jpg",
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Visual Highlights</div>
          <h3>A real window into school life at Angel Montessori</h3>
          <p>
            A gallery should do more than decorate a website. It should help families and visitors see the wider story
            of school life through real moments, real spaces, and real pupil participation.
          </p>
          <p>
            These images help show the rhythm, warmth, activity, and sense of community that words alone cannot fully
            capture.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What The Gallery Shows</div>
          <h3>Activities, events, learning, and everyday community life</h3>
          <ul className="public-stage-list">
            <li>classroom interaction and teaching moments</li>
            <li>outdoor activity and sports participation</li>
            <li>friendships, movement, and belonging</li>
            <li>campus life and school environment</li>
            <li>creativity, celebration, and shared school experiences</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-3 public-gallery-wall">
        {galleryItems.map((item) => (
          <article
            key={item.title}
            className="public-card public-gallery-photo-card"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(10, 22, 38, 0.1) 0%, rgba(10, 22, 38, 0.8) 100%), url('${item.image}')` }}
          >
            <div className="public-kicker">{item.kicker}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Showing the school experience with real moments, not only claims</h3>
        <p>
          We want families to be able to see the atmosphere of the school as clearly as possible. The gallery is part
          of that honesty. It helps visitors feel the life, movement, and community behind the pages.
        </p>
        <div className="public-stage-link-row">
          <Link to="/student-life" className="public-stage-link">Student Life</Link>
          <Link to="/student-life/events" className="public-stage-link">School Events</Link>
          <Link to="/book-a-visit" className="public-stage-link">Book a Visit</Link>
        </div>
      </article>
    </>
  );
}

function SchoolLeadershipPanel({ managedProfiles = [] }) {
  const leadershipProfiles = getFixedSiteRoleProfiles("leadership");
  const leadershipRoles = [
    {
      title: "Academic Coordinator",
      description: "Oversees curriculum planning, teaching quality, and academic consistency across learning stages.",
    },
    {
      title: "Early Years Coordinator",
      description: "Leads the Montessori foundation stage and helps ensure a strong early learning experience.",
    },
    {
      title: "Basic School Coordinator",
      description: "Supervises Basic 1 to Basic 6 academic delivery and learner progress across the primary years.",
    },
    {
      title: "Secondary School Coordinator",
      description: "Manages Junior and Senior Secondary programmes with clearer oversight for standards and progression.",
    },
    {
      title: "Administrative & Finance Lead",
      description: "Supports school operations, planning, and finance systems that keep school life running responsibly.",
    },
  ];
  const dynamicRoleKeys = new Set(managedProfiles.map((profile) => normalizeRoleKey(profile.roleTitle || profile.role)));
  const remainingLeadershipRoles = leadershipRoles.filter((role) => !dynamicRoleKeys.has(normalizeRoleKey(role.title)));

  const leadershipApproach = [
    "commitment to excellence",
    "discipline and structure",
    "child-centered learning",
    "collaboration and teamwork",
    "continuous improvement",
  ];

  const supportAreas = [
    "monitor academic progress",
    "provide guidance and support",
    "maintain a positive learning environment",
    "ensure discipline and order",
  ];

  const parentPartnership = [
    "maintain open communication with parents",
    "provide regular updates on student progress",
    "encourage collaboration between school and home",
  ];

  const commitmentPoints = [
    "excellence is a standard",
    "discipline is upheld",
    "every child is valued",
    "learning is meaningful and impactful",
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Leadership with Vision, Purpose, and Excellence</div>
          <h3>Strong leadership shapes standards, culture, and the whole school experience</h3>
          <p>
            At Angel Montessori School, strong leadership is at the heart of everything we do. Our leadership team is
            committed to providing direction, maintaining high standards, and creating a structured, supportive
            environment where every child can thrive.
          </p>
          <p>
            We believe that effective leadership shapes not only academic success, but also character, discipline, and
            the overall school experience.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Head of School</div>
          <h3>Strategic and academic leadership that keeps the school focused on excellence</h3>
          <p>
            The Head of School provides strategic and academic leadership for Angel Montessori School, ensuring that
            the school remains focused on excellence, discipline, and holistic child development.
          </p>
          <ul className="public-stage-list">
            <li>academic standards and curriculum delivery</li>
            <li>student welfare and discipline</li>
            <li>staff coordination and development</li>
            <li>overall school growth and improvement</li>
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card">
        <div className="public-kicker">Our Leadership Team</div>
        <h3>Experienced professionals working together to guide daily school life</h3>
        <p>
          Our leadership team is made up of experienced and dedicated professionals who work together to ensure the
          smooth running of the school while supporting both pupils and staff with clarity and purpose.
        </p>
        <RoleProfileGrid profiles={leadershipProfiles} kicker="Leadership Profile" />
        {managedProfiles.length ? (
          <>
            <div className="public-kicker">Current Leadership Appointments</div>
            <RoleProfileGrid profiles={managedProfiles} kicker="Current Role Holder" />
          </>
        ) : null}
        {remainingLeadershipRoles.length ? <div className="public-kicker">Additional Leadership Roles</div> : null}
        <div className="public-grid-3">
          {remainingLeadershipRoles.map((role, index) => (
            <article key={role.title} className="public-card public-stage-card">
              <div className="public-feature-index">0{index + 3}</div>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
            </article>
          ))}
        </div>
      </article>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Leadership Approach</div>
          <h3>Leading with clarity, accountability, and continuous improvement</h3>
          <p>
            At Angel Montessori School, leadership is guided by clear standards, practical responsibility, and a
            strong commitment to the whole child. We lead in ways that keep school life purposeful, disciplined, and
            steadily improving.
          </p>
          <ul className="public-stage-list">
            {leadershipApproach.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Supporting Students and Staff</div>
          <h3>Guidance, structure, and daily support that strengthen learning</h3>
          <p>
            Our leadership team works closely with teachers and pupils to create the kind of environment where learning
            remains meaningful, orderly, and successful.
          </p>
          <ul className="public-stage-list">
            {supportAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Partnership with Parents</div>
          <h3>Leadership that extends into open communication and family trust</h3>
          <p>
            We recognize that strong school leadership should also help strengthen the relationship between school and
            home. That is why parent partnership remains part of how we lead.
          </p>
          <ul className="public-stage-list">
            {parentPartnership.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Building a school where excellence, discipline, and care remain visible</h3>
          <p>
            Our leadership remains committed to building a school where high standards are maintained, every child is
            valued, and learning stays meaningful and impactful.
          </p>
          <ul className="public-stage-list">
            {commitmentPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="public-stage-link-row">
            <Link to="/admissions/register" className="public-stage-link">Apply for Admission</Link>
            <Link to="/book-a-visit" className="public-stage-link">Book a School Visit</Link>
            <Link to="/contact" className="public-stage-link">Contact Us</Link>
          </div>
          <p><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></p>
        </article>
      </div>
    </>
  );
}

function SchoolGovernancePanel({ managedProfiles = [] }) {
  const governanceStructure = [
    {
      title: "Proprietor / Proprietress",
      description: "Provides overall vision, direction, and ownership for the school.",
    },
    {
      title: "Head of School",
      description: "Manages academic and operational leadership across the school.",
    },
    {
      title: "School Leadership Team",
      description: "Oversees daily school activities, implementation, and standards.",
    },
    {
      title: "Administrative Units",
      description: "Support finance, operations, communication, and practical coordination.",
    },
    {
      title: "Academic Units",
      description: "Support teaching quality, curriculum delivery, and student development.",
    },
  ];

  const governanceAreas = [
    {
      title: "Strategic Direction",
      description: "Guiding the long-term growth and development of the school.",
    },
    {
      title: "Policy Oversight",
      description: "Ensuring that school rules, policies, and procedures are properly implemented and maintained.",
    },
    {
      title: "Financial Responsibility",
      description: "Maintaining proper financial management, accountability, and sustainability of the school.",
    },
    {
      title: "Academic Standards",
      description: "Supporting high-quality teaching, curriculum alignment, and continuous academic improvement.",
    },
    {
      title: "Student Welfare",
      description: "Ensuring the safety, discipline, and well-being of every pupil.",
    },
  ];

  const philosophyItems = [
    "accountability and responsibility",
    "integrity and transparency",
    "strong policy implementation",
    "continuous school improvement",
  ];

  const policyAreas = [
    "academic operations",
    "student discipline",
    "staff responsibilities",
    "financial management",
    "health and safety",
  ];

  const trustPoints = [
    "transparency in operations",
    "clear communication",
    "responsible leadership",
    "maintaining high standards",
  ];
  const governanceProfiles = [...getFixedSiteRoleProfiles("governance"), ...managedProfiles];
  const governanceProfileKeys = new Set(governanceProfiles.map((profile) => normalizeRoleKey(profile.roleTitle || profile.role)));
  const remainingGovernanceStructure = governanceStructure.filter((item) => !governanceProfileKeys.has(normalizeRoleKey(item.title)));

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Strong Governance, Stronger Schools</div>
          <h3>Structure, accountability, and direction that support school excellence</h3>
          <p>
            At Angel Montessori School, school governance provides the structure, accountability, and direction that
            support excellence in education. It ensures that the school operates effectively, maintains high standards,
            and remains committed to its vision and values.
          </p>
          <p>
            Our governance system helps guide decision-making, uphold policies, and ensure that every aspect of the
            school functions responsibly and efficiently.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Governance Philosophy</div>
          <h3>A framework built on responsibility, transparency, and improvement</h3>
          <p>
            We are guided by a governance approach that helps the school remain disciplined, sustainable, and focused
            on delivering quality education with integrity.
          </p>
          <ul className="public-stage-list">
            {philosophyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="public-card public-stage-card">
        <div className="public-kicker">Governance Structure</div>
        <h3>Clear oversight across school leadership, operations, and academic delivery</h3>
        <p>
          The governance structure of Angel Montessori School provides clear oversight across all areas of school
          operations so that responsibilities remain defined, guided, and effectively managed.
        </p>
        <RoleProfileGrid profiles={governanceProfiles} kicker="Governance Profile" />
        {remainingGovernanceStructure.length ? <div className="public-kicker">Structure Overview</div> : null}
        <div className="public-grid-3">
          {remainingGovernanceStructure.map((item, index) => (
            <article key={item.title} className="public-card public-stage-card">
              <div className="public-feature-index">0{index + 1}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="public-card public-stage-card">
        <div className="public-kicker">Key Areas of Governance</div>
        <h3>Oversight that covers strategy, policy, finance, academics, and welfare</h3>
        <div className="public-grid-2 public-stage-detail-grid">
          {governanceAreas.map((area, index) => (
            <article key={area.title} className="public-card public-stage-card">
              <div className="public-feature-index">0{index + 1}</div>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </article>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Policies, Standards, and Accountability</div>
          <h3>Clear policies that guide consistency, fairness, and responsible practice</h3>
          <p>
            Angel Montessori School operates under clearly defined policies that help maintain fairness, consistency,
            and accountability across the school.
          </p>
          <ul className="public-stage-list">
            {policyAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Safe and Responsible Practice</div>
          <h3>A professionally managed environment where discipline and care are upheld</h3>
          <p>
            We are committed to maintaining a safe and professionally managed environment where pupils are protected,
            staff are accountable, and school systems operate efficiently and respectfully.
          </p>
          <ul className="public-stage-list">
            <li>pupils are protected and supported</li>
            <li>staff are accountable and guided</li>
            <li>school systems operate efficiently</li>
            <li>discipline and respect are upheld</li>
          </ul>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Building Trust with Families</div>
          <h3>Governance that strengthens confidence across the school community</h3>
          <p>
            Strong governance builds confidence among parents and the wider school community. It helps families know
            that the school is being guided with responsibility, transparency, and clear standards.
          </p>
          <ul className="public-stage-list">
            {trustPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Our Commitment</div>
          <h3>Supporting quality education with integrity, structure, and excellence</h3>
          <p>
            Our governance structure supports our mission to deliver quality education while maintaining discipline,
            integrity, and excellence in all areas of school life.
          </p>
          <p>
            We welcome families to learn more about how Angel Montessori School operates and supports the success of
            every child.
          </p>
          <div className="public-stage-link-row">
            <Link to="/about" className="public-stage-link">Explore Our School</Link>
            <Link to="/contact" className="public-stage-link">Contact Us</Link>
            <Link to="/book-a-visit" className="public-stage-link">Book a Visit</Link>
          </div>
          <p><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></p>
        </article>
      </div>
    </>
  );
}

function CampusPanel() {
  const campusQualities = [
    {
      title: "Learning Spaces",
      description:
        "The campus brings together classrooms and teaching spaces that help pupils settle, focus, and take part in learning with structure.",
    },
    {
      title: "Movement and Supervision",
      description:
        "An organised layout supports smoother routines, safer movement, and clearer supervision across the school day.",
    },
    {
      title: "Community Atmosphere",
      description:
        "The wider environment helps pupils feel part of a school community where belonging, discipline, and respect are visible in daily life.",
    },
  ];

  const campusStrengths = [
    "a purposeful environment for teaching and learning",
    "clear movement between learning and activity spaces",
    "a setting that supports order, supervision, and safety",
    "a campus atmosphere that reflects school identity and belonging",
  ];

  const visitReasons = [
    "see the learning environment in person",
    "understand how pupils move through the school day",
    "ask questions about routines, spaces, and support",
    "experience the atmosphere beyond the website",
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Campus</div>
          <h3>A school environment designed for learning, movement, and community life</h3>
          <p>
            At Angel Montessori School, our campus is more than a collection of buildings. It is the environment
            where pupils learn, move, grow, and experience daily school life in a setting designed to support order,
            safety, belonging, and purposeful learning.
          </p>
          <p>
            The wider school environment helps shape how pupils settle, interact, and move through their day, so the
            campus experience matters as much as the timetable itself.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Families Should Picture</div>
          <h3>A campus that supports routine, supervision, and a sense of belonging</h3>
          <ul className="public-stage-list">
            {campusStrengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {campusQualities.map((item, index) => (
          <article key={item.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why The Environment Matters</div>
          <h3>School atmosphere shapes confidence, routine, and daily experience</h3>
          <p>
            A good campus should help pupils feel secure enough to learn, move, and participate with confidence. It
            should also help families feel reassured that school life is being carried out in an environment that is
            orderly, supervised, and welcoming.
          </p>
          <p>
            At Angel Montessori School, the campus is part of that wider learning experience. It supports not only
            academics, but also behaviour, movement, community life, and the sense of being part of something
            purposeful.
          </p>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Visit The Campus</div>
          <h3>The best way to understand the environment is to experience it directly</h3>
          <p>
            Families often understand a school best when they can see the environment for themselves and ask practical
            questions about daily routines, movement, and support.
          </p>
          <ul className="public-stage-list">
            {visitReasons.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="public-stage-link-row">
            <Link to="/book-a-visit" className="public-stage-link">Book a Visit</Link>
            <Link to="/about/facilities" className="public-stage-link">View Facilities</Link>
            <Link to="/contact" className="public-stage-link">Contact School</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function FacilitiesPanel() {
  const facilityAreas = [
    {
      title: "Classrooms and Teaching Areas",
      description:
        "Teaching spaces support lesson delivery, class routines, and the focused academic work that shapes daily learning.",
    },
    {
      title: "Reading and Study Support",
      description:
        "Reading and study areas help pupils build concentration, research habits, and stronger academic confidence.",
    },
    {
      title: "ICT and Digital Support",
      description:
        "ICT support areas strengthen digital learning, CBT readiness, and access to the technology tools used in school life.",
    },
    {
      title: "Activity and Movement Spaces",
      description:
        "Activity areas give pupils room for sports, creativity, movement, and wider participation beyond classroom lessons.",
    },
    {
      title: "Operational Support Spaces",
      description:
        "Support spaces help supervision, administration, coordination, and the practical systems that keep school life running well.",
    },
  ];

  const facilitiesBenefits = [
    "teaching becomes more practical and better supported",
    "pupils have spaces that support both learning and wider development",
    "supervision and daily coordination become clearer and stronger",
    "families can see that the school environment supports real school life, not only claims",
  ];

  const relatedAreas = [
    "academic learning and classroom delivery",
    "reading, research, and digital learning support",
    "sports, creativity, and broader pupil development",
    "safety, supervision, and smooth daily operations",
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Facilities</div>
          <h3>Learning and support spaces that strengthen teaching, safety, and pupil development</h3>
          <p>
            At Angel Montessori School, facilities are part of how learning becomes real. Our classrooms, reading
            spaces, ICT support areas, activity zones, and operational support spaces help create a school environment
            where teaching is practical, pupils are supported, and daily school life runs with more confidence.
          </p>
          <p>
            Facilities matter because they help turn school plans into daily reality. They affect how pupils learn,
            how teachers work, and how well the school supports wider student development.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Strong Facilities Support</div>
          <h3>Academic work, pupil development, and the practical life of the school</h3>
          <ul className="public-stage-list">
            {relatedAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="public-grid-3">
        {facilityAreas.map((area, index) => (
          <article key={area.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 1}</div>
            <h3>{area.title}</h3>
            <p>{area.description}</p>
          </article>
        ))}
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Facilities Matter</div>
          <h3>Spaces and systems that help school life feel practical and well supported</h3>
          <p>
            Facilities should make teaching stronger, routines smoother, and pupil development easier to support in
            practice. They are part of the structure families rely on, even when they are not always the first thing
            seen on a website.
          </p>
          <ul className="public-stage-list">
            {facilitiesBenefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="public-card public-stage-card public-stage-next-card">
          <div className="public-kicker">Explore Further</div>
          <h3>See how facilities connect to the wider school experience</h3>
          <p>
            The best understanding comes when facilities are seen as part of the whole school environment. Families can
            explore the campus, student life, and practical support systems together for a fuller picture.
          </p>
          <div className="public-stage-link-row">
            <Link to="/about/campus" className="public-stage-link">Our Campus</Link>
            <Link to="/student-life/transport" className="public-stage-link">School Transport</Link>
            <Link to="/book-a-visit" className="public-stage-link">Book a Visit</Link>
          </div>
        </article>
      </div>
    </>
  );
}

function AdmissionsWhyPanel() {
  const reasons = [
    {
      index: "01",
      title: "A Balanced and Proven Curriculum",
      intro: "We operate a blended curriculum that combines structure, independence, and modern learning for stronger academic growth.",
      items: [
        "The Nigerian National Curriculum (NERDC)",
        "Montessori learning principles",
        "Technology-driven education",
      ],
    },
    {
      index: "02",
      title: "Dedicated and Experienced Teachers",
      intro: "Our team of educators is committed to nurturing every child with guidance that is both structured and caring.",
      items: [
        "Passionate and qualified teachers",
        "Child-centered teaching approach",
        "Continuous monitoring of pupil progress",
        "Supportive and engaging classroom environment",
      ],
    },
    {
      index: "03",
      title: "Technology-Driven Learning",
      intro: "We prepare pupils for the modern world by making technology part of everyday learning and academic readiness.",
      items: [
        "Computer-Based Testing (CBT)",
        "E-Library and digital learning resources",
        "Learning Management System (LMS)",
        "Coding and robotics exposure",
      ],
    },
    {
      index: "04",
      title: "Strong Academic Excellence",
      intro: "High standards are maintained through consistency, assessment, and careful monitoring of pupil progress.",
      items: [
        "Structured teaching methods",
        "Continuous assessments and feedback",
        "Exam preparation and performance tracking",
        "Consistent academic monitoring",
      ],
    },
    {
      index: "05",
      title: "Focus on Character Development",
      intro: "We believe that education goes beyond academics, so we intentionally shape the habits and values pupils live by.",
      items: [
        "discipline and responsibility",
        "respect and integrity",
        "confidence and leadership",
        "teamwork and good behavior",
      ],
    },
    {
      index: "06",
      title: "Safe and Supportive Environment",
      intro: "Every child should learn in a secure, respectful, and well-guided setting where wellbeing is taken seriously.",
      items: [
        "Well-structured school system",
        "Supervised learning environment",
        "Positive and respectful school culture",
        "Strong focus on pupil safety and well-being",
      ],
    },
    {
      index: "07",
      title: "Enriching Student Life",
      intro: "Balanced development grows when school life includes discovery, movement, creativity, and leadership beyond the classroom.",
      items: [
        "clubs and co-curricular activities",
        "sports and physical development",
        "cultural and social events",
        "creative and leadership opportunities",
      ],
    },
    {
      index: "08",
      title: "Individual Attention for Every Child",
      intro: "We recognize that every child is unique, so support and guidance should reflect different strengths, needs, and learning pace.",
      items: [
        "support different learning paces",
        "identify strengths and areas for improvement",
        "provide personalized guidance",
        "build confidence in every learner",
      ],
    },
    {
      index: "09",
      title: "Strong Partnership with Parents",
      intro: "Education works best when school and home stay connected through openness, trust, and regular communication.",
      items: [
        "open communication with parents",
        "regular academic updates",
        "collaboration in supporting pupils",
        "responsive and accessible school system",
      ],
    },
    {
      index: "10",
      title: "Affordable Quality Education",
      intro: "We are committed to providing quality education at a reasonable cost while maintaining strong standards and a supportive environment.",
      items: [
        "reasonable and accessible fee structure",
        "value through quality teaching and modern systems",
        "supportive learning environment",
        "clear planning through admissions and fee guidance",
      ],
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Why Choose Angel Montessori School</div>
          <h3>A strong foundation for lifelong success</h3>
          <p>
            Choosing the right school is one of the most important decisions for your child's future. At Angel
            Montessori School, we provide more than just education. We offer a well-rounded, structured, and nurturing
            environment where every child is supported to grow academically, socially, and morally.
          </p>
          <p>
            Our approach combines quality teaching, strong values, and modern learning systems to raise confident,
            disciplined, and future-ready learners.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What Families Gain</div>
          <h3>Academic strength, personal growth, and everyday support</h3>
          <p>
            This page brings together the major reasons families choose Angel Montessori School: a proven curriculum,
            dedicated teachers, strong pupil support, character formation, and a school culture that helps children
            thrive in and beyond the classroom.
          </p>
          <p>
            The goal is not only to help pupils succeed in school, but to prepare them for life with confidence,
            discipline, and purpose.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {reasons.map((reason) => (
          <article key={reason.title} className="public-card public-stage-card">
            <div className="public-feature-index">{reason.index}</div>
            <div className="public-kicker">Why Families Choose Us</div>
            <h3>{reason.title}</h3>
            <p>{reason.intro}</p>
            <ul className="public-stage-list">
              {reason.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Building a strong foundation for every child</h3>
        <p>
          At Angel Montessori School, we are dedicated to building a strong foundation for every child academically,
          morally, and socially.
        </p>
        <p>
          We prepare our pupils not only to succeed in school, but to thrive in life.
        </p>
        <div className="public-stage-link-row">
          <Link to="/admissions/register" className="public-stage-link">Apply for Admission</Link>
          <Link to="/book-a-visit" className="public-stage-link">Book a School Visit</Link>
          <Link to="/contact" className="public-stage-link">Contact Us</Link>
        </div>
        <p><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></p>
      </article>
    </>
  );
}

function AdmissionsFeesPanel() {
  const feeLevels = [
    {
      index: "01",
      title: "Early Years (Creche & Reception)",
      intro: "Our early years fee structure supports the resources, care, and guided learning experiences needed at the youngest stage.",
      items: [
        "Tuition Fee",
        "Learning Materials",
        "Activity Fee",
      ],
      classOptions: SCHOOL_FEE_CLASS_GROUPS.earlyYears,
    },
    {
      index: "02",
      title: "Basic School (Basic 1 - 6)",
      intro: "The Basic School fee structure reflects the wider academic support, classroom resources, and digital learning needed at this level.",
      items: [
        "Tuition Fee",
        "ICT / Digital Learning Fee",
        "Activity Fee",
        "Continuous Assessment & Examination Fee",
      ],
      classOptions: SCHOOL_FEE_CLASS_GROUPS.basicSchool,
    },
    {
      index: "03",
      title: "Secondary School (JSS & SSS)",
      intro: "Secondary school fees support subject teaching, digital systems, practical work, and the assessment structure expected at junior and senior levels.",
      items: [
        "Tuition Fee",
        "ICT / Digital Learning Fee",
        "Laboratory / Practical Fee",
        "Activity Fee",
        "Continuous Assessment & Examination Fee",
      ],
      classOptions: SCHOOL_FEE_CLASS_GROUPS.secondarySchool,
    },
  ];

  const feeCoverage = [
    "Quality classroom instruction by experienced teachers",
    "Continuous assessments and examinations",
    "Access to digital learning systems (CBT, LMS, E-Library)",
    "Co-curricular activities (clubs, sports, and creative programs)",
    "Use of school learning facilities and resources",
    "Academic monitoring and student progress tracking",
    "A safe, structured, and supportive learning environment",
  ];

  const supportSections = [
    {
      kicker: "Flexible Payment Options",
      title: "Making quality education easier to plan for families",
      intro:
        "We understand the importance of flexibility for parents and guardians. Our goal is to make quality education accessible while maintaining high standards.",
      items: [
        "Termly payment options",
        "Structured installment plans (where applicable)",
        "Secure payment through approved channels and school platforms",
      ],
    },
    {
      kicker: "Additional Charges",
      title: "Items and services that may be billed separately",
      intro:
        "Certain items and services may attract separate charges. All additional charges are communicated clearly in advance.",
      items: [
        "School uniforms",
        "Textbooks and learning materials",
        "School transport services",
        "Educational excursions and special programs",
        "External examination registration (where applicable)",
      ],
    },
    {
      kicker: "Discounts & Support",
      title: "School-approved support options for families",
      intro:
        "To support families, the school may offer selected payment support arrangements in line with approved policy.",
      items: [
        "Sibling discounts for families with more than one child enrolled",
        "Early payment incentives (where applicable)",
        "Direct clarification through the school for current availability",
      ],
    },
    {
      kicker: "Fee Policy",
      title: "Clear expectations around payment and access",
      intro:
        "Parents are encouraged to adhere to the approved payment guidelines so that school services can run smoothly and consistently.",
      items: [
        "School fees are expected to be paid as scheduled",
        "Late payment may affect access to certain school services",
        "Fees paid are generally non-refundable except under special considerations as determined by the school",
      ],
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Tuition & Fees</div>
          <h3>Investing in your child's future with clarity and value</h3>
          <p>
            At Angel Montessori School, we are committed to providing high-quality, well-structured education at a
            reasonable and accessible cost. Our tuition and fee structure is designed to support academic excellence,
            modern learning systems, and the overall development of every child.
          </p>
          <p>
            We believe that education is an investment, and we strive to ensure that every parent receives value
            through quality teaching, a supportive environment, and a well-rounded school experience.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">Our Fee Structure</div>
          <h3>Structured by learning level for clearer planning</h3>
          <p>
            Our fees are structured by learning level so that each child receives the resources, support, and learning
            experience appropriate for that stage of development.
          </p>
          <p>
            Families can also download class-by-class fee templates generated from the live finance structure saved by
            the school, making term planning easier and more transparent.
          </p>
        </article>
      </div>

      <div className="public-grid-3 public-stage-detail-grid">
        {feeLevels.map((level) => (
          <SchoolFeeTemplateCard
            key={level.title}
            kicker={`Fee Structure ${level.index}`}
            title={level.title}
            description={level.intro}
            items={level.items}
            classOptions={level.classOptions}
            hint={`Available classes here: ${level.classOptions.map((item) => item.label).join(", ")}.`}
          />
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">What Your Fees Cover</div>
        <h3>Academic, digital, developmental, and school-life support in one structure</h3>
        <p>
          Our tuition covers a wide range of academic and developmental services so that every aspect of your child's
          education is well supported at Angel Montessori School.
        </p>
        <ul className="public-stage-list">
          {feeCoverage.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="public-grid-2 public-stage-detail-grid">
        {supportSections.map((section, index) => (
          <article key={section.title} className="public-card public-stage-card">
            <div className="public-feature-index">0{index + 4}</div>
            <div className="public-kicker">{section.kicker}</div>
            <h3>{section.title}</h3>
            <p>{section.intro}</p>
            <ul className="public-stage-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Request Full Fee Details</div>
        <h3>Get class-specific fee guidance and admissions support</h3>
        <p>
          For detailed information about tuition fees for each class and available payment options, kindly contact the
          school or request full fee details through our admissions office.
        </p>
        <p>
          Give your child access to quality education, modern learning, and a supportive environment.
        </p>
        <div className="public-stage-link-row">
          <Link to="/admissions/register" className="public-stage-link">Apply for Admission</Link>
          <Link to="/admissions-enquiry" className="public-stage-link">Request Fee Details</Link>
          <Link to="/contact" className="public-stage-link">Contact Admissions</Link>
        </div>
        <p><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></p>
      </article>
    </>
  );
}

function SchoolPoliciesPanel() {
  const policies = [
    {
      index: "01",
      title: "Attendance Policy",
      intro: "Regular attendance is essential for academic success. Pupils are expected to attend school daily and arrive on time.",
      items: [
        "Pupils must be present and punctual for all school activities.",
        "Absence must be communicated to the school with a valid reason.",
        "Prolonged or repeated absence without justification may affect academic progress.",
        "Parents are responsible for ensuring their children attend school regularly.",
      ],
    },
    {
      index: "02",
      title: "Punctuality Policy",
      intro: "Punctuality is a key part of discipline and responsibility.",
      items: [
        "School activities begin at the designated time each day.",
        "Pupils who arrive late may miss important lessons and activities.",
        "Repeated lateness will be addressed by the school administration.",
      ],
    },
    {
      index: "03",
      title: "Code of Conduct",
      intro: "All pupils are expected to demonstrate good behavior at all times.",
      items: [
        "Respect for teachers, staff, and fellow pupils is mandatory.",
        "Bullying, harassment, or any form of violence is strictly prohibited.",
        "Pupils must follow school rules and instructions at all times.",
        "Proper conduct is expected both within and outside the school premises.",
      ],
    },
    {
      index: "04",
      title: "Dress Code / Uniform Policy",
      intro: "Pupils are expected to maintain a neat and appropriate appearance.",
      items: [
        "School uniform must be worn as prescribed.",
        "Uniforms must be clean, neat, and complete at all times.",
        "Improper dressing or non-compliance may attract corrective measures.",
      ],
    },
    {
      index: "05",
      title: "Academic Integrity Policy",
      intro: "We promote honesty and fairness in all academic activities.",
      items: [
        "Cheating, copying, or any form of academic dishonesty is not allowed.",
        "Pupils are expected to complete their work independently unless instructed otherwise.",
        "Violations will be addressed appropriately by the school.",
      ],
    },
    {
      index: "06",
      title: "Homework and Assignment Policy",
      intro: "Homework reinforces classroom learning.",
      items: [
        "Pupils are expected to complete assignments on time.",
        "Parents are encouraged to support and monitor their children's work.",
        "Late or incomplete work may affect academic assessment.",
      ],
    },
    {
      index: "07",
      title: "Discipline Policy",
      intro: "Discipline is essential for effective learning.",
      items: [
        "The school adopts corrective and constructive disciplinary measures.",
        "Misconduct will be addressed according to its severity.",
        "Parents may be contacted in cases of repeated or serious misconduct.",
      ],
    },
    {
      index: "08",
      title: "Health and Safety Policy",
      intro: "The safety and well-being of every pupil is our priority.",
      items: [
        "Pupils must follow all safety guidelines.",
        "Any illness or health concern should be reported immediately.",
        "The school maintains a safe and secure learning environment.",
      ],
    },
    {
      index: "09",
      title: "Use of Technology Policy",
      intro: "Technology is used to support learning and must be used responsibly.",
      items: [
        "Pupils must use school technology for educational purposes only.",
        "Unauthorized use of devices or internet access is not allowed.",
        "Misuse of technology may lead to disciplinary action.",
      ],
    },
    {
      index: "10",
      title: "Communication Policy",
      intro: "Effective communication between school and parents is essential.",
      items: [
        "Parents are encouraged to maintain regular communication with the school.",
        "Official communication channels should be used for enquiries and updates.",
        "The school will provide timely information regarding academic and school activities.",
      ],
    },
    {
      index: "11",
      title: "Fees and Payment Policy",
      intro: "Timely payment of school fees is required.",
      items: [
        "Fees must be paid as scheduled.",
        "Delays in payment may affect access to certain school services.",
        "Parents are advised to follow the approved payment procedures.",
      ],
    },
    {
      index: "12",
      title: "Transport Policy",
      intro: "For pupils using school transport services:",
      items: [
        "Pupils must follow all transport rules and safety guidelines.",
        "Timely pickup and drop-off must be observed.",
        "Misconduct on the school bus will not be tolerated.",
      ],
    },
    {
      index: "13",
      title: "Parent Partnership Policy",
      intro: "We believe education is a partnership between school and parents.",
      items: [
        "Parents are expected to support school policies and activities.",
        "Active participation in school programs is encouraged.",
        "Mutual respect between parents and staff must be maintained.",
      ],
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">School Policies</div>
          <h3>Creating a safe, disciplined, and supportive school environment</h3>
          <p>
            At Angel Montessori School, our policies are designed to create a safe, disciplined, and supportive
            environment where every child can learn, grow, and succeed.
          </p>
          <p>
            These policies guide the conduct of pupils, staff, and parents, ensuring that the school community operates
            with mutual respect, responsibility, and excellence.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">What the Policies Cover</div>
          <h3>Daily school life, behaviour, learning, safety, and parent partnership</h3>
          <p>
            This page brings together the core standards that guide attendance, punctuality, conduct, uniforms,
            academic honesty, assignments, discipline, technology use, communication, fees, transport, and the wider
            partnership between school and home.
          </p>
          <p>
            The aim is not simply to state rules, but to make expectations clear so that school life can remain
            respectful, productive, and well ordered.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {policies.map((policy) => (
          <article key={policy.title} className="public-card public-stage-card">
            <div className="public-feature-index">{policy.index}</div>
            <div className="public-kicker">School Policy</div>
            <h3>{policy.title}</h3>
            <p>{policy.intro}</p>
            <ul className="public-stage-list">
              {policy.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Our Commitment</div>
        <h3>Working together to raise disciplined, confident, and successful individuals</h3>
        <p>
          At Angel Montessori School, our policies are not just rules. They are guidelines that help us maintain a
          structured, respectful, and productive learning environment.
        </p>
        <p>
          By working together - school, parents, and pupils - we can achieve our shared goal of raising disciplined,
          confident, and successful individuals.
        </p>
        <p><strong>Angel Montessori School - Building Lives, Inspiring Futures.</strong></p>
        <div className="public-stage-link-row">
          <Link to="/contact" className="public-stage-link">Contact School</Link>
          <Link to="/book-a-visit" className="public-stage-link">Book a Visit</Link>
        </div>
      </article>
    </>
  );
}

function PoliciesDocumentsPanel() {
  const documentAreas = [
    {
      index: "01",
      title: "Family Guidance & Handbooks",
      intro: "Families often need clear reference points for everyday school life.",
      items: [
        "school handbook and family guidance materials",
        "admissions guidance and fee-related documents",
        "calendar summaries and key planning references",
      ],
    },
    {
      index: "02",
      title: "Student Protection & Safeguarding",
      intro: "Trust grows when safeguarding expectations are visible and easy to understand.",
      items: [
        "child protection guidance",
        "health, safety, and wellbeing expectations",
        "privacy and responsible communication standards",
      ],
    },
    {
      index: "03",
      title: "Operational Clarity for Daily School Life",
      intro: "Good policy pages help school routines run with fewer surprises and more consistency.",
      items: [
        "attendance and punctuality expectations",
        "conduct, discipline, and academic integrity guidance",
        "transport, technology, and payment-related rules",
      ],
    },
    {
      index: "04",
      title: "How Families Use This Page",
      intro: "This section helps parents and guardians know where to look before they need to call the school.",
      items: [
        "check the relevant guidance before making an enquiry",
        "download school documents where available",
        "contact the school team when a family needs clarification",
      ],
    },
  ];

  return (
    <>
      <div className="public-grid-2 public-stage-overview-grid">
        <article className="public-card public-stage-card">
          <div className="public-kicker">Policies & Documents</div>
          <h3>Family guidance, school policies, and official reference documents in one place</h3>
          <p>
            This page brings together the types of guidance families often need while navigating school life at Angel
            Montessori School. It is designed to make expectations easier to find, understand, and follow.
          </p>
          <p>
            The goal is not simply to store documents, but to support trust, clarity, and better day-to-day
            communication between school and home.
          </p>
        </article>
        <article className="public-card public-stage-card">
          <div className="public-kicker">How It Supports Families</div>
          <h3>Helping parents find practical school guidance without confusion</h3>
          <p>
            When policies and school documents are organised clearly, families can prepare better, respond faster, and
            support their children more confidently.
          </p>
          <p>
            This page works alongside the school policy page, the downloads section, and direct school contact so that
            important guidance is easier to access when it is needed.
          </p>
        </article>
      </div>

      <div className="public-grid-2 public-stage-detail-grid">
        {documentAreas.map((area) => (
          <article key={area.title} className="public-card public-stage-card">
            <div className="public-feature-index">{area.index}</div>
            <div className="public-kicker">Document Area</div>
            <h3>{area.title}</h3>
            <p>{area.intro}</p>
            <ul className="public-stage-list">
              {area.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article className="public-card public-stage-card public-stage-next-card">
        <div className="public-kicker">Key Links</div>
        <h3>Move directly to the school guidance you need</h3>
        <p>
          Families can move from this page into the more detailed policy page, the downloads section, or direct school
          contact depending on what kind of help they need next.
        </p>
        <div className="public-stage-link-row">
          <Link to="/about/policies" className="public-stage-link">School Policies</Link>
          <Link to="/information/downloads" className="public-stage-link">Downloads</Link>
          <Link to="/contact" className="public-stage-link">Contact School</Link>
        </div>
      </article>
    </>
  );
}

function MissionVisionValuesPanel() {
  const coreValues = [
    {
      title: "Excellence",
      description:
        "We strive for the highest standards in teaching, learning, and character development, ensuring every child reaches their full potential.",
    },
    {
      title: "Integrity & Discipline",
      description:
        "We promote honesty, strong moral principles, and self-discipline, shaping responsible and accountable individuals.",
    },
    {
      title: "Compassion & Respect",
      description:
        "We nurture kindness, empathy, and respect for others, creating a safe, inclusive, and supportive environment for all.",
    },
    {
      title: "Innovation & Growth",
      description:
        "We embrace creativity, modern teaching methods, and continuous improvement, preparing our pupils for lifelong learning and success.",
    },
  ];
  return (
    <>
      <div className="public-grid-2 public-values-grid">
        <article className="public-card public-values-card">
          <div className="public-feature-index">01</div>
          <div className="public-kicker">Mission Statement</div>
          <h3>What we are committed to doing every day</h3>
          <p>
            To provide a high-quality, affordable, and well-structured educational system that nurtures every child
            intellectually, morally, and socially. We are committed to developing confident, disciplined, and
            responsible learners through effective teaching methods, a supportive environment, and strong collaboration
            with parents.
          </p>
        </article>
        <article className="public-card public-values-card">
          <div className="public-feature-index">02</div>
          <div className="public-kicker">Vision Statement</div>
          <h3>What we are building for the future</h3>
          <p>
            To be a leading Montessori-based institution recognized for academic excellence, strong moral values, and
            the holistic development of children, raising future leaders who are equipped to succeed and make positive
            contributions to society.
          </p>
        </article>
      </div>
      <article className="public-card public-values-card public-values-list-card">
        <div className="public-feature-index">03</div>
        <div className="public-kicker">Core Values</div>
        <h3>The principles that shape school culture</h3>
        <div className="public-values-list">
          {coreValues.map((value) => (
            <div key={value.title} className="public-value-item">
              <strong>{value.title}</strong>
              <p>{value.description}</p>
            </div>
          ))}
        </div>
        <p className="public-values-closing">
          At Angel Montessori School, these values are not just statements. They are lived daily in our classrooms,
          relationships, and community.
        </p>
      </article>
    </>
  );
}
export default function PublicContentPage({ pageKey }) {
  const page = publicContentPages[pageKey];
  const section = page ? findSectionForPath(page.path) : null;
  const siblingLinks = section ? section.items.filter((item) => item.to !== page?.path).slice(0, 6) : [];
  const [siteOverview, setSiteOverview] = useState(null);
  const [publicAcademicCalendar, setPublicAcademicCalendar] = useState(null);
  const [siteRoleProfiles, setSiteRoleProfiles] = useState([]);

  useEffect(() => {
    const needsOverview = ["informationHome", "downloads"].includes(pageKey);
    if (!needsOverview) return undefined;

    let active = true;
    const loadOverview = async () => {
      try {
        const res = await getPublicSiteOverview();
        if (active) {
          setSiteOverview(res?.data || null);
        }
      } catch {
        if (active) {
          setSiteOverview(null);
        }
      }
    };

    loadOverview();
    return () => {
      active = false;
    };
  }, [pageKey]);

  useEffect(() => {
    const usesDynamicCalendar = ["academicsCalendar", "informationCalendar"].includes(pageKey);
    if (!usesDynamicCalendar) {
      setPublicAcademicCalendar(null);
      return undefined;
    }

    let active = true;
    const loadCalendar = async () => {
      try {
        const res = await getPublicAcademicCalendar();
        if (active) {
          setPublicAcademicCalendar(res?.data?.calendar || null);
        }
      } catch {
        if (active) {
          setPublicAcademicCalendar(null);
        }
      }
    };

    loadCalendar();
    return () => {
      active = false;
    };
  }, [pageKey]);
  useEffect(() => {
    const usesRoleProfiles = ["leadership", "governance"].includes(pageKey);
    if (!usesRoleProfiles) {
      setSiteRoleProfiles([]);
      return undefined;
    }

    let active = true;
    const loadRoleProfiles = async () => {
      try {
        const res = await getPublicSiteRoleProfiles({ page: pageKey });
        if (active) {
          const records = Array.isArray(res?.data?.records) ? res.data.records : [];
          setSiteRoleProfiles(records);
        }
      } catch {
        if (active) {
          setSiteRoleProfiles([]);
        }
      }
    };

    loadRoleProfiles();
    return () => {
      active = false;
    };
  }, [pageKey]);
  const liveAnnouncements = useMemo(() => siteOverview?.announcements || [], [siteOverview]);
  const liveDownloads = useMemo(() => siteOverview?.downloads || [], [siteOverview]);
  const contextualActionLinks = useMemo(() => {
    if (page?.links?.length) {
      return page.links.slice(0, 2);
    }
    return [
      { label: "Contact School", to: "/contact" },
      { label: "Portal Login", to: "/login" },
    ];
  }, [page]);

  const sidebarContent = useMemo(() => {
    const defaultSectionLinks = siblingLinks.length > 0 ? siblingLinks : page?.links || [];
    const defaultQuickLinks = page?.links || [];

    if (!page) {
      return {
        sectionKicker: "In This Section",
        sectionTitle: section?.label || "",
        sectionLinks: defaultSectionLinks,
        quickKicker: "Quick Links",
        quickTitle: "Helpful Actions",
        quickLinks: defaultQuickLinks,
      };
    }

    if (ABOUT_PAGE_KEYS.includes(pageKey)) {
      const preferredAboutRoutes = {
        headOfSchool: ["/about/leadership", "/about/mission-vision-values", "/about/governance", "/about/campus"],
        history: ["/about/mission-vision-values", "/about/leadership", "/about/campus", "/about/facilities"],
        missionVision: ["/about/head-of-school", "/about/leadership", "/about/governance", "/about/policies"],
        leadership: ["/about/head-of-school", "/about/governance", "/about/campus", "/about/facilities"],
        governance: ["/about/leadership", "/about/policies", "/about/campus", "/about/head-of-school"],
        campus: ["/about/facilities", "/about/history", "/about/leadership", "/book-a-visit"],
        facilities: ["/about/campus", "/student-life/transport", "/about/leadership", "/book-a-visit"],
        aboutPolicies: ["/information/policies-documents", "/about/governance", "/contact", "/book-a-visit"],
      };

      const orderedLinks = preferredAboutRoutes[pageKey]
        ?.map((route) => section?.items?.find((item) => item.to === route) || page.links.find((item) => item.to === route))
        .filter(Boolean);

      return {
        sectionKicker: "Continue Exploring",
        sectionTitle: "More About Angel Montessori",
        sectionLinks: orderedLinks?.length ? orderedLinks : defaultSectionLinks,
        quickKicker: "Next Step",
        quickTitle: "Turn interest into a real conversation",
        quickLinks: [
          { label: "Book a Visit", to: "/book-a-visit", description: "See the school environment and ask practical questions in person." },
          { label: "Contact School", to: "/contact", description: "Speak with the school team for guidance, clarification, or support." },
          { label: "Admissions Enquiry", to: "/admissions-enquiry", description: "Ask questions if you are considering Angel Montessori for your child." },
        ],
      };
    }

    return {
      sectionKicker: "In This Section",
      sectionTitle: section?.label || page.kicker,
      sectionLinks: defaultSectionLinks,
      quickKicker: "Quick Links",
      quickTitle: "Helpful Actions",
      quickLinks: defaultQuickLinks,
    };
  }, [page, pageKey, section, siblingLinks]);

  const nextStepContent = useMemo(() => {
    if (["headOfSchool", "history", "missionVision", "leadership", "governance", "campus", "facilities", "aboutPolicies"].includes(pageKey)) {
      return {
        kicker: "Visit or Ask",
        title: "Would you like to experience the school beyond the page?",
        body: "Families often understand a school best when they can visit, ask questions, and see the environment for themselves. The school team is available to guide that next step.",
        actions: [
          { label: "Book a Visit", to: "/book-a-visit", variant: "primary" },
          { label: "Contact School", to: "/contact", variant: "secondary" },
        ],
      };
    }

    if (pageKey === "studentLifeHome") {
      return {
        kicker: "Apply or Visit",
        title: "Give Your Child a Rich and Rewarding School Experience",
        body: "If you are looking for a school experience that builds confidence, friendship, discipline, and discovery beyond academics, the next step is to speak with the team or visit the campus.",
        actions: [
          { label: "Apply for Admission", to: "/admissions/register", variant: "primary" },
          { label: "Book a School Visit", to: "/book-a-visit", variant: "secondary" },
          { label: "Contact School", to: "/contact", variant: "secondary" },
        ],
      };
    }

    if (pageKey === "studentSupport") {
      return {
        kicker: "Need Reassurance?",
        title: "Discover a School That Truly Supports Your Child",
        body: "Families often want to know not only what a school teaches, but how it supports children through learning, wellbeing, guidance, and everyday care. The admissions team can walk you through that clearly.",
        actions: [
          { label: "Apply Now", to: "/admissions/register", variant: "primary" },
          { label: "Book a Visit", to: "/book-a-visit", variant: "secondary" },
          { label: "Contact the School", to: "/contact", variant: "secondary" },
        ],
      };
    }

    if (pageKey === "admissionsFees") {
      return {
        kicker: "Need Full Details?",
        title: "Request the class fee information you need",
        body: "Families often want clarity on class-specific fees, payment options, and any approved support arrangements before making a final decision. The admissions team can guide that conversation clearly.",
        actions: [
          { label: "Request Fee Details", to: "/admissions-enquiry", variant: "primary" },
          { label: "Contact Admissions", to: "/contact", variant: "secondary" },
          { label: "Apply for Admission", to: "/admissions/register", variant: "secondary" },
        ],
      };
    }

    if (["informationHome", "informationCalendar", "parentPortalInfo", "studentPortalInfo", "staffPortalInfo", "eLearning", "downloads", "faqs", "policiesDocuments"].includes(pageKey)) {
      return {
        kicker: "Need Help?",
        title: "Looking for the right portal, document, or school guidance?",
        body: "If you are unsure where to log in, which document you need, or how a school process works, the school team can point you in the right direction quickly.",
        actions: [
          { label: "Contact School", to: "/contact", variant: "primary" },
          { label: "Portal Login", to: "/login", variant: "secondary" },
        ],
      };
    }

    return {
      kicker: "Next Step",
      title: "Need personal guidance from the school team?",
      body: "Admissions, callback, visit booking, and contact support are all connected, so families can move from reading to action without losing context.",
      actions: [
        { label: "Admissions Enquiry", to: "/admissions-enquiry", variant: "primary" },
        { label: "Request Callback", to: "/request-callback", variant: "secondary" },
      ],
    };
  }, [pageKey]);
  const heroActions = useMemo(() => {
    if (["headOfSchool", "history", "missionVision", "leadership", "governance", "campus", "facilities", "aboutPolicies"].includes(pageKey)) {
      return [
        { label: "Book a Visit", to: "/book-a-visit", variant: "primary" },
        { label: "Contact School", to: "/contact", variant: "secondary" },
      ];
    }

    if (pageKey === "cbtAssessments") {
      return [
        { label: "Exam Login", to: "/cbt/exam", variant: "primary" },
        { label: "Admissions Enquiry", to: "/admissions-enquiry", variant: "secondary" },
      ];
    }

    if (["academicsHome", "creche", "reception", "basicSchool", "juniorSecondary", "seniorSecondary", "curriculum", "eLibrary", "academicsCalendar"].includes(pageKey)) {
      return [
        { label: "Admissions Enquiry", to: "/admissions-enquiry", variant: "primary" },
        { label: "Book a Visit", to: "/book-a-visit", variant: "secondary" },
      ];
    }

    if (pageKey === "studentLifeHome") {
      return [
        { label: "Apply Now", to: "/admissions/register", variant: "primary" },
        { label: "Book a Visit", to: "/book-a-visit", variant: "secondary" },
      ];
    }

    if (pageKey === "studentSupport") {
      return [
        { label: "Speak to Admissions", to: "/admissions-enquiry", variant: "primary" },
        { label: "Book a Visit", to: "/book-a-visit", variant: "secondary" },
      ];
    }

    if (pageKey === "admissionsFees") {
      return [
        { label: "Apply for Admission", to: "/admissions/register", variant: "primary" },
        { label: "Request Fee Details", to: "/admissions-enquiry", variant: "secondary" },
      ];
    }

    if (["clubs", "sports", "studentEvents", "studentLeadership", "studentTransport", "gallery", "enrichmentHome", "codingRobotics", "artsCreativity", "entrepreneurship", "communityService", "educationalTrips", "competitionsAwards"].includes(pageKey)) {
      return [
        { label: "Book a Visit", to: "/book-a-visit", variant: "primary" },
        { label: "Contact School", to: "/contact", variant: "secondary" },
      ];
    }

    if (pageKey === "admissionsProcess") {
      return [
        { label: "Apply for Admission", to: "/admissions/register", variant: "primary" },
        { label: "Entrance Exam Login", to: "/cbt/exam", variant: "secondary" },
      ];
    }

    if (["admissionsWhy", "admissionsFees", "scholarships"].includes(pageKey)) {
      return [
        { label: "Apply for Admission", to: "/admissions/register", variant: "primary" },
        { label: "Book a Visit", to: "/book-a-visit", variant: "secondary" },
      ];
    }

    if (pageKey === "eLearning") {
      return [
        { label: "Student Portal", to: "/information/student-portal", variant: "primary" },
        { label: "Staff Portal", to: "/information/staff-portal", variant: "secondary" },
      ];
    }

    if (["informationHome", "informationCalendar", "parentPortalInfo", "studentPortalInfo", "staffPortalInfo", "downloads", "faqs", "policiesDocuments"].includes(pageKey)) {
      return [
        { label: "Portal Login", to: "/login", variant: "primary" },
        { label: "Contact School", to: "/contact", variant: "secondary" },
      ];
    }

    return [
      { label: "Make an Enquiry", to: "/admissions-enquiry", variant: "primary" },
      { label: "Book a Visit", to: "/book-a-visit", variant: "secondary" },
    ];
  }, [pageKey]);

  if (!page) {
    return (
      <PublicSiteLayout>
        <section className="public-main-wrap">
          <article className="public-card">
            <h1>Page Not Found</h1>
            <p>This public page is not available right now.</p>
            <div className="public-actions">
              <Link className="public-btn primary" to="/">Return Home</Link>
            </div>
          </article>
        </section>
      </PublicSiteLayout>
    );
  }

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{
          backgroundImage: `url('${page.image}')`,
          backgroundPosition: "center center",
        }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">{page.kicker}</div>
          <div className="public-breadcrumbs">
            <Link to="/">Home</Link>
            {section ? <><span>/</span><Link to={section.to}>{section.label}</Link></> : null}
            <span>/</span>
            <span>{page.kicker}</span>
          </div>
          <h1 className="public-page-banner-title">{page.title}</h1>
          <p>{page.intro}</p>
          <div className="public-hero-actions">
            {heroActions.map((action) => (
              <DomainAwareLink key={action.to} className={`public-btn ${action.variant}`} to={action.to}>
                {action.label}
              </DomainAwareLink>
            ))}
          </div>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-content-shell">
          <div className="public-content-main">
            {pageKey === "academicsHome" ? (
              <AcademicJourneyPanel />
            ) : ["creche", "reception", "basicSchool", "juniorSecondary", "seniorSecondary"].includes(pageKey) ? (
              <AcademicStagePanel pageKey={pageKey} />
            ) : pageKey === "enrichmentHome" ? (
              <StemProgramsPanel />
            ) : pageKey === "codingRobotics" ? (
              <CodingRoboticsPanel />
            ) : pageKey === "artsCreativity" ? (
              <ArtsCreativityPanel />
            ) : pageKey === "entrepreneurship" ? (
              <EntrepreneurshipPanel />
            ) : pageKey === "communityService" ? (
              <CommunityServicePanel />
            ) : pageKey === "educationalTrips" ? (
              <EducationalTripsPanel />
            ) : pageKey === "competitionsAwards" ? (
              <CompetitionsAwardsPanel />
            ) : pageKey === "aboutPolicies" ? (
              <SchoolPoliciesPanel />
            ) : pageKey === "policiesDocuments" ? (
              <PoliciesDocumentsPanel />
            ) : pageKey === "missionVision" ? (
              <MissionVisionValuesPanel />
            ) : pageKey === "studentLifeHome" ? (
              <StudentLifeHomePanel />
            ) : pageKey === "clubs" ? (
              <ClubsSocietiesPanel />
            ) : pageKey === "sports" ? (
              <SportsPanel />
            ) : pageKey === "studentEvents" ? (
              <StudentEventsPanel />
            ) : pageKey === "studentLeadership" ? (
              <StudentLeadershipPanel />
            ) : pageKey === "studentSupport" ? (
              <StudentSupportPanel />
            ) : pageKey === "studentTransport" ? (
              <StudentTransportPanel />
            ) : pageKey === "gallery" ? (
              <StudentGalleryPanel />
            ) : pageKey === "curriculum" ? (
              <CurriculumPanel />
            ) : pageKey === "admissionsWhy" ? (
              <AdmissionsWhyPanel />
            ) : pageKey === "admissionsFees" ? (
              <AdmissionsFeesPanel />
            ) : pageKey === "leadership" ? (
              <SchoolLeadershipPanel managedProfiles={siteRoleProfiles} />
            ) : pageKey === "governance" ? (
              <SchoolGovernancePanel managedProfiles={siteRoleProfiles} />
            ) : pageKey === "campus" ? (
              <CampusPanel />
            ) : pageKey === "facilities" ? (
              <FacilitiesPanel />
            ) : ["academicsCalendar", "informationCalendar"].includes(pageKey) ? (
              <AcademicCalendarPanel calendar={publicAcademicCalendar} />
            ) : (
              <div className="public-grid-3">
                {page.points.map((point, index) => (
                  <article key={point} className="public-card public-feature-card">
                    <div className="public-feature-index">0{index + 1}</div>
                    <h3>{point}</h3>
                    <p>{describePoint(pageKey, page, point, index)}</p>
                  </article>
                ))}
              </div>
            )}

            <div className="public-grid-2">
              <article className="public-card public-rich-card">
                <h3>Key Highlights</h3>
                <p>{buildKeyHighlightsIntro(pageKey, page)}</p>
                <ul>
                  {page.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>

              <article className="public-card public-rich-card">
                <h3>Why It Matters</h3>
                <p>{buildWhyItMatters(pageKey, page)}</p>
                <div className="public-actions">
                  {contextualActionLinks.map((item) => (
                    <DomainAwareLink key={item.to} className="public-btn secondary" to={item.to}>
                      {item.label}
                    </DomainAwareLink>
                  ))}
                </div>
              </article>
            </div>

            {pageKey === "informationHome" ? (
              <LiveContentPanel title="Current Announcements" items={liveAnnouncements} type="announcements" />
            ) : null}


            {pageKey === "downloads" ? (
              <LiveContentPanel title="Current School Resources" items={liveDownloads} type="downloads" />
            ) : null}

            <article className="public-card public-cta-panel">
              <div>
                <div className="public-kicker">{nextStepContent.kicker}</div>
                <h3>{nextStepContent.title}</h3>
                <p>{nextStepContent.body}</p>
              </div>
              <div className="public-actions">
                {nextStepContent.actions.map((action) => (
                  <DomainAwareLink key={action.to} className={`public-btn ${action.variant}`} to={action.to}>
                    {action.label}
                  </DomainAwareLink>
                ))}
              </div>
            </article>
          </div>

          <aside className="public-content-side">
            <article className="public-card public-side-card">
              <div className="public-kicker">{sidebarContent.sectionKicker}</div>
              <h3>{sidebarContent.sectionTitle}</h3>
              <div className="public-side-link-list">
                {sidebarContent.sectionLinks.map((item) => (
                  <DomainAwareLink key={item.to} to={item.to} className="public-side-link">
                    <strong>{item.label}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                  </DomainAwareLink>
                ))}
              </div>
            </article>

            <article className="public-card public-side-card">
              <div className="public-kicker">{sidebarContent.quickKicker}</div>
              <h3>{sidebarContent.quickTitle}</h3>
              <div className="public-side-link-list">
                {sidebarContent.quickLinks.map((item) => (
                  <DomainAwareLink key={item.to} to={item.to} className="public-side-link">
                    <strong>{item.label}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                  </DomainAwareLink>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </section>
    </PublicSiteLayout>
  );
}























































