// Basic county coordinates mapping
// This is a simplified version - in production you'd want more comprehensive data
const countyCoordinates = {
    // Sample coordinates for major counties
    'COOK': { state: 'ILLINOIS', lat: 41.8781, lng: -87.6298 },
    'LOS ANGELES': { state: 'CALIFORNIA', lat: 34.0522, lng: -118.2437 },
    'HARRIS': { state: 'TEXAS', lat: 29.7604, lng: -95.3698 },
    'MARICOPA': { state: 'ARIZONA', lat: 33.4484, lng: -112.0740 },
    'ORANGE': { state: 'CALIFORNIA', lat: 33.7175, lng: -117.8311 },
    'MIAMI-DADE': { state: 'FLORIDA', lat: 25.7617, lng: -80.1918 },
    'KINGS': { state: 'NEW YORK', lat: 40.6782, lng: -73.9442 },
    'DALLAS': { state: 'TEXAS', lat: 32.7767, lng: -96.7970 },
    'QUEENS': { state: 'NEW YORK', lat: 40.7282, lng: -73.7949 },
    'RIVERSIDE': { state: 'CALIFORNIA', lat: 33.7530, lng: -116.3020 }
};

// Helper function to get county coordinates
function getCountyCoordinates(countyName, stateName) {
    const key = countyName.toUpperCase();
    const county = countyCoordinates[key];
    
    if (county && county.state === stateName.toUpperCase()) {
        return [county.lat, county.lng];
    }
    
    // Return null if coordinates not found
    return null;
}