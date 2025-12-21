'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Upload, MapPin, Target, FileText, Briefcase, Save, X } from 'lucide-react';

interface CompanySettingsProps {
  companyName: string;
  setCompanyName: (name: string) => void;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  companyName: externalCompanyName,
  setCompanyName: setExternalCompanyName,
  companyLogo: externalCompanyLogo,
  setCompanyLogo: setExternalCompanyLogo,
}) => {
  const [companyData, setCompanyData] = useState({
    companyName: externalCompanyName,
    logo: null as File | null,
    logoPreview: '',
    location: '',
    icp: '',
    about: '',
    businessServices: '',
  });

  // Sync with external state
  useEffect(() => {
    setCompanyData(prev => ({ ...prev, companyName: externalCompanyName }));
  }, [externalCompanyName]);

  const [isEditing, setIsEditing] = useState({
    companyName: false,
    location: false,
    icp: false,
    about: false,
    businessServices: false,
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCompanyData(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleInputChange = (field: keyof typeof companyData, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSaveField = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({
      ...prev,
      [field]: false,
    }));
    // Update Redux state if company name changed
    if (field === 'companyName') {
      setExternalCompanyName(companyData.companyName);
    }
    // TODO: Implement API call to save specific field
    console.log(`Saving ${field}:`, companyData[field]);
  };

  const handleCancelField = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({
      ...prev,
      [field]: false,
    }));
    // TODO: Reset to original value from server
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof typeof isEditing) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveField(field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelField(field);
    }
  };

  const handleSave = () => {
    // TODO: Implement API call to save company data
    console.log('Saving company data:', companyData);
    setIsEditing({
      companyName: false,
      location: false,
      icp: false,
      about: false,
      businessServices: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Company Name */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Name
          </h2>
          {!isEditing.companyName ? (
            <button
              onClick={() => toggleEdit('companyName')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('companyName')}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.companyName ? (
          <input
            type="text"
            value={companyData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'companyName')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter company name"
            autoFocus
          />
        ) : (
          <p className="text-gray-700">{companyData.companyName || 'Not set'}</p>
        )}
      </div>

      {/* Location */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </h2>
          {!isEditing.location ? (
            <button
              onClick={() => toggleEdit('location')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('location')}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.location ? (
          <input
            type="text"
            value={companyData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'location')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., San Francisco, CA, USA"
            autoFocus
          />
        ) : (
          <p className="text-gray-700">{companyData.location || 'Not set'}</p>
        )}
      </div>

      {/* ICP (Ideal Customer Profile) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Ideal Customer Profile (ICP)
          </h2>
          {!isEditing.icp ? (
            <button
              onClick={() => toggleEdit('icp')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('icp')}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.icp ? (
          <textarea
            value={companyData.icp}
            onChange={(e) => handleInputChange('icp', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'icp')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
            placeholder="Describe your ideal customer profile (e.g., industry, company size, role, pain points)"
            autoFocus
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">{companyData.icp || 'Not set'}</p>
        )}
      </div>

      {/* About Company */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            About Company
          </h2>
          {!isEditing.about ? (
            <button
              onClick={() => toggleEdit('about')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('about')}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.about ? (
          <textarea
            value={companyData.about}
            onChange={(e) => handleInputChange('about', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'about')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
            placeholder="Tell us about your company, mission, and values"
            autoFocus
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">{companyData.about || 'Not set'}</p>
        )}
      </div>

      {/* Business Services */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Business Services
          </h2>
          {!isEditing.businessServices ? (
            <button
              onClick={() => toggleEdit('businessServices')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('businessServices')}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.businessServices ? (
          <textarea
            value={companyData.businessServices}
            onChange={(e) => handleInputChange('businessServices', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'businessServices')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
            placeholder="List the services or products your company offers"
            autoFocus
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">
            {companyData.businessServices || 'Not set'}
          </p>
        )}
      </div>

      {/* Save Button */}
      {Object.values(isEditing).some(val => val) && (
        <div className="flex items-center justify-end gap-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <button
            onClick={() => setIsEditing({
              companyName: false,
              location: false,
              icp: false,
              about: false,
              businessServices: false,
            })}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel All
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};
