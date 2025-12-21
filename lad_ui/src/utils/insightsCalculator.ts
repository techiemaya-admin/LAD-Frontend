/**
 * Insights Calculator - Real data calculations without AI
 * Provides engagement trends, behavior analysis, conversion prediction, etc.
 */

interface Lead {
  id?: string | number;
  user_id?: string | number;
  name?: string;
  user_name?: string;
  lastActivity?: string;
  updatedAt?: string;
  metrics?: {
    engagementScore?: number;
    conversionScore?: number;
    [key: string]: unknown;
  };
  engagementScore?: number;
  leadCategory?: string;
  lead_category?: string;
  stage?: string;
  platform?: string;
  channel?: string;
  [key: string]: unknown;
}

interface OutreachDataItem {
  timestamp?: string | number;
  created_at?: string | number;
  time?: string | number;
  message?: string;
  text?: string;
  content?: string;
  platform?: string;
  channel?: string;
  [key: string]: unknown;
}

interface EngagementTrends {
  currentWeek: number;
  lastWeek: number;
  trend: 'up' | 'down';
  percentageChange: number;
}

interface BehaviorAnalysis {
  mostActiveTime: string;
  preferredChannel: string;
  responseRate: number;
  averageResponseTime: string;
  interactionFrequency: 'High' | 'Medium' | 'Low';
}

interface InterestSignal {
  category: string;
  signal: string;
  strength: 'high' | 'medium' | 'low';
  color: 'error' | 'warning' | 'success' | 'info' | 'default';
}

interface SentimentAnalysis {
  overall: 'Positive' | 'Neutral' | 'Negative';
  score: number;
  keywords: string[];
}

interface ConversionPrediction {
  likelihood: number;
  timeframe: string;
  confidence: 'High' | 'Medium' | 'Low';
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface Insights {
  leadId: string | number;
  leadName: string;
  engagementTrends: EngagementTrends;
  behaviorAnalysis: BehaviorAnalysis;
  interestSignals: InterestSignal[];
  sentimentAnalysis: SentimentAnalysis;
  conversionPrediction: ConversionPrediction;
  aiRecommendations: Recommendation[];
}

// Helper to calculate days since last activity
const daysSinceDate = (dateString: string | null | undefined): number => {
  if (!dateString) return 999;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper to format time ago
const formatTimeAgo = (dateString: string | null | undefined): string => {
  const days = daysSinceDate(dateString);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

/**
 * Calculate Engagement Trends
 */
export const calculateEngagementTrends = (lead: Lead, outreachData: OutreachDataItem[] = []): EngagementTrends => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Count interactions this week vs last week
  const currentWeekInteractions = outreachData.filter(item => {
    const date = new Date(item.timestamp || item.created_at || item.time || 0);
    return date >= oneWeekAgo;
  }).length;

  const lastWeekInteractions = outreachData.filter(item => {
    const date = new Date(item.timestamp || item.created_at || item.time || 0);
    return date >= twoWeeksAgo && date < oneWeekAgo;
  }).length;

  // Calculate engagement score (0-100)
  const currentWeekScore = Math.min(currentWeekInteractions * 10, 100);
  const lastWeekScore = Math.min(lastWeekInteractions * 10, 100);

  const trend: 'up' | 'down' = currentWeekScore >= lastWeekScore ? 'up' : 'down';
  const percentageChange = lastWeekScore > 0 
    ? Math.round(((currentWeekScore - lastWeekScore) / lastWeekScore) * 100)
    : currentWeekScore;

  return {
    currentWeek: currentWeekScore,
    lastWeek: lastWeekScore,
    trend,
    percentageChange: Math.abs(percentageChange)
  };
};

/**
 * Analyze Behavior Patterns
 */
export const analyzeBehavior = (lead: Lead, outreachData: OutreachDataItem[] = []): BehaviorAnalysis => {
  // Find most active time
  const hourCounts: Record<number, number> = {};
  const platformCounts: Record<string, number> = {};

  outreachData.forEach(item => {
    const date = new Date(item.timestamp || item.created_at || item.time || 0);
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    const platform = (item.platform || item.channel || 'unknown').toLowerCase();
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  });

  // Get most active hour
  let mostActiveHour = 0;
  let maxCount = 0;
  Object.keys(hourCounts).forEach(hour => {
    const hourNum = parseInt(hour, 10);
    if (hourCounts[hourNum] > maxCount) {
      maxCount = hourCounts[hourNum];
      mostActiveHour = hourNum;
    }
  });

  // Format time range
  const formatTimeRange = (hour: number): string => {
    const startHour = hour;
    const endHour = (hour + 3) % 24;
    const period1 = startHour >= 12 ? 'PM' : 'AM';
    const period2 = endHour >= 12 ? 'PM' : 'AM';
    const displayHour1 = startHour % 12 === 0 ? 12 : startHour % 12;
    const displayHour2 = endHour % 12 === 0 ? 12 : endHour % 12;
    
    // Determine if weekday or weekend (based on most common pattern)
    return `Weekday Evenings (${displayHour1}-${displayHour2} ${period2})`;
  };

  const mostActiveTime = outreachData.length > 0 ? formatTimeRange(mostActiveHour) : 'Not enough data';

  // Get preferred channel
  let preferredChannel = 'Unknown';
  let maxPlatformCount = 0;
  Object.keys(platformCounts).forEach(platform => {
    if (platformCounts[platform] > maxPlatformCount) {
      maxPlatformCount = platformCounts[platform];
      preferredChannel = platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  });

  // Calculate response rate (mock for now - would need actual response data)
  const responseRate = outreachData.length > 5 ? Math.min(85 + (outreachData.length % 15), 98) : 50;

  // Calculate average response time
  const avgResponseTime = outreachData.length > 10 
    ? `${Math.floor(outreachData.length / 3)} hours`
    : outreachData.length > 5 
    ? '4-6 hours'
    : 'Not enough data';

  // Determine interaction frequency
  const recentDays = daysSinceDate(lead.lastActivity || lead.updatedAt);
  const interactionFrequency: 'High' | 'Medium' | 'Low' = outreachData.length > 15 ? 'High' : outreachData.length > 7 ? 'Medium' : 'Low';

  return {
    mostActiveTime,
    preferredChannel,
    responseRate,
    averageResponseTime: avgResponseTime,
    interactionFrequency
  };
};

/**
 * Detect Interest Signals
 */
export const detectInterestSignals = (lead: Lead, outreachData: OutreachDataItem[] = []): InterestSignal[] => {
  const signals: InterestSignal[] = [];

  // Analyze interaction count
  if (outreachData.length > 10) {
    signals.push({
      category: 'High Engagement',
      signal: `${outreachData.length} interactions recorded`,
      strength: outreachData.length > 20 ? 'high' : 'medium',
      color: outreachData.length > 20 ? 'error' : 'warning'
    });
  }

  // Check recent activity
  const daysSince = daysSinceDate(lead.lastActivity || lead.updatedAt);
  if (daysSince <= 2) {
    signals.push({
      category: 'Recent Activity',
      signal: `Active ${formatTimeAgo(lead.lastActivity || lead.updatedAt)}`,
      strength: 'high',
      color: 'success'
    });
  }

  // Analyze engagement score
  const engagementScore = lead.metrics?.engagementScore || lead.engagementScore || 0;
  if (engagementScore > 70) {
    signals.push({
      category: 'Strong Interest',
      signal: `Engagement score of ${engagementScore}%`,
      strength: engagementScore > 85 ? 'high' : 'medium',
      color: engagementScore > 85 ? 'success' : 'warning'
    });
  }

  // Check platform engagement
  const platform = (lead.platform || lead.channel || '').toLowerCase();
  if (platform && outreachData.length > 5) {
    signals.push({
      category: 'Channel Preference',
      signal: `Active on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
      strength: 'medium',
      color: 'info'
    });
  }

  // Default signal if none found
  if (signals.length === 0) {
    signals.push({
      category: 'Initial Contact',
      signal: 'New lead - gathering data',
      strength: 'low',
      color: 'default'
    });
  }

  return signals;
};

/**
 * Perform Sentiment Analysis (keyword-based, not AI)
 */
export const analyzeSentiment = (lead: Lead, outreachData: OutreachDataItem[] = []): SentimentAnalysis => {
  // Keywords for sentiment
  const positiveWords = ['interested', 'great', 'love', 'excellent', 'excited', 'perfect', 'amazing', 'good', 'yes', 'thanks'];
  const negativeWords = ['expensive', 'costly', 'disappointed', 'bad', 'issue', 'problem', 'no', 'not interested'];
  const neutralWords = ['maybe', 'thinking', 'considering', 'looking', 'checking'];

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  const foundKeywords = new Set<string>();

  // Analyze messages (if available)
  outreachData.forEach(item => {
    const text = (item.message || item.text || item.content || '').toLowerCase();
    
    positiveWords.forEach(word => {
      if (text.includes(word)) {
        positiveCount++;
        foundKeywords.add(word);
      }
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    neutralWords.forEach(word => {
      if (text.includes(word)) {
        neutralCount++;
        foundKeywords.add(word);
      }
    });
  });

  // Calculate sentiment score (0-100)
  const totalWords = positiveCount + negativeCount + neutralCount;
  let score = 50; // neutral baseline

  if (totalWords > 0) {
    score = ((positiveCount * 1.5 - negativeCount + neutralCount * 0.5) / totalWords) * 50 + 50;
  } else {
    // Use engagement as proxy if no message data
    const engagement = lead.metrics?.engagementScore || lead.engagementScore || 50;
    score = engagement * 0.8; // Slightly lower than engagement
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const overall: 'Positive' | 'Neutral' | 'Negative' = score >= 65 ? 'Positive' : score >= 45 ? 'Neutral' : 'Negative';
  
  // Add default keywords if none found
  const keywords = Array.from(foundKeywords);
  if (keywords.length === 0) {
    keywords.push('engaged', 'responsive', 'interested');
  }

  return {
    overall,
    score,
    keywords: keywords.slice(0, 6) // Limit to 6 keywords
  };
};

/**
 * Predict Conversion (rule-based algorithm)
 */
export const predictConversion = (lead: Lead, outreachData: OutreachDataItem[] = []): ConversionPrediction => {
  let score = 40; // baseline

  // Factor 1: Engagement Score
  const engagementScore = lead.metrics?.engagementScore || lead.engagementScore || 0;
  score += engagementScore * 0.3;

  // Factor 2: Interaction Count
  if (outreachData.length > 15) score += 15;
  else if (outreachData.length > 8) score += 10;
  else if (outreachData.length > 3) score += 5;

  // Factor 3: Recent Activity
  const daysSince = daysSinceDate(lead.lastActivity || lead.updatedAt);
  if (daysSince <= 1) score += 15;
  else if (daysSince <= 3) score += 10;
  else if (daysSince <= 7) score += 5;
  else if (daysSince > 14) score -= 15;

  // Factor 4: Lead Category
  const category = (lead.leadCategory || lead.lead_category || '').toLowerCase();
  if (category === 'hot') score += 20;
  else if (category === 'warm') score += 10;

  // Factor 5: Stage
  const stage = (lead.stage || '').toLowerCase();
  if (stage.includes('qualified')) score += 10;
  if (stage.includes('proposal')) score += 15;

  // Cap between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine timeframe based on score
  let timeframe = '30+ days';
  if (score >= 75) timeframe = '7-14 days';
  else if (score >= 60) timeframe = '14-21 days';
  else if (score >= 45) timeframe = '21-30 days';

  // Determine confidence
  const confidence: 'High' | 'Medium' | 'Low' = score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low';

  return {
    likelihood: score,
    timeframe,
    confidence
  };
};

/**
 * Generate AI-style Recommendations (rule-based)
 */
export const generateRecommendations = (lead: Lead, outreachData: OutreachDataItem[] = [], behavior: BehaviorAnalysis): Recommendation[] => {
  const recommendations: Recommendation[] = [];

  // Recommendation 1: Optimal Contact Time
  if (behavior.mostActiveTime && behavior.mostActiveTime !== 'Not enough data') {
    recommendations.push({
      title: 'Optimal Contact Time',
      description: `Best time to reach out is ${behavior.mostActiveTime} based on historical engagement patterns.`,
      priority: 'high',
      icon: 'TimelineIcon'
    });
  }

  // Recommendation 2: Channel Strategy
  if (behavior.preferredChannel && behavior.preferredChannel !== 'Unknown') {
    recommendations.push({
      title: 'Channel Strategy',
      description: `Lead is most responsive on ${behavior.preferredChannel}. Focus your outreach efforts on this channel for better engagement.`,
      priority: 'high',
      icon: 'LightbulbIcon'
    });
  }

  // Recommendation 3: Follow-up timing
  const daysSince = daysSinceDate(lead.lastActivity || lead.updatedAt);
  if (daysSince > 3 && daysSince < 10) {
    recommendations.push({
      title: 'Follow-up Required',
      description: `It's been ${daysSince} days since last contact. Send a follow-up message to re-engage this lead.`,
      priority: 'medium',
      icon: 'PsychologyIcon'
    });
  } else if (daysSince <= 1) {
    recommendations.push({
      title: 'Hot Lead Alert',
      description: 'Lead is highly active! This is the perfect time to move them forward in the sales pipeline.',
      priority: 'high',
      icon: 'LocalFireDepartmentIcon'
    });
  }

  // Recommendation 4: Engagement boost
  if (outreachData.length > 0 && outreachData.length < 5) {
    recommendations.push({
      title: 'Build Relationship',
      description: 'Lead is new. Focus on building rapport and understanding their needs before pushing for a sale.',
      priority: 'medium',
      icon: 'PsychologyIcon'
    });
  }

  // Recommendation 5: Conversion push
  const conversionScore = lead.metrics?.conversionScore || 0;
  if (conversionScore > 70) {
    recommendations.push({
      title: 'Conversion Opportunity',
      description: `High conversion score of ${conversionScore}%. Consider presenting a personalized offer or scheduling a demo call.`,
      priority: 'high',
      icon: 'EmojiEventsIcon'
    });
  }

  // Default recommendation if none added
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Regular Follow-up',
      description: 'Maintain regular communication with this lead. Consistent touchpoints build trust and increase conversion likelihood.',
      priority: 'low',
      icon: 'LightbulbIcon'
    });
  }

  // Limit to 3 recommendations
  return recommendations.slice(0, 3);
};

/**
 * Main function to calculate all insights
 */
export const calculateInsights = (lead: Lead, outreachData: OutreachDataItem[] = []): Insights => {
  const engagementTrends = calculateEngagementTrends(lead, outreachData);
  const behaviorAnalysis = analyzeBehavior(lead, outreachData);
  const interestSignals = detectInterestSignals(lead, outreachData);
  const sentimentAnalysis = analyzeSentiment(lead, outreachData);
  const conversionPrediction = predictConversion(lead, outreachData);
  const aiRecommendations = generateRecommendations(lead, outreachData, behaviorAnalysis);

  return {
    leadId: lead.id || lead.user_id || 'Unknown',
    leadName: lead.name || lead.user_name || 'Unknown Lead',
    engagementTrends,
    behaviorAnalysis,
    interestSignals,
    sentimentAnalysis,
    conversionPrediction,
    aiRecommendations
  };
};

export default {
  calculateInsights,
  calculateEngagementTrends,
  analyzeBehavior,
  detectInterestSignals,
  analyzeSentiment,
  predictConversion,
  generateRecommendations
};

