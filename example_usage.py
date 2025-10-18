#!/usr/bin/env python3
"""
Example usage of Truth Extractor as a Python library.
"""

import logging
from pathlib import Path

from truth_extractor.config import Config
from truth_extractor.orchestrator import TruthExtractor

# Setup logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)


def main():
    """Example: Extract business information from a website."""
    
    # Configure the extractor
    config = Config()
    config.output_dir = "output"
    config.crawl.max_pages = 15
    config.crawl.timeout = 10
    
    # Create extractor
    extractor = TruthExtractor(config)
    
    # Example URL (replace with actual business website)
    url = "https://example.com"
    
    print(f"Extracting truth record from {url}...")
    print("=" * 60)
    
    try:
        # Extract
        result = extractor.extract(url)
        
        # Display results
        print("\nExtraction Results:")
        print("-" * 60)
        
        fields = result["fields"]
        
        print(f"\n🏢 Business Name: {fields['brand_name']['value']}")
        print(f"   Confidence: {fields['brand_name']['confidence']:.2f}")
        
        if fields['email']['value']:
            print(f"\n📧 Email: {fields['email']['value']}")
            print(f"   Confidence: {fields['email']['confidence']:.2f}")
        
        if fields['phone']['value']:
            print(f"\n📞 Phone: {fields['phone']['value']}")
            print(f"   Confidence: {fields['phone']['confidence']:.2f}")
        
        if fields['location']['value']:
            loc = fields['location']['value']
            print(f"\n📍 Location: {loc.get('formatted', 'N/A')}")
            print(f"   Confidence: {fields['location']['confidence']:.2f}")
        
        if fields['services']['value']:
            services = fields['services']['value']
            print(f"\n🔧 Services ({len(services)}):")
            for service in services:
                print(f"   - {service}")
        
        if fields['brand_colors']['value']:
            colors = fields['brand_colors']['value']
            print(f"\n🎨 Brand Colors: {', '.join(colors)}")
            print(f"   Confidence: {fields['brand_colors']['confidence']:.2f}")
        
        if fields['logo']['value']:
            print(f"\n🖼️  Logo: {fields['logo']['value']}")
            print(f"   Confidence: {fields['logo']['confidence']:.2f}")
        
        if fields['background']['value']:
            print(f"\n📝 Background: {fields['background']['value'][:100]}...")
        
        if fields['slogan']['value']:
            print(f"\n💬 Slogan: {fields['slogan']['value']}")
        
        socials = fields['socials']['value']
        if socials:
            print(f"\n🔗 Social Media:")
            for platform, url in socials.items():
                if url:
                    print(f"   {platform.capitalize()}: {url}")
        
        print("\n" + "=" * 60)
        print(f"✅ Complete! Pages crawled: {result['pages_visited']}")
        print(f"📁 Output saved to: {config.output_dir}/")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()


