// Election Data Processing Utilities
class ElectionDataProcessor {
    constructor() {
        this.data = null;
        this.countyNameMappings = this.initializeCountyMappings();
        this.fipsMapping = this.initializeFipsMapping();
    }
    
    initializeCountyMappings() {
        return {
            // Alaska district to standard county mapping
            'ALASKA': {
                'DISTRICT 01': 'Southeast Fairbanks Census Area',
                'DISTRICT 02': 'Yukon-Koyukuk Census Area', 
                'DISTRICT 03': 'Nome Census Area',
                'DISTRICT 04': 'Northwest Arctic Borough',
                'DISTRICT 05': 'North Slope Borough',
                'DISTRICT 06': 'Fairbanks North Star Borough',
                'DISTRICT 07': 'Denali Borough',
                'DISTRICT 08': 'Matanuska-Susitna Borough',
                'DISTRICT 09': 'Anchorage Municipality',
                'DISTRICT 10': 'Valdez-Cordova Census Area',
                'DISTRICT 11': 'Kenai Peninsula Borough',
                'DISTRICT 12': 'Kodiak Island Borough',
                'DISTRICT 13': 'Lake and Peninsula Borough',
                'DISTRICT 14': 'Bristol Bay Borough',
                'DISTRICT 15': 'Dillingham Census Area',
                'DISTRICT 16': 'Bethel Census Area',
                'DISTRICT 17': 'Wade Hampton Census Area',
                'DISTRICT 18': 'Aleutians East Borough',
                'DISTRICT 19': 'Aleutians West Census Area',
                'DISTRICT 20': 'Sitka City and Borough',
                'DISTRICT 21': 'Haines Borough',
                'DISTRICT 22': 'Juneau City and Borough',
                'DISTRICT 23': 'Skagway Municipality',
                'DISTRICT 24': 'Yakutat City and Borough',
                'DISTRICT 25': 'Wrangell City and Borough',
                'DISTRICT 26': 'Petersburg Census Area',
                'DISTRICT 27': 'Prince of Wales-Hyder Census Area',
                'DISTRICT 28': 'Ketchikan Gateway Borough',
                'DISTRICT 29': 'Hoonah-Angoon Census Area',
                'DISTRICT 30': 'Chugach Census Area',
                'DISTRICT 31': 'Copper River Census Area',
                'DISTRICT 32': 'Kusilvak Census Area',
                'DISTRICT 33': 'Southeast Fairbanks Census Area',
                'DISTRICT 34': 'Yukon-Koyukuk Census Area',
                'DISTRICT 35': 'Nome Census Area',
                'DISTRICT 36': 'Northwest Arctic Borough',
                'DISTRICT 37': 'North Slope Borough',
                'DISTRICT 38': 'Fairbanks North Star Borough',
                'DISTRICT 39': 'Denali Borough',
                'DISTRICT 40': 'Matanuska-Susitna Borough'
            }
        };
    }
    
    initializeFipsMapping() {
        return {
            // Alaska district FIPS to real Alaska county FIPS mapping
            'ALASKA': {
                '2001': '02240', // Southeast Fairbanks Census Area
                '2002': '02290', // Yukon-Koyukuk Census Area
                '2003': '02180', // Nome Census Area
                '2004': '02188', // Northwest Arctic Borough
                '2005': '02185', // North Slope Borough
                '2006': '02090', // Fairbanks North Star Borough
                '2007': '02068', // Denali Borough
                '2008': '02170', // Matanuska-Susitna Borough
                '2009': '02020', // Anchorage Municipality
                '2010': '02261', // Valdez-Cordova Census Area → Now Chugach + Copper River
                '2011': '02122', // Kenai Peninsula Borough
                '2012': '02150', // Kodiak Island Borough
                '2013': '02164', // Lake and Peninsula Borough
                '2014': '02060', // Bristol Bay Borough
                '2015': '02070', // Dillingham Census Area
                '2016': '02050', // Bethel Census Area
                '2017': '02270', // Wade Hampton Census Area → Now Kusilvak
                '2018': '02013', // Aleutians East Borough
                '2019': '02016', // Aleutians West Census Area
                '2020': '02220', // Sitka City and Borough
                '2021': '02100', // Haines Borough
                '2022': '02110', // Juneau City and Borough
                '2023': '02230', // Skagway Municipality
                '2024': '02282', // Yakutat City and Borough
                '2025': '02275', // Wrangell City and Borough
                '2026': '02195', // Petersburg Census Area
                '2027': '02198', // Prince of Wales-Hyder Census Area
                '2028': '02130', // Ketchikan Gateway Borough
                '2029': '02105', // Hoonah-Angoon Census Area
                '2030': '02063', // Chugach Census Area (new)
                '2031': '02066', // Copper River Census Area (new)
                '2032': '02158'  // Kusilvak Census Area (new)
            }
        };
    }
    
    normalizeCountyName(stateName, countyName) {
        // Check if we have a mapping for this state
        if (this.countyNameMappings[stateName?.toUpperCase()]) {
            const stateMapping = this.countyNameMappings[stateName.toUpperCase()];
            const normalizedName = stateMapping[countyName?.toUpperCase()];
            if (normalizedName) {
                console.log(`Mapped ${countyName} to ${normalizedName} in ${stateName}`);
                return normalizedName;
            }
        }
        // Return original name if no mapping found
        return countyName;
    }

    normalizeFipsCode(stateName, originalFips) {
        // Check if we have a FIPS mapping for this state
        if (this.fipsMapping[stateName?.toUpperCase()]) {
            const stateMapping = this.fipsMapping[stateName.toUpperCase()];
            const normalizedFips = stateMapping[originalFips];
            if (normalizedFips) {
                console.log(`Mapped FIPS ${originalFips} to ${normalizedFips} in ${stateName}`);
                return normalizedFips;
            }
        }
        // Return original FIPS if no mapping found
        return originalFips;
    }

    async loadData() {
        try {
            console.log('Loading election data from CSV...');
            // Try loading from multiple sources for reliability
            let response;
            try {
                response = await fetch('./data/countypres_2000-2024.csv');
            } catch (error) {
                console.warn('Local CSV failed, trying GitHub raw URL as fallback');
                response = await fetch('https://raw.githubusercontent.com/nickstagrammed/ElectionWall/master/data/countypres_2000-2024.csv');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.log('CSV response received, parsing...');
            const csvText = await response.text();
            console.log(`CSV text length: ${csvText.length} characters`);
            
            this.data = this.parseElectionCSV(csvText);
            console.log('Data parsed successfully', Object.keys(this.data));
            console.log('Sample data for 2024:', Object.keys(this.data['2024'] || {}));
            
            return this.data;
        } catch (error) {
            console.error('Failed to load election data:', error);
            throw error;
        }
    }

    parseElectionCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data = {};
        
        // Expected columns: year,state,state_po,county_name,county_fips,office,candidate,party,candidatevotes,totalvotes,version,mode
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 9) {
                const year = values[0]?.trim();
                const state = values[1]?.trim();
                const statePo = values[2]?.trim();
                const countyName = values[3]?.trim();
                const countyFips = values[4]?.trim();
                const party = values[7]?.trim();
                const votes = parseInt(values[8]) || 0;
                const mode = values[11]?.trim() || 'TOTAL';
                
                if (year && state && countyFips && party && votes >= 0) {
                    if (!data[year]) data[year] = {};
                    if (!data[year][state]) data[year][state] = {};
                    
                    // Normalize FIPS code and county name for Alaska districts
                    const normalizedFips = this.normalizeFipsCode(state, countyFips);
                    const normalizedCountyName = this.normalizeCountyName(state, countyName);
                    
                    if (!data[year][state][normalizedFips]) {
                        data[year][state][normalizedFips] = {
                            name: normalizedCountyName,
                            originalName: countyName, // Keep original for reference
                            originalFips: countyFips, // Keep original FIPS for reference
                            results: {},
                            modes: {}
                        };
                    }
                    
                    // Store votes by mode to handle aggregation correctly
                    if (!data[year][state][normalizedFips].modes[mode]) {
                        data[year][state][normalizedFips].modes[mode] = {};
                    }
                    data[year][state][normalizedFips].modes[mode][party] = (data[year][state][normalizedFips].modes[mode][party] || 0) + votes;
                }
            }
        }
        
        // Process data to avoid double counting - prefer TOTAL VOTES over component modes
        for (const year in data) {
            for (const state in data[year]) {
                for (const countyFips in data[year][state]) {
                    const county = data[year][state][countyFips];
                    const modes = county.modes;
                    
                    // Determine which modes to use based on available data
                    if (modes['TOTAL VOTES']) {
                        // Use TOTAL VOTES if available (this includes early voting, election day, etc.)
                        county.results = { ...modes['TOTAL VOTES'] };
                    } else if (modes['TOTAL']) {
                        // Use TOTAL if available (legacy format)
                        county.results = { ...modes['TOTAL'] };
                    } else {
                        // Sum component modes, but avoid double counting
                        // Skip modes that are subsets of others
                        const modesToSum = Object.keys(modes).filter(mode => 
                            !['EARLY VOTING', 'LATE EARLY VOTING', 'ELECTION DAY', 'PROVISIONAL', 'ABSENTEE', 'MAIL-IN', 'ABSENTEE BY MAIL'].includes(mode) ||
                            (!modes['TOTAL VOTES'] && !modes['TOTAL'])
                        );
                        
                        for (const mode of modesToSum) {
                            for (const party in modes[mode]) {
                                county.results[party] = (county.results[party] || 0) + modes[mode][party];
                            }
                        }
                    }
                    
                    // Clean up temporary modes data
                    delete county.modes;
                }
            }
        }
        
        return data;
    }

    getStateResults(year, stateName) {
        const stateData = this.data?.[year]?.[stateName?.toUpperCase()];
        if (!stateData) return null;
        
        let totalVotes = {};
        
        // Aggregate all county votes for the state
        for (const countyFips in stateData) {
            const countyData = stateData[countyFips];
            if (countyData && countyData.results) {
                for (const party in countyData.results) {
                    totalVotes[party] = (totalVotes[party] || 0) + countyData.results[party];
                }
            }
        }
        
        return this.calculateResults(totalVotes);
    }

    getCountyResults(year, stateName, countyName) {
        const stateData = this.data?.[year]?.[stateName?.toUpperCase()];
        if (!stateData) return null;
        
        // Find county by name (check both normalized and original names)
        for (const countyFips in stateData) {
            const countyData = stateData[countyFips];
            if (countyData) {
                // Check normalized name
                if (countyData.name?.toUpperCase() === countyName?.toUpperCase()) {
                    return this.calculateResults(countyData.results);
                }
                // Check original name for backward compatibility
                if (countyData.originalName?.toUpperCase() === countyName?.toUpperCase()) {
                    return this.calculateResults(countyData.results);
                }
            }
        }
        
        return null;
    }

    getCountyResultsByFips(year, stateName, countyFips) {
        const countyData = this.data?.[year]?.[stateName?.toUpperCase()]?.[countyFips];
        if (!countyData) return null;
        
        return this.calculateResults(countyData.results);
    }

    getNationalResults(year) {
        const yearData = this.data?.[year];
        if (!yearData) return null;
        
        let totalVotes = {};
        
        // Aggregate all state and county votes
        for (const state in yearData) {
            for (const countyFips in yearData[state]) {
                const countyData = yearData[state][countyFips];
                if (countyData && countyData.results) {
                    for (const party in countyData.results) {
                        totalVotes[party] = (totalVotes[party] || 0) + countyData.results[party];
                    }
                }
            }
        }
        
        return this.calculateResults(totalVotes);
    }

    calculateResults(voteData) {
        if (!voteData) return null;
        
        const results = [];
        let totalVotes = 0;
        let winningParty = null;
        let maxVotes = 0;
        
        // Calculate totals
        for (const party in voteData) {
            totalVotes += voteData[party];
            if (voteData[party] > maxVotes) {
                maxVotes = voteData[party];
                winningParty = party;
            }
        }
        
        // Create results array with percentages
        for (const party in voteData) {
            const votes = voteData[party];
            const percentage = totalVotes > 0 ? (votes / totalVotes * 100).toFixed(1) : 0;
            
            results.push({
                party,
                votes,
                percentage: parseFloat(percentage),
                isWinner: party === winningParty
            });
        }
        
        // Sort by votes (descending)
        results.sort((a, b) => b.votes - a.votes);
        
        return {
            results,
            totalVotes,
            winningParty,
            margin: results.length > 1 ? results[0].votes - results[1].votes : results[0]?.votes || 0,
            marginPercentage: results.length > 1 ? results[0].percentage - results[1].percentage : results[0]?.percentage || 0
        };
    }

    getPartyColor(partyName) {
        const colors = {
            'DEMOCRAT': '#1E90FF',      // Blue
            'REPUBLICAN': '#DC143C',    // Red  
            'GREEN': '#228B22',         // Green
            'LIBERTARIAN': '#FFD700',   // Yellow/Gold
            'OTHER': '#8A2BE2'          // Purple for independents/other
        };
        
        return colors[partyName?.toUpperCase()] || colors['OTHER'];
    }

    formatVotes(votes, useAbbreviation = false) {
        if (useAbbreviation) {
            if (votes >= 1000000) {
                return (votes / 1000000).toFixed(1) + 'M';
            } else if (votes >= 1000) {
                return (votes / 1000).toFixed(0) + 'K';
            }
        }
        return votes.toLocaleString();
    }
}

// Global instance
window.electionProcessor = new ElectionDataProcessor();

// Global debug function for testing Alaska data
window.debugAlaska = function() {
    console.log('=== DEBUGGING ALASKA 2024 DATA ===');
    const alaskaData = window.electionProcessor.data?.['2024']?.['ALASKA'];
    console.log('Raw Alaska 2024 data:', alaskaData);
    
    if (alaskaData) {
        let totalDem = 0, totalRep = 0;
        let districtCount = 0;
        
        for (const fips in alaskaData) {
            const district = alaskaData[fips];
            console.log(`Original: ${district.originalName} (${district.originalFips}) -> Normalized: ${district.name} (FIPS: ${fips}):`, district.results);
            
            if (district.results.DEMOCRAT) totalDem += district.results.DEMOCRAT;
            if (district.results.REPUBLICAN) totalRep += district.results.REPUBLICAN;
            districtCount++;
        }
        
        console.log(`Total districts: ${districtCount}`);
        console.log(`Total Democrat votes: ${totalDem.toLocaleString()}`);
        console.log(`Total Republican votes: ${totalRep.toLocaleString()}`);
        console.log(`Democrat winning: ${totalDem > totalRep ? 'YES' : 'NO'}`);
    } else {
        console.log('No Alaska data found');
    }
    
    const processedResults = window.electionProcessor.getStateResults('2024', 'ALASKA');
    console.log('Processed state results:', processedResults);
    console.log('=== END DEBUG ===');
};

// Global debug function for testing Arizona data
window.debugArizona = function() {
    console.log('=== DEBUGGING ARIZONA 2020 DATA ===');
    const arizonaData = window.electionProcessor.data?.['2020']?.['ARIZONA'];
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
    
    const processedResults = window.electionProcessor.getStateResults('2020', 'ARIZONA');
    console.log('Processed state results:', processedResults);
    console.log('=== END DEBUG ===');
};