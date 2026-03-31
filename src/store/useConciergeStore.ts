import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ConciergeTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'Open' | 'On Hold';
  priority: 'High' | 'Medium' | null;
  account: string;
  channel: string;
  createdTime: string;
  dueDate: string | null;
  webUrl: string;
  threadCount: number;
  commentCount: number;
}

interface ConciergeState {
  tickets: ConciergeTicket[];
  lastSynced: string | null;
  setTickets: (tickets: ConciergeTicket[]) => void;
}

const SEED_TICKETS: ConciergeTicket[] = [
  {"id":"134512000007784001","ticketNumber":"2300","subject":"Service Cloud - Whitmore Inc. - Paul","status":"Open","priority":"High","account":"Whitmore","channel":"Email","createdTime":"2026-03-18T14:29:42.000Z","dueDate":"2026-03-31T17:30:00.000Z","webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000007784001","threadCount":11,"commentCount":2},
  {"id":"134512000007873003","ticketNumber":"2313","subject":"Pricing Import","status":"Open","priority":"Medium","account":"Whitmore","channel":"Email","createdTime":"2026-03-26T19:58:16.000Z","dueDate":"2026-04-01T17:30:00.000Z","webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000007873003","threadCount":3,"commentCount":1},
  {"id":"134512000001422852","ticketNumber":"1201","subject":"Setup Salesforce Foundations (Commerce and PayNow) for Sumedco","status":"On Hold","priority":null,"account":"Sumedco","channel":"Phone","createdTime":"2024-11-14T00:08:36.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000001422852","threadCount":1,"commentCount":30},
  {"id":"134512000005395001","ticketNumber":"2055","subject":"Marketing app and Campaigns for Sumedco","status":"On Hold","priority":null,"account":"Sumedco","channel":"Phone","createdTime":"2025-10-15T08:55:36.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000005395001","threadCount":1,"commentCount":3},
  {"id":"134512000007102001","ticketNumber":"2226","subject":"Make Opportunity Amount mandatory when creating a new Opportunity","status":"On Hold","priority":null,"account":"Sumedco","channel":"Phone","createdTime":"2026-02-03T07:21:30.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000007102001","threadCount":1,"commentCount":2},
  {"id":"134512000007137015","ticketNumber":"2243","subject":"Create a URL for a google maps Link","status":"On Hold","priority":null,"account":"Sumedco","channel":"Phone","createdTime":"2026-02-09T07:25:02.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000007137015","threadCount":1,"commentCount":5},
  {"id":"134512000001912015","ticketNumber":"1399","subject":"Chat setup Digital Engagement","status":"On Hold","priority":null,"account":"Balkan Plumbing","channel":"Phone","createdTime":"2025-01-10T14:06:57.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000001912015","threadCount":1,"commentCount":20},
  {"id":"134512000005704007","ticketNumber":"2090","subject":"Draft: $50 Amazon Gift Card promotion","status":"On Hold","priority":null,"account":"Balkan Plumbing","channel":"Email","createdTime":"2025-11-03T20:28:56.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000005704007","threadCount":2,"commentCount":16},
  {"id":"134512000006172001","ticketNumber":"2166","subject":"Linking Campaigns with the referred","status":"On Hold","priority":null,"account":"Balkan Plumbing","channel":"Phone","createdTime":"2025-12-03T15:38:38.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000006172001","threadCount":1,"commentCount":2},
  {"id":"134512000006065001","ticketNumber":"2158","subject":"Market Segmentation (Chris)","status":"On Hold","priority":null,"account":"Knit","channel":"Phone","createdTime":"2025-11-26T18:47:21.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000006065001","threadCount":0,"commentCount":3},
  {"id":"134512000006281001","ticketNumber":"2180","subject":"Use Case Activation Tracking - Knit","status":"On Hold","priority":"High","account":"Knit","channel":"Phone","createdTime":"2025-12-10T08:16:27.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000006281001","threadCount":1,"commentCount":0},
  {"id":"134512000006419001","ticketNumber":"2186","subject":"Import ICP file in Salesforce","status":"On Hold","priority":null,"account":"Knit","channel":"Phone","createdTime":"2025-12-15T16:27:26.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000006419001","threadCount":0,"commentCount":0},
  {"id":"134512000003177001","ticketNumber":"1664","subject":"Avochato Integration of Chatter Platform setup","status":"On Hold","priority":null,"account":"Integrity Together","channel":"Phone","createdTime":"2025-05-09T08:59:05.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000003177001","threadCount":0,"commentCount":15},
  {"id":"134512000003650002","ticketNumber":"1753","subject":"Helpdesk integration with Zoho Desk","status":"On Hold","priority":null,"account":"Simpliigence","channel":"Email","createdTime":"2025-06-20T10:07:19.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000003650002","threadCount":1,"commentCount":0},
  {"id":"134512000003924108","ticketNumber":"1815","subject":"Salesforce to G-Drive Connector","status":"On Hold","priority":null,"account":"Averifica","channel":"Phone","createdTime":"2025-07-10T16:49:36.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000003924108","threadCount":1,"commentCount":2},
  {"id":"134512000005053001","ticketNumber":"2016","subject":"DayBack Work Post Demo","status":"On Hold","priority":null,"account":"Geo Environmental Drilling","channel":"Phone","createdTime":"2025-09-22T05:22:27.000Z","dueDate":null,"webUrl":"https://desk.zoho.in/support/simpliigence/ShowHomePage.do#Cases/dv/134512000005053001","threadCount":1,"commentCount":1},
];

export const useConciergeStore = create<ConciergeState>()(
  persist(
    (set) => ({
      tickets: SEED_TICKETS,
      lastSynced: new Date().toISOString(),

      setTickets: (tickets) =>
        set({ tickets, lastSynced: new Date().toISOString() }),
    }),
    {
      name: 'simpliigence-concierge',
      version: 1,
    },
  ),
);
