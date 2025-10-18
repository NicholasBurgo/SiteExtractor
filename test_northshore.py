import requests
import re
from bs4 import BeautifulSoup

r = requests.get('https://www.northshoreexteriorupkeep.com/')
soup = BeautifulSoup(r.text, 'lxml')

print("=== PAGE ANALYSIS ===\n")

# Title
title = soup.find('title')
print(f"Title: {title.string if title else 'None'}")

# H1
h1s = soup.find_all('h1')
print(f"\nH1 tags ({len(h1s)}):")
for h1 in h1s:
    print(f"  - '{h1.get_text(strip=True)}'")

# H2
h2s = soup.find_all('h2')
print(f"\nH2 tags ({len(h2s)}):")
for h2 in h2s[:5]:
    print(f"  - '{h2.get_text(strip=True)}'")

# Test brand name extraction
from truth_extractor.extraction.brand_name import BrandNameExtractor
from truth_extractor.crawl.parser import HTMLParser

parser = HTMLParser(r.text, 'https://www.northshoreexteriorupkeep.com/')
extractor = BrandNameExtractor(parser)

print("\n=== BRAND NAME EXTRACTION ===\n")
candidates = []
candidates.extend(extractor.extract_from_title())
candidates.extend(extractor.extract_from_og_title())
candidates.extend(extractor.extract_from_header())

print(f"Total candidates found: {len(candidates)}")
for i, cand in enumerate(candidates, 1):
    print(f"{i}. '{cand.value}' (score: {cand.score:.2f}, from: {cand.provenance[0].path if cand.provenance else 'unknown'})")



