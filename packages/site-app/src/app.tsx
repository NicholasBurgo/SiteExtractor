import React, { useEffect, useState } from 'react';
import { Form } from './components/Form';
import { Progress } from './components/Progress';
import { ConfirmationPanel } from './components/ConfirmationPanel';
import './styles.css';

type Status = 'idle' | 'running' | 'success' | 'confirmation' | 'error';
type Step = 'extract' | 'confirm';

export default function App() {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [step, setStep] = useState<Step>('extract');
  const [outputPath, setOutputPath] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  useEffect(() => {
    window.SG.onLog((line: string) => {
      setLines(prev => [...prev.slice(-199), line]); // Keep last 200 lines
    });

    return () => {
      window.SG.removeLogListener();
    };
  }, []);

  const runPipeline = async (opts: { url: string; out: string; base: string; pages: number; noLLM: boolean }) => {
    setStatus('running');
    setLines([]);
    setOutputPath(opts.out);

    try {
      const result = await window.SG.runPipeline(opts);
      
      if (result.code === 0) {
        setStatus('success');
        // Use the actual output path returned from the pipeline
        if (result.outputPath) {
          setOutputPath(result.outputPath);
        }
        
        // IMPORTANT: Wait a bit for file system to flush
        console.log('Extraction completed, waiting for files to be written...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Load the extracted data for confirmation
        try {
          const outputPathToUse = result.outputPath || opts.out;
          console.log('=== LOADING TRUTH DATA ===');
          console.log('Output path:', outputPathToUse);
          console.log('URL was:', opts.url);
          
          // Extract domain from URL to construct the correct path
          let domain = 'unknown';
          try {
            const urlObj = new URL(opts.url);
            domain = urlObj.hostname;
            // Remove www. prefix if present
            if (domain.startsWith('www.')) {
              domain = domain.substring(4);
            }
          } catch (e) {
            console.warn('Failed to parse URL:', opts.url, e);
          }
          
          console.log('Extracted domain:', domain);
          console.log('=== PATH CONSTRUCTION DEBUG ===');
          console.log('Output path to use:', outputPathToUse);
          console.log('Domain extracted:', domain);
          
          // First, try to load truth data directly (with retries)
          let truthData = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (!truthData && attempts < maxAttempts) {
            attempts++;
            console.log(`Attempt ${attempts}/${maxAttempts} to load truth data...`);
            // Construct the full path to the domain-specific truth.json
            const truthDataPath = `${outputPathToUse}/${domain}/truth.json`;
            console.log('Loading truth data from:', truthDataPath);
            console.log('Full constructed path:', truthDataPath);
            truthData = await window.SG.loadTruthData(truthDataPath);
            
            if (!truthData && attempts < maxAttempts) {
              console.log('Not found yet, waiting 500ms...');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          console.log('Truth data loaded:', truthData ? 'SUCCESS' : 'FAILED');
          
          if (truthData) {
            console.log('=== LOADED TRUTH DATA DEBUG ===');
            console.log('Truth data structure:', {
              business_id: truthData.business_id,
              domain: truthData.domain,
              pages_visited: truthData.pages_visited,
              hasFields: !!truthData.fields,
              fieldKeys: truthData.fields ? Object.keys(truthData.fields) : []
            });
            console.log('Brand name from loaded data:', truthData.fields?.brand_name?.value);
            console.log('Email from loaded data:', truthData.fields?.email?.value);
            
            // Extract images from truth data
            const images = [];
            
            console.log('=== EXTRACTING IMAGES FROM TRUTH DATA ===');
            console.log('Truth data fields:', truthData.fields);
            console.log('Logo field:', truthData.fields?.logo);
            console.log('Logo value:', truthData.fields?.logo?.value);
            console.log('Logo candidates:', truthData.candidates?.logo);
            console.log('Logo candidates length:', truthData.candidates?.logo?.length || 0);
            
            // Add logo images from truth data
            if (truthData.fields.logo?.value) {
              const logoValue = truthData.fields.logo.value;
              let logoUrl = logoValue;
              
              // Handle different logo value formats
              if (logoValue.startsWith('http')) {
                // Already a full URL
                logoUrl = logoValue;
              } else if (logoValue.startsWith('assets')) {
                // Local asset path - load the actual downloaded file
                const domain = truthData.domain || new URL(opts.url).hostname;
                const outputPath = result.outputPath || opts.out || './out';
                
                // Construct the full path to the downloaded asset
                // Normalize path separators for cross-platform compatibility
                const normalizedLogoPath = logoValue.replace(/\\/g, '/');
                const assetPath = `${outputPath}/${domain}/${normalizedLogoPath}`;
                
                console.log('Loading local asset from:', assetPath);
                
                // Try to load the file and convert to data URL
                try {
                  const imageData = await window.SG.loadImageAsDataUrl(assetPath);
                  if (imageData) {
                    logoUrl = imageData;
                    console.log('Successfully loaded local asset as data URL');
                  } else {
                    console.log('Failed to load as data URL, trying fallback...');
                    // Try the original URL from candidates as fallback
                    if (truthData.candidates?.logo && truthData.candidates.logo.length > 0) {
                      logoUrl = truthData.candidates.logo[0].value;
                      console.log('Using fallback URL from candidates:', logoUrl);
                    } else {
                      // Try to construct URL from domain and asset path
                      logoUrl = `https://${truthData.domain}/${normalizedLogoPath}`;
                      console.log('Using constructed URL:', logoUrl);
                    }
                  }
                } catch (err) {
                  console.error('Failed to load local asset:', err);
                  // Last resort: try the original URL from provenance
                  if (truthData.candidates?.logo && truthData.candidates.logo.length > 0) {
                    logoUrl = truthData.candidates.logo[0].value;
                    console.log('Using fallback URL from candidates:', logoUrl);
                  } else {
                    // Try to construct URL from domain and asset path
                    logoUrl = `https://${truthData.domain}/${normalizedLogoPath}`;
                    console.log('Using constructed URL as final fallback:', logoUrl);
                  }
                }
              } else if (logoValue.startsWith('/')) {
                // Absolute path on the domain
                logoUrl = `https://${truthData.domain}${logoValue}`;
              } else {
                // Relative path
                logoUrl = `https://${truthData.domain}/${logoValue}`;
              }
              
              console.log('Adding main logo:', logoUrl);
              
              // Extract page information from provenance for main logo
              let mainLogoPageSlug = 'home';
              if (truthData.fields.logo.provenance && truthData.fields.logo.provenance.length > 0) {
                const provenance = truthData.fields.logo.provenance[0];
                if (provenance.url) {
                  try {
                    const pageUrl = new URL(provenance.url);
                    const pathname = pageUrl.pathname;
                    if (pathname === '/' || pathname === '') {
                      mainLogoPageSlug = 'home';
                    } else {
                      const segments = pathname.split('/').filter(s => s);
                      if (segments.length > 0) {
                        mainLogoPageSlug = segments[0];
                      } else {
                        mainLogoPageSlug = 'home';
                      }
                    }
                  } catch (e) {
                    mainLogoPageSlug = 'home';
                  }
                }
              }
              
              images.push({
                id: 'logo-main',
                src: logoUrl,
                alt: 'Company Logo',
                description: truthData.fields.brand_name?.value || 'Company Logo',
                pageSlug: mainLogoPageSlug,
                width: 200,
                height: 200,
                format: 'jpg',
                placement: {
                  zone: 'logo',
                  confidence: truthData.fields.logo.confidence,
                  reasoning: 'Extracted logo from meta tags'
                },
                source: 'extracted' as const,
                status: 'pending' as const
              });
            }
            
            // Add all images from truth data - these have HTTP URLs and page information!
            if (truthData.candidates?.images && Array.isArray(truthData.candidates.images)) {
              console.log('Processing all images:', truthData.candidates.images.length);
              
              // Sort candidates by score (highest first) and take the best ones
              const sortedImages = [...truthData.candidates.images]
                .filter(image => image.value && typeof image.value === 'string')
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 20); // Take top 20 images
              
              sortedImages.forEach((image: any, index: number) => {
                if (image.value.startsWith('http')) {
                  console.log(`Adding image ${index}:`, image.value);
                  
                  // Extract page information from provenance
                  let pageSlug = 'home';
                  if (image.provenance && image.provenance.length > 0) {
                    const provenance = image.provenance[0];
                    if (provenance.url) {
                      try {
                        const pageUrl = new URL(provenance.url);
                        const pathname = pageUrl.pathname;
                        if (pathname === '/' || pathname === '') {
                          pageSlug = 'home';
                        } else {
                          // Extract page name from path
                          const segments = pathname.split('/').filter(s => s);
                          if (segments.length > 0) {
                            pageSlug = segments[0];
                          } else {
                            pageSlug = 'home';
                          }
                        }
                      } catch (e) {
                        pageSlug = 'home';
                      }
                    }
                  }
                  
                  // Extract zone information from notes
                  const notes = image.notes || '';
                  const zoneMatch = notes.match(/\b(hero|logo|gallery|service|team|testimonial|product|footer|unknown)\b/);
                  const zone = zoneMatch ? zoneMatch[1] : 'unknown';
                  
                  images.push({
                    id: `image-${index}`,
                    src: image.value,
                    alt: `Image ${index + 1}`,
                    description: `${zone} image from ${new URL(image.value).hostname} (score: ${Math.round((image.score || 0) * 100)}%)`,
                    pageSlug: pageSlug,
                    width: 200,
                    height: 200,
                    format: image.value.split('.').pop()?.toLowerCase() || 'jpg',
                    placement: {
                      zone: zone,
                      confidence: image.score || 0.5,
                      reasoning: image.notes || 'Image from extraction'
                    },
                    source: 'extracted' as const,
                    status: 'pending' as const
                  });
                }
              });
            }
            
            // Also add logo candidates from truth data for backward compatibility
            if (truthData.candidates?.logo && Array.isArray(truthData.candidates.logo)) {
              console.log('Processing logo candidates:', truthData.candidates.logo.length);
              
              // Sort candidates by score (highest first) and take the best ones
              const sortedCandidates = [...truthData.candidates.logo]
                .filter(logo => logo.value && typeof logo.value === 'string')
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 5); // Take top 5 candidates
              
              sortedCandidates.forEach((logo: any, index: number) => {
                if (logo.value.startsWith('http')) {
                  console.log(`Adding logo candidate ${index}:`, logo.value);
                  
                  // Extract page information from provenance
                  let pageSlug = 'home';
                  if (logo.provenance && logo.provenance.length > 0) {
                    const provenance = logo.provenance[0];
                    if (provenance.url) {
                      try {
                        const pageUrl = new URL(provenance.url);
                        const pathname = pageUrl.pathname;
                        if (pathname === '/' || pathname === '') {
                          pageSlug = 'home';
                        } else {
                          // Extract page name from path
                          const segments = pathname.split('/').filter(s => s);
                          if (segments.length > 0) {
                            pageSlug = segments[0];
                          } else {
                            pageSlug = 'home';
                          }
                        }
                      } catch (e) {
                        pageSlug = 'home';
                      }
                    }
                  }
                  
                  images.push({
                    id: `logo-candidate-${index}`,
                    src: logo.value,
                    alt: `Logo Candidate ${index + 1}`,
                    description: `Logo candidate from ${new URL(logo.value).hostname} (score: ${Math.round((logo.score || 0) * 100)}%)`,
                    pageSlug: pageSlug,
                    width: 200,
                    height: 200,
                    format: logo.value.split('.').pop()?.toLowerCase() || 'jpg',
                    placement: {
                      zone: 'logo',
                      confidence: logo.score || 0.5,
                      reasoning: logo.notes || 'Logo candidate from extraction'
                    },
                    source: 'extracted' as const,
                    status: 'pending' as const
                  });
                }
              });
            }
            
            // If no images were found, add a fallback image
            if (images.length === 0) {
              console.log('No images found, adding fallback image');
              images.push({
                id: 'fallback-image',
                src: 'https://via.placeholder.com/200x200/cccccc/666666?text=No+Image+Found',
                alt: 'No Image Found',
                description: 'No images were extracted from this website',
                width: 200,
                height: 200,
                format: 'png',
                placement: {
                  zone: 'unknown',
                  confidence: 0.0,
                  reasoning: 'Fallback image - no images extracted'
                },
                source: 'extracted' as const,
                status: 'pending' as const
              });
            }
            
            console.log('=== FINAL IMAGE COUNT ===');
            console.log('Total images to display:', images.length);
            console.log('Images array:', images);
            
            // Extract crawled pages information
            const crawledPages = [];
            if (truthData.pages_visited > 0) {
              // If we have page information in the truth data, use it
              console.log('Pages visited from truth data:', truthData.pages_visited);
              
              // Create page entries based on the images we found
              const pageMap = new Map();
              images.forEach(img => {
                const pageSlug = img.pageSlug || 'home';
                if (!pageMap.has(pageSlug)) {
                  pageMap.set(pageSlug, {
                    slug: pageSlug,
                    url: pageSlug === 'home' ? opts.url : `${opts.url}${pageSlug}/`,
                    title: pageSlug === 'home' ? 'Home' : pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1),
                    depth: pageSlug === 'home' ? 0 : 1,
                    success: true,
                    statusCode: 200,
                    imageCount: 0
                  });
                }
                pageMap.get(pageSlug).imageCount++;
              });
              
              crawledPages.push(...Array.from(pageMap.values()));
            } else {
              // Fallback: create a basic page entry
              crawledPages.push({
                slug: 'home',
                url: opts.url,
                title: 'Home',
                depth: 0,
                success: true,
                statusCode: 200,
                imageCount: images.length
              });
            }
            
            console.log('=== CRAWLED PAGES ===');
            console.log('Total pages discovered:', crawledPages.length);
            console.log('Pages array:', crawledPages);
            
            // Create a properly formatted data structure with truth data
            const formattedData = {
              slug: truthData.business_id || 'extracted-data',
              source: {
                url: opts.url,
                crawledAt: truthData.crawled_at || new Date().toISOString(),
                statusCode: 200,
                contentType: 'text/html; charset=utf-8'
              },
              truth: {
                value: truthData,
                status: 'ok',
                confidence: 0.8,
                notes: 'Loaded from truth.json'
              },
              images: {
                value: images,
                status: 'ok',
                confidence: 0.8,
                notes: 'Extracted from truth data'
              },
              crawledPages: {
                value: crawledPages,
                status: 'ok',
                confidence: 0.8,
                notes: 'Pages discovered during crawling'
              },
              paragraphs: {
                value: [
                  {
                    text: truthData.fields.brand_name?.value || 'Brand Name',
                    type: 'heading',
                    level: 1,
                    wordCount: (truthData.fields.brand_name?.value || '').split(' ').length
                  },
                  {
                    text: truthData.fields.background?.value || 'Background description',
                    type: 'paragraph',
                    wordCount: (truthData.fields.background?.value || '').split(' ').length
                  }
                ],
                status: 'ok',
                confidence: 0.8,
                notes: 'Extracted from truth data'
              },
              navbar: {
                value: [
                  { text: 'Home', href: opts.url, isExternal: false, depth: 0 },
                  { text: 'About', href: `${opts.url}about/`, isExternal: false, depth: 1 },
                  { text: 'Contact', href: `${opts.url}contact/`, isExternal: false, depth: 1 }
                ],
                status: 'ok',
                confidence: 0.8,
                notes: 'Generated from URL structure'
              },
              misc: {
                value: {
                  meta: {
                    title: truthData.fields.brand_name?.value || 'Website Title',
                    description: truthData.fields.background?.value || 'Website Description',
                    keywords: truthData.fields.services?.value || [],
                    author: truthData.fields.brand_name?.value || 'Unknown',
                    robots: 'index, follow'
                  },
                  links: {
                    internal: [opts.url, `${opts.url}about/`, `${opts.url}contact/`],
                    external: Object.values(truthData.fields.socials?.value || {}).filter(link => link && typeof link === 'string')
                  },
                  diagnostics: {
                    wordCount: (truthData.fields.background?.value || '').split(' ').length,
                    readabilityScore: 75,
                    hasSchemaOrg: false,
                    hasOpenGraph: true
                  }
                },
                status: 'ok',
                confidence: 0.8,
                notes: 'Generated from truth data'
              }
            };
            
            console.log('Setting extracted data with truth table');
            console.log('Formatted data structure:', formattedData);
            console.log('Images in formatted data:', formattedData.images);
            setExtractedData(formattedData);
            setStep('confirm');
            setStatus('confirmation');
            return;
          } else {
            console.warn('No truth data found, trying fallback methods...');
          }
          
          // Fallback: try to load extracted data from .page.json files
          const fallbackPath = `${outputPathToUse}/${domain}`;
          console.log('Trying fallback path:', fallbackPath);
          const data = await window.SG.loadExtractedData(fallbackPath);
          console.log('Loaded extracted data:', data);
          
          if (data) {
            setExtractedData(data);
            setStep('confirm');
            setStatus('confirmation');
          } else {
            // No data found - show error
            console.error('No extracted data found! Make sure Python extraction completed successfully.');
            console.error('Expected to find truth.json in:', `${outputPathToUse}/${domain}/truth.json`);
            
            // Create minimal structure with empty truth data
            const emptyData = {
              slug: 'no-data',
              source: {
                url: opts.url,
                crawledAt: new Date().toISOString(),
                statusCode: 0,
                contentType: 'unknown'
              },
              truth: {
                value: {
                  business_id: 'unknown',
                  domain: new URL(opts.url).hostname,
                  crawled_at: new Date().toISOString(),
                  pages_visited: 0,
                  fields: {
                    brand_name: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    location: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    email: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    phone: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    socials: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    services: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    brand_colors: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    logo: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    background: { value: null, confidence: 0, provenance: [], notes: 'not found' },
                    slogan: { value: null, confidence: 0, provenance: [], notes: 'not found' }
                  }
                },
                status: 'error',
                confidence: 0,
                notes: 'No data extracted - Python extraction may have failed'
              },
              images: {
                value: [],
                status: 'error',
                confidence: 0,
                notes: 'No images found - Python extraction may have failed'
              },
              crawledPages: {
                value: [],
                status: 'error',
                confidence: 0,
                notes: 'No pages crawled - Python extraction may have failed'
              },
              paragraphs: {
                value: [],
                status: 'error',
                confidence: 0,
                notes: 'No paragraphs found - Python extraction may have failed'
              },
              navbar: {
                value: [],
                status: 'error',
                confidence: 0,
                notes: 'No navigation found - Python extraction may have failed'
              },
              misc: {
                value: {
                  meta: {
                    title: 'No Data',
                    description: 'No data extracted',
                    keywords: [],
                    author: 'Unknown',
                    robots: 'noindex'
                  },
                  links: {
                    internal: [],
                    external: []
                  },
                  diagnostics: {
                    wordCount: 0,
                    readabilityScore: 0,
                    hasSchemaOrg: false,
                    hasOpenGraph: false
                  }
                },
                status: 'error',
                confidence: 0,
                notes: 'No miscellaneous data found - Python extraction may have failed'
              }
            };
            setExtractedData(emptyData);
            setStep('confirm');
            setStatus('confirmation');
          }
        } catch (loadError) {
          console.error('Failed to load extracted data:', loadError);
          // Still show success but without confirmation step
          setStatus('success');
        }
      } else {
        setStatus('error');
        setLines(prev => [...prev, `\nProcess exited with code: ${result.code}`]);
      }
    } catch (error) {
      setStatus('error');
      setLines(prev => [...prev, `\nError: ${error}`]);
    }
  };

  const handleConfirmComplete = () => {
    // Move to final step or close
    setStatus('success');
    setStep('extract');
  };

  const handleBackToExtract = () => {
    setStep('extract');
    setStatus('idle');
    setExtractedData(null);
  };

  return (
    <main>
      {step === 'extract' && (
        <>
          <Form onRun={runPipeline} disabled={status === 'running'} />
          <Progress lines={lines} status={status} />
        </>
      )}
      
      {step === 'confirm' && extractedData && (
        <ConfirmationPanel 
          page={extractedData}
          onComplete={handleConfirmComplete}
          onBack={handleBackToExtract}
        />
      )}
    </main>
  );
}
