#!/usr/bin/env node

/**
 * Test script to verify extraction functionality
 * This script tests the extraction process with a sample HTML page
 */

import { loadHtml } from './src/core/htmlLoader.js'
import { extractImages } from './src/extractors/images.js'
import { extractNavbar } from './src/extractors/navbar.js'
import { extractParagraphs } from './src/extractors/paragraphs.js'
import { extractMiscData } from './src/extractors/misc.js'
import { extractTruthTable } from './src/extractors/truthTable.js'
import { writeJsonFile, ensureDirectoryExists } from './src/utils/file.js'

// Sample HTML content for testing
const sampleHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tula's Lawn Service LLC - Professional Lawn Care</title>
    <meta name="description" content="Professional lawn care and landscaping services in your area. Contact us for mowing, trimming, and maintenance.">
    <meta name="keywords" content="lawn care, landscaping, mowing, trimming, maintenance">
    <meta name="author" content="Tula's Lawn Service LLC">
</head>
<body>
    <header>
        <nav>
            <img src="/logo.png" alt="Tula's Lawn Service LLC Logo" class="logo" width="200" height="200">
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section class="hero">
            <img src="/hero-image.jpg" alt="Professional lawn care service" width="800" height="600" class="hero-image">
            <h1>Welcome to Tula's Lawn Service LLC</h1>
            <p>Your trusted partner for professional lawn care and landscaping services.</p>
        </section>
        
        <section class="services">
            <h2>Our Services</h2>
            <div class="service-grid">
                <div class="service-item">
                    <img src="/mowing.jpg" alt="Lawn mowing service" width="400" height="300">
                    <h3>Lawn Mowing</h3>
                    <p>Professional weekly lawn mowing and trimming services.</p>
                </div>
                <div class="service-item">
                    <img src="/trimming.jpg" alt="Hedge trimming service" width="400" height="300">
                    <h3>Hedge Trimming</h3>
                    <p>Expert hedge trimming and shrub maintenance.</p>
                </div>
            </div>
        </section>
        
        <section class="about">
            <h2>About Our Team</h2>
            <div class="team-grid">
                <div class="team-member">
                    <img src="/team-member-1.jpg" alt="Team member" width="150" height="150" class="team-photo">
                    <h3>John Smith</h3>
                    <p>Lead Lawn Care Specialist</p>
                </div>
                <div class="team-member">
                    <img src="/team-member-2.jpg" alt="Team member" width="150" height="150" class="team-photo">
                    <h3>Sarah Johnson</h3>
                    <p>Landscaping Expert</p>
                </div>
            </div>
        </section>
        
        <section class="contact">
            <h2>Contact Us</h2>
            <p>Email: info@toulaslawnservicellc.com</p>
            <p>Phone: (555) 123-4567</p>
            <p>Address: 123 Lawn Care Lane, Green City, GC 12345</p>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 Tula's Lawn Service LLC. All rights reserved.</p>
    </footer>
</body>
</html>
`

async function testExtraction() {
  console.log('🧪 Testing extraction functionality...')
  
  try {
    // Load and normalize HTML
    const normalizedHtml = loadHtml(sampleHtml, 'https://toulaslawnservicellc.com')
    console.log('✅ HTML loaded and normalized')
    
    // Extract images
    const images = await extractImages(normalizedHtml.$, 'https://toulaslawnservicellc.com', {
      pageSlug: 'home'
    })
    console.log(`✅ Extracted ${images.length} images`)
    
    // Extract navbar
    const navbar = extractNavbar(normalizedHtml.$, 'https://toulaslawnservicellc.com')
    console.log(`✅ Extracted ${navbar.length} navigation items`)
    
    // Extract paragraphs
    const paragraphs = extractParagraphs(normalizedHtml.$)
    console.log(`✅ Extracted ${paragraphs.length} paragraphs`)
    
    // Extract misc data
    const misc = extractMiscData(normalizedHtml.$, 'https://toulaslawnservicellc.com')
    console.log('✅ Extracted miscellaneous data')
    
    // Extract truth table
    const truthTable = await extractTruthTable(normalizedHtml.$, 'https://toulaslawnservicellc.com')
    console.log('✅ Extracted truth table data')
    
    // Create pack bundle
    const packBundle = {
      slug: 'home',
      truthTable,
      images,
      paragraphs,
      navbar,
      misc,
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceUrl: 'https://toulaslawnservicellc.com',
        pageCount: 1,
        version: '2.0.0'
      }
    }
    
    // Ensure output directory exists
    ensureDirectoryExists('./build/extract/pages')
    
    // Write test output
    writeJsonFile('./build/extract/pages/home.page.json', packBundle)
    console.log('✅ Test data written to build/extract/pages/home.page.json')
    
    // Print summary
    console.log('\n📊 Extraction Summary:')
    console.log(`- Images: ${images.length}`)
    console.log(`- Navigation items: ${navbar.length}`)
    console.log(`- Paragraphs: ${paragraphs.length}`)
    console.log(`- Truth table fields: ${Object.keys(truthTable.table).length}`)
    
    // Print image details
    if (images.length > 0) {
      console.log('\n🖼️  Extracted Images:')
      images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.alt || 'No alt text'} (${img.placement.zone}, ${Math.round(img.placement.confidence * 100)}%)`)
      })
    }
    
    console.log('\n🎉 Extraction test completed successfully!')
    
  } catch (error) {
    console.error('❌ Extraction test failed:', error)
    process.exit(1)
  }
}

// Run the test
testExtraction()

