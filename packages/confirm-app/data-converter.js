import fs from 'fs'
import path from 'path'

/**
 * Data converter to transform site-app extraction output to confirm-app format
 */

interface SiteAppTruthData {
  business_id: string
  domain: string
  crawled_at: string
  pages_visited: number
  fields: Record<string, {
    value: any
    confidence: number
    provenance: Array<{
      url: string
      path: string
    }>
    notes: string
  }>
  candidates: Record<string, any[]>
}

interface SiteAppCrawlData {
  start_url: string
  domain: string
  pages_attempted: number
  pages_successful: number
  pages_failed: number
  pages_cached: number
  total_bytes: number
  total_time_ms: number
  failed_urls: string[]
  pages: Array<{
    url: string
    title: string
    success: boolean
    status_code: number
    depth: number
    elapsed_ms: number
    from_cache: boolean
  }>
}

interface PackBundle {
  slug: string
  truthTable: {
    table: Record<string, {
      value: any
      confidence: number
      provenance: Array<{
        url: string
        method: string
      }>
    }>
  }
  images: Array<{
    id: string
    pageSlug: string
    src: string
    alt?: string
    description?: string
    width?: number
    height?: number
    aspect?: number
    placement: {
      zone: string
      targetRefId?: string
      confidence: number
      reasoning?: string
    }
    source: string
    license?: string
    attribution?: string
  }>
  paragraphs: Array<{
    text: string
    type: string
    level?: number
    wordCount: number
  }>
  navbar: Array<{
    text: string
    href: string
    isExternal?: boolean
    depth?: number
  }>
  misc: {
    meta: {
      title?: string
      description?: string
      keywords?: string[]
      author?: string
      robots?: string
    }
    links: {
      internal: string[]
      external: string[]
    }
    diagnostics: {
      wordCount: number
      readabilityScore?: number
      hasSchemaOrg?: boolean
      hasOpenGraph?: boolean
    }
  }
  metadata: {
    extractedAt: string
    sourceUrl: string
    pageCount: number
    version: string
  }
}

/**
 * Convert site-app truth data to confirm-app format
 */
function convertTruthData(truthData: SiteAppTruthData): PackBundle['truthTable'] {
  const table: PackBundle['truthTable']['table'] = {}
  
  for (const [fieldName, fieldData] of Object.entries(truthData.fields)) {
    table[fieldName] = {
      value: fieldData.value,
      confidence: fieldData.confidence,
      provenance: fieldData.provenance.map(p => ({
        url: p.url,
        method: p.path
      }))
    }
  }
  
  return { table }
}

/**
 * Extract images from truth data (logo and social media images)
 */
function extractImagesFromTruthData(truthData: SiteAppTruthData): PackBundle['images'] {
  const images: PackBundle['images'] = []
  
  // Add logo image
  if (truthData.fields.logo?.value) {
    const logoValue = truthData.fields.logo.value
    const logoUrl = logoValue.startsWith('http') ? logoValue : `https://${truthData.domain}/${logoValue}`
    
    images.push({
      id: 'logo-1',
      pageSlug: 'home',
      src: logoUrl,
      alt: 'Company Logo',
      description: truthData.fields.brand_name?.value || 'Company Logo',
      placement: {
        zone: 'logo',
        confidence: truthData.fields.logo.confidence,
        reasoning: 'Extracted logo from meta tags'
      },
      source: 'extracted',
      license: 'unknown'
    })
  }
  
  // Add social media images from candidates
  if (truthData.candidates.logo) {
    truthData.candidates.logo.forEach((logo, index) => {
      if (logo.value && logo.value.startsWith('http')) {
        images.push({
          id: `logo-candidate-${index}`,
          pageSlug: 'home',
          src: logo.value,
          alt: 'Logo Candidate',
          description: `Logo candidate ${index + 1}`,
          placement: {
            zone: 'logo',
            confidence: logo.score,
            reasoning: 'Logo candidate from extraction'
          },
          source: 'extracted',
          license: 'unknown'
        })
      }
    })
  }
  
  return images
}

/**
 * Extract paragraphs from truth data
 */
function extractParagraphsFromTruthData(truthData: SiteAppTruthData): PackBundle['paragraphs'] {
  const paragraphs: PackBundle['paragraphs'] = []
  
  // Add brand name as heading
  if (truthData.fields.brand_name?.value) {
    paragraphs.push({
      text: truthData.fields.brand_name.value,
      type: 'heading',
      level: 1,
      wordCount: truthData.fields.brand_name.value.split(' ').length
    })
  }
  
  // Add background/description as paragraph
  if (truthData.fields.background?.value) {
    paragraphs.push({
      text: truthData.fields.background.value,
      type: 'paragraph',
      wordCount: truthData.fields.background.value.split(' ').length
    })
  }
  
  // Add services as list
  if (truthData.fields.services?.value && Array.isArray(truthData.fields.services.value)) {
    const servicesText = truthData.fields.services.value.map(service => `• ${service}`).join('\n')
    paragraphs.push({
      text: servicesText,
      type: 'list',
      wordCount: servicesText.split(' ').length
    })
  }
  
  return paragraphs
}

/**
 * Extract navigation from crawl data
 */
function extractNavbarFromCrawlData(crawlData: SiteAppCrawlData): PackBundle['navbar'] {
  const navbar: PackBundle['navbar'] = []
  
  // Extract navigation from crawled pages
  crawlData.pages.forEach(page => {
    if (page.success && page.depth <= 1) {
      const pathname = new URL(page.url).pathname
      if (pathname === '/') {
        navbar.push({
          text: 'Home',
          href: page.url,
          isExternal: false,
          depth: page.depth
        })
      } else if (pathname === '/about/') {
        navbar.push({
          text: 'About',
          href: page.url,
          isExternal: false,
          depth: page.depth
        })
      } else if (pathname === '/contact/') {
        navbar.push({
          text: 'Contact',
          href: page.url,
          isExternal: false,
          depth: page.depth
        })
      } else if (pathname === '/portfolio/') {
        navbar.push({
          text: 'Portfolio',
          href: page.url,
          isExternal: false,
          depth: page.depth
        })
      }
    }
  })
  
  return navbar
}

/**
 * Extract miscellaneous data
 */
function extractMiscData(truthData: SiteAppTruthData, crawlData: SiteAppCrawlData): PackBundle['misc'] {
  const socials = truthData.fields.socials?.value || {}
  const socialLinks = Object.values(socials).filter(link => link && typeof link === 'string')
  
  return {
    meta: {
      title: crawlData.pages[0]?.title || truthData.fields.brand_name?.value,
      description: truthData.fields.background?.value,
      keywords: truthData.fields.services?.value || [],
      author: truthData.fields.brand_name?.value,
      robots: 'index, follow'
    },
    links: {
      internal: crawlData.pages.filter(p => p.success).map(p => p.url),
      external: socialLinks
    },
    diagnostics: {
      wordCount: truthData.fields.background?.value?.split(' ').length || 0,
      readabilityScore: 75,
      hasSchemaOrg: false,
      hasOpenGraph: true
    }
  }
}

/**
 * Convert site-app data to confirm-app PackBundle format
 */
export function convertSiteAppDataToPackBundle(
  domain: string,
  truthData: SiteAppTruthData,
  crawlData: SiteAppCrawlData
): PackBundle {
  const slug = domain.replace(/\./g, '-')
  
  return {
    slug,
    truthTable: convertTruthData(truthData),
    images: extractImagesFromTruthData(truthData),
    paragraphs: extractParagraphsFromTruthData(truthData),
    navbar: extractNavbarFromCrawlData(crawlData),
    misc: extractMiscData(truthData, crawlData),
    metadata: {
      extractedAt: truthData.crawled_at,
      sourceUrl: crawlData.start_url,
      pageCount: crawlData.pages_successful,
      version: '2.0.0'
    }
  }
}

/**
 * Load and convert all site-app extraction data
 */
export function loadSiteAppData(): PackBundle[] {
  const siteAppOutDir = path.join(process.cwd(), 'packages', 'site-app', 'out')
  const bundles: PackBundle[] = []
  
  if (!fs.existsSync(siteAppOutDir)) {
    console.log('No site-app extraction data found')
    return bundles
  }
  
  // Find all domain directories
  const domains = fs.readdirSync(siteAppOutDir).filter(item => {
    const itemPath = path.join(siteAppOutDir, item)
    return fs.statSync(itemPath).isDirectory()
  })
  
  for (const domain of domains) {
    const domainDir = path.join(siteAppOutDir, domain)
    const truthFile = path.join(domainDir, 'truth.json')
    const crawlFile = path.join(domainDir, 'crawl.json')
    
    if (fs.existsSync(truthFile) && fs.existsSync(crawlFile)) {
      try {
        const truthData: SiteAppTruthData = JSON.parse(fs.readFileSync(truthFile, 'utf8'))
        const crawlData: SiteAppCrawlData = JSON.parse(fs.readFileSync(crawlFile, 'utf8'))
        
        const bundle = convertSiteAppDataToPackBundle(domain, truthData, crawlData)
        bundles.push(bundle)
        
        console.log(`✅ Converted data for ${domain}`)
      } catch (error) {
        console.error(`❌ Failed to convert data for ${domain}:`, error)
      }
    }
  }
  
  return bundles
}

/**
 * Write converted data to confirm-app format
 */
export function writeConvertedData(bundles: PackBundle[]): void {
  const confirmAppDir = path.join(process.cwd(), 'packages', 'confirm-app', 'build', 'extract', 'pages')
  
  // Ensure directory exists
  if (!fs.existsSync(confirmAppDir)) {
    fs.mkdirSync(confirmAppDir, { recursive: true })
  }
  
  for (const bundle of bundles) {
    const outputFile = path.join(confirmAppDir, `${bundle.slug}.page.json`)
    fs.writeFileSync(outputFile, JSON.stringify(bundle, null, 2))
    console.log(`📝 Wrote ${outputFile}`)
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔄 Converting site-app data to confirm-app format...')
  
  const bundles = loadSiteAppData()
  
  if (bundles.length > 0) {
    writeConvertedData(bundles)
    console.log(`✅ Converted ${bundles.length} bundles successfully`)
  } else {
    console.log('ℹ️  No extraction data found to convert')
  }
}

