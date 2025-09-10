// Embedded boundary data to avoid CORS issues
window.embeddedBoundaries = {
  states: {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "NAME": "ALABAMA"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-88.473227, 35.008028],
            [-88.473227, 30.223334],
            [-84.88908, 30.223334],
            [-84.88908, 35.008028],
            [-88.473227, 35.008028]
          ]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "NAME": "CALIFORNIA"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-124.409591, 42.009518],
            [-124.409591, 32.534156],
            [-114.131211, 32.534156],
            [-114.131211, 42.009518],
            [-124.409591, 42.009518]
          ]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "NAME": "TEXAS"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-106.645646, 36.500704],
            [-106.645646, 25.837377],
            [-93.508292, 25.837377],
            [-93.508292, 36.500704],
            [-106.645646, 36.500704]
          ]]
        }
      }
    ]
  },
  
  counties: {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "NAME": "AUTAUGA",
          "STATE_NAME": "ALABAMA",
          "FIPS": "1001"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-86.917595, 32.664169],
            [-86.917595, 32.409639],
            [-86.411133, 32.409639],
            [-86.411133, 32.664169],
            [-86.917595, 32.664169]
          ]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "NAME": "LOS ANGELES",
          "STATE_NAME": "CALIFORNIA",
          "FIPS": "6037"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-118.944092, 34.823013],
            [-118.944092, 33.477310],
            [-117.646484, 33.477310],
            [-117.646484, 34.823013],
            [-118.944092, 34.823013]
          ]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "NAME": "HARRIS",
          "STATE_NAME": "TEXAS",
          "FIPS": "48201"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-95.823975, 30.110732],
            [-95.823975, 29.523624],
            [-94.587402, 29.523624],
            [-94.587402, 30.110732],
            [-95.823975, 30.110732]
          ]]
        }
      }
    ]
  }
};