/**
 * Blood type compatibility validator
 * This utility checks if a donor blood type is compatible with a recipient blood type
 */

// Blood type compatibility mapping
// Key: recipient blood type
// Value: array of compatible donor blood types
const bloodTypeCompatibility = {
    'A POS': ['A POS', 'A NEG', 'O POS', 'O NEG'],
    'A NEG': ['A NEG', 'O NEG'],
    'B POS': ['B POS', 'B NEG', 'O POS', 'O NEG'],
    'B NEG': ['B NEG', 'O NEG'],
    'AB POS': ['A POS', 'A NEG', 'B POS', 'B NEG', 'AB POS', 'AB NEG', 'O POS', 'O NEG'], // Universal recipient
    'AB NEG': ['A NEG', 'B NEG', 'AB NEG', 'O NEG'],
    'O POS': ['O POS', 'O NEG'],
    'O NEG': ['O NEG'], // Can only receive O NEG
};

/**
 * Check if donor blood type is compatible with recipient blood type
 * @param {string} recipientBloodType - Blood type of the recipient
 * @param {string} donorBloodType - Blood type of the donor
 * @returns {boolean} - True if compatible, false otherwise
 */
const isBloodTypeCompatible = (recipientBloodType, donorBloodType) => {
    // Validate input blood types
    if (!bloodTypeCompatibility[recipientBloodType] || !bloodTypeCompatibility[donorBloodType]) {
        return false;
    }
    
    // Check if donor blood type is in the list of compatible types for the recipient
    return bloodTypeCompatibility[recipientBloodType].includes(donorBloodType);
};

module.exports = {
    isBloodTypeCompatible
};