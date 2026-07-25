import zipfile
import xml.etree.ElementTree as ET

def extract_text_from_docx(docx_path):
    try:
        document = zipfile.ZipFile(docx_path)
        xml_content = document.read('word/document.xml')
        document.close()
        tree = ET.XML(xml_content)
        
        paragraphs = []
        for paragraph in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        return paragraphs
    except Exception as e:
        return [str(e)]

paragraphs = extract_text_from_docx(r"f:\360 Star Solutions\SRS - 360 Star Solutions.docx")

# Look for the section specifically
for i, p in enumerate(paragraphs):
    if "14.10" in p or "User Dashboard" in p:
        print(f"--- MATCH FOUND AT INDEX {i}: {p} ---")
        start = max(0, i)
        end = min(len(paragraphs), i + 20)
        for j in range(start, end):
            print(f"[{j}]: {paragraphs[j]}")
        print("-------------------------------")
