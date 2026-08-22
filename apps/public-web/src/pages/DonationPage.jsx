import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getDonationPublicOverview,
  initiateDonation,
  verifyDonationPayment,
} from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

const initialForm = {
  donorName: "",
  email: "",
  phone: "",
  amount: "",
  campaign: "",
  anonymous: false,
  message: "",
};

const campaignPresentation = {
  "scholarship-fund": {
    displayName: "Innovation Access Initiative",
    displayDescription:
      "Extend access to high-impact technology pathways, student competitions, and future-facing learning opportunities.",
  },
  "learning-materials": {
    displayName: "Digital Learning Resources",
    displayDescription:
      "Strengthen digital content, curriculum platforms, guided practice tools, and premium learning resources for pupils.",
  },
  "classroom-development": {
    displayName: "Smart Classroom Technology",
    displayDescription:
      "Upgrade teaching spaces with interactive presentation tools, digital teaching aids, and stronger classroom technology.",
  },
  "feeding-support": {
    displayName: "Student Wellbeing and Learning Support",
    displayDescription:
      "Support the wellbeing systems that help pupils stay focused, engaged, and ready to thrive across the school day.",
  },
  "infrastructure-project": {
    displayName: "ICT Lab Expansion",
    displayDescription:
      "Build stronger digital infrastructure, connected workstations, and practical ICT spaces for future-ready learning.",
  },
};

const fallbackCampaignChoices = Object.entries(campaignPresentation).map(([id, item]) => ({
  id,
  name: item.displayName,
  displayName: item.displayName,
  displayDescription: item.displayDescription,
  suggestedAmounts: [25000, 50000, 100000, 250000],
  targetAmount: 0,
  totalRaised: 0,
  accent: "#163a70",
}));

const supportAudiences = ["Parents", "Alumni", "Professional Partners", "Sponsors"];

const supportHighlights = [
  {
    id: "ict-lab-expansion",
    title: "ICT Lab Expansion",
    tag: "Digital infrastructure",
    description:
      "Expand high-performance workstations, faster connectivity, and collaborative digital lab capacity for practical learning.",
    campaignId: "infrastructure-project",
    suggestedAmount: 12000000,
    imageOne: "/assets/support-ict-lab-1.jpg",
    imageTwo: "/assets/support-ict-lab-2.jpg",
  },
  {
    id: "robotics-coding-program",
    title: "Robotics & Coding Program",
    tag: "Future skills",
    description:
      "Scale robotics kits, coding pathways, competitions, and guided project-based experiences for confident problem-solvers.",
    campaignId: "scholarship-fund",
    suggestedAmount: 8000000,
    imageOne: "/assets/support-robotics-coding-1.jpg",
    imageTwo: "/assets/support-robotics-coding-2.jpg",
  },
  {
    id: "smart-classroom-technology",
    title: "Smart Classroom Technology",
    tag: "Teaching innovation",
    description:
      "Introduce interactive display tools, presentation technology, and better-enabled learning environments across key stages.",
    campaignId: "classroom-development",
    suggestedAmount: 6500000,
    imageOne: "/assets/support-smart-classroom-1.jpg",
    imageTwo: "/assets/support-smart-classroom-2.jpg",
  },
  {
    id: "digital-learning-resources",
    title: "Digital Learning Resources",
    tag: "Curriculum depth",
    description:
      "Strengthen access to adaptive learning tools, curated digital reading, and modern curriculum support materials.",
    campaignId: "learning-materials",
    suggestedAmount: 4000000,
    imageOne: "/assets/support-digital-learning-1.jpg",
    imageTwo: "/assets/support-digital-learning-2.jpg",
  },
  {
    id: "stem-innovation-hub",
    title: "STEM Innovation Hub",
    tag: "Long-term growth",
    description:
      "Create a premium space for design thinking, STEM clubs, prototyping, and innovation-led student collaboration.",
    campaignId: "infrastructure-project",
    suggestedAmount: 15000000,
    imageOne: "/assets/support-stem-hub-1.jpg",
    imageTwo: "/assets/support-stem-hub-2.jpg",
  },
];

const whyThisMatters = [
  {
    title: "Digital literacy with depth",
    description:
      "Technology-rich learning environments help pupils move beyond familiarity into confident, applied digital fluency.",
  },
  {
    title: "Creativity backed by tools",
    description:
      "Robotics, coding, and smart classroom resources strengthen curiosity, experimentation, and creative problem-solving.",
  },
  {
    title: "Future-ready confidence",
    description:
      "Students gain the mindset and exposure needed for a world shaped by technology, innovation, and global collaboration.",
  },
  {
    title: "Academic excellence that evolves",
    description:
      "Modern learning spaces help a strong private-school education stay ambitious, relevant, and responsive to what comes next.",
  },
];

const studentImpact = [
  {
    title: "Tomorrow's innovators",
    description:
      "Angel Montessori pupils are being equipped to think critically, build confidently, and solve meaningful challenges.",
  },
  {
    title: "Applied STEM confidence",
    description:
      "From robotics exploration to digital research and collaborative projects, students grow through purposeful hands-on learning.",
  },
  {
    title: "Global readiness",
    description:
      "Future-ready classrooms support digital citizenship, communication, and the confidence to thrive in modern academic pathways.",
  },
];

const trustPoints = [
  "Secure payment processing",
  "Verified school-managed initiatives",
  "Transparent use of support",
  "Receipt and confirmation after payment",
];

const partnerGroups = [
  {
    title: "Parents and families",
    description:
      "Support the learning environment your children benefit from and help shape the next phase of school excellence.",
  },
  {
    title: "Alumni community",
    description:
      "Stay connected to the school's future by backing projects that expand opportunity, innovation, and student ambition.",
  },
  {
    title: "Professional partners",
    description:
      "Contribute expertise, project support, or strategic funding toward technology-rich education and future skills development.",
  },
  {
    title: "Corporate sponsors",
    description:
      "Align with visible, school-managed initiatives that strengthen ICT, STEM growth, digital learning, and long-term impact.",
  },
];

const featuredInitiative = {
  title: "Featured Initiative: ICT & Robotics Lab",
  summary:
    "Angel Montessori School is building a more advanced ICT and robotics environment where pupils can learn digital fluency, coding logic, systems thinking, and collaborative innovation in one premium space.",
  detailPoints: [
    "Robotics kits, coding stations, and practical student workspaces",
    "Interactive teaching screens and better-equipped digital instruction zones",
    "Reliable infrastructure for research, guided practice, and project-based learning",
  ],
  campaignId: "infrastructure-project",
  suggestedAmount: 100000,
};

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  const safe = String(value || "").trim();
  if (!safe) return "";
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return safe;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getProgress(totalRaised, targetAmount) {
  const total = Number(totalRaised || 0);
  const target = Number(targetAmount || 0);
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((total / target) * 100)));
}

function getCampaignDisplay(campaign) {
  if (!campaign) return null;
  const presentation = campaignPresentation[campaign.id] || {};
  return {
    ...campaign,
    displayName: presentation.displayName || campaign.name || "Featured Initiative",
    displayDescription:
      presentation.displayDescription || campaign.description || "Support a featured school initiative.",
  };
}

export default function DonationPage() {
  const [searchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const verifiedReferenceRef = useRef("");

  const reference = String(searchParams.get("reference") || searchParams.get("trxref") || "").trim();
  const currency = overview?.currency || "NGN";
  const totalRaised = Number(overview?.totals?.totalRaised || 0);
  const monthRaised = Number(overview?.totals?.monthRaised || 0);
  const donorCount = Number(overview?.totals?.donorCount || 0);
  const hasVisibleSupportStats = totalRaised > 0 || monthRaised > 0 || donorCount > 0;

  const loadOverview = async () => {
    try {
      const res = await getDonationPublicOverview();
      setOverview(res?.data || null);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const campaigns = useMemo(() => (Array.isArray(overview?.campaigns) ? overview.campaigns : []), [overview]);
  const campaignChoices = useMemo(() => {
    if (!campaigns.length) return fallbackCampaignChoices;
    return campaigns.map((campaign) => getCampaignDisplay(campaign));
  }, [campaigns]);
  const selectedCampaign = campaignChoices.find((item) => item.id === form.campaign) || campaignChoices[0] || null;
  const selectedCampaignProgress = getProgress(selectedCampaign?.totalRaised, selectedCampaign?.targetAmount);
  const selectedCampaignRaised = Number(selectedCampaign?.totalRaised || 0);
  const featuredCampaign =
    campaignChoices.find((item) => item.id === featuredInitiative.campaignId) || selectedCampaign || null;
  const featuredProgress = getProgress(featuredCampaign?.totalRaised, featuredCampaign?.targetAmount);
  const featuredCampaignRaised = Number(featuredCampaign?.totalRaised || 0);
  const recentSupport = useMemo(
    () =>
      (Array.isArray(overview?.recentSupport) ? overview.recentSupport : []).map((item) => ({
        ...item,
        displayCampaignLabel: campaignPresentation[item.campaign]?.displayName || item.campaignLabel || "Featured initiative",
      })),
    [overview],
  );
  const highlightedProjects = useMemo(
    () =>
      supportHighlights.map((item) => {
        const campaign = campaignChoices.find((choice) => choice.id === item.campaignId) || null;
        return {
          ...item,
          campaign,
          totalRaised: campaign?.totalRaised || 0,
          targetAmount: campaign?.targetAmount || 0,
          progress: getProgress(campaign?.totalRaised, campaign?.targetAmount),
        };
      }),
    [campaignChoices],
  );
  const suggestedAmounts = selectedCampaign?.suggestedAmounts?.length
    ? selectedCampaign.suggestedAmounts
    : [25000, 50000, 100000, 250000];

  useEffect(() => {
    if (!form.campaign && campaignChoices.length) {
      setForm((prev) => ({ ...prev, campaign: campaignChoices[0].id }));
    }
  }, [campaignChoices, form.campaign]);

  useEffect(() => {
    if (!reference || verifiedReferenceRef.current === reference) return;

    const runVerification = async () => {
      try {
        setVerifying(true);
        setError("");
        const res = await verifyDonationPayment(reference);
        const donation = res?.data?.donation || null;
        setVerificationResult(donation);

        if (res?.data?.verified || donation?.status === "SUCCESS") {
          setSuccess("Thank you. Your support was confirmed successfully and your receipt has been queued for email delivery.");
        } else if (donation?.status === "FAILED") {
          setError("We could not confirm this payment as successful. Please try again or contact the school if you were charged.");
        }

        await loadOverview();
      } catch (err) {
        setError(err?.response?.data?.message || "We could not verify this support payment yet.");
      } finally {
        verifiedReferenceRef.current = reference;
        setVerifying(false);
      }
    };

    runVerification();
  }, [reference]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const focusProject = (campaignId, amount = "") => {
    setForm((prev) => ({
      ...prev,
      campaign: campaignId || prev.campaign,
      amount: amount ? String(amount) : prev.amount,
    }));

    if (typeof document !== "undefined") {
      document.getElementById("support-project-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      const res = await initiateDonation({
        ...form,
        amount: Number(form.amount || 0),
      });

      const checkoutUrl = String(res?.data?.checkoutUrl || "").trim();
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      setSuccess("Your support request has been created. Continue once the secure payment link becomes available.");
    } catch (err) {
      setError(err?.response?.data?.message || "We could not start the secure support payment right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicSiteLayout>
      <section
        className="public-support-hero"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(7, 19, 46, 0.96) 0%, rgba(18, 58, 112, 0.9) 52%, rgba(16, 168, 224, 0.74) 100%), url('/assets/home-latest-bg.jpg')",
        }}
      >
        <div className="public-support-hero-grid">
          <div className="public-support-hero-copy">
            <div className="public-kicker">Build the future of learning</div>
            <h1 className="public-support-hero-title">
              Support Angel Montessori School's next era of innovation and digital excellence
            </h1>
            <p className="public-support-hero-text">
              Partner with a respected private school investing in ICT, robotics, smart classrooms, and future-ready
              student development. Every contribution goes through a verified school-managed payment flow.
            </p>
            <div className="public-hero-actions">
              <a className="public-btn primary" href="#support-project-form">
                Support a Project
              </a>
              <a className="public-btn secondary" href="#featured-initiative">
                View Featured Initiative
              </a>
            </div>
            <div className="public-support-hero-badges">
              {supportAudiences.map((item) => (
                <span key={item} className="public-support-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <aside className="public-support-hero-aside">
            {hasVisibleSupportStats ? (
              <>
                <div className="public-support-stat-grid">
                  <article className="public-support-stat-card">
                    <span className="public-support-stat-label">Strategic support raised</span>
                    <strong>{formatCurrency(totalRaised, currency)}</strong>
                    <p>Verified support tracked securely through the school platform.</p>
                  </article>
                  <article className="public-support-stat-card">
                    <span className="public-support-stat-label">This month</span>
                    <strong>{formatCurrency(monthRaised, currency)}</strong>
                    <p>Current support momentum from parents, alumni, and school partners.</p>
                  </article>
                  <article className="public-support-stat-card">
                    <span className="public-support-stat-label">Verified supporters</span>
                    <strong>{donorCount}</strong>
                    <p>Confirmed contributors helping fund school-led innovation initiatives.</p>
                  </article>
                </div>
                <div className="public-support-hero-note">
                  {loading ? "Refreshing live support data..." : "Live support figures are synced from the school backend."}
                </div>
              </>
            ) : (
              <div className="public-support-trust-panel">
                <div className="public-kicker">Why partner through this page</div>
                <h3>Verified school-managed support for future-ready projects</h3>
                <div className="public-support-trust-list">
                  <div className="public-support-trust-item">
                    <strong>Project-led support</strong>
                    <p>Back defined initiatives in ICT, robotics, smart classrooms, and digital learning.</p>
                  </div>
                  <div className="public-support-trust-item">
                    <strong>Secure verification</strong>
                    <p>Every payment is created and verified through the school backend before confirmation.</p>
                  </div>
                  <div className="public-support-trust-item">
                    <strong>Professional follow-through</strong>
                    <p>Receipts, records, and project tracking stay within the school’s managed systems.</p>
                  </div>
                </div>
                <div className="public-support-hero-note">
                  Support figures will appear here automatically once verified project contributions begin coming in.
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="public-main-wrap public-support-page">
        {reference ? (
          <article className="public-card public-support-alert public-support-alert-info">
            <div className="public-kicker">Payment confirmation</div>
            <h3>{verifying ? "Checking your support payment..." : "Support payment status"}</h3>
            <p>
              Reference: <strong>{reference}</strong>
            </p>
            {verificationResult ? (
              <p>
                Current status: <strong>{verificationResult.status}</strong>
                {verificationResult.paidAt ? ` on ${formatDate(verificationResult.paidAt)}` : ""}
              </p>
            ) : (
              <p>We are verifying this transaction with the payment provider.</p>
            )}
          </article>
        ) : null}

        {success ? <div className="public-support-alert public-support-alert-success">{success}</div> : null}
        {error ? <div className="public-support-alert public-support-alert-error">{error}</div> : null}

        <section className="public-support-section" id="project-highlights">
          <div className="public-support-section-head">
            <div>
              <div className="public-kicker">Project highlights</div>
              <h2 className="public-section-title">Featured initiatives designed for modern, future-ready learning</h2>
            </div>
            <p>
              Support a focused school project that strengthens ICT capacity, STEM growth, digital learning, and
              classroom innovation.
            </p>
          </div>

          <div className="public-support-project-grid">
            {highlightedProjects.map((item) => (
              <article key={item.id} className="public-card public-support-project-card">
                <div
                  className="public-support-project-visual"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(8, 20, 45, 0.06) 0%, rgba(8, 20, 45, 0.24) 100%), url('${item.imageOne}')`,
                  }}
                />
                <div
                  className="public-support-project-visual"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(8, 20, 45, 0.06) 0%, rgba(8, 20, 45, 0.24) 100%), url('${item.imageTwo}')`,
                  }}
                />
                <div className="public-support-project-details">
                  <span className="public-support-project-tag">{item.tag}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="public-support-project-meta">
                    <span>{item.progress ? `${item.progress}% of live goal funded` : "Open for support"}</span>
                    <strong>{formatCurrency(item.suggestedAmount, currency)}</strong>
                  </div>
                  <button
                    type="button"
                    className="public-btn secondary"
                    onClick={() => focusProject(item.campaignId, item.suggestedAmount)}
                  >
                    Support This Initiative
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="public-support-section" id="featured-initiative">
          <article className="public-support-feature">
            <div className="public-support-feature-grid">
              <div className="public-support-feature-copy">
                <div className="public-kicker">Featured initiative</div>
                <h2>{featuredInitiative.title}</h2>
                <p>{featuredInitiative.summary}</p>
                <div className="public-support-feature-points">
                  {featuredInitiative.detailPoints.map((item) => (
                    <div key={item} className="public-support-mini-card">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <aside className="public-support-feature-panel">
                <div className="public-support-feature-stat">
                  <span>Funding goal</span>
                  <strong>{formatCurrency(featuredCampaign?.targetAmount, currency)}</strong>
                </div>
                {featuredCampaignRaised > 0 ? (
                  <div className="public-support-feature-stat">
                    <span>Support received</span>
                    <strong>{formatCurrency(featuredCampaignRaised, currency)}</strong>
                  </div>
                ) : null}
                <div className="public-support-progress">
                  <div className="public-support-progress-track">
                    <div className="public-support-progress-fill" style={{ width: `${featuredProgress}%` }} />
                  </div>
                  <span>{featuredProgress ? `${featuredProgress}% of current target` : "Funding target now open"}</span>
                </div>
                <p className="public-support-feature-panel-copy">
                  This initiative supports the school's vision for premium digital learning, stronger ICT experiences,
                  and confident student innovation.
                </p>
                <button
                  type="button"
                  className="public-btn primary"
                  onClick={() => focusProject(featuredInitiative.campaignId, featuredInitiative.suggestedAmount)}
                >
                  Support Featured Initiative
                </button>
              </aside>
            </div>
          </article>
        </section>

        <section className="public-support-section">
          <div className="public-support-section-head">
            <div>
              <div className="public-kicker">Why this matters</div>
              <h2 className="public-section-title">Technology-driven education builds confidence for what comes next</h2>
            </div>
            <p>
              The strongest school environments combine academic excellence with the tools, creativity, and digital
              fluency students need for the future.
            </p>
          </div>

          <div className="public-grid-4 public-support-value-grid">
            {whyThisMatters.map((item) => (
              <article key={item.title} className="public-card public-support-value-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-support-section">
          <div className="public-support-section-head">
            <div>
              <div className="public-kicker">Student impact</div>
              <h2 className="public-section-title">Supporting today's learners means investing in tomorrow's innovators</h2>
            </div>
            <p>
              Angel Montessori students are developing the confidence, creativity, and discipline to thrive in an
              increasingly digital and globally connected world.
            </p>
          </div>

          <div className="public-grid-3 public-support-impact-grid">
            {studentImpact.map((item) => (
              <article key={item.title} className="public-card public-support-impact-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-support-section" id="support-project-form">
          <div className="public-support-section-head">
            <div>
              <div className="public-kicker">Support this project</div>
              <h2 className="public-section-title">Choose an initiative and continue to secure payment</h2>
            </div>
            <p>
              The form stays simple, while the school backend handles record creation, payment verification, and
              confirmation behind the scenes.
            </p>
          </div>

          <div className="public-grid-2 public-support-form-grid">
            <article className="public-card public-support-form-card">
              <div className="public-support-form-header">
                <h3>Support This Project</h3>
                <p>
                  Select the initiative you want to back, choose an amount, and continue to the secure payment page.
                </p>
              </div>

              <form className="public-form public-support-form" onSubmit={handleSubmit}>
                <label>
                  <span>Full Name</span>
                  <input
                    type="text"
                    required
                    value={form.donorName}
                    onChange={(event) => handleChange("donorName", event.target.value)}
                    placeholder="Enter your full name"
                  />
                </label>

                <label>
                  <span>Email Address</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    placeholder="Enter your email address"
                  />
                </label>

                <label>
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    placeholder="Optional phone number"
                  />
                </label>

                <label>
                  <span>Project or Initiative</span>
                  <select
                    value={form.campaign}
                    onChange={(event) => handleChange("campaign", event.target.value)}
                    required
                  >
                    <option value="">Select a project</option>
                    {campaignChoices.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <div className="public-kicker public-support-form-kicker">Suggested amounts</div>
                  <div className="public-actions">
                    {suggestedAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className="public-btn secondary"
                        onClick={() => handleChange("amount", String(amount))}
                      >
                        {formatCurrency(amount, currency)}
                      </button>
                    ))}
                  </div>
                </div>

                <label>
                  <span>Support Amount</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.amount}
                    onChange={(event) => handleChange("amount", event.target.value)}
                    placeholder="Enter your preferred amount"
                  />
                </label>

                <label>
                  <span>Message</span>
                  <textarea
                    rows="4"
                    value={form.message}
                    onChange={(event) => handleChange("message", event.target.value)}
                    placeholder="Optional note to the school"
                  />
                </label>

                <label className="public-support-checkbox">
                  <input
                    type="checkbox"
                    checked={form.anonymous}
                    onChange={(event) => handleChange("anonymous", event.target.checked)}
                  />
                  <span>Keep my name private in public supporter highlights</span>
                </label>

                <button className="public-btn primary" type="submit" disabled={submitting || loading}>
                  {submitting ? "Preparing Secure Payment..." : "Continue to Secure Payment"}
                </button>
              </form>
            </article>

            <div className="public-support-form-aside">
              <article className="public-card public-support-selected-card">
                <div className="public-kicker">Selected initiative</div>
                <h3>{selectedCampaign?.displayName || "Featured school initiative"}</h3>
                <p>
                  {selectedCampaign?.displayDescription ||
                    "Choose a project to see how your support aligns with the school's future-facing plans."}
                </p>
                <div className="public-support-progress">
                  <div className="public-support-progress-track">
                    <div className="public-support-progress-fill" style={{ width: `${selectedCampaignProgress}%` }} />
                  </div>
                  <span>
                    {selectedCampaign?.targetAmount
                      ? selectedCampaignRaised > 0
                        ? `${selectedCampaignProgress}% of the current target`
                        : "Funding target now open"
                      : "Live progress will appear when a target is available"}
                  </span>
                </div>
                <div className="public-support-selected-metrics">
                  {selectedCampaignRaised > 0 ? (
                    <div>
                      <span>Raised</span>
                      <strong>{formatCurrency(selectedCampaignRaised, currency)}</strong>
                    </div>
                  ) : null}
                  <div>
                    <span>Goal</span>
                    <strong>{formatCurrency(selectedCampaign?.targetAmount, currency)}</strong>
                  </div>
                </div>
              </article>

              <article className="public-card public-support-process-card">
                <div className="public-kicker">Payment confidence</div>
                <h3>How school-managed support works</h3>
                <ul>
                  <li>Your support record is created in the school backend first.</li>
                  <li>The backend starts the secure payment provider using your chosen project.</li>
                  <li>Payment is verified server-side before the support is marked successful.</li>
                  <li>A receipt or confirmation is queued after successful verification.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="public-support-section">
          <div className="public-support-section-head">
            <div>
              <div className="public-kicker">Trust and clarity</div>
              <h2 className="public-section-title">Designed for confident, transparent support</h2>
            </div>
            <p>
              Every support transaction goes through the school platform with clear records, verified payment status,
              and post-payment confirmation.
            </p>
          </div>

          <div className="public-grid-4 public-support-trust-grid">
            {trustPoints.map((item) => (
              <article key={item} className="public-card public-support-trust-card">
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="public-support-section">
          <div className="public-support-section-head">
            <div>
              <div className="public-kicker">Supporters and partners</div>
              <h2 className="public-section-title">A strong invitation for parents, alumni, professionals, and sponsors</h2>
            </div>
            <p>
              This page is built for school stakeholders who want to contribute to meaningful, well-defined initiatives
              that strengthen educational excellence.
            </p>
          </div>

          <div className="public-grid-2 public-support-partner-grid">
            <article className="public-card">
              <div className="public-support-partner-stack">
                {partnerGroups.map((item) => (
                  <div key={item.title} className="public-support-partner-item">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="public-card">
              <div className="public-kicker">Recent verified support</div>
              <h3>Recent project contributions</h3>
              {recentSupport.length ? (
                <div className="public-support-recent-list">
                  {recentSupport.map((item) => (
                    <div key={item.id} className="public-support-recent-item">
                      <div>
                        <strong>{item.donorName}</strong>
                        <p>
                          {item.displayCampaignLabel} | {formatCurrency(item.amount, currency)}
                        </p>
                      </div>
                      <span>{formatDate(item.paidAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>
                  Verified supporter activity will appear here as project payments are confirmed through the school
                  platform.
                </p>
              )}
            </article>
          </div>
        </section>

        <section className="public-support-section">
          <article className="public-support-final-cta">
            <div>
              <div className="public-kicker">Ready to contribute?</div>
              <h2>Help shape the next chapter of learning excellence at Angel Montessori School.</h2>
              <p>
                Support a featured project, strengthen digital readiness, and invest in the students who will build the
                future.
              </p>
            </div>
            <div className="public-support-final-actions">
              <a className="public-btn primary" href="#support-project-form">
                Support a Project Today
              </a>
              <Link className="public-btn secondary" to="/contact">
                Speak With The School
              </Link>
            </div>
          </article>
        </section>
      </section>
    </PublicSiteLayout>
  );
}
