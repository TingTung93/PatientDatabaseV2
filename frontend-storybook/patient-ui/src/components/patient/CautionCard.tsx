import React from 'react';
import { Patient } from '../../types/patient';
import { Card } from '../common/Card';

interface CautionCardProps {
  patient: Patient;
  className?: string;
}

export const CautionCard: React.FC<CautionCardProps> = ({ patient, className }) => {
  const { demographics, identification, bloodProfile } = patient;
  
  // Format blood type display
  const formatBloodType = () => {
    return `${bloodProfile.abo} ${bloodProfile.rh}`;
  };
  
  // Helper to render phenotype checkboxes
  const renderPhenotypeCheckbox = (value?: boolean) => (
    <div className={`w-6 h-6 border border-black rounded-sm flex items-center justify-center ${value ? 'bg-white' : 'bg-gray-100'}`}>
      {value && '✓'}
    </div>
  );

  return (
    <Card className={`bg-white border-2 border-black ${className}`}>
      <div className="text-center font-bold text-xl border-b-2 border-black p-2">
        CAUTION - Special Procedures Required
      </div>
      
      {/* Patient Info Header */}
      <div className="grid grid-cols-3 border-b-2 border-black">
        <div className="border-r-2 border-black p-2">
          <div className="font-bold">Patient Name:</div>
          <div>{`${demographics.lastName}, ${demographics.firstName}`}</div>
        </div>
        <div className="border-r-2 border-black p-2">
          <div className="font-bold">FMP/SSN:</div>
          <div>{identification.fmp || identification.ssn}</div>
        </div>
        <div className="p-2">
          <div className="font-bold">ABO/Rh:</div>
          <div>{formatBloodType()}</div>
        </div>
      </div>
      
      {/* Phenotyping Grid */}
      <div className="border-b-2 border-black">
        <div className="text-center font-bold border-b border-black py-1">
          PATIENT PHENOTYPING
        </div>
        <div className="grid grid-cols-6 gap-0">
          {/* Rh System */}
          <div className="col-span-1 border-r border-black">
            <div className="text-center font-bold border-b border-black">Rh</div>
            <div className="grid grid-cols-5 gap-1 p-1">
              <div className="text-center">D</div>
              <div className="text-center">C</div>
              <div className="text-center">E</div>
              <div className="text-center">c</div>
              <div className="text-center">e</div>
              {renderPhenotypeCheckbox(bloodProfile.phenotype.rh.D)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.rh.C)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.rh.E)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.rh.c)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.rh.e)}
            </div>
          </div>
          
          {/* Kell System */}
          <div className="col-span-1 border-r border-black">
            <div className="text-center font-bold border-b border-black">Kell</div>
            <div className="grid grid-cols-2 gap-1 p-1">
              <div className="text-center">K</div>
              <div className="text-center">k</div>
              {renderPhenotypeCheckbox(bloodProfile.phenotype.kell.K)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.kell.k)}
            </div>
          </div>
          
          {/* Duffy System */}
          <div className="col-span-1 border-r border-black">
            <div className="text-center font-bold border-b border-black">Duffy</div>
            <div className="grid grid-cols-2 gap-1 p-1">
              <div className="text-center">Fya</div>
              <div className="text-center">Fyb</div>
              {renderPhenotypeCheckbox(bloodProfile.phenotype.duffy.Fya)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.duffy.Fyb)}
            </div>
          </div>
          
          {/* Kidd System */}
          <div className="col-span-1 border-r border-black">
            <div className="text-center font-bold border-b border-black">Kidd</div>
            <div className="grid grid-cols-2 gap-1 p-1">
              <div className="text-center">Jka</div>
              <div className="text-center">Jkb</div>
              {renderPhenotypeCheckbox(bloodProfile.phenotype.kidd.Jka)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.kidd.Jkb)}
            </div>
          </div>
          
          {/* MNS System */}
          <div className="col-span-1 border-r border-black">
            <div className="text-center font-bold border-b border-black">MNS</div>
            <div className="grid grid-cols-4 gap-1 p-1">
              <div className="text-center">M</div>
              <div className="text-center">N</div>
              <div className="text-center">S</div>
              <div className="text-center">s</div>
              {renderPhenotypeCheckbox(bloodProfile.phenotype.mns.M)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.mns.N)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.mns.S)}
              {renderPhenotypeCheckbox(bloodProfile.phenotype.mns.s)}
            </div>
          </div>
          
          {/* Other */}
          <div className="col-span-1">
            <div className="text-center font-bold border-b border-black">Other:</div>
            <div className="p-1">
              {bloodProfile.phenotype.other && Object.entries(bloodProfile.phenotype.other).map(([antigen, value]) => (
                <div key={antigen} className="flex items-center gap-1">
                  <div className="text-sm">{antigen}</div>
                  {renderPhenotypeCheckbox(value)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Requirements Grid */}
      <div className="grid grid-cols-12 text-sm">
        <div className="col-span-2 border-r-2 border-black p-1">
          <div className="font-bold">DD-MM-YY</div>
          <div>{new Date().toLocaleDateString('en-GB')}</div>
        </div>
        
        <div className="col-span-4 border-r-2 border-black p-1">
          <div className="font-bold">DIAGNOSIS/PROBLEM</div>
          <div className="flex flex-col gap-1">
            {patient.cautionFlags?.map((flag, index) => (
              <div key={index} className="flex items-center gap-2">
                <input type="checkbox" checked readOnly className="form-checkbox" />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="col-span-3 border-r-2 border-black p-1">
          <div className="font-bold">RESTRICTION</div>
          <div>{bloodProfile.restrictions?.join(', ')}</div>
        </div>
        
        <div className="col-span-2 border-r-2 border-black p-1">
          <div className="font-bold">CROSSMATCH</div>
          <div className="flex flex-col gap-1">
            {bloodProfile.requirements && (
              <>
                {bloodProfile.requirements.immediateSpinRequired && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="form-checkbox" />
                    <span>Immediate Spin</span>
                  </div>
                )}
                {bloodProfile.requirements.salineToAHGRequired && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="form-checkbox" />
                    <span>Sal→ AHG</span>
                  </div>
                )}
                {bloodProfile.requirements.preWarmRequired && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="form-checkbox" />
                    <span>Pre-Warm</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="col-span-1 p-1">
          <div className="font-bold">TECH</div>
          <div>{patient.updatedBy}</div>
        </div>
      </div>
    </Card>
  );
};

export default CautionCard; 