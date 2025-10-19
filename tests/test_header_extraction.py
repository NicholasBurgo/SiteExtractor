import requests
from bs4 import BeautifulSoup
from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.brand_name import BrandNameExtractor

r = requests.get('https://www.northshoreexteriorupkeep.com/')
parser = HTMLParser(r.text, 'https://www.northshoreexteriorupkeep.com/')
extractor = BrandNameExtractor(parser)

print("=== Testing extract_from_header() ===\n")

# Check header
header = parser.soup.find("header")
print(f"Has <header> tag: {header is not None}")

if header:
    h1 = header.find("h1")
    print(f"H1 in header: {h1.get_text(strip=True) if h1 else 'None'}")
else:
    print("\nNo <header> tag found! Checking all H1s...")
    h1s = parser.soup.find_all("h1")
    for i, h1 in enumerate(h1s, 1):
        text = h1.get_text(strip=True)
        print(f"  H1 #{i}: '{text}'")
        print(f"    Passes validation: {BrandNameExtractor._looks_like_business_name(text)}")

print("\n=== Running extract_from_header() ===")
candidates = extractor.extract_from_header()
print(f"Candidates found: {len(candidates)}")
for cand in candidates:
    print(f"  - '{cand.value}' (score: {cand.score:.2f})")



