#!/usr/bin/env python
"""Generate Stage C Reception seed files from the approved AMES Volume III master PDF.

This helper is scoped to Phase 2 Stage C only. It reads the verified Reception
pages from the approved master PDF and writes Reception term seed files for the
existing importAmesVolumeIII.js pipeline. It does not process later phases.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber


REPO_ROOT = Path(__file__).resolve().parents[2]
CURRICULUM_DIR = REPO_ROOT / "docs" / "curriculum"
MASTER_FILE = "AMES_Volume_III_The_Complete_Early_Years_Curriculum_Final_Master_v1.0 (1).pdf"
APPROVAL_FILE = "AMES_Volume_III_Final_Audit_and_Approval_Record_v1.0.pdf"
SEED_DIR = REPO_ROOT / "backend" / "data" / "curriculum" / "ames-volume-iii"

SOURCE_DOCUMENT = "AMES Volume III - The Complete Early Years Curriculum"
FRAMEWORK = {"code": "AMES_VOLUME_III_EYFS", "version": "1.0"}
PHONICS_PROGRAMME = "NOT_YET_CONFIGURED"

TERM_CONFIGS = [
    {
        "file": "reception-term-1.json",
        "termName": "First Term",
        "termCode": "T1",
        "sourceSection": "Part IV - Reception Curriculum / First Term",
        "weekPages": [53, 54],
        "overviewPages": [52, 53, 54, 55, 56],
        "journey": ["SETTLE", "SECURE", "DECODE", "REPRESENT", "REASON"],
        "weekDevelopments": {
            1: "Belonging, routines and baseline understanding",
            2: "Identity, communication and representation",
            3: "Health, movement and investigation",
            4: "Belonging, diversity and storytelling",
            5: "PSED and emotional literacy",
            6: "Review and responsive teaching",
            7: "Community, roles and responsibility",
            8: "Observation and seasonal/environmental change",
            9: "Number sense and mathematical application",
            10: "Spatial reasoning and mathematical language",
            11: "Culture, identity and respectful comparison",
            12: "Faith, story, language and creativity",
            13: "Consolidation and reflection",
        },
        "sourcePages": {
            1: "53",
            2: "53",
            3: "53",
            4: "53",
            5: "53",
            6: "53",
            7: "53",
            8: "53",
            9: "53-54",
            10: "54",
            11: "54",
            12: "54",
            13: "54",
        },
    },
    {
        "file": "reception-term-2.json",
        "termName": "Second Term",
        "termCode": "T2",
        "sourceSection": "Part IV - Reception Curriculum / Second Term",
        "weekPages": [59, 60],
        "overviewPages": [58, 59, 60, 61, 62],
        "journey": ["DEEPEN", "READ", "COMPOSE", "INVESTIGATE", "APPLY"],
        "weekDevelopments": {
            1: "Reconnection, routines and assessment",
            2: "Community, occupations and service",
            3: "Movement, maps, routes and comparison",
            4: "Investigation and descriptive language",
            5: "Prediction, cause and effect",
            6: "Responsive review",
            7: "Classification, habitats and care",
            8: "Living things, food origins and change",
            9: "Composition, comparison and reasoning",
            10: "Mathematical application",
            11: "Technology, systems and responsibility",
            12: "Comprehension, narrative and culture",
            13: "Consolidation, application and reflection",
        },
        "sourcePages": {
            1: "59",
            2: "59",
            3: "59",
            4: "59",
            5: "59",
            6: "59",
            7: "59",
            8: "59",
            9: "59",
            10: "59-60",
            11: "60",
            12: "60",
            13: "60",
        },
    },
    {
        "file": "reception-term-3.json",
        "termName": "Third Term",
        "termCode": "T3",
        "sourceSection": "Part IV - Reception Curriculum / Third Term",
        "weekPages": [64, 65],
        "overviewPages": [64, 65, 66],
        "journey": ["FLUENCY", "INDEPENDENCE", "CONNECTION", "REFLECTION", "TRANSITION"],
        "weekDevelopments": {
            1: "Growth, change and representation",
            2: "Life cycles, observation and explanation",
            3: "Environment, care and responsible action",
            4: "Nigeria, identity and respectful knowledge",
            5: "Africa, maps and wider-world understanding",
            6: "Review and intervention while there is time",
            7: "Decoding, fluency and reading meaning",
            8: "Independent composition and writing improvement",
            9: "Mathematical reasoning and problem-solving",
            10: "Design, collaboration and explanation",
            11: "Reflection on Reception learning",
            12: "Practical and emotional Basic 1 readiness",
            13: "Celebration and Early Years transition",
        },
        "sourcePages": {
            1: "64",
            2: "64",
            3: "64",
            4: "64",
            5: "64",
            6: "65",
            7: "65",
            8: "65",
            9: "65",
            10: "65",
            11: "65",
            12: "65",
            13: "65",
        },
    },
]

PRIMARY_AREAS = {
    "Welcome to Reception": "PSED",
    "All About Me": "PSED",
    "My Body, Health and Senses": "PHYSICAL_DEVELOPMENT",
    "Families and Relationships": "PSED",
    "Feelings, Friendship and Self-Regulation": "PSED",
    "Consolidation / Calendar Flexibility": "PSED",
    "My School and Community": "UNDERSTANDING_THE_WORLD",
    "Autumn, Weather and Change": "UNDERSTANDING_THE_WORLD",
    "Numbers Are Everywhere": "MATHEMATICS",
    "Shape, Space and Pattern": "MATHEMATICS",
    "Celebrations and Traditions": "UNDERSTANDING_THE_WORLD",
    "Christmas: The Nativity": "PSED",
    "Look How We Have Grown": "PSED",
    "Back Together: Ready to Learn": "PSED",
    "People Who Help Us": "UNDERSTANDING_THE_WORLD",
    "Journeys and Transport": "UNDERSTANDING_THE_WORLD",
    "Materials and Their Properties": "UNDERSTANDING_THE_WORLD",
    "Forces: Push, Pull and Movement": "UNDERSTANDING_THE_WORLD",
    "Animals and Their Environments": "UNDERSTANDING_THE_WORLD",
    "Plants, Food and Growth": "UNDERSTANDING_THE_WORLD",
    "Number Relationships": "MATHEMATICS",
    "Measure, Shape and Spatial Thinking": "MATHEMATICS",
    "Machines, Technology and How Things Work": "UNDERSTANDING_THE_WORLD",
    "Stories From Nigeria and the World": "LITERACY",
    "What Can I Explain Now?": "PSED",
    "Growing and Changing": "UNDERSTANDING_THE_WORLD",
    "Life Cycles": "UNDERSTANDING_THE_WORLD",
    "Our Environment": "UNDERSTANDING_THE_WORLD",
    "Nigeria - Our Country": "UNDERSTANDING_THE_WORLD",
    "Africa and Our Wider World": "UNDERSTANDING_THE_WORLD",
    "Becoming Fluent Readers": "LITERACY",
    "Becoming Independent Writers": "LITERACY",
    "Mathematical Problem-Solvers": "MATHEMATICS",
    "Design, Build, Test, Improve": "EXPRESSIVE_ARTS_DESIGN",
    "Looking Back at Reception": "PSED",
    "Getting Ready for Basic 1": "PSED",
    "Celebration and Moving Forward": "PSED",
}

TERM_SECTION_RE = re.compile(
    r"\n(?:4|5|6|7|8|9|10|11|12|13|14|15|16|17|18)\.\s+"
    r"(?:Reception|First-Term|Second-Term|Third-Term|Reading|Writing|Handwriting|"
    r"Mathematics|Practical Life|Continuous Provision|Outdoor|Assessment|Inclusion|"
    r"Parent|End-of|Progression|Communication|PSED|Physical|Critical|Transition|"
    r"Christian Character)"
)


def clean_text(value: str) -> str:
    value = value.replace("\uFFFD", "è")
    value = value.replace("(cid:127)", "-")
    value = value.replace("�", "-")
    value = value.replace("–", "-").replace("—", "-")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n+", "\n", value)
    return value.strip()


def strip_page_noise(text: str) -> str:
    keep = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("AMES VOLUME III - RECEPTION"):
            continue
        if line.startswith("AMES-003-R-"):
            continue
        if line.startswith("ANGEL MONTESSORI EDUCATION SYSTEM"):
            continue
        if line in {
            "VOLUME III",
            "EARLY YEARS CURRICULUM & SCHEME OF",
            "LEARNING",
            "RECEPTION CURRICULUM",
            "PART IV - RECEPTION CURRICULUM",
            "FIRST TERM",
            "SECOND TERM",
            "THIRD TERM",
            "Official Approved Curriculum Record",
            "Audit-Corrected Approved Edition",
            "Version 1.0",
            "Version 1.1",
            "Motto: In God We Trust",
        }:
            continue
        keep.append(line)
    return clean_text("\n".join(keep))


def page_text(pdf, page_no: int) -> str:
    return strip_page_noise(pdf.pages[page_no - 1].extract_text() or "")


def trim_term_sections(body: str) -> str:
    match = TERM_SECTION_RE.search(f"\n{body}")
    if not match:
        return clean_text(body)
    return clean_text(("\n" + body)[: match.start()]).strip()


def extract_week_sections(text: str) -> dict[int, tuple[str, str]]:
    pattern = re.compile(r"Week\s+(\d+)\s+-\s+(.+?)(?=\nWeek\s+\d+\s+-|\Z)", re.S)
    weeks: dict[int, tuple[str, str]] = {}
    for match in pattern.finditer(text):
        week_no = int(match.group(1))
        chunk = clean_text(match.group(2))
        lines = chunk.splitlines()
        title = lines[0].strip()
        body = trim_term_sections(clean_text("\n".join(lines[1:])))
        weeks[week_no] = (title, body)
    return weeks


def first_sentence(text: str) -> str:
    match = re.search(r"(.+?\.)\s", text)
    return clean_text(match.group(1) if match else text[:220])


def extract_vocabulary(text: str) -> list[str]:
    match = re.search(r"Vocabulary(?: includes| may include)?:?\s+(.+?)(?:\.|$)", text)
    if not match:
        return []
    raw = match.group(1).replace(" and ", ", ")
    return [item.strip() for item in raw.split(",") if item.strip()]


def extract_character(text: str) -> str:
    match = re.search(r"Character:\s+(.+?)(?:\.|$)", text)
    return clean_text(match.group(1)) if match else ""


def extract_practical_life(text: str) -> str:
    patterns = [
        r"Practical Life includes\s+(.+?)(?:\.| Character:|$)",
        r"Practical Life:\s+(.+?)(?:\.| Character:|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return clean_text(match.group(1).strip(" ."))
    if "Practical Life" in text:
        return "Practical Life is included in the approved weekly guidance."
    return ""


def sentence_with_any(text: str, needles: tuple[str, ...]) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    for sentence in sentences:
        if any(needle.lower() in sentence.lower() for needle in needles):
            return clean_text(sentence)
    return ""


def dimension_codes(text: str) -> list[str]:
    codes = []
    lower = text.lower()
    if "practical life" in text or any(token in lower for token in ["self-care", "hygiene", "belongings", "pour", "clean", "resources"]):
        codes.append("PRACTICAL_LIFE")
    if "montessori" in lower:
        codes.append("MONTESSORI_INFORMED_PRACTICE")
    if "Character:" in text or "Christian" in text or "Nativity" in text or "Christmas" in text:
        codes.append("CHRISTIAN_CHARACTER")
    if any(token in text for token in ["Owo", "Ondo", "Nigeria", "Nigerian", "Yoruba", "Africa", "African", "local"]):
        codes.append("NIGERIAN_AFRICAN_CONTEXT")
    if any(token in lower for token in ["outdoor", "outside", "weather", "nature", "plant", "environment", "large construction"]):
        codes.append("OUTDOOR_LEARNING")
    if "provision" in lower or "play" in lower or "role play" in lower:
        codes.append("CONTINUOUS_PROVISION")
    return list(dict.fromkeys(codes))


def build_item(config: dict, week_no: int, title: str, body: str) -> dict:
    source_section = f"Reception {config['termName']} / Week {week_no} - {title}"
    code_prefix = f"AMES-EYFS-RECEPTION-{config['termCode']}-W{week_no:02d}"
    return {
        "code": f"{code_prefix}-INT-01",
        "eyfsArea": PRIMARY_AREAS.get(title, "COMMUNICATION_LANGUAGE"),
        "title": config["weekDevelopments"].get(week_no, title),
        "learningIntent": first_sentence(body),
        "learningContent": body,
        "keyVocabulary": extract_vocabulary(body),
        "teachingGuidance": sentence_with_any(body, ("Adult", "Adults", "Use", "Do not", "No formal", "Ask", "Teach", "Encourage")),
        "suggestedExperiences": [],
        "resources": [],
        "outdoorLearning": sentence_with_any(body, ("outdoor", "outside", "weather", "nature", "plant", "environment", "large construction")),
        "practicalLife": extract_practical_life(body),
        "montessoriPractice": "",
        "christianCharacter": extract_character(body),
        "nigerianAfricanContext": sentence_with_any(body, ("Owo", "Ondo", "Nigeria", "Nigerian", "Yoruba", "Africa", "African", "local")),
        "continuousProvision": sentence_with_any(body, ("play", "role play", "Practical Life", "construction")),
        "sendAccess": "",
        "parentHomeConnection": sentence_with_any(body, ("family", "home", "parent")),
        "assessmentFocus": sentence_with_any(body, ("assess", "assessment", "Review", "Determine", "observe", "revisit", "What has")),
        "progressionReference": sentence_with_any(body, ("Reception", "Basic 1", "progress", "Transition", "READ", "WRITE", "EXPLAIN")),
        "phonicsProgramme": PHONICS_PROGRAMME,
        "dimensionCodes": dimension_codes(body),
        "status": "APPROVED_LOCKED",
        "sourceSection": source_section,
        "sourcePage": config["sourcePages"][week_no],
        "lockedFromEditing": True,
    }


def build_seed(pdf, config: dict) -> dict:
    week_text = "\n".join(page_text(pdf, page) for page in config["weekPages"])
    overview = " ".join(page_text(pdf, page).replace("\n", " ") for page in config["overviewPages"])
    weeks = extract_week_sections(week_text)
    if sorted(weeks) != list(range(1, 14)):
        raise RuntimeError(f"{config['termName']} expected weeks 1-13, got {sorted(weeks)}")

    seed_weeks = []
    for week_no in range(1, 14):
        title, body = weeks[week_no]
        source_section = f"Reception {config['termName']} / Week {week_no} - {title}"
        code_prefix = f"AMES-EYFS-RECEPTION-{config['termCode']}-W{week_no:02d}"
        is_flexible = "Consolidation" in title
        seed_weeks.append(
            {
                "code": code_prefix,
                "weekNumber": week_no,
                "weekLabel": f"Week {week_no}",
                "title": title,
                "bigIdea": title,
                "mainDevelopment": config["weekDevelopments"].get(week_no, title),
                "curriculumIntent": first_sentence(body),
                "notes": "Responsive review rather than formal examination." if is_flexible else "",
                "isFlexibleWeek": is_flexible,
                "isTeachingWeek": True,
                "calendarNotes": "Calendar flexibility / responsive review." if is_flexible else "",
                "calendarStatus": "FLEXIBLE" if is_flexible else "UPCOMING",
                "sourceSection": source_section,
                "sourcePage": config["sourcePages"][week_no],
                "items": [build_item(config, week_no, title, body)],
            }
        )

    return {
        "sourceStatus": "APPROVED_LOCKED",
        "framework": FRAMEWORK,
        "classLevelCode": "RECEPTION",
        "className": "Reception",
        "termName": config["termName"],
        "title": f"Reception {config['termName']}",
        "overview": clean_text(overview),
        "developmentalJourney": config["journey"],
        "academicSessionId": "",
        "templateSessionReference": "TEMPLATE",
        "sourceDocument": SOURCE_DOCUMENT,
        "sourceVersion": "1.0",
        "sourceFile": MASTER_FILE,
        "approvalRecord": APPROVAL_FILE,
        "sourceSection": config["sourceSection"],
        "phonicsProgramme": PHONICS_PROGRAMME,
        "lockedFromEditing": True,
        "weeks": seed_weeks,
    }


def main() -> None:
    master_path = CURRICULUM_DIR / MASTER_FILE
    approval_path = CURRICULUM_DIR / APPROVAL_FILE
    if not master_path.exists():
        raise FileNotFoundError(master_path)
    if not approval_path.exists():
        raise FileNotFoundError(approval_path)

    with pdfplumber.open(master_path) as pdf:
        if len(pdf.pages) != 99:
            raise RuntimeError(f"Expected 99-page master PDF, got {len(pdf.pages)}")
        first_page = pdf.pages[0].extract_text() or ""
        if "FINAL MASTER" not in first_page or "APPROVED" not in first_page:
            raise RuntimeError("Master PDF does not contain the expected final approved status text.")
        for config in TERM_CONFIGS:
            seed = build_seed(pdf, config)
            out_path = SEED_DIR / config["file"]
            out_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            item_count = sum(len(week["items"]) for week in seed["weeks"])
            print(f"Wrote {out_path} - {len(seed['weeks'])} weeks, {item_count} items")


if __name__ == "__main__":
    main()
