// Election Data Processing Utilities
class ElectionDataProcessor {
    constructor() {
        this.data = null;
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
                    
                    // Use FIPS code as primary key, store county name for reference
                    if (!data[year][state][countyFips]) {
                        data[year][state][countyFips] = {
                            name: countyName,
                            results: {},
                            modes: {}
                        };
                    }
                    
                    // Store votes by mode to handle aggregation correctly
                    if (!data[year][state][countyFips].modes[mode]) {
                        data[year][state][countyFips].modes[mode] = {};
                    }
                    data[year][state][countyFips].modes[mode][party] = (data[year][state][countyFips].modes[mode][party] || 0) + votes;
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
        
        // Find county by name (since we might not have FIPS code available)
        for (const countyFips in stateData) {
            const countyData = stateData[countyFips];
            if (countyData && countyData.name?.toUpperCase() === countyName?.toUpperCase()) {
                return this.calculateResults(countyData.results);
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