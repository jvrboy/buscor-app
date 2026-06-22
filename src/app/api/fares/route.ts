import { success, apiHandler } from '@/lib/response';
import { ROUTE_FARES, TICKET_CONFIG } from '@/lib/constants';

export function GET() {
  return apiHandler(async () => {
    // Format route fares as a flat array
    const routes = Object.entries(ROUTE_FARES).map(([id, route]) => ({
      id,
      name: route.name,
      from: route.from,
      to: route.to,
      fare: route.fare,
    }));

    // Format ticket types from TICKET_CONFIG
    const tickets = Object.entries(TICKET_CONFIG).map(
      ([type, config]) => ({
        type,
        price: config.price,
        trips: config.trips,
        label: config.label,
        description: config.description,
      }),
    );

    return success({ routes, tickets });
  });
}