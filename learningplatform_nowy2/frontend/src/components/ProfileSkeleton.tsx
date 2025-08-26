import React from 'react';

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-10 bg-gray-200 rounded"></div>
              <div className="w-48 h-8 bg-gray-200 rounded"></div>
            </div>
            <div className="flex space-x-3">
              <div className="w-24 h-10 bg-gray-200 rounded"></div>
              <div className="w-24 h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Profile Header Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Image Skeleton */}
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
            
            {/* Profile Info Skeleton */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="h-10 bg-gray-200 rounded w-64 mx-auto md:mx-0"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mx-auto md:mx-0"></div>
              <div className="h-6 bg-gray-200 rounded w-56 mx-auto md:mx-0"></div>
            </div>
          </div>
        </div>

        {/* Profile Details Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;

