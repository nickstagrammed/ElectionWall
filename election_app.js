// Enhanced Election Magic Wall Application
class ElectionMagicWall {
    constructor() {
        this.map = null;
        this.currentLayer = null;
        this.electionData = {};
        this.isDataLoaded = false;
        this.currentYear = '2024';
        this.currentDrillLevel = 'national'; // 'national', 'state', 'state-wide', 'county'
        this.currentDrilledState = null;
        this.stateBoundaries = null;
        this.countyBoundaries = null;
        this.selectedStateLayer = null;
        this.selectedCountyLayer = null;
        this.drillUpButton = null;
        this.processor = null;
        this.currentStateBounds = null; // Store bounds from state selection for county view
        this.clickTimeout = null; // For handling single/double click detection
        this.selectedState = null; // Track currently selected state
        this.selectedCounty = null; // Track currently selected county
        this.selectedCountyLayer = null; // Visual reference to selected county layer
        
        // Caching for performance
        this.stateCountyCache = new Map(); // Cache county boundaries by state
        this.stateResultsCache = new Map(); // Cache election results by state and year
        
        this.init();
    }
    
    async init() {
        console.log('=== INITIALIZING ELECTION APP ===');
        console.log('1. Initializing map...');
        this.initializeMap();
        console.log('2. Setting up navigation buttons...');
        this.setupNavigationButtons();
        console.log('3. Setting up year selector...');
        this.setupYearSelector();
        console.log('4. Getting processor...');
        this.processor = window.electionProcessor;
        console.log('5. Loading election data...');
        await this.loadElectionData();
        console.log('6. Creating national view...');
        this.createNationalView();
        console.log('=== ELECTION APP INITIALIZED ===');
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
        this.drillUpButton = document.getElementById('drillUpButton');
        console.log('Drill-up button found:', !!this.drillUpButton);
        
        if (this.drillUpButton) {
            console.log('Adding click event listener to drill-up button');
            this.drillUpButton.addEventListener('click', () => {
                console.log('=== DRILL UP BUTTON CLICKED ===');
                console.log('Current drill level:', this.currentDrillLevel);
                console.log('Current drilled state:', this.currentDrilledState);
                console.log('Current state bounds:', this.currentStateBounds);
                this.returnToPreviousLevel();
                console.log('=== DRILL UP COMPLETED ===');
            });
        } else {
            console.error('Drill-up button not found! ID: drillUpButton');
        }
        
        // Setup mobile panel controls
        this.setupMobilePanelControls();
        
        // Setup selection label
        this.selectionLabel = document.getElementById('selectionLabel');
    }
    
    setupMobilePanelControls() {
        const mobileToggle = document.getElementById('mobilePanelToggle');
        const mobileClose = document.getElementById('mobileClosePanel');
        const detailPanel = document.getElementById('detailPanel');
        
        if (mobileToggle && detailPanel) {
            mobileToggle.addEventListener('click', () => {
                detailPanel.classList.toggle('open');
                // Update toggle icon
                mobileToggle.textContent = detailPanel.classList.contains('open') ? '✕' : 'ℹ';
            });
        }
        
        if (mobileClose && detailPanel) {
            mobileClose.addEventListener('click', () => {
                detailPanel.classList.remove('open');
                // Reset toggle icon
                if (mobileToggle) {
                    mobileToggle.textContent = 'ℹ';
                }
            });
        }
        
        // Close panel when clicking outside on mobile
        if (detailPanel) {
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && 
                    detailPanel.classList.contains('open') && 
                    !detailPanel.contains(e.target) && 
                    !e.target.closest('#mobilePanelToggle')) {
                    detailPanel.classList.remove('open');
                    if (mobileToggle) {
                        mobileToggle.textContent = 'ℹ';
                    }
                }
            });
        }
    }
    
    showSelectionLabel(text, type = 'default') {
        if (this.selectionLabel) {
            this.selectionLabel.textContent = text;
            this.selectionLabel.className = `selection-label ${type}`;
            this.selectionLabel.style.display = 'block';
        }
    }
    
    hideSelectionLabel() {
        if (this.selectionLabel) {
            this.selectionLabel.style.display = 'none';
        }
    }
    
    setupYearSelector() {
        const yearSelector = document.getElementById('yearSelector');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                this.currentYear = e.target.value;
                this.updateElectionInfo();
                this.updateView();
                
                // Maintain selections if they exist
                if (this.selectedCounty) {
                    const selectedCountyData = this.selectedCounty;
                    // Clear and re-select to update data for new year
                    this.clearCountySelection();
                    // Give map time to update then re-select
                    setTimeout(() => {
                        this.showCountyDetails(selectedCountyData.state, selectedCountyData.name);
                    }, 100);
                } else if (this.selectedState) {
                    const selectedStateName = this.selectedState;
                    // Clear and re-select to update data for new year
                    this.clearStateSelection();
                    // Give map time to update then re-select
                    setTimeout(() => {
                        this.showStateDetails(selectedStateName);
                    }, 100);
                }
            });
        }
    }
    
    async loadElectionData() {
        try {
            console.log('Starting election data load...');
            await this.processor.loadData();
            this.isDataLoaded = true;
            console.log('Election data loaded successfully');
            this.updateNationalSummary();
        } catch (error) {
            console.error('Failed to load election data:', error);
            this.isDataLoaded = false;
            
            // Show error in UI
            const sidebarContent = document.getElementById('detailContent');
            if (sidebarContent) {
                sidebarContent.innerHTML = `
                    <div style="color: red; padding: 1rem;">
                        <h3>Data Loading Error</h3>
                        <p>Failed to load election data: ${error.message}</p>
                        <p>Please check the browser console for more details.</p>
                    </div>
                `;
            }
        }
    }
    
    createNationalView() {
        this.clearMap();
        this.currentDrillLevel = 'national';
        this.currentDrilledState = null;
        
        // Start with state-level view for performance
        this.showStateLayer();
        
        this.hideDrillUpButton();
        this.updateSidebar('national');
        
        // Show intro content if no state is selected
        if (!this.selectedState) {
            this.showIntroContent();
        }
        
        this.updateNationalSummary();
        
        // Only set view if not coming from a smooth transition
        if (!this.selectedState) {
            this.map.setView([39.50, -98.35], 4);
        }
    }
    
    async createCountyLayer() {
        // Load county boundaries if not already loaded
        if (!this.countyBoundaries) {
            try {
                console.log('Loading county boundaries...');
                const response = await fetch('./county_boundaries.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.countyBoundaries = await response.json();
                console.log('County boundaries loaded:', this.countyBoundaries.features.length, 'counties');
            } catch (error) {
                console.error('Failed to load county boundaries, using embedded fallback:', error);
                // Fallback to embedded boundaries
                if (window.embeddedBoundaries && window.embeddedBoundaries.counties) {
                    this.countyBoundaries = window.embeddedBoundaries.counties;
                    console.log('Using embedded county boundaries:', this.countyBoundaries.features.length, 'counties');
                } else {
                    console.log('No embedded county boundaries, falling back to state view...');
                    this.showStateLayer();
                    return;
                }
            }
        }
        
        this.clearMap();
        
        const countyLayer = L.geoJSON(this.countyBoundaries, {
            style: (feature) => {
                const countyName = feature.properties.NAME;
                const stateFips = feature.properties.STATE;
                const countyFips = feature.properties.COUNTY;
                const fullFips = stateFips + countyFips;
                const color = this.getCountyColorByRealFips(fullFips, countyName, this.currentYear);
                
                return {
                    fillColor: color,
                    weight: 0.5,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                const countyName = feature.properties.NAME;
                const stateFips = feature.properties.STATE;
                const stateName = window.getStateNameFromFips ? window.getStateNameFromFips(stateFips) : 'Unknown';
                
                layer.on({
                    mouseover: (e) => {
                        this.highlightFeature(e);
                        // Only visual hover highlighting, no data preview
                    },
                    mouseout: (e) => {
                        this.resetHighlight(e);
                    },
                    click: (e) => {
                        this.selectCounty(stateName, countyName, layer);
                    }
                });
            }
        }).addTo(this.map);
        
        this.currentLayer = countyLayer;
    }
    
    async showStateLayer() {
        // Load state boundaries if not already loaded
        if (!this.stateBoundaries) {
            try {
                const response = await fetch('./state_boundaries.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.stateBoundaries = await response.json();
            } catch (error) {
                console.error('Failed to load state boundaries, using embedded fallback:', error);
                // Fallback to embedded boundaries
                if (window.embeddedBoundaries && window.embeddedBoundaries.states) {
                    this.stateBoundaries = window.embeddedBoundaries.states;
                } else {
                    console.error('No embedded state boundaries available');
                    return;
                }
            }
        }
        
        this.clearMap();
        
        const stateLayer = L.geoJSON(this.stateBoundaries, {
            style: (feature) => {
                const stateName = feature.properties.NAME;
                const color = this.getStateColor(stateName, this.currentYear);
                
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
                        // Only visual hover highlighting, no data preview
                    },
                    mouseout: (e) => {
                        this.resetHighlight(e);
                    },
                    click: (e) => {
                        console.log(`Clicked state: "${stateName}" from properties:`, feature.properties);
                        // Only single click - select and show state details
                        this.selectState(stateName, layer);
                    }
                });
            }
        }).addTo(this.map);
        
        this.currentLayer = stateLayer;
    }
    
    getStateColor(stateName, year) {
        const results = this.processor.getStateResults(year, stateName);
        if (!results || !results.winningParty) return '#cccccc';
        
        return this.processor.getPartyColor(results.winningParty);
    }
    
    getCountyColor(stateName, countyName, year) {
        const results = this.processor.getCountyResults(year, stateName, countyName);
        if (!results || !results.winningParty) return '#cccccc';
        
        return this.processor.getPartyColor(results.winningParty);
    }

    getCountyColorByFips(stateName, countyFips, countyName, year) {
        // Try FIPS first, fallback to name
        let results = null;
        if (countyFips) {
            results = this.processor.getCountyResultsByFips(year, stateName, countyFips);
        }
        if (!results && countyName) {
            results = this.processor.getCountyResults(year, stateName, countyName);
        }
        
        if (!results || !results.winningParty) return '#cccccc';
        
        return this.processor.getPartyColor(results.winningParty);
    }

    getCountyColorByRealFips(fullFips, countyName, year) {
        // Extract state from FIPS (first 2 digits)
        const stateFips = fullFips.substring(0, 2);
        const stateName = window.getStateNameFromFips ? window.getStateNameFromFips(stateFips) : null;
        
        if (!stateName) return '#cccccc';
        
        // Try getting results by FIPS first
        let results = this.processor.getCountyResultsByFips(year, stateName, fullFips);
        
        // Fallback to county name if FIPS doesn't work
        if (!results && countyName) {
            results = this.processor.getCountyResults(year, stateName, countyName);
        }
        
        if (!results || !results.winningParty) return '#cccccc';
        
        return this.processor.getPartyColor(results.winningParty);
    }
    
    async drillDownToState(stateName) {
        console.log(`Drilling down to state-wide view: ${stateName}`);
        this.currentDrilledState = stateName;
        this.currentDrillLevel = 'state-wide';
        
        // Show loading indicator
        this.showLoadingIndicator(`Loading ${stateName} counties...`);
        
        try {
            await this.showStateCounties(stateName);
            this.showDrillUpButton();
            this.updateSidebar('state-wide', stateName);
            
            // Show state-level data by default when entering state-wide view
            this.showStateDetails(stateName);
        } catch (error) {
            console.error('Error drilling down to state-wide view:', error);
            this.showErrorMessage(`Failed to load ${stateName} data`);
        } finally {
            this.hideLoadingIndicator();
        }
    }
    
    async showStateCounties(stateName) {
        // Check cache first
        const cacheKey = stateName;
        if (this.stateCountyCache.has(cacheKey)) {
            console.log(`Using cached counties for ${stateName}`);
            this.renderStateCounties(this.stateCountyCache.get(cacheKey), stateName);
            return;
        }
        
        if (!this.countyBoundaries) {
            try {
                console.log('Loading county boundaries...');
                const response = await fetch('./county_boundaries.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.countyBoundaries = await response.json();
                console.log('County boundaries loaded successfully');
            } catch (error) {
                console.error('Failed to load county boundaries, using embedded fallback:', error);
                // Fallback to embedded boundaries
                if (window.embeddedBoundaries && window.embeddedBoundaries.counties) {
                    this.countyBoundaries = window.embeddedBoundaries.counties;
                } else {
                    console.error('No embedded county boundaries available');
                    throw new Error('County boundaries not available');
                }
            }
        }
        
        console.log(`Filtering counties for ${stateName}...`);
        
        // Filter counties for the selected state
        console.log(`Looking for counties in state: "${stateName}"`);
        console.log('Sample county feature:', this.countyBoundaries.features[0]?.properties);
        
        const stateCounties = this.countyBoundaries.features.filter(feature => {
            const stateFips = feature.properties.STATE;
            const featureStateName = window.getStateNameFromFips ? window.getStateNameFromFips(stateFips) : null;
            // Handle case-insensitive comparison
            const matches = featureStateName && featureStateName.toUpperCase() === stateName.toUpperCase();
            if (feature.properties.NAME === 'Colusa') { // Debug first California county
                console.log(`DEBUG: County ${feature.properties.NAME}: STATE="${stateFips}" -> "${featureStateName}" vs "${stateName}" = ${matches}`);
            }
            return matches;
        });
        
        console.log(`Found ${stateCounties.length} counties for ${stateName}`);
        
        // Cache the filtered counties
        this.stateCountyCache.set(cacheKey, stateCounties);
        console.log(`Cached ${stateCounties.length} counties for ${stateName}`);
        
        this.renderStateCounties(stateCounties, stateName);
    }

    renderStateCounties(stateCounties, stateName) {
        // Preserve current view to prevent any auto-adjustment when switching layers
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        console.log('Preserving current view:', currentCenter, currentZoom);
        
        this.clearMap();
        
        if (stateCounties.length === 0) {
            console.warn(`No counties found for state: ${stateName}`);
            throw new Error(`No counties found for ${stateName}`);
        }
        
        console.log(`Rendering ${stateCounties.length} counties for ${stateName}`);
        
        const countyLayer = L.geoJSON(stateCounties, {
            style: (feature) => {
                const countyName = feature.properties.NAME;
                const stateFips = feature.properties.STATE;
                const countyFips = feature.properties.COUNTY;
                const fullFips = stateFips + countyFips;
                const color = this.getCountyColorByRealFips(fullFips, countyName, this.currentYear);
                
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
                const stateFips = feature.properties.STATE;
                const stateName = window.getStateNameFromFips ? window.getStateNameFromFips(stateFips) : 'Unknown';
                
                layer.on({
                    mouseover: (e) => {
                        this.highlightFeature(e);
                        // Only visual hover highlighting, no data preview
                    },
                    mouseout: (e) => {
                        this.resetHighlight(e);
                    },
                    click: (e) => {
                        this.selectCounty(stateName, countyName, layer);
                    }
                });
            }
        }).addTo(this.map);
        
        this.currentLayer = countyLayer;
        
        // Restore the exact view to prevent any auto-adjustment from layer switching
        this.map.setView(currentCenter, currentZoom, { animate: false });
        console.log('Restored exact view after layer switch');
        
        // Add haptic feedback: slight zoom out then back to provide visual confirmation
        setTimeout(() => {
            const hapticZoomOut = currentZoom - 0.3;
            this.map.setZoom(hapticZoomOut, { animate: true, duration: 0.2 });
            
            setTimeout(() => {
                this.map.setZoom(currentZoom, { animate: true, duration: 0.2 });
            }, 200);
        }, 50);
        
        // DO NOT CHANGE VIEW AT ALL - just switch from state layer to county layer
        // The user should see the exact same view, just with counties instead of states
        console.log(`Successfully rendered counties for ${stateName} - maintaining exact same view as state level`);
    }
    
    returnToPreviousLevel() {
        console.log('=== RETURN TO PREVIOUS LEVEL ===');
        console.log('Called from:', new Error().stack);
        console.log('Current level:', this.currentDrillLevel);
        console.log('Available state bounds:', !!this.currentStateBounds);
        
        if (this.currentDrillLevel === 'county') {
            console.log('Executing: County → State-wide');
            this.returnToStateWideView();
        } else if (this.currentDrillLevel === 'state-wide') {
            console.log('Executing: State-wide → State');
            this.returnToStateView();
        } else if (this.currentDrillLevel === 'state') {
            console.log('Executing: State → National');
            this.returnToNationalView();
        } else {
            console.log('Already at national level - no previous level');
        }
        console.log('=== RETURN TO PREVIOUS LEVEL COMPLETED ===');
    }
    
    returnToStateWideView() {
        console.log(`Returning to state-wide view for: ${this.currentDrilledState} - snapping to state view`);
        
        // Clear county selection but keep showing the counties
        this.clearCountySelection();
        
        // Set back to state-wide level (showing counties with state data)
        this.currentDrillLevel = 'state-wide';
        
        // FORCE ZOOM OUT from county view to full state-wide view
        if (this.currentStateBounds) {
            console.log('Forcing visible zoom OUT from county to state-wide view');
            console.log('Current map center:', this.map.getCenter());
            console.log('Current map zoom:', this.map.getZoom());
            console.log('Target bounds:', this.currentStateBounds.bounds);
            console.log('Target zoom:', this.currentStateBounds.zoom);
            
            const currentZoom = this.map.getZoom();
            const targetZoom = this.currentStateBounds.zoom;
            
            // Always create visible zoom out movement for County → State-wide
            console.log('Creating visible zoom out: zoom further out then back to state view');
            
            // First zoom slightly out from current position to create subtle visible movement
            const zoomOutLevel = Math.max(targetZoom - 0.5, currentZoom - 0.3);
            this.map.setZoom(zoomOutLevel, { animate: true, duration: 0.4 });
            
            // Then zoom back to correct state bounds
            setTimeout(() => {
                console.log('Zooming back to stored state bounds:', this.currentStateBounds.bounds);
                console.log('Stored state bounds details:', {
                    southwest: this.currentStateBounds.bounds._southWest,
                    northeast: this.currentStateBounds.bounds._northEast
                });
                
                this.map.fitBounds(this.currentStateBounds.bounds, {
                    padding: [20, 20],
                    maxZoom: this.currentStateBounds.zoom,
                    animate: true,
                    duration: 0.6
                });
                console.log('Completed zoom back - should show full state with all counties');
            }, 400);
        } else {
            console.warn('No state bounds stored for zoom out');
        }
        
        // Show state-level data in the sidebar (same as when double-clicking into state)
        if (this.currentDrilledState) {
            this.showStateDetails(this.currentDrilledState);
            this.updateSidebar('state-wide', this.currentDrilledState);
        }
        
        // Keep drill-up button for further navigation to state view
        this.showDrillUpButton();
    }
    
    returnToStateView() {
        console.log(`Returning to state view for: ${this.currentDrilledState} - switching from counties to states`);
        
        // Clear county selection
        this.clearCountySelection();
        
        // Set back to state level (showing states with selected state)
        this.currentDrillLevel = 'state';
        
        // CRITICAL: Switch from county layer to state layer while maintaining same view
        this.clearMap();
        
        // Load state layer 
        console.log('Loading state layer to replace county layer...');
        this.showStateLayer();
        
        // Give time for state layer to load then apply snap-to
        setTimeout(() => {
            console.log('State layer loaded, now maintaining state view...');
            
            // SNAP TO state view if user has navigated away, then switch to state layer
            if (this.currentStateBounds) {
                console.log('Clearing county view and snapping to state view');
                
                // Always snap back to the original state view in case user has panned/zoomed
                this.map.fitBounds(this.currentStateBounds.bounds, {
                    padding: [20, 20],
                    maxZoom: this.currentStateBounds.zoom,
                    animate: true,
                    duration: 0.8
                });
                
                // Re-select the state after snap-to completes
                setTimeout(() => {
                    this.selectStateByName(this.currentDrilledState);
                }, 900);
            } else {
                console.warn('No state bounds stored for snap-to');
                // Re-select the state anyway
                setTimeout(() => {
                    this.selectStateByName(this.currentDrilledState);
                }, 100);
            }
        }, 200); // Wait 200ms for state layer to load
        
        // Keep drill-up button for further navigation to national view
        this.showDrillUpButton();
    }

    selectStateByName(stateName) {
        // This method will find and select a state by name without requiring the layer reference
        console.log(`Selecting state by name: ${stateName}`);
        this.showStateDetails(stateName);
        
        // TODO: If we need visual highlighting, we'd need to find the layer
        // For now, just show the data which is the main requirement
    }
    
    returnToNationalView() {
        console.log('Returning to national view - snapping to national level');
        
        // Clear both state and county selections
        this.clearStateSelection();
        this.clearCountySelection();
        
        // SNAP TO national view
        console.log('Snapping to national view at [39.50, -98.35] zoom 4');
        this.map.setView([39.50, -98.35], 4, { 
            animate: true, 
            duration: 0.8 
        });
        
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
    
    showDrillUpButton() {
        if (this.drillUpButton) {
            this.drillUpButton.style.display = 'flex';
        }
    }
    
    hideDrillUpButton() {
        if (this.drillUpButton) {
            this.drillUpButton.style.display = 'none';
        }
    }

    showLoadingIndicator(message = 'Loading...') {
        const sidebarContent = document.getElementById('detailContent');
        if (sidebarContent) {
            sidebarContent.innerHTML = `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    hideLoadingIndicator() {
        const sidebarContent = document.getElementById('detailContent');
        if (sidebarContent) {
            sidebarContent.innerHTML = `
                <div class="sidebar-intro">
                    <h3>Election Results Analysis</h3>
                    <p>Explore presidential election results:</p>
                    <ul>
                        <li>Vote totals and percentages</li>
                        <li>Margin of victory</li>
                        <li>Historical comparison</li>
                        <li>Turnout analysis</li>
                    </ul>
                </div>
            `;
        }
    }

    showErrorMessage(message) {
        const sidebarContent = document.getElementById('detailContent');
        if (sidebarContent) {
            sidebarContent.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="window.electionMagicWall.returnToNationalView()">Return to National View</button>
                </div>
            `;
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
            // Don't reset highlighting if this is the selected state or county
            if ((this.selectedStateLayer && e.target === this.selectedStateLayer) ||
                (this.selectedCountyLayer && e.target === this.selectedCountyLayer)) {
                return;
            }
            this.currentLayer.resetStyle(e.target);
        }
    }
    

    selectState(stateName, layer) {
        // Clear previous selections
        this.clearStateSelection();
        this.clearCountySelection(); // Clear county selection when changing states
        
        // Set drill level to state (showing states with one selected)
        this.currentDrillLevel = 'state';
        this.currentDrilledState = stateName;
        
        // Set new selection
        this.selectedState = stateName;
        this.selectedStateLayer = layer;
        
        // Highlight selected state with prominent styling
        layer.setStyle({
            weight: 4,
            opacity: 1,
            fillOpacity: 0.85,
            color: '#FF6B35', // Bright orange border
            dashArray: '8, 4' // Longer dashed border for state level
        });
        
        // Add click handler to the selected state - clicking again drills to counties
        layer.off('click'); // Remove any existing click handler
        layer.on('click', (e) => {
            if (e.originalEvent) {
                e.originalEvent.stopPropagation(); // Prevent map click
            }
            console.log(`Clicked already selected state: ${stateName} - drilling down to counties`);
            this.drillDownToState(stateName);
        });
        
        // Snap to selected state - center map on state bounds
        this.snapToState(layer);
        
        // Show selection label on map
        this.showSelectionLabel(stateName, 'state');
        
        // Show drill-up button since we're now in state level
        this.showDrillUpButton();
        
        // Show state details
        this.showStateDetails(stateName);
    }

    clearStateSelection() {
        if (this.selectedStateLayer) {
            this.selectedStateLayer.setStyle({
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.7,
                color: '#666'
            });
            // Remove click handler when clearing selection
            this.selectedStateLayer.off('click');
        }
        this.selectedState = null;
        this.selectedStateLayer = null;
        this.currentStateBounds = null; // Clear stored bounds when clearing state
        
        // Hide selection label when clearing state
        this.hideSelectionLabel();
    }

    clearCountySelection() {
        if (this.selectedCountyLayer) {
            this.selectedCountyLayer.setStyle({
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.7,
                color: '#666'
            });
        }
        this.selectedCounty = null;
        this.selectedCountyLayer = null;
        
        // Update selection label when clearing county (show state if selected)
        if (this.selectedState) {
            this.showSelectionLabel(this.selectedState, 'state');
        } else {
            this.hideSelectionLabel();
        }
    }

    snapToState(layer) {
        if (!layer) return;
        
        try {
            // Get the bounds of the selected state
            const bounds = layer.getBounds();
            
            // Store these bounds for reuse when double-clicking to county view
            this.currentStateBounds = {
                bounds: bounds,
                zoom: this.calculateOptimalZoom(bounds)
            };
            
            // Smoothly fit the map to the state bounds with padding
            this.map.fitBounds(bounds, {
                padding: [20, 20], // Add padding around the state
                maxZoom: this.currentStateBounds.zoom,
                animate: true,
                duration: 0.8 // Smooth animation duration
            });
            
            console.log(`Snapped to state bounds and stored for county view:`, bounds);
        } catch (error) {
            console.error('Error snapping to state:', error);
            // Fallback to center on layer
            try {
                const center = layer.getBounds().getCenter();
                this.map.setView(center, 6, { animate: true, duration: 0.8 });
            } catch (fallbackError) {
                console.error('Fallback snap failed:', fallbackError);
            }
        }
    }

    calculateOptimalZoom(bounds) {
        // Calculate state size to determine appropriate zoom level
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        
        const latDiff = Math.abs(northEast.lat - southWest.lat);
        const lngDiff = Math.abs(northEast.lng - southWest.lng);
        
        // Larger states need lower zoom, smaller states can zoom in more
        const maxDiff = Math.max(latDiff, lngDiff);
        
        if (maxDiff > 15) return 5;      // Very large states (like Alaska, Texas)
        if (maxDiff > 8) return 6;       // Large states (like California, Montana)
        if (maxDiff > 4) return 7;       // Medium states (like Colorado, Arizona)
        if (maxDiff > 2) return 8;       // Smaller states (like Illinois, Georgia)
        return 9;                        // Small states (like Connecticut, Rhode Island)
    }

    // Debug function to check Arizona data
    debugArizonaData() {
        console.log('=== DEBUGGING ARIZONA 2020 DATA ===');
        const arizonaData = this.processor.data?.['2020']?.['ARIZONA'];
        console.log('Raw Arizona 2020 data:', arizonaData);
        
        if (arizonaData) {
            let totalDem = 0, totalRep = 0;
            let countyCount = 0;
            
            for (const countyFips in arizonaData) {
                const county = arizonaData[countyFips];
                console.log(`County ${county.name} (${countyFips}):`, county.results);
                
                if (county.results.DEMOCRAT) totalDem += county.results.DEMOCRAT;
                if (county.results.REPUBLICAN) totalRep += county.results.REPUBLICAN;
                countyCount++;
            }
            
            console.log(`Total counties: ${countyCount}`);
            console.log(`Total Democrat votes: ${totalDem.toLocaleString()}`);
            console.log(`Total Republican votes: ${totalRep.toLocaleString()}`);
            console.log(`Democrat winning: ${totalDem > totalRep ? 'YES' : 'NO'}`);
        }
        
        const processedResults = this.processor.getStateResults('2020', 'ARIZONA');
        console.log('Processed state results:', processedResults);
        console.log('=== END DEBUG ===');
    }

    showIntroContent() {
        const detailContent = document.getElementById('detailContent');
        const sidebarInstructions = document.getElementById('sidebarInstructions');
        
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="sidebar-intro">
                    <h3>Election Results Analysis</h3>
                    <p>Explore ${this.currentYear} presidential election results:</p>
                    <ul>
                        <li>Click states to view detailed results</li>
                        <li>Click again to drill down to counties</li>
                        <li>Compare vote totals and margins</li>
                        <li>Track historical trends</li>
                    </ul>
                </div>
            `;
        }
        
        if (sidebarInstructions) {
            sidebarInstructions.textContent = 'Click on states to view election results';
        }
    }

    showStateDetails(stateName) {
        console.log(`Showing details for state: ${stateName}`);
        const results = this.processor.getStateResults(this.currentYear, stateName);
        if (results) {
            this.updateSidebarContent('state_details', stateName, null, results);
            
            // Update instructions based on current drill level
            const sidebarInstructions = document.getElementById('sidebarInstructions');
            if (sidebarInstructions) {
                if (this.currentDrillLevel === 'state-wide') {
                    // We're in state-wide viewing counties with state data
                    sidebarInstructions.textContent = `Viewing ${stateName} counties - Click counties for details`;
                } else if (this.currentDrillLevel === 'state') {
                    // We're in state level with state selected
                    sidebarInstructions.textContent = `${stateName} selected - Click again to view counties`;
                } else {
                    // We're in national view
                    sidebarInstructions.textContent = 'Click states to view results';
                }
            }
        }
    }
    
    
    selectCounty(stateName, countyName, layer = null) {
        console.log(`Selected county: ${countyName}, ${stateName}`);
        this.currentDrillLevel = 'county';
        
        // Clear previous county selection highlighting
        this.clearCountySelection();
        
        // Set new county selection
        this.selectedCounty = { name: countyName, state: stateName };
        this.selectedCountyLayer = layer;
        
        // Highlight selected county with prominent styling
        if (layer) {
            layer.setStyle({
                weight: 4,
                opacity: 1,
                fillOpacity: 0.9,
                color: '#FFD700', // Bright gold border
                dashArray: '5, 5' // Dashed border for extra visibility
            });
            
            // Snap to county BUT don't overwrite the original state bounds
            const originalStateBounds = this.currentStateBounds; // Preserve original state bounds
            this.snapToState(layer); // This snaps to county
            this.currentStateBounds = originalStateBounds; // Restore original state bounds for drill-up
            
            console.log('Selected county and snapped to it, but preserved original state bounds for drill-up');
        }
        
        // Show selection label on map
        this.showSelectionLabel(`${countyName}, ${stateName}`, 'county');
        
        // Show county details in sidebar
        this.showCountyDetails(stateName, countyName);
    }
    
    showCountyDetails(stateName, countyName) {
        console.log(`Showing county details for: ${countyName}, ${stateName}`);
        const results = this.processor.getCountyResults(this.currentYear, stateName, countyName);
        if (results) {
            this.updateSidebarContent('county_details', stateName, countyName, results);
            
            // Update instructions for county view
            const sidebarInstructions = document.getElementById('sidebarInstructions');
            if (sidebarInstructions) {
                sidebarInstructions.textContent = `${countyName} County, ${stateName} - Election Results`;
            }
        }
    }
    
    updateSidebar(level, stateName = null, countyName = null) {
        const sidebarInstructions = document.getElementById('sidebarInstructions');
        
        if (level === 'national') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = 'Click states to view results';
            }
        } else if (level === 'state') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = `${stateName} selected - Click again to view counties`;
            }
        } else if (level === 'state-wide') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = `Viewing ${stateName} counties - Click counties for details`;
            }
        } else if (level === 'county') {
            if (sidebarInstructions) {
                sidebarInstructions.textContent = `${countyName}, ${stateName} - Election Results`;
            }
        }
    }
    
    updateSidebarContent(level, stateName, countyName, results) {
        const sidebarContent = document.getElementById('detailContent');
        if (!sidebarContent || !results) return;
        
        if (level === 'state_details') {
            sidebarContent.innerHTML = `
                <div class="state-details">
                    <h3>${stateName} Election Results</h3>
                    <div class="election-year-display">${this.currentYear} Presidential Election</div>
                    
                    <div class="results-container">
                        ${results.results.map((result, index) => `
                            <div class="candidate-result ${result.party.toLowerCase()} ${result.isWinner ? 'winner' : ''}">
                                <div class="candidate-info">
                                    <div class="party-indicator" style="background-color: ${this.processor.getPartyColor(result.party)}"></div>
                                    <div class="candidate-details">
                                        <div class="candidate-name">${result.party}</div>
                                        <div class="candidate-percentage">${result.percentage}%</div>
                                    </div>
                                </div>
                                <div class="candidate-votes">${this.processor.formatVotes(result.votes, false)}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="state-summary">
                        <div class="summary-item">
                            <span class="summary-label">Total Votes:</span>
                            <span class="summary-value">${this.processor.formatVotes(results.totalVotes, false)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Winning Margin:</span>
                            <span class="summary-value">${this.processor.formatVotes(results.margin, false)} votes (${results.marginPercentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                    
                    <div class="drill-down-hint">
                        <div class="interaction-hint">Click selected state again to view counties</div>
                    </div>
                </div>
            `;
        } else if (level === 'county_details') {
            sidebarContent.innerHTML = `
                <div class="county-details">
                    <h3>${countyName} County, ${stateName}</h3>
                    <div class="election-year-display">${this.currentYear} Presidential Election</div>
                    
                    <div class="results-container">
                        ${results.results.map((result, index) => `
                            <div class="candidate-result ${result.party.toLowerCase()} ${result.isWinner ? 'winner' : ''}">
                                <div class="candidate-info">
                                    <div class="party-indicator" style="background-color: ${this.processor.getPartyColor(result.party)}"></div>
                                    <div class="candidate-details">
                                        <div class="candidate-name">${result.party}</div>
                                        <div class="candidate-percentage">${result.percentage}%</div>
                                    </div>
                                </div>
                                <div class="candidate-votes">${this.processor.formatVotes(result.votes, false)}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="county-summary">
                        <div class="summary-item">
                            <span class="summary-label">Total Votes:</span>
                            <span class="summary-value">${this.processor.formatVotes(results.totalVotes, false)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Winning Margin:</span>
                            <span class="summary-value">${this.processor.formatVotes(results.margin, false)} votes (${results.marginPercentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    updateElectionInfo() {
        const yearElement = document.querySelector('.election-year');
        if (yearElement) {
            yearElement.textContent = this.currentYear;
        }
    }
    
    updateNationalSummary() {
        const nationalResults = this.processor.getNationalResults(this.currentYear);
        if (!nationalResults) return;
        
        const summary = document.getElementById('nationalSummary');
        const democratResult = nationalResults.results.find(r => r.party === 'DEMOCRAT');
        const republicanResult = nationalResults.results.find(r => r.party === 'REPUBLICAN');
        
        if (democratResult) {
            const nameEl = document.getElementById('democratName');
            const votesEl = document.getElementById('democratVotes');
            const percentEl = document.getElementById('democratPercentage');
            
            if (nameEl) nameEl.textContent = 'Democratic';
            if (votesEl) votesEl.textContent = this.processor.formatVotes(democratResult.votes);
            if (percentEl) percentEl.textContent = `${democratResult.percentage}%`;
        }
        
        if (republicanResult) {
            const nameEl = document.getElementById('republicanName');
            const votesEl = document.getElementById('republicanVotes');
            const percentEl = document.getElementById('republicanPercentage');
            
            if (nameEl) nameEl.textContent = 'Republican';
            if (votesEl) votesEl.textContent = this.processor.formatVotes(republicanResult.votes);
            if (percentEl) percentEl.textContent = `${republicanResult.percentage}%`;
        }
        
        if (summary) {
            summary.style.display = 'block';
        }
    }
}

// Global function for lightbox
function closeCountyLightbox() {
    const lightbox = document.getElementById('countyLightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.electionMagicWall = new ElectionMagicWall();
});