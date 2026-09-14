#!/usr/bin/env python
"""Generate Stage A Crèche seed files from the approved AMES Volume III master PDF.

This is an internal import helper for Phase 2 Stage A only. It reads the verified
Crèche pages from the approved master PDF and writes the three Crèche seed files
used by importAmesVolumeIII.js. It does not process Nursery or Reception.
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

TERM_CONFIGS = [
    {
        "file": "creche-term-1.json",
        "termName": "First Term",
        "termCode": "T1",
        "sourceSection": "Part II - Crèche Curriculum / First Term",
        "weekPages": [15, 16],
        "overviewPages": [14, 17],
        "journey": [
            "SECURITY",
            "RELATIONSHIP",
            "COMMUNICATION",
            "MOVEMENT",
            "EXPLORATION",
            "ROUTINE",
            "INDEPENDENCE",
        ],
        "weekDevelopments": {
            1: "Security, settling and relationships",
            2: "Identity, name and self-awareness",
            3: "Body awareness and movement",
            4: "Hygiene and emerging independence",
            5: "Familiar people and belonging",
            6: "Responsive review / mid-term",
            7: "Familiar environments and routines",
            8: "Sensory discrimination and language",
            9: "Nature, growth and care",
            10: "Animals, sounds and movement",
            11: "Early mathematics and creativity",
            12: "Christian character and celebration",
            13: "Reflection, transition and term closure",
        },
        "sourcePages": {
            1: "15",
            2: "15",
            3: "15",
            4: "15",
            5: "15",
            6: "15",
            7: "15",
            8: "15",
            9: "15",
            10: "15-16",
            11: "16",
            12: "16",
            13: "16",
        },
    },
    {
        "file": "creche-term-2.json",
        "termName": "Second Term",
        "termCode": "T2",
        "sourceSection": "Part II - Crèche Curriculum / Second Term",
        "weekPages": [21, 22],
        "overviewPages": [20, 23],
        "journey": [
            "SECURITY",
            "PARTICIPATION",
            "COMMUNICATION",
            "CURIOSITY",
            "CHOICE",
            "INCREASING_INDEPENDENCE",
        ],
        "weekDevelopments": {
            1: "Weather awareness and daily routines",
            2: "Environment, clothing and self-care",
            3: "Familiar community relationships",
            4: "Occupations, tools and role play",
            5: "Transport, movement and sound",
            6: "Review and responsive curriculum",
            7: "Position, movement and familiar journeys",
            8: "Food vocabulary, senses and healthy experiences",
            9: "Food origins and Nigerian community life",
            10: "Materials, construction and problem-solving",
            11: "Identity, culture, music and environment",
            12: "Creative expression and cultural experience",
            13: "Reflection, independence and term closure",
        },
        "sourcePages": {
            1: "21",
            2: "21",
            3: "21",
            4: "21",
            5: "21",
            6: "21",
            7: "21",
            8: "21",
            9: "21",
            10: "21",
            11: "21-22",
            12: "22",
            13: "22",
        },
    },
    {
        "file": "creche-term-3.json",
        "termName": "Third Term",
        "termCode": "T3",
        "sourceSection": "Part II - Crèche Curriculum / Third Term",
        "weekPages": [27, 28],
        "overviewPages": [26, 29, 30],
        "journey": [
            "I_NOTICE",
            "I_TRY",
            "I_SOLVE",
            "I_COMMUNICATE",
            "I_DO_MORE_FOR_MYSELF",
            "I_AM_READY_TO_MOVE_FORWARD",
        ],
        "weekDevelopments": {
            1: "Growth, change and identity",
            2: "Growth, care and observation",
            3: "Sensory investigation and Practical Life",
            4: "Uses of water, care and safety",
            5: "Minibeasts, movement and observation",
            6: "Responsive review",
            7: "Habitats, position and care",
            8: "Cause, effect and problem-solving",
            9: "Simple technology and purposeful action",
            10: "Identity and widening world knowledge",
            11: "Communication, imagination and expression",
            12: "Independence and Nursery preparation",
            13: "Reflection, celebration and transition",
        },
        "sourcePages": {
            1: "27",
            2: "27",
            3: "27",
            4: "27",
            5: "27",
            6: "27",
            7: "27",
            8: "27",
            9: "27",
            10: "27",
            11: "27",
            12: "28",
            13: "28",
        },
    },
]

PRIMARY_AREAS = {
    "I Belong Here": "PSED",
    "This Is Me": "PSED",
    "My Amazing Body": "PHYSICAL_DEVELOPMENT",
    "I Can Take Care of Myself": "PHYSICAL_DEVELOPMENT",
    "My Family": "PSED",
    "Consolidation / Mid-Term Flexibility": "PSED",
    "My Home and My School": "UNDERSTANDING_THE_WORLD",
    "I Explore With My Senses": "COMMUNICATION_LANGUAGE",
    "Plants Around Me": "UNDERSTANDING_THE_WORLD",
    "Animals Around Me": "UNDERSTANDING_THE_WORLD",
    "Shape, Colour, Pattern and Making": "MATHEMATICS",
    "Giving, Gratitude and Christmas": "PSED",
    "I Have Grown": "PSED",
    "Weather and My Day": "UNDERSTANDING_THE_WORLD",
    "Sun, Rain and What We Wear": "PHYSICAL_DEVELOPMENT",
    "People Who Help Me": "PSED",
    "Helpers at Work": "UNDERSTANDING_THE_WORLD",
    "Things That Move": "PHYSICAL_DEVELOPMENT",
    "Consolidation / Calendar Flexibility": "PSED",
    "Journeys and Places": "UNDERSTANDING_THE_WORLD",
    "Food I Know": "COMMUNICATION_LANGUAGE",
    "Farms and Markets": "UNDERSTANDING_THE_WORLD",
    "Building and Making": "MATHEMATICS",
    "Nigeria: My Home": "UNDERSTANDING_THE_WORLD",
    "Music, Art and Celebration": "EXPRESSIVE_ARTS_DESIGN",
    "Look What I Can Do": "PSED",
    "I Am Growing": "PSED",
    "Plants Grow Too": "UNDERSTANDING_THE_WORLD",
    "Wonderful Water": "MATHEMATICS",
    "Water Around Us": "UNDERSTANDING_THE_WORLD",
    "Little Creatures": "UNDERSTANDING_THE_WORLD",
    "Homes for Living Things": "UNDERSTANDING_THE_WORLD",
    "How Things Move and Work": "UNDERSTANDING_THE_WORLD",
    "I Can Make Things Happen": "UNDERSTANDING_THE_WORLD",
    "Africa: Our Wider Home": "UNDERSTANDING_THE_WORLD",
    "Sounds, Stories and Creativity": "EXPRESSIVE_ARTS_DESIGN",
    "I Can Do More for Myself": "PHYSICAL_DEVELOPMENT",
    "Moving Forward": "PSED",
}


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
        if line.startswith("AMES VOLUME III - CRECHE"):
            continue
        if line.startswith("AMES-003-C-"):
            continue
        if line.startswith("ANGEL MONTESSORI EDUCATION SYSTEM"):
            continue
        if line in {
            "VOLUME III",
            "EARLY YEARS CURRICULUM & SCHEME OF",
            "LEARNING",
            "PART II - CRECHE CURRICULUM",
            "FIRST TERM",
            "SECOND TERM",
            "THIRD TERM",
            "Official Approved Curriculum Record",
            "Version 1.0",
            "Motto: In God We Trust",
        }:
            continue
        keep.append(line)
    return clean_text("\n".join(keep))


def page_text(pdf, page_no: int) -> str:
    return strip_page_noise(pdf.pages[page_no - 1].extract_text() or "")


def extract_week_sections(text: str) -> dict[int, tuple[str, str]]:
    pattern = re.compile(r"Week\s+(\d+)\s+-\s+(.+?)(?=\nWeek\s+\d+\s+-|\Z)", re.S)
    weeks: dict[int, tuple[str, str]] = {}
    for match in pattern.finditer(text):
        week_no = int(match.group(1))
        chunk = clean_text(match.group(2))
        lines = chunk.splitlines()
        title = lines[0].strip()
        body = clean_text("\n".join(lines[1:]))
        weeks[week_no] = (title, body)
    return weeks


def first_sentence(text: str) -> str:
    match = re.search(r"(.+?\.)\s", text)
    return clean_text(match.group(1) if match else text[:220])


def extract_list_after_vocabulary(text: str) -> list[str]:
    match = re.search(r"Vocabulary(?: includes| may include)?:?\s+(.+?)(?:\.|$)", text)
    if not match:
        return []
    raw = match.group(1)
    raw = raw.replace(" and ", ", ")
    return [item.strip() for item in raw.split(",") if item.strip()]


def extract_character(text: str) -> str:
    match = re.search(r"Character:\s+(.+?)(?:\.|$)", text)
    return clean_text(match.group(1)) if match else ""


def extract_practical_life(text: str) -> str:
    patterns = [
        r"Practical Life:\s+(.+?)(?:\.| Character:|$)",
        r"Practical Life asks,?\s+(.+?)(?:\.| Character:|$)",
        r"Practical Life includes\s+(.+?)(?:\.| Character:|$)",
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
    if "Practical Life" in text or "self-care" in text or "handwashing" in text or "wiping" in text:
        codes.append("PRACTICAL_LIFE")
    if "Montessori-informed" in text or "HELP ME TO DO MORE FOR MYSELF" in text:
        codes.append("MONTESSORI_INFORMED_PRACTICE")
    if "Character:" in text or "Christmas" in text or "Christian" in text:
        codes.append("CHRISTIAN_CHARACTER")
    if any(token in text for token in ["Owo", "Ondo", "Nigeria", "Nigerian", "Yoruba", "Africa", "African", "local market", "local animals"]):
        codes.append("NIGERIAN_AFRICAN_CONTEXT")
    if any(token.lower() in text.lower() for token in ["outdoor", "outside", "school grounds", "rain", "nature"]):
        codes.append("OUTDOOR_LEARNING")
    return codes


def calendar_status(title: str) -> str:
    return "FLEXIBLE" if "Consolidation" in title else "UPCOMING"


def build_item(config: dict, week_no: int, title: str, body: str) -> dict:
    source_section = f"Crèche {config['termName']} / Week {week_no} - {title}"
    code_prefix = f"AMES-EYFS-CRECHE-{config['termCode']}-W{week_no:02d}"
    return {
        "code": f"{code_prefix}-INT-01",
        "eyfsArea": PRIMARY_AREAS.get(title, "COMMUNICATION_LANGUAGE"),
        "title": config["weekDevelopments"].get(week_no, title),
        "learningIntent": first_sentence(body),
        "learningContent": body,
        "keyVocabulary": extract_list_after_vocabulary(body),
        "teachingGuidance": sentence_with_any(body, ("Adults", "Teachers", "Use", "No formal", "Do not", "rather than")),
        "suggestedExperiences": [],
        "resources": [],
        "outdoorLearning": sentence_with_any(body, ("outdoor", "outside", "school grounds", "rain", "nature")),
        "practicalLife": extract_practical_life(body),
        "montessoriPractice": sentence_with_any(body, ("Montessori-informed", "HELP ME TO DO MORE FOR MYSELF")),
        "christianCharacter": extract_character(body),
        "nigerianAfricanContext": sentence_with_any(body, ("Owo", "Ondo", "Nigeria", "Nigerian", "Yoruba", "Africa", "African", "local market", "local animals")),
        "continuousProvision": "",
        "sendAccess": "",
        "parentHomeConnection": sentence_with_any(body, ("family", "home", "parent")),
        "assessmentFocus": sentence_with_any(body, ("Observe", "Review", "Teachers should")),
        "progressionReference": "",
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
        source_section = f"Crèche {config['termName']} / Week {week_no} - {title}"
        code_prefix = f"AMES-EYFS-CRECHE-{config['termCode']}-W{week_no:02d}"
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
                "calendarStatus": calendar_status(title),
                "sourceSection": source_section,
                "sourcePage": config["sourcePages"][week_no],
                "items": [build_item(config, week_no, title, body)],
            }
        )

    return {
        "sourceStatus": "APPROVED_LOCKED",
        "framework": FRAMEWORK,
        "classLevelCode": "CRECHE",
        "className": "Crèche",
        "termName": config["termName"],
        "title": f"Crèche {config['termName']}",
        "overview": clean_text(overview),
        "developmentalJourney": config["journey"],
        "academicSessionId": "",
        "templateSessionReference": "TEMPLATE",
        "sourceDocument": SOURCE_DOCUMENT,
        "sourceVersion": "1.0",
        "sourceFile": MASTER_FILE,
        "approvalRecord": APPROVAL_FILE,
        "sourceSection": config["sourceSection"],
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
