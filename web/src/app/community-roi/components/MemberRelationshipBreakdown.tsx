import React, { useEffect, useState } from 'react';

interface RelationshipType {
  combination_type: number;
  color_code: string;
  count: number;
  label: string;
  total_meetings: number;
  total_referrals: number;
}

interface MemberRelationshipBreakdownProps {
  memberId: string;
  memberName?: string;
}

const typeDescriptions: Record<number, string> = {
  0: 'No interaction with',
  1: 'Meetings only with',
  2: 'Referrals only with',
  3: 'Both meetings and referrals with',
};

export const MemberRelationshipBreakdown: React.FC<MemberRelationshipBreakdownProps> = ({
  memberId,
  memberName = 'This member',
}) => {
  const [breakdown, setBreakdown] = useState<RelationshipType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRelationships, setTotalRelationships] = useState(0);

  useEffect(() => {
    const fetchBreakdown = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/community-roi/members/${memberId}/relationship-breakdown`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch relationship breakdown: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
          setBreakdown(result.data.breakdown);
          setTotalRelationships(result.data.totalRelationships);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch relationship breakdown');
        console.error('Error fetching relationship breakdown:', err);
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchBreakdown();
    }
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-500">Loading relationship data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!breakdown || totalRelationships === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-500">No relationship data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Relationship Breakdown</h3>
        <p className="text-xs text-gray-500 mt-1">
          {memberName} has {totalRelationships} total connections
        </p>
      </div>

      <div className="space-y-3">
        {breakdown.map((type) => {
          const percentage =
            totalRelationships > 0
              ? Math.round((type.count / totalRelationships) * 100)
              : 0;

          return (
            <div key={type.combination_type} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: type.color_code }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {type.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900">
                    {type.count}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: type.color_code,
                    width: `${percentage}%`,
                  }}
                />
              </div>

              {/* Additional stats for types with data */}
              {(type.total_meetings > 0 || type.total_referrals > 0) && (
                <div className="flex gap-3 text-xs text-gray-500 ml-5">
                  {type.total_meetings > 0 && (
                    <span>📅 {type.total_meetings} meeting{type.total_meetings > 1 ? 's' : ''}</span>
                  )}
                  {type.total_referrals > 0 && (
                    <span>🎯 {type.total_referrals} referral{type.total_referrals > 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="font-medium text-gray-900">Type Distribution</div>
            <div className="text-gray-500 mt-1">
              {breakdown.length} types tracked
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium text-gray-900">Total</div>
            <div className="text-gray-500 mt-1">{totalRelationships} members</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberRelationshipBreakdown;
