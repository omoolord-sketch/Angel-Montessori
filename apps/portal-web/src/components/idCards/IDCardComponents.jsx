import { useState } from "react";
import "./IDCardComponents.css";

export const ID_CARD_TEMPLATES = [
  {
    id: "classic-navy",
    name: "Classic Navy",
    description: "Official blue and gold school identity card for daily use.",
  },
  {
    id: "bright-primary",
    name: "Bright Primary",
    description: "Friendly nursery and primary look with a lighter front panel.",
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Clean white card for ink-efficient batch printing.",
  },
];

const SCHOOL = {
  name: "Angel Montessori School",
  address: "152 Okedogbon Road, Owo, Ondo State, Nigeria",
  phone: "+234 803 506 7767",
  email: "info@angelmontessori.ng",
  logo: "/logo.png",
  coatOfArms: "/assets/nigeria-coat-of-arms-real.svg?v=20260504-real",
};

function compact(value, fallback = "Not provided") {
  const text = String(value || "").trim();
  return text || fallback;
}

function initials(name) {
  return String(name || "Angel Montessori")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatRole(value) {
  return compact(value, "Staff")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeTokenPart(value) {
  return String(value || "UNKNOWN")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 32)
    .toUpperCase();
}

export function buildVerificationToken(type, idNumber, recordId) {
  const prefix = type === "staff" ? "AMS-STF" : "AMS-STU";
  return `${prefix}-${safeTokenPart(idNumber || recordId)}`;
}

function BarcodeMark({ token }) {
  const chars = Array.from(String(token || "AMS-ID"));
  const bars = chars.flatMap((char, index) => {
    const code = char.charCodeAt(0) + index;
    return [code % 5, (code + 2) % 5];
  });

  return (
    <div className="id-card-barcode" aria-label={`Verification token ${token}`}>
      <div className="id-card-barcode-bars">
        {bars.slice(0, 34).map((bar, index) => (
          <span
            key={`${token}-${index}`}
            style={{ width: `${bar + 1}px`, height: `${12 + ((bar + index) % 9)}px` }}
          />
        ))}
      </div>
      <small>{token}</small>
    </div>
  );
}

function SchoolLogo() {
  return (
    <div className="id-card-logo-wrap">
      <img src={SCHOOL.logo} alt="Angel Montessori School logo" />
    </div>
  );
}

function ProfilePhoto({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className="id-card-photo-placeholder">{initials(name)}</div>;
  }
  return <img className="id-card-photo" src={src} alt={`${name} profile`} onError={() => setFailed(true)} />;
}

function NationalCrest() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="id-card-national-crest" aria-label="Nigeria coat of arms">
      {!failed ? (
        <img
          src={SCHOOL.coatOfArms}
          alt="Nigeria coat of arms"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>NGA</span>
      )}
    </div>
  );
}

export function IDCardFront({
  template = "classic-navy",
  cardTitle,
  personName,
  photoUrl,
  primaryId,
  primaryLabel,
  secondaryLabel,
  secondaryValue,
  tertiaryLabel,
  tertiaryValue,
  extraLabel,
  extraValue,
}) {
  return (
    <article className={`id-card-shell id-card-front id-card-template-${template}`}>
      <div className="id-card-brand-row">
        <SchoolLogo />
        <div>
          <p className="id-card-school-name">{SCHOOL.name}</p>
          <p className="id-card-title">{cardTitle}</p>
        </div>
      </div>

      <div className="id-card-front-main">
        <ProfilePhoto src={photoUrl} name={personName} />
        <div className="id-card-front-info">
          <p className="id-card-name">{compact(personName, "Unnamed profile")}</p>
          <dl>
            <div>
              <dt>{primaryLabel}</dt>
              <dd>{compact(primaryId)}</dd>
            </div>
            <div>
              <dt>{secondaryLabel}</dt>
              <dd>{compact(secondaryValue)}</dd>
            </div>
            <div>
              <dt>{tertiaryLabel}</dt>
              <dd>{compact(tertiaryValue)}</dd>
            </div>
            {extraValue ? (
              <div>
                <dt>{extraLabel}</dt>
                <dd>{extraValue}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <NationalCrest />
      </div>
    </article>
  );
}

export function IDCardBack({
  template = "classic-navy",
  contactTitle = "Emergency Contact",
  contactValue,
  medicalOne,
  medicalTwo,
  issueDate,
  expiryDate,
  verificationToken,
}) {
  return (
    <article className={`id-card-shell id-card-back id-card-template-${template}`}>
      <div className="id-card-back-head">
        <SchoolLogo />
        <div>
          <p className="id-card-school-name">{SCHOOL.name}</p>
          <p>{SCHOOL.address}</p>
        </div>
      </div>

      <div className="id-card-back-grid">
        <div>
          <span>{contactTitle}</span>
          <strong>{compact(contactValue)}</strong>
        </div>
        <div>
          <span>School Contact</span>
          <strong>{SCHOOL.phone}</strong>
        </div>
        {medicalOne ? (
          <div>
            <span>Blood Group</span>
            <strong>{medicalOne}</strong>
          </div>
        ) : null}
        {medicalTwo ? (
          <div>
            <span>Medical Note</span>
            <strong>{medicalTwo}</strong>
          </div>
        ) : null}
        <div>
          <span>Issue Date</span>
          <strong>{formatDate(issueDate, "Current session")}</strong>
        </div>
        <div>
          <span>Valid Until</span>
          <strong>{formatDate(expiryDate, "Session end")}</strong>
        </div>
      </div>

      <p className="id-card-instruction">
        This card is the property of Angel Montessori School. If found, please return to the school office.
      </p>

      <div className="id-card-signature-row">
        <div>
          <span />
          <p>Principal/Admin Signature</p>
        </div>
        <BarcodeMark token={verificationToken} />
      </div>
    </article>
  );
}

export function StudentIDCard({ student, template = "classic-navy", options = {} }) {
  const fullName =
    student?.name ||
    [student?.firstName, student?.otherName, student?.lastName].filter(Boolean).join(" ") ||
    "Student";
  const admissionNo = student?.admissionNumber || student?.admissionNo || student?.portalUsername || student?.id;
  const token = buildVerificationToken("student", admissionNo, student?.id);
  const className = student?.className || student?.class?.name || student?.class || "Class not set";

  return (
    <div className="id-card-pair">
      <IDCardFront
        template={template}
        cardTitle="STUDENT ID CARD"
        personName={fullName}
        photoUrl={student?.photoUrl || student?.passportPhotoUrl || student?.photo}
        primaryLabel="Admission No."
        primaryId={admissionNo}
        secondaryLabel="Class / Level"
        secondaryValue={className}
        tertiaryLabel="Academic Session"
        tertiaryValue={options.academicSession || student?.academicSession || "Current session"}
        extraLabel="Date of Birth"
        extraValue={options.includeDob ? formatDate(student?.dateOfBirth, "") : ""}
        verificationToken={token}
      />
      <IDCardBack
        template={template}
        contactTitle="Parent / Guardian"
        contactValue={student?.parentPhone || student?.guardianPhone || student?.studentPhone}
        medicalOne={student?.bloodGroup}
        medicalTwo={student?.allergyNote || student?.medicalNote}
        issueDate={options.issueDate}
        expiryDate={options.expiryDate}
        verificationToken={token}
      />
    </div>
  );
}

export function StaffIDCard({ staff, template = "classic-navy", options = {} }) {
  const fullName = staff?.name || staff?.fullName || staff?.username || "Staff Member";
  const staffId = staff?.staffId || staff?.staffNumber || staff?.username || staff?.id;
  const token = buildVerificationToken("staff", staffId, staff?.id);

  return (
    <div className="id-card-pair">
      <IDCardFront
        template={template}
        cardTitle="STAFF ID CARD"
        personName={fullName}
        photoUrl={staff?.photoUrl || staff?.passportPhotoUrl || staff?.photo}
        primaryLabel="Staff ID"
        primaryId={staffId}
        secondaryLabel="Role / Job Title"
        secondaryValue={formatRole(staff?.jobTitle || staff?.role)}
        tertiaryLabel="Department"
        tertiaryValue={staff?.department || "School Staff"}
        verificationToken={token}
      />
      <IDCardBack
        template={template}
        contactTitle="Emergency Contact"
        contactValue={staff?.emergencyContact || staff?.phone}
        issueDate={options.issueDate}
        expiryDate={options.expiryDate}
        verificationToken={token}
      />
    </div>
  );
}

export function IDCardPreview({ type = "student", record, template, options }) {
  if (!record) {
    return (
      <div className="id-card-empty-preview">
        Select a {type === "staff" ? "staff member" : "student"} to preview the printable ID card.
      </div>
    );
  }

  return type === "staff" ? (
    <StaffIDCard staff={record} template={template} options={options} />
  ) : (
    <StudentIDCard student={record} template={template} options={options} />
  );
}

export function IDCardPrintLayout({ type = "student", records = [], template, options }) {
  return (
    <section className="id-card-print-zone" aria-label="Printable ID cards">
      {records.map((record) =>
        type === "staff" ? (
          <StaffIDCard key={`staff-${record.id || record.username}`} staff={record} template={template} options={options} />
        ) : (
          <StudentIDCard key={`student-${record.id || record.admissionNumber}`} student={record} template={template} options={options} />
        )
      )}
    </section>
  );
}

export function IDCardTemplateSelector({ value, onChange }) {
  return (
    <div className="id-card-template-selector">
      {ID_CARD_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          className={value === template.id ? "active" : ""}
          onClick={() => onChange(template.id)}
        >
          <span>{template.name}</span>
          <small>{template.description}</small>
        </button>
      ))}
    </div>
  );
}
