const BACKEND_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004'}/api`;

class LinkedInLeadsService {
    async searchLeads(params) {
        console.log('🔗 LinkedIn API called with params:', params);
        try {
            const response = await fetch(`${BACKEND_URL}/linkedin-leads/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    keywords: params.keyword || params.keywords,
                    maxResults: params.maxResults || 50,
                    location: params.location || 'worldwide'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔗 LinkedIn API response:', data);
            return data;
        } catch (error) {
            console.error('LinkedIn search error:', error);
            return {
                success: false,
                error: error.message,
                leads: []
            };
        }
    }

    async searchLinkedInByWebsite(websiteUrl) {
        try {
            console.log('🔗 LinkedIn website search called with URL:', websiteUrl);
            
            const response = await fetch(`${BACKEND_URL}/linkedin-leads/search-by-website`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ websiteUrl })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔗 LinkedIn website search response:', data);
            return data;
        } catch (error) {
            console.error('LinkedIn website search error:', error);
            return {
                success: false,
                error: error.message,
                leads: []
            };
        }
    }

    async validateLinkedInUrl(url) {
        try {
            const response = await fetch(`${BACKEND_URL}/linkedin-leads/validate-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔗 LinkedIn URL validation response:', data);
            return data;
        } catch (error) {
            console.error('LinkedIn URL validation error:', error);
            return {
                success: false,
                error: error.message,
                isValid: false
            };
        }
    }

    async getAllLeads(params = {}) {
        try {
            const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sts-service-zfrsrcuvna-uc.a.run.app'}/api`;
            const queryParams = new URLSearchParams();
            if (params.keyword) queryParams.append('keyword', params.keyword);
            if (params.limit) queryParams.append('limit', params.limit);

            const response = await fetch(`${API_BASE_URL}/leads?${queryParams}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('LinkedIn get all leads error:', error);
            return {
                success: false,
                error: error.message,
                leads: []
            };
        }
    }

    async getRecentLeads(params = {}) {
        try {
            const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sts-service-zfrsrcuvna-uc.a.run.app'}/api`;
            const queryParams = new URLSearchParams();
            if (params.keyword) queryParams.append('keyword', params.keyword);
            if (params.limit) queryParams.append('limit', params.limit);

            const response = await fetch(`${API_BASE_URL}/recent?${queryParams}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('LinkedIn get recent leads error:', error);
            return {
                success: false,
                error: error.message,
                leads: []
            };
        }
    }

    async checkHealth() {
        try {
            const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sts-service-zfrsrcuvna-uc.a.run.app'}/api`;
            const response = await fetch(`${API_BASE_URL}/health`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('LinkedIn health check error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new LinkedInLeadsService();

