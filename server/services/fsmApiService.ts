import fetch from 'node-fetch';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export const fsmApiService = {
    async getToken(): Promise<string> {
        if (cachedToken && Date.now() < tokenExpiresAt) {
            return cachedToken;
        }

        const clientId = process.env.FSM_CLIENT_ID;
        const clientSecret = process.env.FSM_CLIENT_SECRET;
        const tokenUrl = process.env.FSM_TOKEN_URL || 'https://eu.coresuite.com/api/oauth2/v1/token';

        if (!clientId || !clientSecret) {
            throw new Error('FSM credentials are not properly configured.');
        }

        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to fetch FSM token: ${response.status} ${errText}`);
        }

        const data: any = await response.json();
        cachedToken = data.access_token;
        // Typically expires in 3600 seconds, reduce by 60s for safety buffer
        tokenExpiresAt = Date.now() + ((data.expires_in || 3600) - 60) * 1000;

        return cachedToken;
    },

    async getTechniciansForTickets(ticketIds: string[]): Promise<Record<string, string>> {
        if (!ticketIds || ticketIds.length === 0) return {};

        const token = await this.getToken();
        const account = process.env.FSM_ACCOUNT;
        const company = process.env.FSM_COMPANY;
        const baseUrl = process.env.FSM_QUERY_URL || 'https://us.coresuite.com/api/query/v1';
        const queryUrl = `${baseUrl}?account=${account}&company=${company}&dtos=Activity.20;Person.20`;

        const queryReqParams = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Client-ID': 'SiatcDashboard',
                'X-Client-Version': '1.0',
                'X-Account-Name': account!,
                'X-Company-Name': company!
            }
        };

        const techniciansMap: Record<string, string> = {};

        try {
            // Bulk fetch Activity where code is like any ticketId or subject contains any ticketId
            // To prevent massive queries, we break ticketIds into chunks of 50
            const chunkSize = 50;
            for (let i = 0; i < ticketIds.length; i += chunkSize) {
                const chunk = ticketIds.slice(i, i + chunkSize);
                const codeConditions = chunk.map(id => `it.code LIKE '%${id}%' OR it.subject LIKE '%${id}%'`).join(' OR ');
                const query = `SELECT it.subject, it.responsibles FROM Activity it WHERE ${codeConditions}`;
                
                const actRes = await fetch(queryUrl, {
                    ...queryReqParams,
                    body: JSON.stringify({ query })
                });

                if (!actRes.ok) {
                    console.error('FSM Activity query failed', await actRes.text());
                    continue;
                }

                const actData: any = await actRes.json();
                const personIds = new Set<string>();
                const activityToTicketMap: Record<string, string[]> = {}; // Map personId -> array of associated ticket IDs

                if (actData.data && actData.data.length > 0) {
                    actData.data.forEach((row: any) => {
                        const activity = row.it || row;
                        // Determine which ticket this activity belongs to by checking subject
                        const matchedTicket = chunk.find(id => activity.subject?.includes(id) || activity.code?.includes(id));
                        
                        const personId = activity.assignedPerson || (activity.responsibles && activity.responsibles[0]);
                        if (personId && matchedTicket) {
                            personIds.add(personId);
                            if (!activityToTicketMap[personId]) activityToTicketMap[personId] = [];
                            activityToTicketMap[personId].push(matchedTicket);
                        }
                    });
                }

                // If persons were found, resolve their names
                if (personIds.size > 0) {
                    const pIds = Array.from(personIds);
                    const personConditions = pIds.map(id => `'${id}'`).join(',');
                    const pQuery = `SELECT it.id, it.firstName, it.lastName FROM Person it WHERE it.id IN (${personConditions})`;
                    
                    const personRes = await fetch(queryUrl, {
                        ...queryReqParams,
                        body: JSON.stringify({ query: pQuery })
                    });

                    if (personRes.ok) {
                        const personData: any = await personRes.json();
                        if (personData.data && personData.data.length > 0) {
                            personData.data.forEach((row: any) => {
                                const person = row.it || row;
                                const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
                                
                                // Map the full name back to the respective tickets
                                const tickets = activityToTicketMap[person.id];
                                if (tickets) {
                                    tickets.forEach(ticketId => {
                                        techniciansMap[ticketId] = fullName;
                                    });
                                }
                            });
                        }
                    } else {
                        console.error('FSM Person query failed', await personRes.text());
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching technicians from FSM API:', error);
        }

        return techniciansMap;
    }
};
