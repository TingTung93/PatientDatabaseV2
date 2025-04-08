const logger = require('../utils/logger');

class ReportParser {
    static parseDate(dateStr) {
        // Format: DDMMMYY (e.g., 17MAR25)
        const day = dateStr.substring(0, 2);
        const month = dateStr.substring(2, 5);
        const year = dateStr.substring(5, 7);
        return `20${year}-${this.getMonthNumber(month)}-${day}`;
    }

    static getMonthNumber(monthStr) {
        const months = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        return months[monthStr] || '01';
    }

    static parseHeader(lines) {
        const headerData = {
            facilityId: null,
            reportDate: null,
            facility: null,
            location: null
        };

        for (const line of lines) {
            if (line.match(/^\s*\d{4}-[A-Z]{2}/)) {
                headerData.facilityId = line.trim().split(/\s+/)[0];
            } else if (line.includes('As of Date:')) {
                headerData.reportDate = this.parseDate(line.match(/As of Date:\s+(\d{2}[A-Z]{3}\d{2})/)[1]);
            } else if (line.match(/^Facility:/)) {
                headerData.facility = line.match(/Facility:\s+(\d{4}[A-Z])/)[1];
            } else if (line.match(/^\d{4}\s+[A-Za-z]/)) {
                headerData.location = line.trim();
            }
        }

        return headerData;
    }

    static parsePatientRecord(line) {
        // Skip empty lines or header lines
        if (!line.trim() || line.includes('---') || line.includes('Name')) {
            return null;
        }

        // Match patient record pattern
        const pattern = /^([^,]+),\s+(.+?)\s+(\d+)\s+(\d{2}[A-Z]{3}\d{2})\s+(\w+\s+\w+|\<None\>)/;
        const match = line.match(pattern);

        if (!match) {
            return null;
        }

        return {
            lastName: match[1].trim(),
            firstName: match[2].trim(),
            medicalRecordNumber: match[3],
            dateOfBirth: this.parseDate(match[4]),
            bloodType: match[5],
            phenotype: '<None>',
            transfusionRequirements: '<None>',
            antibodies: '<None>',
            antigens: '<None>',
            comments: []
        };
    }

    static parseComments(lines, currentPatient) {
        const comments = [];
        const commentPattern = /^>>\s+([A-Z]{3}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([^\s]+)\s+(.+)/;

        for (const line of lines) {
            if (!line.startsWith('>>')) continue;

            const match = line.match(commentPattern);
            if (match) {
                comments.push({
                    date: this.parseCommentDate(match[1]),
                    time: match[2],
                    userId: match[3],
                    comment: match[4].trim()
                });
            }
        }

        return comments;
    }

    static parseCommentDate(dateStr) {
        // Format: MMM/DD/YY (e.g., MAR/17/25)
        const [month, day, year] = dateStr.split('/');
        return `20${year}-${this.getMonthNumber(month)}-${day.padStart(2, '0')}`;
    }

    static async parseReport(content) {
        const lines = content.split('\n').map(line => line.trim());
        const result = {
            metadata: {
                facility: null,
                facilityId: null,
                reportDate: new Date(),
                reportType: 'BLOOD_BANK'
            },
            patients: []
        };

        let currentPatient = null;
        let inPatientSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines
            if (!line) continue;

            // Parse facility information
            if (line.startsWith('Facility:')) {
                const [_, facilityInfo] = line.split(':');
                const [facilityId, facility] = facilityInfo.trim().split(' - ');
                result.metadata.facilityId = facilityId;
                result.metadata.facility = facility;
                continue;
            }

            // Start of patient record
            if (line.startsWith('Patient Record:')) {
                inPatientSection = true;
                if (currentPatient) {
                    result.patients.push(currentPatient);
                }
                currentPatient = {
                    lastName: '',
                    firstName: '',
                    dateOfBirth: null,
                    medicalRecordNumber: '',
                    bloodType: '',
                    phenotype: '',
                    transfusionRequirements: [],
                    antibodies: [],
                    antigens: [],
                    comments: []
                };
                continue;
            }

            // Parse patient information
            if (inPatientSection && currentPatient) {
                if (line.startsWith('Name:')) {
                    const [_, name] = line.split(':');
                    const [lastName, firstName] = name.trim().split(',').map(n => n.trim());
                    currentPatient.lastName = lastName;
                    currentPatient.firstName = firstName;
                } else if (line.startsWith('DOB:')) {
                    const [_, dob] = line.split(':');
                    currentPatient.dateOfBirth = new Date(dob.trim());
                } else if (line.startsWith('MRN:')) {
                    const [_, mrn] = line.split(':');
                    currentPatient.medicalRecordNumber = mrn.trim();
                } else if (line.startsWith('Blood Type:')) {
                    const [_, bloodType] = line.split(':');
                    currentPatient.bloodType = bloodType.trim();
                } else if (line.startsWith('Phenotype:')) {
                    const [_, phenotype] = line.split(':');
                    currentPatient.phenotype = phenotype.trim();
                } else if (line.startsWith('Transfusion Requirements:')) {
                    const [_, reqs] = line.split(':');
                    currentPatient.transfusionRequirements = reqs.trim().split(',').map(r => r.trim());
                } else if (line.startsWith('Antibodies:')) {
                    const [_, abs] = line.split(':');
                    currentPatient.antibodies = abs.trim().split(',').map(a => a.trim());
                } else if (line.startsWith('Antigens:')) {
                    const [_, ags] = line.split(':');
                    currentPatient.antigens = ags.trim().split(',').map(a => a.trim());
                } else if (line.startsWith('Comment:')) {
                    const [_, comment] = line.split(':');
                    currentPatient.comments.push({
                        text: comment.trim(),
                        date: new Date(),
                        author: 'System'
                    });
                }
            }

            // End of patient record
            if (line.startsWith('End Record') && currentPatient) {
                result.patients.push(currentPatient);
                currentPatient = null;
                inPatientSection = false;
            }
        }

        // Add last patient if exists
        if (currentPatient) {
            result.patients.push(currentPatient);
        }

        return result;
    }
}

module.exports = {
    parseReport: ReportParser.parseReport.bind(ReportParser)
}; 