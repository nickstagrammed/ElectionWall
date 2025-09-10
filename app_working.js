// Election Magic Wall Application
class ElectionMagicWall {
    constructor() {
        this.map = null;
        this.currentLayer = null;
        this.electionData = {};
        this.isDataLoaded = false;
        this.currentView = 'state'; // 'state' or 'county'
        this.currentDrillLevel = 'national'; // 'national', 'state', 'county'
        this.currentDrilledState = null;
        this.stateBoundaries = null;
        this.countyBoundaries = null;
        this.selectedStateLayer = null;
        this.selectedCountyLayer = null;
        this.backButton = null;
        this.backLabel = null;
        this.closeButton = null;
        
        // Political party colors
        this.partyColors = {
            'DEMOCRAT': '#1E90FF',      // Blue
            'REPUBLICAN': '#DC143C',    // Red  
            'GREEN': '#228B22',         // Green
            'LIBERTARIAN': '#FFD700',   // Yellow/Gold
            'OTHER': '#8A2BE2'          // Purple for independents/other
        };
        
        this.init();
    }
    
    async init() {
        this.initializeMap();
        this.setupNavigationButtons();
        this.setupViewSelector();
        await this.loadElectionData();
        this.createNationalView();
    }
    
    initializeMap() {
        this.map = L.map('map', {
            preferCanvas: true,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true
        }).setView([39.50, -98.35], 4);
        
        this.map.setMinZoom(3);
        this.map.setMaxZoom(12);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);
    }
    
    setupNavigationButtons() {
        this.backButton = document.getElementById('backButton');
        this.backLabel = document.getElementById('backLabel');
        this.closeButton = document.getElementById('closeButton');
        
        if (this.backButton) {
            this.backButton.addEventListener('click', () => {
                this.returnToPreviousLevel();
            });
        }
        
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.returnToNationalView();
            });
        }
    }
    
    setupViewSelector() {
        const viewSelector = document.getElementById('viewSelector');
        if (viewSelector) {
            viewSelector.addEventListener('change', (e) => {
                this.currentView = e.target.value;
                this.updateView();
            });
        }
    }
    
    async loadElectionData() {
        try {
            // Load the CSV data
            const response = await fetch('./data/countypres_2000-2024.csv');
            const csvText = await response.text();
            this.electionData = this.parseElectionCSV(csvText);
            this.isDataLoaded = true;
            console.log('Election data loaded successfully');
        } catch (error) {
            console.error('Failed to load election data:', error);
            this.isDataLoaded = false;
        }
    }
    
    parseElectionCSV(csvText) {
        const lines = csvText.split('\\n');
        const headers = lines[0].split(',');
        const data = {};
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
                const year = values[0];
                const state = values[1];
                const county = values[3];
                const party = values[7];
                const votes = parseInt(values[8]) || 0;
                
                if (!data[year]) data[year] = {};
                if (!data[year][state]) data[year][state] = {};
                if (!data[year][state][county]) data[year][state][county] = {};
                
                data[year][state][county][party] = votes;
            }
        }
        
        return data;
    }
    
    createNationalView() {
        this.clearMap();
        this.currentDrillLevel = 'national';
        this.currentDrilledState = null;
        
        if (this.currentView === 'state') {
            this.createStateLayer();
        } else if (this.currentView === 'county') {
            this.createNationalCountyView();
        }
        
        this.hideBackButton();
        this.hideCloseButton();
        this.updateSidebar('national');
        this.map.setView([39.50, -98.35], 4);
    }
    
    async createStateLayer() {
        // Load state boundaries if not already loaded
        if (!this.stateBoundaries) {
            try {
                const response = await fetch('./state_boundaries.json');
                this.stateBoundaries = await response.json();
            } catch (error) {
                console.error('Failed to load state boundaries:', error);
                return;
            }
        }
        
        this.clearMap();
        
        const stateLayer = L.geoJSON(this.stateBoundaries, {
            style: (feature) => {
                const stateName = feature.properties.NAME;
                const color = this.getStateColor(stateName, 2024); // Use 2024 as default year
                
                return {
                    fillColor: color,
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: (feature, layer) => {
                const stateName = feature.properties.NAME;
                
                layer.on({
                    mouseover: (e) => {
                        this.highlightFeature(e);
                        this.showStatePreview(stateName);
                    },
                    mouseout: (e) => {
                        this.resetHighlight(e);
                    },
                    click: (e) => {
                        this.drillDownToState(stateName);
                    }
                });
            }
        }).addTo(this.map);
        
        this.currentLayer = stateLayer;
    }
    
    getStateColor(stateName, year) {
        // Get the winning party for the state in the given year
        const stateData = this.electionData[year] && this.electionData[year][stateName.toUpperCase()];
        if (!stateData) return '#cccccc'; // Gray for no data
        
        let totalVotes = {};
        
        // Aggregate all county votes for the state
        for (const county in stateData) {
            for (const party in stateData[county]) {
                totalVotes[party] = (totalVotes[party] || 0) + stateData[county][party];
            }
        }
        
        // Find winning party
        let winningParty = null;
        let maxVotes = 0;
        for (const party in totalVotes) {
            if (totalVotes[party] > maxVotes) {
                maxVotes = totalVotes[party];
                winningParty = party;
            }
        }
        
        return this.partyColors[winningParty] || this.partyColors['OTHER'];
    }
    
    async drillDownToState(stateName) {
        console.log(`Drilling down to state: ${stateName}`);
        this.currentDrilledState = stateName;
        this.currentDrillLevel = 'state';
        
        if (this.currentView === 'county') {
            await this.showStateCounties(stateName);
        } else {
            // Stay on state view but zoom to state
            this.focusOnState(stateName);
        }
        
        this.showBackButton();
        this.updateSidebar('state', stateName);
    }
    
    async showStateCounties(stateName) {
        // Load county boundaries if not already loaded
        if (!this.countyBoundaries) {
            try {
                const response = await fetch('./county_boundaries.json');
                this.countyBoundaries = await response.json();
            } catch (error) {
                console.error('Failed to load county boundaries:', error);
                return;
            }
        }
        
        this.clearMap();
        
        // Filter counties for the selected state
        const stateCounties = this.countyBoundaries.features.filter(feature => 
            feature.properties.STATE_NAME === stateName
        );
        
        const countyLayer = L.geoJSON(stateCounties, {
            style: (feature) => {
                const countyName = feature.properties.NAME;
                const color = this.getCountyColor(stateName, countyName, 2024);
                
                return {
                    fillColor: color,
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                const countyName = feature.properties.NAME;
                
                layer.on({
                    mouseover: (e) => {
                        this.highlightFeature(e);
                        this.showCountyPreview(stateName, countyName);
                    },
                    mouseout: (e) => {
                        this.resetHighlight(e);
                    },
                    click: (e) => {
                        this.selectCounty(stateName, countyName);
                    }
                });
            }
        }).addTo(this.map);
        
        this.currentLayer = countyLayer;
        
        // Zoom to state bounds
        if (stateCounties.length > 0) {
            this.map.fitBounds(countyLayer.getBounds());
        }
    }
    
    getCountyColor(stateName, countyName, year) {
        const countyData = this.electionData[year] && 
                          this.electionData[year][stateName.toUpperCase()] && 
                          this.electionData[year][stateName.toUpperCase()][countyName.toUpperCase()];
        
        if (!countyData) return '#cccccc';
        
        // Find winning party
        let winningParty = null;
        let maxVotes = 0;
        for (const party in countyData) {
            if (countyData[party] > maxVotes) {
                maxVotes = countyData[party];
                winningParty = party;
            }
        }
        
        return this.partyColors[winningParty] || this.partyColors['OTHER'];
    }
    
    returnToPreviousLevel() {
        console.log('Return to previous level - current level:', this.currentDrillLevel);
        
        if (this.currentDrillLevel === 'county') {
            // Return to state view
            this.returnToStateView();
        } else if (this.currentDrillLevel === 'state') {
            // Return to national view
            this.returnToNationalView();
        }
    }
    
    returnToStateView() {
        this.currentDrillLevel = 'state';
        this.drillDownToState(this.currentDrilledState);
    }
    
    returnToNationalView() {
        this.createNationalView();
    }
    
    updateView() {
        if (this.currentDrillLevel === 'national') {
            this.createNationalView();
        } else if (this.currentDrillLevel === 'state' && this.currentDrilledState) {
            this.drillDownToState(this.currentDrilledState);
        }
    }
    
    // Utility functions
    clearMap() {
        if (this.currentLayer) {
            this.map.removeLayer(this.currentLayer);
            this.currentLayer = null;
        }
        if (this.selectedStateLayer) {
            this.map.removeLayer(this.selectedStateLayer);
            this.selectedStateLayer = null;
        }
        if (this.selectedCountyLayer) {
            this.map.removeLayer(this.selectedCountyLayer);
            this.selectedCountyLayer = null;
        }
    }
    
    showBackButton() {
        if (this.backButton) {
            this.backButton.style.display = 'flex';
        }
        if (this.backLabel) {
            this.backLabel.style.display = 'block';
        }
    }
    
    hideBackButton() {
        if (this.backButton) {
            this.backButton.style.display = 'none';
        }
        if (this.backLabel) {
            this.backLabel.style.display = 'none';
        }
    }
    
    hideCloseButton() {
        if (this.closeButton) {
            this.closeButton.style.display = 'none';
        }
    }
    
    highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.9
        });
        layer.bringToFront();
    }
    
    resetHighlight(e) {
        if (this.currentLayer) {
            this.currentLayer.resetStyle(e.target);
        }
    }
    
    focusOnState(stateName) {
        // Zoom to state bounds (implementation needed)
        console.log(`Focusing on state: ${stateName}`);
    }
    
    showStatePreview(stateName) {
        // Update sidebar with state preview
        console.log(`Showing preview for state: ${stateName}`);
    }
    
    showCountyPreview(stateName, countyName) {
        // Update sidebar with county preview
        console.log(`Showing preview for county: ${countyName}, ${stateName}`);
    }
    
    selectCounty(stateName, countyName) {
        // Show detailed county information
        console.log(`Selected county: ${countyName}, ${stateName}`);
        this.currentDrillLevel = 'county';
        this.updateSidebar('county', stateName, countyName);
    }
    
    updateSidebar(level, stateName = null, countyName = null) {
        const detailContent = document.getElementById('detailContent');
        const sidebarInstructions = document.getElementById('sidebarInstructions');
        
        if (level === 'national') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = this.currentView === 'state' ? 
                    'Hover over states for election results' : 
                    'Click on a state to view county results';
            }
        } else if (level === 'state') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = `Viewing ${stateName} - Click counties for details`;
            }
        } else if (level === 'county') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = `${countyName}, ${stateName} - Election Results`;
            }
        }
    }
    
    createNationalCountyView() {
        // Implementation for national county view
        console.log('Creating national county view');
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.electionMagicWall = new ElectionMagicWall();
});