#!/usr/bin/env python
"""Generate Stage B Nursery seed files from the approved AMES Volume III master PDF.

This helper is scoped to Phase 2 Stage B only. It reads the verified Nursery
pages from the approved master PDF and writes Nursery term seed files for the
existing importAmesVolumeIII.js pipeline. It does not process Reception.
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
        "file": "nursery-term-1.json",
        "termName": "First Term",
        "termCode": "T1",
        "sourceSection": "Part III - Nursery Curriculum / First Term",
        "weekPages": [34, 35],
        "overviewPages": [33, 36, 37],
        "journey": ["BELONG", "COMMUNICATE", "NOTICE", "REPRESENT"],
        "weekDevelopments": {
            1: "Belonging, routines and independence",
            2: "Identity, language and representation",
            3: "Body knowledge, movement and investigation",
            4: "Self-care, hygiene and healthy routines",
            5: "Emotional literacy and relationships",
            6: "Responsive review",
            7: "Relationships, language and belonging",
            8: "People, places and responsibility",
            9: "Mathematical noticing and representation",
            10: "Early number sense and quantity",
            11: "Observation, growth and stewardship",
            12: "Faith, story and creative expression",
            13: "Reflection, consolidation and progression",
        },
        "sourcePages": {
            1: "34",
            2: "34",
            3: "34",
            4: "34",
            5: "34",
            6: "34",
            7: "34",
            8: "34",
            9: "34",
            10: "34-35",
            11: "35",
            12: "35",
            13: "35",
        },
    },
    {
        "file": "nursery-term-2.json",
        "termName": "Second Term",
        "termCode": "T2",
        "sourceSection": "Part III - Nursery Curriculum / Second Term",
        "weekPages": [40, 41],
        "overviewPages": [39, 42, 43],
        "journey": ["QUESTION", "INVESTIGATE", "COMPARE", "EXPLAIN", "SOLVE"],
        "weekDevelopments": {
            1: "Roles, service and community",
            2: "Movement, routes and positional language",
            3: "Properties, sorting and investigation",
            4: "Forces through practical exploration",
            5: "Classification, features and care",
            6: "Responsive assessment and review",
            7: "Habitats, comparison and adaptation",
            8: "Origins, community and healthy experiences",
            9: "Observation, change and recording",
            10: "Design, construction and reasoning",
            11: "Cause, effect and simple technology",
            12: "Narrative, language and cultural expression",
            13: "Reflection, explanation and consolidation",
        },
        "sourcePages": {
            1: "40",
            2: "40",
            3: "40",
            4: "40",
            5: "40",
            6: "40",
            7: "40",
            8: "40",
            9: "40",
            10: "40",
            11: "41",
            12: "41",
            13: "41",
        },
    },
    {
        "file": "nursery-term-3.json",
        "termName": "Third Term",
        "termCode": "T3",
        "sourceSection": "Part III - Nursery Curriculum / Third Term",
        "weekPages": [46, 47],
        "overviewPages": [45, 48, 49, 50],
        "journey": ["CONNECT", "APPLY", "CREATE", "REFLECT", "PREPARE"],
        "weekDevelopments": {
            1: "Growth, change and sequencing",
            2: "Change over time and observation",
            3: "Environment, land, water and stewardship",
            4: "Identity, place and belonging",
            5: "Widening geographical and cultural awareness",
            6: "Responsive review",
            7: "Mathematical reasoning",
            8: "Spatial reasoning and comparison",
            9: "Narrative, language and imagination",
            10: "Design, creativity and problem-solving",
            11: "Literacy foundations",
            12: "Independence and Reception readiness",
            13: "Reflection, celebration and transition",
        },
        "sourcePages": {
            1: "46",
            2: "46",
            3: "46",
            4: "46",
            5: "46",
            6: "46",
            7: "46",
            8: "46",
            9: "46",
            10: "46",
            11: "46-47",
            12: "47",
            13: "47",
        },
    },
]

PRIMARY_AREAS = {
    "Welcome to Nursery": "PSED",
    "All About Me": "PSED",
    "My Body and My Senses": "PHYSICAL_DEVELOPMENT",
    "Keeping Myself Healthy": "PHYSICAL_DEVELOPMENT",
    "My Feelings and Friendships": "PSED",
    "Consolidation / Calendar Flexibility": "PSED",
    "My Family and Home": "PSED",
    "My School and Community": "UNDERSTANDING_THE_WORLD",
    "Colours, Shapes and Patterns Around Me": "MATHEMATICS",
    "Numbers in My World": "MATHEMATICS",
    "Plants and Living Things": "UNDERSTANDING_THE_WORLD",
    "Christmas: Love, Giving and Celebration": "PSED",
    "Look How I Have Grown": "PSED",
    "People Who Help Our Community": "UNDERSTANDING_THE_WORLD",
    "Transport and Journeys": "PHYSICAL_DEVELOPMENT",
    "Materials Around Us": "UNDERSTANDING_THE_WORLD",
    "Push, Pull, Roll and Slide": "UNDERSTANDING_THE_WORLD",
    "Animals Around Us": "UNDERSTANDING_THE_WORLD",
    "Where Animals Live": "UNDERSTANDING_THE_WORLD",
    "Food, Farms and Markets": "UNDERSTANDING_THE_WORLD",
    "Weather and Our Environment": "UNDERSTANDING_THE_WORLD",
    "Building, Making and Problem-Solving": "MATHEMATICS",
    "Things That Work": "UNDERSTANDING_THE_WORLD",
    "Stories, Music and Our Culture": "EXPRESSIVE_ARTS_DESIGN",
    "What Have We Discovered?": "PSED",
    "Look How Things Grow": "UNDERSTANDING_THE_WORLD",
    "Life Cycles Around Us": "UNDERSTANDING_THE_WORLD",
    "Our Amazing Earth": "UNDERSTANDING_THE_WORLD",
    "Nigeria: My Country": "UNDERSTANDING_THE_WORLD",
    "Africa and the Wider World": "UNDERSTANDING_THE_WORLD",
    "Numbers Help Us Solve Problems": "MATHEMATICS",
    "Shapes, Measures and Patterns": "MATHEMATICS",
    "I Am a Storyteller": "LITERACY",
    "I Can Plan, Make and Improve": "EXPRESSIVE_ARTS_DESIGN",
    "Sounds, Words and Meaningful Marks": "LITERACY",
    "I Can Do More for Myself": "PHYSICAL_DEVELOPMENT",
    "Moving Forward to Reception": "PSED",
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
        if line.startswith("AMES VOLUME III - NURSERY"):
            continue
        if line.startswith("AMES-003-N-"):
            continue
        if line.startswith("ANGEL MONTESSORI EDUCATION SYSTEM"):
            continue
        if line in {
            "VOLUME III",
            "EARLY YEARS CURRICULUM & SCHEME OF",
            "LEARNING",
            "PART III - NURSERY CURRICULUM",
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
        r"Practical Life:\s+(.+?)(?:\.| Character:|$)",
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
    if "Practical Life" in text or any(token in text for token in ["self-care", "handwashing", "wiping", "pour", "sweeping", "serving"]):
        codes.append("PRACTICAL_LIFE")
    if "Montessori" in text:
        codes.append("MONTESSORI_INFORMED_PRACTICE")
    if "Character:" in text or "Christian" in text or "Christmas" in text:
        codes.append("CHRISTIAN_CHARACTER")
    if any(token in text for token in ["Owo", "Ondo", "Nigeria", "Nigerian", "Yoruba", "Africa", "African", "local"]):
        codes.append("NIGERIAN_AFRICAN_CONTEXT")
    if any(token.lower() in text.lower() for token in ["outdoor", "outside", "weather", "nature", "gardening", "large construction"]):
        codes.append("OUTDOOR_LEARNING")
    if "Continuous Provision" in text:
        codes.append("CONTINUOUS_PROVISION")
    return codes


def build_item(config: dict, week_no: int, title: str, body: str) -> dict:
    source_section = f"Nursery {config['termName']} / Week {week_no} - {title}"
    code_prefix = f"AMES-EYFS-NURSERY-{config['termCode']}-W{week_no:02d}"
    return {
        "code": f"{code_prefix}-INT-01",
        "eyfsArea": PRIMARY_AREAS.get(title, "COMMUNICATION_LANGUAGE"),
        "title": config["weekDevelopments"].get(week_no, title),
        "learningIntent": first_sentence(body),
        "learningContent": body,
        "keyVocabulary": extract_vocabulary(body),
        "teachingGuidance": sentence_with_any(body, ("Adults", "Use", "No formal", "Do not", "Never", "Formal", "Encourage", "Teach")),
        "suggestedExperiences": [],
        "resources": [],
        "outdoorLearning": sentence_with_any(body, ("outdoor", "outside", "weather", "nature", "gardening")),
        "practicalLife": extract_practical_life(body),
        "montessoriPractice": "",
        "christianCharacter": extract_character(body),
        "nigerianAfricanContext": sentence_with_any(body, ("Owo", "Nigeria", "Nigerian", "Yoruba", "Africa", "African", "local")),
        "continuousProvision": "",
        "sendAccess": "",
        "parentHomeConnection": sentence_with_any(body, ("family", "home", "parent")),
        "assessmentFocus": sentence_with_any(body, ("Observe", "Review", "Assessment", "Revisit")),
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
        source_section = f"Nursery {config['termName']} / Week {week_no} - {title}"
        code_prefix = f"AMES-EYFS-NURSERY-{config['termCode']}-W{week_no:02d}"
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
        "classLevelCode": "NURSERY",
        "className": "Nursery",
        "termName": config["termName"],
        "title": f"Nursery {config['termName']}",
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
