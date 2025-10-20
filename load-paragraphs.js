// Temporary script to load successful run data into localStorage
// Run this in the browser console to load the successful paragraph data

const successfulRunId = 'www-northshoreexteriorupkeep-com-2025-10-19T23-24-18';
const paragraphData = [
  {
    "id": "div_0",
    "type": "paragraph",
    "content": "Call us at (985)662-8005HomeServicesOur workContact UsCall us at (985)662-8005HomeServicesOur workContact UsMoreHomeServicesOur workContact Us",
    "page": "Home",
    "status": "keep",
    "confidence": 0.6,
    "order": 0
  },
  {
    "id": "div_4",
    "type": "paragraph", 
    "content": "Northshore Exterior UpkeepWe serve Baton rouge all the way to Slidell!Why choose us?We use Eco friendly chemicals that are safe from the environment, and we use soft washing method so to not damage the propertyOur staff are fully trained, Licensed, and insured.We use commercial grade equipment, and we have a very flexible schedule that can accommodate yours.Who are we?We are a family owned and passionate in restoring homes and driveway. We're here to make Louisiana shine.Why pressure wash?Pressure washing is very important. It gets rid of mold, dirt, and other stains. Which over time can build up and result in discoloring or fading. Which in turn can bring down the property value. Our service locationHours of operation Mon-Thu 8:30 AM - 7:00 PMFri-Sun 7:00 AM – 7:00 PMContact Us Here",
    "page": "Home",
    "status": "keep",
    "confidence": 0.6,
    "order": 4
  },
  {
    "id": "p_14",
    "type": "paragraph",
    "content": "Pressure washing is very important. It gets rid of mold, dirt, and other stains. Which over time can build up and result in discoloring or fading. Which in turn can bring down the property value.",
    "page": "Home", 
    "status": "keep",
    "confidence": 0.7,
    "order": 14
  }
];

// Save to localStorage
localStorage.setItem(`paragraphs-${successfulRunId}`, JSON.stringify({
  paragraphs: paragraphData,
  loadedAt: new Date().toISOString(),
  runId: successfulRunId,
}));

console.log('Successfully loaded paragraph data for run:', successfulRunId);
console.log('Paragraphs loaded:', paragraphData.length);
