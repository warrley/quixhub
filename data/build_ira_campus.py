"""Builds frontend/src/data/iraCampus.json from the campus IRA export.

Usage:
    python3 data/build_ira_campus.py [path/to/IRA.csv]

Default input: data/raw/IRA.csv (gitignored — the raw export never goes
into the repository).

Input columns (SIGAA export, one row per student, no name/matrícula):
    Curso, Período, IRA-I, IRA-G, Status, Ingresso

What goes out (and why it's safe to commit):
    - students: one compact row per student — [courseIdx, ingresso, status,
      ira] with ira rounded to 4 decimals (exact SIGAA precision). No
      Período, no IRA-G, no identifiers, rows sorted by IRA. The ranking
      needs per-student values (top 5 + your exact position), which no
      histogram can give.
    - graduation: semesters-to-graduate counts for CONCLUÍDO students,
      aggregated by course × IRA band (0.5 wide) — never per student,
      since ingresso + duration would reveal the graduation semester.

Students with IRA 0 are dropped: in the export they're ativos whose IRA
hasn't been computed yet (no closed semester), not real zeros.
"""

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / 'data' / 'raw' / 'IRA.csv'
OUTPUT = ROOT / 'frontend' / 'src' / 'data' / 'iraCampus.json'

# SIGAA name → app display name (same strings as the cadastro options).
COURSE_NAMES = {
    'CIÊNCIA DA COMPUTAÇÃO': 'Ciência da Computação',
    'DESIGN DIGITAL': 'Design Digital',
    'ENGENHARIA DE COMPUTAÇÃO': 'Engenharia de Computação',
    'ENGENHARIA DE SOFTWARE': 'Engenharia de Software',
    'INTELIGÊNCIA ARTIFICIAL': 'Inteligência Artificial',
    'REDES DE COMPUTADORES': 'Redes de Computadores',
    'SISTEMAS DE INFORMAÇÃO': 'Sistemas de Informação',
}

# 0 = ativo (still enrolled, incl. formando/graduando), 1 = formado, 2 = trancado
STATUS = {'ATIVO': 0, 'FORMANDO': 0, 'GRADUANDO': 0, 'CONCLUÍDO': 1, 'TRANCADO': 2}

GRADUATION_BAND = 0.5


def parse_semester(value: str) -> tuple[int, int]:
    match = re.match(r'^\s*(\d{4})\.?(\d)?', value)
    if not match:
        raise ValueError(f'semestre inválido: {value!r}')
    return int(match.group(1)), int(match.group(2) or 1)


def semester_index(value: str) -> int:
    year, period = parse_semester(value)
    return year * 2 + (period - 1)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    with src.open(encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    courses = sorted(COURSE_NAMES.values())
    course_idx = {name: i for i, name in enumerate(courses)}

    students = []
    graduation: dict[str, dict[str, dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    latest = 0
    skipped = 0

    for r in rows:
        sigaa_course = r['Curso'].split('/')[0].strip()
        course = COURSE_NAMES[sigaa_course]
        ira = float(r['IRA-I'])
        status = STATUS[r['Status'].strip()]
        year, period = parse_semester(r['Ingresso'])
        latest = max(latest, semester_index(r['Período']))
        if ira <= 0:
            skipped += 1
            continue
        students.append([course_idx[course], year * 10 + period, status, round(ira, 4)])

        if status == 1:
            duration = semester_index(r['Período']) - semester_index(r['Ingresso']) + 1
            band = f'{int(ira / GRADUATION_BAND) * GRADUATION_BAND:.1f}'
            for key in (course, 'Campus'):
                graduation[key][band][str(duration)] += 1

    students.sort(key=lambda s: (-s[3], s[0], s[1], s[2]))
    reference = f'{latest // 2}.{latest % 2 + 1}'

    out = {
        'updatedAt': reference,
        'courses': courses,
        'students': students,
        'graduation': {k: {b: dict(sorted(d.items(), key=lambda kv: int(kv[0]))) for b, d in sorted(v.items())} for k, v in sorted(graduation.items())},
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(students)} alunos ({skipped} sem IRA ignorados), referência {reference} → {OUTPUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
