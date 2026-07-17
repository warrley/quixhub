import zipfile
import xml.etree.ElementTree as ET
import json
import collections

ods_path = '/home/warley/Downloads/trash/estudantes-matriculados-graduacao.ods'

def parse_ods(filepath):
    with zipfile.ZipFile(filepath, 'r') as z:
        content = z.read('content.xml')
    
    root = ET.fromstring(content)
    ns = {
        'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
        'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
        'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'
    }
    
    body = root.find('office:body', ns)
    spreadsheet = body.find('office:spreadsheet', ns)
    
    data = []
    # Search all sheets just in case
    for table in spreadsheet.findall('table:table', ns):
        for row in table.findall('table:table-row', ns):
            row_data = []
            for cell in row.findall('table:table-cell', ns):
                repeat = int(cell.attrib.get(f"{{{ns['table']}}}number-columns-repeated", 1))
                p = cell.find('text:p', ns)
                val = p.text if p is not None and p.text is not None else ""
                for _ in range(min(repeat, 100)): # prevent memory issues with empty cells repeating 1000s of times
                    row_data.append(val.strip())
            
            # Trim trailing empty strings
            while row_data and not row_data[-1]:
                row_data.pop()
                
            if row_data:
                data.append(row_data)
    return data

data = parse_ods(ods_path)

idx_curso = 2
idx_campus = 5
idx_unidade = 6
idx_ano_ing = 7
idx_sem_ing = 8

# Filter for Quixada
quixada_rows = []
for row in data:
    # Ensure row has enough columns
    if len(row) <= idx_sem_ing: continue
    
    campus = row[idx_campus] if len(row) > idx_campus else ""
    unidade = row[idx_unidade] if len(row) > idx_unidade else ""
    
    if 'quixad' in campus.lower() or 'quixad' in unidade.lower():
        quixada_rows.append(row)

print(f"Found {len(quixada_rows)} students for Quixada.")

grouped = collections.defaultdict(lambda: collections.defaultdict(int))

for row in quixada_rows:
    curso = row[idx_curso]
    ano = row[idx_ano_ing]
    sem = row[idx_sem_ing]
    
    if not curso or not ano or not sem: continue
    
    semestre_entrada = f"{ano}.{sem}"
    grouped[curso][semestre_entrada] += 1

result = {
    curso: dict(sorted(semestres.items())) 
    for curso, semestres in sorted(grouped.items())
}

out_path = '/home/warley/development/projects/quixhub/data/quixada_analise.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Analysis saved to {out_path}")
