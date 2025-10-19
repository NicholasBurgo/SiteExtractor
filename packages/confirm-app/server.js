import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files
app.use(express.static('dist'))

// API endpoint to serve extraction data
app.get('/api/extraction-data', (req, res) => {
  try {
    // Try to read from the extraction output directory
    const extractDir = path.join(process.cwd(), 'build', 'extract', 'pages')
    
    if (fs.existsSync(extractDir)) {
      const files = fs.readdirSync(extractDir).filter(file => file.endsWith('.page.json'))
      const pages = files.map(file => {
        const filePath = path.join(extractDir, file)
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
      })
      
      res.json({ pages })
    } else {
      // Return empty array if no extraction data found
      res.json({ pages: [] })
    }
  } catch (error) {
    console.error('Error reading extraction data:', error)
    res.status(500).json({ error: 'Failed to read extraction data' })
  }
})

// API endpoint to serve site-app data (converted format)
app.get('/api/site-app-data', (req, res) => {
  try {
    // Import the data converter
    const { loadSiteAppData } = require('./data-converter.js')
    
    // Load and convert site-app data
    const pages = loadSiteAppData()
    
    res.json({ pages })
  } catch (error) {
    console.error('Error reading site-app data:', error)
    res.status(500).json({ error: 'Failed to read site-app data' })
  }
})

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Confirmation app server running on port ${PORT}`)
})
